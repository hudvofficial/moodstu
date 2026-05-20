import JSZip from "jszip";

/**
 * Generates an Export Pack ZIP file containing:
 * - selected-files.txt
 * - copy-selected.ps1 (Windows PowerShell script)
 * - copy-selected.mjs (macOS / Linux Node.js script)
 * - README.txt
 */
export async function generateExportPack(selectedJpgNames: string[], contractCode: string, matchRaw: boolean = false) {
  const zip = new JSZip();

  // 1. selected-files.txt hoặc selected-basenames.txt
  if (matchRaw) {
    const basenames = selectedJpgNames.map(name => {
      const lastDot = name.lastIndexOf(".");
      return lastDot > 0 ? name.substring(0, lastDot) : name;
    });
    const uniqueBasenames = [...new Set(basenames)];
    zip.file("selected-basenames.txt", uniqueBasenames.join("\r\n"));
  } else {
    zip.file("selected-files.txt", selectedJpgNames.join("\r\n"));
  }

  // 2. copy-selected.ps1 (Windows)
  const ps1Content = `# PowerShell Script to copy selected JPGs
$ErrorActionPreference = "Stop"

$sourceDir = Read-Host -Prompt 'Nhập đường dẫn thư mục GỐC (Ví dụ: D:\\Wedding\\Day1)'
$destDir = Read-Host -Prompt 'Nhập đường dẫn thư mục ĐÍCH (Ví dụ: D:\\Wedding\\Selected)'

if (-not (Test-Path $sourceDir)) {
    Write-Error "Thư mục gốc không tồn tại!"
    exit
}

if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    Write-Host "Đã tạo thư mục đích: $destDir" -ForegroundColor Green
}

$files = Get-Content -Path "${matchRaw ? 'selected-basenames.txt' : 'selected-files.txt'}"
$successCount = 0
$missingCount = 0

foreach ($fileName in $files) {
    if ([string]::IsNullOrWhiteSpace($fileName)) { continue }
    
${matchRaw ? `    $sourceFiles = Get-ChildItem -Path $sourceDir -Filter "$fileName.*"
    if ($sourceFiles.Count -eq 0 -and $sourceFiles -eq $null) {
        Write-Warning "Không tìm thấy file nào cho: $fileName"
        $missingCount++
    } else {
        foreach ($srcFile in $sourceFiles) {
            $destPath = Join-Path -Path $destDir -ChildPath $srcFile.Name
            if (-not (Test-Path $destPath)) {
                Copy-Item -Path $srcFile.FullName -Destination $destPath -Force
                $successCount++
            }
        }
    }` : `    $sourcePath = Join-Path -Path $sourceDir -ChildPath $fileName
    $destPath = Join-Path -Path $destDir -ChildPath $fileName

    if (Test-Path $sourcePath) {
        if (-not (Test-Path $destPath)) {
            Copy-Item -Path $sourcePath -Destination $destPath -Force
            $successCount++
        }
    } else {
        Write-Warning "Không tìm thấy file: $fileName"
        $missingCount++
    }`}
}

Write-Host "-------------------------"
Write-Host "HOÀN TẤT!" -ForegroundColor Cyan
Write-Host "Copy thành công: $successCount file" -ForegroundColor Green
if ($missingCount -gt 0) {
    Write-Host "Thiếu/Không tìm thấy: $missingCount file" -ForegroundColor Yellow
}
Write-Host "-------------------------"
pause
`;
  zip.file("copy-selected.ps1", ps1Content);

  // 3. copy-selected.mjs (MacOS/Linux)
  const mjsContent = `// Node.js Script to copy selected JPGs
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (query) => new Promise(resolve => rl.question(query, resolve));

async function run() {
  console.log("=== MJS Lọc File ===");
  const sourceDir = await ask('Nhập đường dẫn thư mục GỐC: ');
  const destDir = await ask('Nhập đường dẫn thư mục ĐÍCH: ');

  if (!fs.existsSync(sourceDir)) {
    console.error("LỖI: Thư mục gốc không tồn tại!");
    process.exit(1);
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log("Đã tạo thư mục đích.");
  }

  const filesList = fs.readFileSync('${matchRaw ? "selected-basenames.txt" : "selected-files.txt"}', 'utf-8');
  const files = filesList.split(/\\r?\\n/).filter(f => f.trim().length > 0);

  let successCount = 0;
  let missingCount = 0;

${matchRaw ? `  const allSourceFiles = fs.readdirSync(sourceDir.trim());
  for (const fileName of files) {
    const matched = allSourceFiles.filter(f => f.toLowerCase().startsWith(fileName.toLowerCase() + "."));
    if (matched.length > 0) {
      for (const m of matched) {
        const sourcePath = path.join(sourceDir.trim(), m);
        const destPath = path.join(destDir.trim(), m);
        if (!fs.existsSync(destPath)) {
          fs.copyFileSync(sourcePath, destPath);
          successCount++;
        }
      }
    } else {
      console.warn(\`Không tìm thấy: \${fileName}\`);
      missingCount++;
    }
  }` : `  for (const fileName of files) {
    const sourcePath = path.join(sourceDir.trim(), fileName.trim());
    const destPath = path.join(destDir.trim(), fileName.trim());

    if (fs.existsSync(sourcePath)) {
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(sourcePath, destPath);
        successCount++;
      }
    } else {
      console.warn(\`Không tìm thấy: \${fileName}\`);
      missingCount++;
    }
  }`}

  console.log("-------------------------");
  console.log("HOÀN TẤT!");
  console.log(\`Copy thành công: \${successCount} file\`);
  if (missingCount > 0) {
    console.log(\`Thiếu/Không tìm thấy: \${missingCount} file\`);
  }
  console.log("-------------------------");
  rl.close();
}

run();
`;
  zip.file("copy-selected.mjs", mjsContent);

  // 4. README.txt
  const readmeContent = `=== HƯỚNG DẪN LỌC ẢNH OFFLINE ===

Mã hợp đồng: ${contractCode}
Số lượng file đã chọn: ${selectedJpgNames.length} file

[TRÊN WINDOWS]
1. Nhấp chuột phải vào file "copy-selected.ps1".
2. Chọn "Run with PowerShell".
3. Làm theo hướng dẫn trên màn hình (Nhập đường dẫn gốc và đích).

[TRÊN MACOS / LINUX]
1. Đảm bảo máy đã cài NodeJS.
2. Mở Terminal tại thư mục giải nén này.
3. Chạy lệnh: node copy-selected.mjs
4. Làm theo hướng dẫn trên màn hình.

* Lưu ý: Hệ thống sẽ tự động bỏ qua nếu file đã tồn tại ở thư mục đích để tránh ghi đè sai.
`;
  zip.file("README.txt", readmeContent);

  // Generate and return Blob
  const blob = await zip.generateAsync({ type: "blob" });
  return blob;
}
