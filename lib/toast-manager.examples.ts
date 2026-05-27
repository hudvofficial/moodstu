/**
 * 📚 Toast Manager Usage Examples
 *
 * Phase 1 implementation examples showing all features
 */

import { toast } from "@/lib/toast-manager";

// ═══════════════════════════════════════════
// 1. BASIC USAGE (Backward Compatible)
// ═══════════════════════════════════════════

function example_basic() {
  // Simple toasts
  toast.success("Đã lưu thành công");
  toast.error("Có lỗi xảy ra");
  toast.info("Thông tin mới");
  toast.warning("Cảnh báo!");
}

// ═══════════════════════════════════════════
// 2. LOADING → SUCCESS/ERROR FLOW
// ═══════════════════════════════════════════

async function example_loading_flow() {
  // Method 1: Manual ID management
  const toastId = toast.loading("Đang tải...");

  try {
    await fetchData();
    toast.success("Tải thành công", { id: toastId });
  } catch (error) {
    toast.error("Tải thất bại", { id: toastId });
  }

  // Method 2: Named loading (better for complex flows)
  toast.startLoading("upload-photos", "Đang tải 10 ảnh...");

  try {
    await uploadPhotos();
    toast.finishLoading("upload-photos", "success", "Đã tải 10 ảnh");
  } catch (error) {
    toast.finishLoading("upload-photos", "error", "Không thể tải ảnh");
  }

  // Method 3: Promise wrapper (automatic)
  await toast.promise(
    fetchData(),
    {
      loading: "Đang tải...",
      success: "Thành công!",
      error: "Lỗi!",
    }
  );
}

// ═══════════════════════════════════════════
// 3. BATCH OPERATIONS (No more toast spam!)
// ═══════════════════════════════════════════

function example_batch_operations() {
  const files = ["photo1.jpg", "photo2.jpg", "photo3.jpg", /* ...20 more */];

  // ❌ OLD WAY: Shows 23 toasts!
  files.forEach((file) => {
    toast.success(`Đã tải ${file}`);
  });

  // ✅ NEW WAY: Shows 1 summary toast
  toast.batchSuccess(files, "tải xuống");
  // Result: "Đã tải xuống 23 mục"
  //         "photo1.jpg, photo2.jpg, photo3.jpg... và 20 mục khác"

  // Error batch
  const failedFiles = ["corrupted1.jpg", "corrupted2.jpg"];
  toast.batchError(failedFiles, "tải xuống");
}

// ═══════════════════════════════════════════
// 4. SERVER ACTIONS INTEGRATION
// ═══════════════════════════════════════════

async function example_server_actions() {
  // Old way (still works)
  const result = await createGallery({ title: "Album mới" });
  toast.result(result, "Tạo album thành công");

  // Advanced: with options
  const result2 = await updateContract({ id: "123" });
  toast.result(result2, "Cập nhật hợp đồng thành công", {
    duration: 5000,
    description: "Dữ liệu đã được đồng bộ",
  });
}

// ═══════════════════════════════════════════
// 5. REACT QUERY MUTATIONS
// ═══════════════════════════════════════════

function example_react_query() {
  // In mutation callbacks
  const mutation = useMutation({
    mutationFn: createGallery,

    onSuccess: (data: any) => {
      toast.success("Tạo album thành công", {
        description: `Album "${data.title}" đã được tạo`,
      });
    },

    onError: (error: any) => {
      toast.error("Không thể tạo album", {
        description: error.message,
      });
    },
  });

  // With loading state
  const mutation2 = useMutation({
    mutationFn: async (payload: any) => {
      const loadingId = toast.startLoading("create-gallery", "Đang tạo album...");

      try {
        const result = await createGallery(payload);
        toast.finishLoading("create-gallery", "success", "Tạo album thành công");
        return result;
      } catch (error) {
        toast.finishLoading("create-gallery", "error", "Không thể tạo album");
        throw error;
      }
    },
  });
}

// ═══════════════════════════════════════════
// 6. ACTION TOASTS (Undo/Retry)
// ═══════════════════════════════════════════

function example_action_toasts() {
  // Undo action
  function deleteImage(imageId: string) {
    performDelete(imageId);

    toast.successWithUndo("Đã xóa ảnh", () => {
      restoreImage(imageId);
    });
  }

  // Retry action
  async function downloadWithRetry(imageId: string) {
    try {
      await downloadImage(imageId);
      toast.success("Đã tải ảnh");
    } catch (error) {
      toast.errorWithRetry("Không thể tải ảnh", () => {
        downloadWithRetry(imageId); // Retry recursively
      });
    }
  }
}

// ═══════════════════════════════════════════
// 7. RETRY PATTERN (Gallery Download Style)
// ═══════════════════════════════════════════

async function example_retry_pattern(imageId: string, maxRetries = 3) {
  const toastId = toast.loading("Đang tải ảnh...");

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await downloadImage(imageId);

      // Success!
      toast.success("Đã tải ảnh", { id: toastId });
      return true;
    } catch (error) {
      if (attempt < maxRetries - 1) {
        // Update loading toast with retry count
        toast.loading(`Thử lại... (${attempt + 2}/${maxRetries})`, { id: toastId });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        // Final failure
        toast.error("Không thể tải ảnh. Vui lòng thử lại sau.", { id: toastId });
        return false;
      }
    }
  }
}

// ═══════════════════════════════════════════
// 8. CRITICAL TOASTS (No Auto-Dismiss)
// ═══════════════════════════════════════════

function example_critical_toasts() {
  // Payment failure - user must acknowledge
  toast.critical("Thanh toán thất bại - Vui lòng kiểm tra lại", "error");

  // Important warning
  toast.critical("Hợp đồng sắp hết hạn trong 3 ngày", "warning");

  // Critical success (rare, but possible)
  toast.critical("Backup hoàn tất - Dữ liệu đã được sao lưu an toàn", "success");
}

// ═══════════════════════════════════════════
// 9. DEDUPLICATION (Automatic)
// ═══════════════════════════════════════════

function example_deduplication() {
  // User clicks save button rapidly 3 times
  function handleSave() {
    // Only shows ONCE (automatic deduplication by message)
    toast.success("Đã lưu thành công");
    toast.success("Đã lưu thành công"); // Ignored
    toast.success("Đá lưu thành công"); // Ignored
  }

  // Custom deduplication ID
  function handleCustomDedupe() {
    // Use custom ID for more control
    toast.success("Đã lưu", { id: "save-action" });
    toast.success("Đã lưu lại", { id: "save-action" }); // Updates existing toast

    // Different ID = new toast
    toast.success("Đã lưu file khác", { id: "save-action-2" });
  }
}

// ═══════════════════════════════════════════
// 10. ADVANCED OPTIONS
// ═══════════════════════════════════════════

function example_advanced_options() {
  // Long duration
  toast.success("Thao tác hoàn tất", { duration: 8000 });

  // With description
  toast.success("Đã tạo hợp đồng", {
    description: "Hợp đồng ABC-123 với giá trị 50.000.000đ",
  });

  // With action button
  toast.success("Đã lưu bản nháp", {
    action: {
      label: "Xem",
      onClick: () => router.push("/contract/123"),
    },
  });

  // Combine all options
  toast.error("Không thể đồng bộ Drive", {
    duration: 10000,
    description: "Vui lòng kiểm tra quyền truy cập thư mục",
    action: {
      label: "Cài đặt",
      onClick: () => router.push("/settings/integrations"),
    },
    closeButton: true,
  });
}

// ═══════════════════════════════════════════
// 11. MIGRATION FROM OLD PATTERNS
// ═══════════════════════════════════════════

// ❌ OLD: Direct sonner import
// import { toast } from "sonner";
// toast.success("Message");

// ✅ NEW: Import from toast-manager
// import { toast } from "@/lib/toast-manager";
// toast.success("Message");

// ❌ OLD: Manual deduplication
// let toastShown = false;
// if (!toastShown) {
//   toast.success("Message");
//   toastShown = true;
// }

// ✅ NEW: Automatic deduplication
// toast.success("Message"); // Just call it, handled automatically

// ❌ OLD: Manual batch handling
// if (files.length > 1) {
//   toast.success(`Đã tải ${files.length} ảnh`);
// } else {
//   toast.success(`Đã tải ${files[0]}`);
// }

// ✅ NEW: batchSuccess handles it
// toast.batchSuccess(files, "tải xuống");

// ═══════════════════════════════════════════
// HELPER FUNCTIONS (for examples)
// ═══════════════════════════════════════════

async function fetchData(): Promise<any> {
  return new Promise((resolve) => setTimeout(resolve, 1000));
}

async function uploadPhotos(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 2000));
}

async function createGallery(payload: any): Promise<any> {
  return { success: true, data: { title: payload.title } };
}

async function updateContract(payload: any): Promise<any> {
  return { success: true };
}

function performDelete(id: string): void {}
function restoreImage(id: string): void {}
async function downloadImage(id: string): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 1000));
}

const useMutation = (config: any) => config;
const router = { push: (path: string) => {} };
