/**
 * prod-guard — chuẩn S3 (bước #10, agent/HANDOFFS/T-20260905-s3-ky-luat-ghi-prod.spec.md).
 * Dev = prod chung 1 Supabase. Script nào GHI vào DB phải gọi requireProdWrite() TRƯỚC khi tạo client;
 * không có ALLOW_PROD_WRITE=1 → dừng ngay, in cách bật. Không phụ thuộc gì ngoài process.
 */
export function requireProdWrite(script, what) {
  if (process.env.ALLOW_PROD_WRITE === "1") {
    console.warn(`[prod-guard] ${script}: GHI PRODUCTION — ${what}`);
    return;
  }
  console.error(
    `\n⛔ ${script} sẽ GHI vào DB production (${what}).\n` +
      `   Dev = prod chung 1 Supabase — không có cờ thì không chạy.\n` +
      `   Muốn chạy thật (PowerShell):  $env:ALLOW_PROD_WRITE="1"; node scripts/${script}\n` +
      `   Trước đó: backup đêm gần nhất OK? (H:\\backups\\mood-studio\\backup.log) · đã có dòng trong agent/DB-CHANGELOG.md chưa?\n`,
  );
  process.exit(2);
}
