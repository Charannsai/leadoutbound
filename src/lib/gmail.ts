import { prisma } from "./prisma";

export interface GmailTokenInfo {
  accessToken: string;
  refreshToken: string;
  expiry: number;
  email: string;
}

export async function getGmailTokenInfo(): Promise<GmailTokenInfo | null> {
  const [access, refresh, expiry, email] = await Promise.all([
    prisma.settings.findUnique({ where: { key: "gmail_access_token" } }),
    prisma.settings.findUnique({ where: { key: "gmail_refresh_token" } }),
    prisma.settings.findUnique({ where: { key: "gmail_token_expiry" } }),
    prisma.settings.findUnique({ where: { key: "gmail_connected_email" } })
  ]);

  if (!access?.value || !refresh?.value || !expiry?.value) {
    return null;
  }

  return {
    accessToken: access.value,
    refreshToken: refresh.value,
    expiry: Number(expiry.value),
    email: email?.value || ""
  };
}

export async function refreshGmailAccessToken(tokens: GmailTokenInfo): Promise<string> {
  const [clientIdSet, clientSecretSet] = await Promise.all([
    prisma.settings.findUnique({ where: { key: "gmail_client_id" } }),
    prisma.settings.findUnique({ where: { key: "gmail_client_secret" } })
  ]);

  const clientId = clientIdSet?.value;
  const clientSecret = clientSecretSet?.value;

  if (!clientId || !clientSecret) {
    throw new Error("Missing client_id or client_secret in Settings");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refreshToken,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh Gmail access token: ${errorText}`);
  }

  const data = await response.json();
  const newAccessToken = data.access_token;
  const newExpiry = Date.now() + (data.expires_in || 3600) * 1000;

  // Save new values
  await prisma.$transaction([
    prisma.settings.upsert({
      where: { key: "gmail_access_token" },
      update: { value: newAccessToken },
      create: { key: "gmail_access_token", value: newAccessToken }
    }),
    prisma.settings.upsert({
      where: { key: "gmail_token_expiry" },
      update: { value: String(newExpiry) },
      create: { key: "gmail_token_expiry", value: String(newExpiry) }
    })
  ]);

  return newAccessToken;
}

export async function getValidAccessToken(): Promise<string> {
  const tokens = await getGmailTokenInfo();
  if (!tokens) {
    throw new Error("Gmail is not connected. Please connect it in Settings.");
  }

  // Refresh token if it expires in less than 5 minutes
  if (Date.now() + 5 * 60 * 1000 >= tokens.expiry) {
    return refreshGmailAccessToken(tokens);
  }

  return tokens.accessToken;
}

interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  signature?: string;
}

export async function sendGmailEmail(input: SendEmailInput): Promise<{ messageId: string; threadId: string }> {
  const accessToken = await getValidAccessToken();
  const tokens = await getGmailTokenInfo();
  const fromEmail = tokens?.email || "";

  const fromLine = input.fromName 
    ? `From: =?utf-8?B?${Buffer.from(input.fromName).toString("base64")}?= <${fromEmail}>`
    : `From: ${fromEmail}`;

  const emailBody = input.signature 
    ? `${input.body}\n\n--\n${input.signature}`
    : input.body;

  // Build RFC 822 formatted raw message
  const utf8Subject = `=?utf-8?B?${Buffer.from(input.subject).toString("base64")}?=`;
  const rawParts = [
    fromLine,
    `To: ${input.to}`,
    `Subject: ${utf8Subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    "",
    emailBody
  ];

  const rawMessage = rawParts.join("\r\n");
  
  // Base64url encode the message
  const base64urlMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw: base64urlMessage })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail Send API error: ${errorText}`);
  }

  const result = await response.json();
  return {
    messageId: result.id,
    threadId: result.threadId
  };
}
