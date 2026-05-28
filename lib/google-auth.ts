import {
  decryptGoogleOAuth,
  encryptGoogleOAuth,
} from "@/lib/settings-secrets";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh google token");
  }

  return response.json();
}

 
export async function getValidGoogleToken(supabase: any, studioInfo: any) {
   
  let authData = decryptGoogleOAuth(studioInfo.google_oauth) as any;
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Missing Google Credentials");
  }

  if (!authData?.access_token) {
    throw new Error("Missing Google Access Token");
  }

  const updatedAt = new Date(authData.updated_at).getTime();
  const expiresInMs = (authData.expires_in || 3600) * 1000;
  const now = Date.now();

  // Refresh if expiring in less than 5 minutes
  if (now - updatedAt > expiresInMs - 5 * 60 * 1000) {
    if (!authData.refresh_token) {
      throw new Error("Missing Refresh Token");
    }

    const newTokens = await refreshAccessToken(
      authData.refresh_token,
      CLIENT_ID,
      CLIENT_SECRET,
    );
    authData = {
      ...authData,
      ...newTokens,
      refresh_token: newTokens.refresh_token || authData.refresh_token,
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from("studio_info")
      .update({ google_oauth: encryptGoogleOAuth(authData) })
      .eq("id", studioInfo.id);
  }

  return authData;
}

export function hasGoogleScope(grantedScopes: string | undefined | null, requiredScope: string): boolean {
  if (!grantedScopes) return false;
  const scopes = grantedScopes.split(" ");
  return scopes.includes(requiredScope);
}
