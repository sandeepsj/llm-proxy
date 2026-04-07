export interface GoogleUserInfo {
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  sub: string;
}

export async function getGoogleUser(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error("Invalid Google access token");
  }

  const user = (await res.json()) as GoogleUserInfo;

  if (!user.email_verified) {
    throw new Error("Google email is not verified");
  }

  return user;
}

function getAllowedEmails(): Set<string> {
  const raw = process.env.ALLOWED_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function authenticate(authHeader: string | null): Promise<string> {
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  const [scheme, token] = authHeader.split(" ");

  if (!scheme || !token) {
    throw new Error("Invalid Authorization header format");
  }

  if (scheme.toLowerCase() === "bearer") {
    // Check shared secret first (server-to-server calls)
    const sharedSecret = process.env.PROXY_SECRET;
    if (sharedSecret && token === sharedSecret) {
      return "server";
    }

    // Google token validation
    const user = await getGoogleUser(token);
    const email = user.email.toLowerCase();

    const allowed = getAllowedEmails();
    if (allowed.size > 0 && !allowed.has(email)) {
      throw new Error(`Email not allowed: ${email}`);
    }

    return email;
  }

  throw new Error("Unsupported auth scheme");
}
