import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("Google OAuth error parameter:", error);
      return NextResponse.redirect(new URL("/settings?oauth=error", request.nextUrl.origin));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/settings?oauth=no_code", request.nextUrl.origin));
    }

    // Retrieve OAuth client credentials from Settings
    const [clientIdSet, clientSecretSet, redirectUriSet] = await Promise.all([
      prisma.settings.findUnique({ where: { key: "gmail_client_id" } }),
      prisma.settings.findUnique({ where: { key: "gmail_client_secret" } }),
      prisma.settings.findUnique({ where: { key: "gmail_redirect_uri" } })
    ]);

    const clientId = clientIdSet?.value;
    const clientSecret = clientSecretSet?.value;
    const redirectUri = redirectUriSet?.value || "https://ykiwsxkycybntfjklxvk.supabase.co/auth/v1/callback";

    if (!clientId || !clientSecret) {
      console.error("Missing Gmail credentials in Settings");
      return NextResponse.redirect(new URL("/settings?oauth=missing_creds", request.nextUrl.origin));
    }

    // Exchange auth code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Google token exchange failed:", errText);
      return NextResponse.redirect(new URL("/settings?oauth=exchange_failed", request.nextUrl.origin));
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Fetch user info to get email address
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    let email = "";
    if (userinfoRes.ok) {
      const userinfo = await userinfoRes.json();
      email = userinfo.email || "";
    }

    // Save tokens in SQLite
    const expiryTimestamp = Date.now() + (expires_in || 3600) * 1000;
    
    const upserts = [
      prisma.settings.upsert({
        where: { key: "gmail_access_token" },
        update: { value: access_token },
        create: { key: "gmail_access_token", value: access_token }
      }),
      prisma.settings.upsert({
        where: { key: "gmail_token_expiry" },
        update: { value: String(expiryTimestamp) },
        create: { key: "gmail_token_expiry", value: String(expiryTimestamp) }
      })
    ];

    if (refresh_token) {
      upserts.push(
        prisma.settings.upsert({
          where: { key: "gmail_refresh_token" },
          update: { value: refresh_token },
          create: { key: "gmail_refresh_token", value: refresh_token }
        })
      );
    }

    if (email) {
      upserts.push(
        prisma.settings.upsert({
          where: { key: "gmail_connected_email" },
          update: { value: email },
          create: { key: "gmail_connected_email", value: email }
        })
      );
    }

    await prisma.$transaction(upserts);

    return NextResponse.redirect(new URL("/settings?oauth=success", request.nextUrl.origin));
  } catch (error) {
    console.error("OAuth callback API error:", error);
    return NextResponse.redirect(new URL("/settings?oauth=server_error", request.nextUrl.origin));
  }
}
