import { resolveGoogleOAuthRedirectUri } from "@/lib/google-oauth-redirect";

const production = "https://stu.moodwedding.com/api/auth/google/callback";
const obsoleteLocal = "http://localhost:3000/api/auth/google/callback";
const currentLocal = "http://localhost:3001/api/auth/google/callback";

describe("Google OAuth callback origin — single studio", () => {
  it("ignores obsolete localhost env in production login, preventing callback to CHC", () => {
    expect(resolveGoogleOAuthRedirectUri("https://stu.moodwedding.com/api/auth/google", obsoleteLocal))
      .toBe(production);
  });

  it("uses the same production callback URI when exchanging the Google code", () => {
    expect(resolveGoogleOAuthRedirectUri(
      "https://stu.moodwedding.com/api/auth/google/callback?code=fake-code",
      obsoleteLocal,
    )).toBe(production);
  });

  it("ignores a stale NEXT_PUBLIC_SITE_URL on the trusted production domain", () => {
    expect(resolveGoogleOAuthRedirectUri(
      "https://stu.moodwedding.com/api/auth/google",
      undefined,
      "http://localhost:3000",
    )).toBe(production);
  });

  it("keeps the correct production redirect when already configured", () => {
    expect(resolveGoogleOAuthRedirectUri(
      "https://stu.moodwedding.com/api/auth/google",
      production,
    )).toBe(production);
  });

  it("keeps the current local port 3001 even if env says 3000", () => {
    expect(resolveGoogleOAuthRedirectUri(
      "http://localhost:3001/api/auth/google",
      obsoleteLocal,
    )).toBe(currentLocal);
  });

  it("uses the registered local callback when env matches", () => {
    expect(resolveGoogleOAuthRedirectUri(
      "http://localhost:3001/api/auth/google/callback?code=sample",
      currentLocal,
    )).toBe(currentLocal);
  });

  it("derives origin from incoming local request when no env is set", () => {
    expect(resolveGoogleOAuthRedirectUri("http://127.0.0.1:3100/api/auth/google"))
      .toBe("http://127.0.0.1:3100/api/auth/google/callback");
  });

  it("does not break local state cookies when env points to production", () => {
    expect(resolveGoogleOAuthRedirectUri(
      "http://localhost:3001/api/auth/google",
      production,
    )).toBe(currentLocal);
  });

  it("fails closed for a preview origin using the production callback", () => {
    expect(() => resolveGoogleOAuthRedirectUri(
      "https://mood-studio-preview.vercel.app/api/auth/google",
      production,
    )).toThrow("does not match the current host");
  });

  it("fails closed for public requests with a localhost callback", () => {
    expect(() => resolveGoogleOAuthRedirectUri(
      "https://other.example/api/auth/google",
      obsoleteLocal,
    )).toThrow("does not match the current host");
  });

  it("rejects callback URI with wrong path or insecure public transport", () => {
    expect(() => resolveGoogleOAuthRedirectUri(
      "http://localhost:3001/api/auth/google",
      "http://localhost:3001/not-the-callback",
    )).toThrow("Invalid Google OAuth");
    expect(() => resolveGoogleOAuthRedirectUri(
      "https://staging.example/api/auth/google",
      "http://example.com/api/auth/google/callback",
    )).toThrow("Invalid Google OAuth");
  });
});
