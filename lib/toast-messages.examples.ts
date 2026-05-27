/**
 * 📚 Toast Messages Usage Examples
 *
 * Phase 2 implementation - using centralized message constants
 */

import { toast } from "@/lib/toast-manager";
import { TOAST_MESSAGES } from "@/lib/toast-messages";

// ═══════════════════════════════════════════
// BASIC USAGE
// ═══════════════════════════════════════════

function example_basic() {
  // Before: Hardcoded strings
  toast.success("Đã lưu thành công");
  toast.error("Không thể lưu");

  // After: Constants
  toast.success(TOAST_MESSAGES.SAVE_SUCCESS);
  toast.error(TOAST_MESSAGES.SAVE_ERROR);
}

// ═══════════════════════════════════════════
// MODULE-SPECIFIC MESSAGES
// ═══════════════════════════════════════════

function example_gallery() {
  // Gallery operations
  toast.success(TOAST_MESSAGES.GALLERY.CREATE_SUCCESS);
  toast.error(TOAST_MESSAGES.GALLERY.SYNC_ERROR);

  // Dynamic messages with params
  const fileName = "wedding-photo.jpg";
  toast.success(TOAST_MESSAGES.GALLERY.DOWNLOAD_SUCCESS(fileName));
  // Result: "Đã tải wedding-photo.jpg"

  // Batch download
  const count = 10;
  toast.loading(TOAST_MESSAGES.GALLERY.DOWNLOAD_BATCH_START(count));
  // Result: "Đang tải 10 ảnh..."
}

function example_contracts() {
  // Contract operations
  toast.success(TOAST_MESSAGES.CONTRACT.CREATE_SUCCESS);
  toast.success(TOAST_MESSAGES.CONTRACT.EVENT_CREATE_SUCCESS);
  toast.success(TOAST_MESSAGES.CONTRACT.TASK_COMPLETE_SUCCESS);
}

function example_finance() {
  // Finance operations
  toast.success(TOAST_MESSAGES.FINANCE.RECEIPT_CREATE_SUCCESS);
  toast.success(TOAST_MESSAGES.FINANCE.EXPENSE_CREATE_SUCCESS);
  toast.success(TOAST_MESSAGES.FINANCE.DEBT_PAYMENT_SUCCESS);
}

// ═══════════════════════════════════════════
// DYNAMIC MESSAGES (Functions)
// ═══════════════════════════════════════════

function example_dynamic_messages() {
  // Gallery download with file name
  const fileName = "photo-123.jpg";
  toast.success(TOAST_MESSAGES.GALLERY.DOWNLOAD_SUCCESS(fileName));

  // Or without file name (optional param)
  toast.success(TOAST_MESSAGES.GALLERY.DOWNLOAD_SUCCESS());
  // Result: "Đã tải ảnh"

  // Batch operations with count
  toast.success(TOAST_MESSAGES.GALLERY.SYNC_SUCCESS(25));
  // Result: "Đã đồng bộ 25 ảnh"

  // Selection limit
  toast.error(TOAST_MESSAGES.GALLERY.SELECT_LIMIT_EXCEEDED(50));
  // Result: "Chỉ được chọn tối đa 50 ảnh"

  // Upload file size
  toast.error(TOAST_MESSAGES.UPLOAD.FILE_TOO_LARGE("10MB"));
  // Result: "File quá lớn. Kích thước tối đa: 10MB"
}

// ═══════════════════════════════════════════
// LOADING FLOW WITH MESSAGES
// ═══════════════════════════════════════════

async function example_loading_flow() {
  // Start loading
  const toastId = toast.loading(TOAST_MESSAGES.GALLERY.DOWNLOAD_START);

  try {
    await downloadImage();

    // Success
    toast.success(TOAST_MESSAGES.GALLERY.DOWNLOAD_SUCCESS("photo.jpg"), {
      id: toastId,
    });
  } catch (error) {
    // Error
    toast.error(TOAST_MESSAGES.GALLERY.DOWNLOAD_ERROR("photo.jpg"), {
      id: toastId,
    });
  }
}

// ═══════════════════════════════════════════
// RETRY PATTERN WITH MESSAGES
// ═══════════════════════════════════════════

async function example_retry_pattern() {
  const maxRetries = 3;
  const toastId = toast.loading(TOAST_MESSAGES.GALLERY.DOWNLOAD_START);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await downloadImage();

      // Success
      toast.success(TOAST_MESSAGES.GALLERY.DOWNLOAD_SUCCESS(), { id: toastId });
      return true;
    } catch (error) {
      if (attempt < maxRetries - 1) {
        // Show retry message
        toast.loading(
          TOAST_MESSAGES.GALLERY.DOWNLOAD_RETRY(attempt + 2, maxRetries),
          { id: toastId }
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        // Final failure
        toast.error(TOAST_MESSAGES.GALLERY.DOWNLOAD_ERROR(), { id: toastId });
        return false;
      }
    }
  }
}

// ═══════════════════════════════════════════
// SERVER ACTIONS WITH MESSAGES
// ═══════════════════════════════════════════

async function example_server_actions() {
  // Create gallery
  const result = await createGallery({ title: "Album mới" });
  toast.result(result, TOAST_MESSAGES.GALLERY.CREATE_SUCCESS);

  // Update contract
  const result2 = await updateContract({ id: "123" });
  toast.result(result2, TOAST_MESSAGES.CONTRACT.UPDATE_SUCCESS);

  // With custom error message
  const result3 = await syncDrive();
  if (result3.success) {
    toast.success(TOAST_MESSAGES.GALLERY.SYNC_SUCCESS(result3.count));
  } else {
    toast.error(TOAST_MESSAGES.GALLERY.SYNC_DRIVE_ERROR);
  }
}

// ═══════════════════════════════════════════
// BATCH OPERATIONS WITH MESSAGES
// ═══════════════════════════════════════════

function example_batch_operations() {
  // Download multiple files
  const files = ["photo1.jpg", "photo2.jpg", "photo3.jpg"];

  // Start loading
  toast.loading(TOAST_MESSAGES.GALLERY.DOWNLOAD_BATCH_START(files.length));

  // After download
  toast.batchSuccess(files, "tải xuống");
  // OR with custom message:
  toast.success(TOAST_MESSAGES.GALLERY.DOWNLOAD_BATCH_SUCCESS(files.length));
}

// ═══════════════════════════════════════════
// MIGRATION EXAMPLES
// ═══════════════════════════════════════════

// ❌ BEFORE: Hardcoded strings everywhere
function before_migration() {
  // Auth component
  toast.success("Đăng nhập thành công");
  toast.error("Email hoặc mật khẩu không đúng");

  // Gallery component
  toast.loading("Đang tải ảnh...");
  toast.success("Đã tải photo.jpg");
  toast.error("Không thể tải ảnh. Vui lòng thử lại sau.");

  // Contract component
  toast.success("Đã tạo hợp đồng");
  toast.success("Đã cập nhật hợp đồng");
  toast.error("Không thể cập nhật hợp đồng");
}

// ✅ AFTER: Centralized constants
function after_migration() {
  // Auth component
  toast.success(TOAST_MESSAGES.AUTH.LOGIN_SUCCESS);
  toast.error(TOAST_MESSAGES.AUTH.LOGIN_INVALID_CREDENTIALS);

  // Gallery component
  toast.loading(TOAST_MESSAGES.GALLERY.DOWNLOAD_START);
  toast.success(TOAST_MESSAGES.GALLERY.DOWNLOAD_SUCCESS("photo.jpg"));
  toast.error(TOAST_MESSAGES.GALLERY.DOWNLOAD_ERROR());

  // Contract component
  toast.success(TOAST_MESSAGES.CONTRACT.CREATE_SUCCESS);
  toast.success(TOAST_MESSAGES.CONTRACT.UPDATE_SUCCESS);
  toast.error(TOAST_MESSAGES.CONTRACT.UPDATE_ERROR);
}

// ═══════════════════════════════════════════
// BENEFITS DEMONSTRATED
// ═══════════════════════════════════════════

/**
 * 1. EASY TO TRANSLATE (i18n)
 *
 * Before: Find/replace 318 hardcoded strings across 121 files
 * After: Translate 1 file (toast-messages.ts)
 */

/**
 * 2. CONSISTENT WORDING
 *
 * Before:
 *   "Đã lưu thành công"
 *   "Lưu thành công"
 *   "Đã lưu"
 *   "Thành công"
 *
 * After: Always "Đã lưu thành công"
 */

/**
 * 3. TYPE-SAFE
 *
 * TypeScript autocomplete for all messages:
 * TOAST_MESSAGES.GALLERY. → (autocomplete shows all options)
 */

/**
 * 4. FIND/REPLACE FRIENDLY
 *
 * Change wording in 1 place:
 * SAVE_SUCCESS: "Đã lưu thành công" → "Lưu thành công ✓"
 * All 50 usages update automatically
 */

/**
 * 5. NO TYPOS
 *
 * Before: "Đã lưu thànhcông" (typo!)
 * After: TOAST_MESSAGES.SAVE_SUCCESS (can't typo)
 */

// ═══════════════════════════════════════════
// HELPER FUNCTIONS (for examples)
// ═══════════════════════════════════════════

async function downloadImage(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 1000));
}

async function createGallery(payload: any): Promise<any> {
  return { success: true, count: 25 };
}

async function updateContract(payload: any): Promise<any> {
  return { success: true };
}

async function syncDrive(): Promise<any> {
  return { success: true, count: 25 };
}
