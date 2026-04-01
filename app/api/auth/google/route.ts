import { NextResponse } from "next/server";

export async function GET() {
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const REDIRECT_URI =
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:3000/api/auth/google/callback";

  if (!CLIENT_ID) {
    return NextResponse.json(
      {
        error:
          "Chưa cấu hình Google Client ID. Vui lòng thêm GOOGLE_CLIENT_ID vào file .env",
      },
      { status: 500 },
    );
  }

  // Scope: calendar (full read+write) để đồng bộ 2 chiều
  const scope = "https://www.googleapis.com/auth/calendar";

  // access_type=offline để lấy refresh_token (quan trọng để tự động refresh khi hết hạn)
  // prompt=consent để luôn hiện màn hình đồng ý, đảm bảo trả về refresh_token
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

  return NextResponse.redirect(url);
}
