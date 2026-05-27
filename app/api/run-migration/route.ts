import { createClient } from "@/lib/supabase/server";
import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    // Security check - simple password (thay đổi sau khi test)
    if (password !== "migrate-vendors-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Read migration SQL
    const migrationPath = join(
      process.cwd(),
      "supabase/migrations/20260527000000_add_vendors_to_contract_detail_v2.sql"
    );
    const sql = readFileSync(migrationPath, "utf-8");

    // Get Supabase admin client
    const supabase = await createClient();

    // Execute SQL via Supabase client (này sẽ fail vì không có raw SQL support)
    // Thay vào đó, dùng approach khác...

    // Check if we can create function via .rpc() or need alternative
    console.log("Migration SQL length:", sql.length);

    return NextResponse.json({
      success: true,
      message: "Use Supabase Dashboard SQL Editor instead",
      sql: sql,
      instructions: [
        "1. Go to Supabase Dashboard → SQL Editor",
        "2. Paste the returned SQL",
        "3. Click RUN",
      ],
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
