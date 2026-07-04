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

// ==========================================
// 📬 New Email Client Core Sync & Operations
// ==========================================

export interface GmailAttachmentInfo {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface GmailMessageInfo {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string; // HTML if available, fallback text
  snippet: string;
  attachments: GmailAttachmentInfo[];
}

export interface GmailThreadInfo {
  id: string;
  snippet: string;
  messagesCount: number;
  lastMessageDate: string;
  lastSender: string;
  subject: string;
  isUnread: boolean;
}

/**
 * Encodes base64 string to base64url standard for Gmail API payload specs.
 */
function base64urlEncode(str: string | Buffer): string {
  const buf = typeof str === "string" ? Buffer.from(str) : str;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * List threads filtered by folder/mailbox with pagination.
 */
export async function listGmailThreads(
  folder: string,
  search?: string
): Promise<GmailThreadInfo[]> {
  const tokens = await getGmailTokenInfo();
  if (!tokens) {
    return getMockThreads(folder, search);
  }

  try {
    const accessToken = await getValidAccessToken();

    // 1. Fetch tracked outreach thread IDs from local Prisma database
    const [dbEmails, dbReplies] = await Promise.all([
      prisma.leadEmail.findMany({
        where: { gmailThreadId: { not: null } },
        select: { gmailThreadId: true }
      }),
      prisma.reply.findMany({
        where: { gmailThreadId: { not: null } },
        select: { gmailThreadId: true }
      })
    ]);

    const trackedThreadIds = Array.from(new Set([
      ...dbEmails.map((e) => e.gmailThreadId),
      ...dbReplies.map((r) => r.gmailThreadId)
    ])).filter(Boolean) as string[];

    if (trackedThreadIds.length === 0) {
      return [];
    }

    const threadList: GmailThreadInfo[] = [];

    // 2. Fetch details for each tracked outreach thread directly to ensure no irrelevant personal emails bleed in
    for (const threadId of trackedThreadIds) {
      try {
        const threadDetails = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=minimal`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!threadDetails.ok) continue;
        const details = await threadDetails.json();
        const messages = details.messages || [];
        if (messages.length === 0) continue;

        // Check labels to categorize message under correct folders
        const messageLabels = messages.flatMap((m: any) => m.labelIds || []);
        let matchesFolder = false;

        if (folder === "inbox") {
          matchesFolder = messageLabels.includes("INBOX");
        } else if (folder === "sent") {
          matchesFolder = messageLabels.includes("SENT");
        } else if (folder === "drafts") {
          matchesFolder = messageLabels.includes("DRAFT");
        } else if (folder === "trash") {
          matchesFolder = messageLabels.includes("TRASH");
        } else {
          matchesFolder = true;
        }

        if (!matchesFolder) continue;

        const lastMsg = messages[messages.length - 1];
        const firstMsg = messages[0];

        const headers = firstMsg.payload?.headers || [];
        const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "(No Subject)";
        const fromHeader = lastMsg.payload?.headers?.find((h: any) => h.name.toLowerCase() === "from")?.value || "Unknown";
        const lastSender = fromHeader.split("<")[0]?.trim() || fromHeader;
        
        const dateHeader = lastMsg.payload?.headers?.find((h: any) => h.name.toLowerCase() === "date")?.value || "";
        const dateParsed = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();

        const isUnread = messages.some((m: any) => m.labelIds?.includes("UNREAD"));

        // Match local search query if provided
        if (search) {
          const s = search.toLowerCase();
          const matchesSearch = 
            subject.toLowerCase().includes(s) || 
            lastSender.toLowerCase().includes(s) || 
            (lastMsg.snippet || "").toLowerCase().includes(s);
          if (!matchesSearch) continue;
        }

        threadList.push({
          id: threadId,
          snippet: lastMsg.snippet || "",
          messagesCount: messages.length,
          lastMessageDate: dateParsed,
          lastSender,
          subject,
          isUnread
        });
      } catch (err) {
        console.error(`Failed to fetch/parse thread ${threadId}:`, err);
      }
    }

    return threadList.sort(
      (a, b) => new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime()
    );
  } catch (err) {
    console.error("Failed to fetch live Gmail threads, falling back:", err);
    return getMockThreads(folder, search);
  }
}

/**
 * Fetches all messages inside a thread and parses bodies, attachments, and metadata.
 */
export async function getGmailThreadDetails(
  threadId: string
): Promise<GmailMessageInfo[]> {
  const tokens = await getGmailTokenInfo();
  if (!tokens) {
    return getMockThreadDetails(threadId);
  }

  try {
    const accessToken = await getValidAccessToken();
    const threadRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!threadRes.ok) {
      throw new Error(`Gmail Get Thread API error: ${await threadRes.text()}`);
    }

    const threadData = await threadRes.json();
    const messages = threadData.messages || [];
    const parsedMessages: GmailMessageInfo[] = [];

    for (const msg of messages) {
      const headers = msg.payload?.headers || [];
      const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "";
      const to = headers.find((h: any) => h.name.toLowerCase() === "to")?.value || "";
      const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "(No Subject)";
      const dateHeader = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || "";
      const date = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();

      // Extract body payload (prefer HTML, fall back to plain text)
      let htmlBody = "";
      let plainTextBody = "";
      const attachments: GmailAttachmentInfo[] = [];

      const parseParts = (parts: any[]) => {
        for (const part of parts) {
          if (part.mimeType === "text/html" && part.body?.data) {
            htmlBody = Buffer.from(part.body.data, "base64").toString("utf-8");
          } else if (part.mimeType === "text/plain" && part.body?.data) {
            plainTextBody = Buffer.from(part.body.data, "base64").toString("utf-8");
          } else if (part.filename && part.body?.attachmentId) {
            attachments.push({
              id: part.body.attachmentId,
              name: part.filename,
              mimeType: part.mimeType,
              size: part.body.size || 0
            });
          }

          if (part.parts) {
            parseParts(part.parts);
          }
        }
      };

      if (msg.payload?.parts) {
        parseParts(msg.payload.parts);
      } else if (msg.payload?.body?.data) {
        const bodyStr = Buffer.from(msg.payload.body.data, "base64").toString("utf-8");
        if (msg.payload.mimeType === "text/html") {
          htmlBody = bodyStr;
        } else {
          plainTextBody = bodyStr;
        }
      }

      // Mark message as read on fetch
      if (msg.labelIds?.includes("UNREAD")) {
        fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/batchModify`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ removeLabelIds: ["UNREAD"] })
        }).catch(err => console.error("Failed to mark message as read:", err));
      }

      parsedMessages.push({
        id: msg.id,
        threadId,
        from,
        to,
        subject,
        date,
        body: htmlBody || plainTextBody || msg.snippet || "",
        snippet: msg.snippet || "",
        attachments
      });
    }

    return parsedMessages;
  } catch (err) {
    console.error("Failed to fetch live Gmail thread details, falling back:", err);
    return getMockThreadDetails(threadId);
  }
}

/**
 * Downloads binary attachment base64 payload from Gmail API.
 */
export async function getGmailAttachment(
  messageId: string,
  attachmentId: string
): Promise<{ data: string; mimeType: string }> {
  const tokens = await getGmailTokenInfo();
  if (!tokens) {
    return { data: getMockAttachmentData(attachmentId), mimeType: "application/octet-stream" };
  }

  const accessToken = await getValidAccessToken();
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    throw new Error(`Gmail Get Attachment API error: ${await res.text()}`);
  }

  const result = await res.json();
  return {
    data: result.data || "",
    mimeType: "application/octet-stream"
  };
}

/**
 * Sends a MIME multipart/mixed cold email or inline thread reply.
 */
export async function sendMimeEmail({
  to,
  subject,
  body,
  attachments = [],
  threadId,
  messageId,
  fromName
}: {
  to: string;
  subject: string;
  body: string;
  attachments?: Array<{ name: string; content: string; mimeType: string }>; // content is base64 string
  threadId?: string;
  messageId?: string;
  fromName?: string;
}): Promise<{ id: string; threadId: string }> {
  const tokens = await getGmailTokenInfo();
  if (!tokens) {
    console.log("Mock Send MIME email dispatched:", { to, subject, body, attachments, threadId });
    return { id: "mock_msg_" + Math.random().toString(36).substr(2, 9), threadId: threadId || "mock_thread_1" };
  }

  const accessToken = await getValidAccessToken();
  const fromEmail = tokens.email;

  const boundary = `Boundary_OutReach_AI_${Math.random().toString(36).substring(2)}`;
  const alternativeBoundary = `Alt_Boundary_OutReach_AI_${Math.random().toString(36).substring(2)}`;

  const headers: string[] = [];
  const fromLine = fromName 
    ? `From: =?utf-8?B?${Buffer.from(fromName).toString("base64")}?= <${fromEmail}>`
    : `From: ${fromEmail}`;
  
  headers.push(fromLine);
  headers.push(`To: ${to}`);
  headers.push(`Subject: =?utf-8?B?${Buffer.from(subject).toString("base64")}?=`);
  headers.push("MIME-Version: 1.0");

  if (threadId && messageId) {
    headers.push(`In-Reply-To: ${messageId}`);
    headers.push(`References: ${messageId}`);
  }

  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  headers.push("");

  const payloadParts: string[] = [];

  // 1. Text/HTML alternative body segment
  payloadParts.push(`--${boundary}`);
  payloadParts.push(`Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`);
  payloadParts.push("");

  // Plain text version
  payloadParts.push(`--${alternativeBoundary}`);
  payloadParts.push("Content-Type: text/plain; charset=utf-8");
  payloadParts.push("Content-Transfer-Encoding: base64");
  payloadParts.push("");
  payloadParts.push(Buffer.from(body).toString("base64"));
  payloadParts.push("");

  // Simple HTML version (supporting inline line breaks)
  const htmlBody = `<html><body><div style="font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #1f2937;">${body.replace(/\n/g, "<br />")}</div></body></html>`;
  payloadParts.push(`--${alternativeBoundary}`);
  payloadParts.push("Content-Type: text/html; charset=utf-8");
  payloadParts.push("Content-Transfer-Encoding: base64");
  payloadParts.push("");
  payloadParts.push(Buffer.from(htmlBody).toString("base64"));
  payloadParts.push("");
  
  payloadParts.push(`--${alternativeBoundary}--`);

  // 2. Attachments segments
  for (const file of attachments) {
    payloadParts.push(`--${boundary}`);
    payloadParts.push(`Content-Type: ${file.mimeType}; name="${file.name}"`);
    payloadParts.push("Content-Transfer-Encoding: base64");
    payloadParts.push(`Content-Disposition: attachment; filename="${file.name}"`);
    payloadParts.push("");
    // In MIME structure, base64 attachments must not exceed 76 characters per line (standards-based block split)
    const base64Content = file.content;
    const base64Lines = base64Content.match(/.{1,76}/g) || [base64Content];
    payloadParts.push(base64Lines.join("\r\n"));
    payloadParts.push("");
  }

  payloadParts.push(`--${boundary}--`);

  const rawMessage = [...headers, ...payloadParts].join("\r\n");
  const base64urlMessage = base64urlEncode(rawMessage);

  const requestBody: any = { raw: base64urlMessage };
  if (threadId) {
    requestBody.threadId = threadId;
  }

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail Send API error: ${errorText}`);
  }

  const result = await response.json();
  return {
    id: result.id,
    threadId: result.threadId
  };
}

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  signature?: string;
}

export async function sendGmailEmail(input: SendEmailInput): Promise<{ messageId: string; threadId: string }> {
  const fullBody = input.signature ? `${input.body}\n\n--\n${input.signature}` : input.body;
  const result = await sendMimeEmail({
    to: input.to,
    subject: input.subject,
    body: fullBody,
    fromName: input.fromName
  });
  return {
    messageId: result.id,
    threadId: result.threadId
  };
}

// ==========================================
// 📂 Sandbox Mock Datasets (Gmail Connected Fallback)
// ==========================================

const MOCK_ATTACHMENTS: Record<string, string> = {
  "att_resume": "JVBERi0xLjQKJcFSWDFj...[Mock Resume Base64 Payload]...",
  "att_portfolio": "iVBORw0KGgoAAAANSUhEUgAA...[Mock Design Base64 Payload]..."
};

const mockThreadsData: Record<string, GmailThreadInfo[]> = {
  inbox: [
    {
      id: "mock_thread_1",
      snippet: "Hi Charann, thanks for reaching out. We loved your portfolio and would like to schedule a 30 min chat this Thursday.",
      messagesCount: 2,
      lastMessageDate: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      lastSender: "Sarah Jenkins (Linear)",
      subject: "Follow up: Software Engineer - Remote application",
      isUnread: true
    },
    {
      id: "mock_thread_2",
      snippet: "Hello! Unfortunately we are not sponsoring Visas for this specific contract. Best of luck in your search.",
      messagesCount: 2,
      lastMessageDate: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      lastSender: "Talent Team (Railway)",
      subject: "Application Status Update: Software Engineer",
      isUnread: false
    },
    {
      id: "mock_thread_3",
      snippet: "Can you send over your resume in PDF format? The LinkedIn profile looks great but our hiring board needs the raw doc.",
      messagesCount: 1,
      lastMessageDate: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      lastSender: "Arvid Larsson (Supabase)",
      subject: "Supabase Cold outreach - Resume request",
      isUnread: true
    }
  ],
  sent: [
    {
      id: "mock_thread_4",
      snippet: "I am writing to express my interest in remote software engineering roles. I have 2 years of experience building scalable applications.",
      messagesCount: 1,
      lastMessageDate: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      lastSender: "Me",
      subject: "Cold Pitch: Software Engineer (Charann Sai)",
      isUnread: false
    }
  ],
  drafts: [
    {
      id: "mock_thread_5",
      snippet: "[Draft] Hi team, following up on my previous note. I wanted to share a link to my recent Next.js side projects...",
      messagesCount: 1,
      lastMessageDate: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      lastSender: "Me",
      subject: "Draft follow up pitch",
      isUnread: false
    }
  ],
  trash: []
};

const mockThreadDetailsData: Record<string, GmailMessageInfo[]> = {
  mock_thread_1: [
    {
      id: "mock_msg_1a",
      threadId: "mock_thread_1",
      from: "Charann Sai <charann@example.com>",
      to: "Sarah Jenkins <sarah@linear.app>",
      subject: "Cold Pitch: Software Engineer",
      date: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      body: "Hi Sarah,\n\nI noticed Linear is expanding its remote product team. I have 2 years of experience developing React/Next.js systems and would love to contribute. I've attached my resume below.\n\nBest,\nCharann",
      snippet: "Hi Sarah, I noticed Linear is expanding its remote product team...",
      attachments: []
    },
    {
      id: "mock_msg_1b",
      threadId: "mock_thread_1",
      from: "Sarah Jenkins <sarah@linear.app>",
      to: "Charann Sai <charann@example.com>",
      subject: "Re: Cold Pitch: Software Engineer",
      date: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      body: "Hi Charann, thanks for reaching out.<br/><br/>We loved your portfolio details and the Next.js work you built. We would like to schedule a 30 min chat this Thursday at 3:00 PM EST. Let me know if that works!<br/><br/>I've attached our initial interview brief sheet.<br/><br/>Sarah",
      snippet: "Hi Charann, thanks for reaching out. We loved your portfolio...",
      attachments: [
        {
          id: "att_resume",
          name: "linear_interview_brief.pdf",
          mimeType: "application/pdf",
          size: 142050
        }
      ]
    }
  ],
  mock_thread_2: [
    {
      id: "mock_msg_2a",
      threadId: "mock_thread_2",
      from: "Charann Sai <charann@example.com>",
      to: "Railway Careers <careers@railway.app>",
      subject: "Application Status Update: Software Engineer",
      date: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
      body: "Hi Team,\n\nI submitted an application for the remote Software Engineer position. I would love to learn more about the role.\n\nThanks,\nCharann",
      snippet: "Hi Team, I submitted an application for the remote Software Engineer position...",
      attachments: []
    },
    {
      id: "mock_msg_2b",
      threadId: "mock_thread_2",
      from: "Talent Team <careers@railway.app>",
      to: "Charann Sai <charann@example.com>",
      subject: "Re: Application Status Update: Software Engineer",
      date: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      body: "Hello Charann,<br/><br/>Thank you for your interest. Unfortunately, we are not sponsoring Visas or hiring in your specific region for this contract role. We will keep your resume on file for future expansions.<br/><br/>Best of luck,<br/>Railway Team",
      snippet: "Hello! Unfortunately we are not sponsoring Visas for this specific contract...",
      attachments: []
    }
  ],
  mock_thread_3: [
    {
      id: "mock_msg_3a",
      threadId: "mock_thread_3",
      from: "Arvid Larsson <arvid@supabase.io>",
      to: "Charann Sai <charann@example.com>",
      subject: "Supabase Cold outreach - Resume request",
      date: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      body: "Can you send over your resume in PDF format? The LinkedIn profile looks great but our hiring board needs the raw doc.<br/><br/>Arvid",
      snippet: "Can you send over your resume in PDF format?...",
      attachments: []
    }
  ],
  mock_thread_4: [
    {
      id: "mock_msg_4a",
      threadId: "mock_thread_4",
      from: "Charann Sai <charann@example.com>",
      to: "Hiring Team <jobs@supa.io>",
      subject: "Cold Pitch: Software Engineer (Charann Sai)",
      date: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      body: "I am writing to express my interest in remote software engineering roles. I have 2 years of experience building scalable applications.",
      snippet: "I am writing to express my interest in remote software engineering roles...",
      attachments: []
    }
  ],
  mock_thread_5: [
    {
      id: "mock_msg_5a",
      threadId: "mock_thread_5",
      from: "Charann Sai <charann@example.com>",
      to: "hiring@vercel.com",
      subject: "Draft follow up pitch",
      date: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      body: "Hi team, following up on my previous note. I wanted to share a link to my recent Next.js side projects...",
      snippet: "[Draft] Hi team, following up on my previous note...",
      attachments: []
    }
  ]
};

function getMockThreads(folder: string, search?: string): GmailThreadInfo[] {
  let list = mockThreadsData[folder] || [];
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(
      (t) =>
        t.subject.toLowerCase().includes(s) ||
        t.snippet.toLowerCase().includes(s) ||
        t.lastSender.toLowerCase().includes(s)
    );
  }
  return list;
}

function getMockThreadDetails(threadId: string): GmailMessageInfo[] {
  return mockThreadDetailsData[threadId] || [
    {
      id: "mock_msg_dyn",
      threadId,
      from: "System <system@outreach.ai>",
      to: "User <user@outreach.ai>",
      subject: "Sandbox Fallback Thread",
      date: new Date().toISOString(),
      body: "This is a sandbox fallback email detail view because no live Gmail account is connected in your Settings.",
      snippet: "This is a sandbox fallback email...",
      attachments: []
    }
  ];
}

function getMockAttachmentData(attachmentId: string): string {
  return MOCK_ATTACHMENTS[attachmentId] || "";
}
