export type ExcelCellValue = string | number | boolean | null | undefined;

export interface ExcelWorksheet {
  name: string;
  rows: ExcelCellValue[][];
}

const INVALID_SHEET_NAME = /[:\\/?*\[\]]/g;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizeSheetName(name: string) {
  const safeName = name.replace(INVALID_SHEET_NAME, " ").trim() || "Sheet";
  return safeName.slice(0, 31);
}

function buildCell(value: ExcelCellValue) {
  const normalized = value ?? "";

  if (typeof normalized === "number" && Number.isFinite(normalized)) {
    return `<Cell><Data ss:Type="Number">${normalized}</Data></Cell>`;
  }

  if (typeof normalized === "boolean") {
    return `<Cell><Data ss:Type="String">${normalized ? "TRUE" : "FALSE"}</Data></Cell>`;
  }

  return `<Cell><Data ss:Type="String">${escapeXml(String(normalized))}</Data></Cell>`;
}

function buildWorksheet(sheet: ExcelWorksheet) {
  const rows = sheet.rows
    .map((row) => `<Row>${row.map((cell) => buildCell(cell)).join("")}</Row>`)
    .join("");

  return `<Worksheet ss:Name="${escapeXml(normalizeSheetName(sheet.name))}"><Table>${rows}</Table></Worksheet>`;
}

export function buildExcelXmlWorkbook(sheets: ExcelWorksheet[]) {
  const body = sheets.map((sheet) => buildWorksheet(sheet)).join("");

  return [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:html="http://www.w3.org/TR/REC-html40">',
    body,
    "</Workbook>",
  ].join("");
}

export function downloadExcelXml(filename: string, sheets: ExcelWorksheet[]) {
  const workbook = buildExcelXmlWorkbook(sheets);
  const blob = new Blob([workbook], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
