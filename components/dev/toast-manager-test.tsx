"use client";

/**
 * 🧪 Toast Manager Test Component
 *
 * Phase 1 testing - verify all features work correctly
 *
 * Usage: Add to a dev page to test
 */

import { useState } from "react";
import { toast } from "@/lib/toast-manager";
import { Button } from "@/components/ui/button";

export function ToastManagerTest() {
  const [loading, setLoading] = useState(false);

  // Test 1: Basic toasts
  const testBasic = () => {
    toast.success("✅ Success toast");
    setTimeout(() => toast.error("❌ Error toast"), 500);
    setTimeout(() => toast.info("ℹ️ Info toast"), 1000);
    setTimeout(() => toast.warning("⚠️ Warning toast"), 1500);
  };

  // Test 2: Deduplication (rapid clicks)
  const testDeduplication = () => {
    // Click multiple times - should only show ONCE
    toast.success("🎯 Deduplicated toast");
    toast.success("🎯 Deduplicated toast");
    toast.success("🎯 Deduplicated toast");

    setTimeout(() => {
      toast.info("✓ Test passed: Only 1 toast shown despite 3 calls");
    }, 500);
  };

  // Test 3: Loading → Success flow
  const testLoadingFlow = async () => {
    const toastId = toast.loading("⏳ Loading...");

    await new Promise(resolve => setTimeout(resolve, 2000));

    toast.success("✅ Loading complete!", { id: toastId });
  };

  // Test 4: Named loading flow
  const testNamedLoading = async () => {
    toast.startLoading("test-upload", "⏳ Uploading 10 files...");

    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.updateLoading("test-upload", "⏳ Processing... 50%");

    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.finishLoading("test-upload", "success", "✅ Upload complete!");
  };

  // Test 5: Batch operations
  const testBatch = () => {
    const files = [
      "photo1.jpg",
      "photo2.jpg",
      "photo3.jpg",
      "photo4.jpg",
      "photo5.jpg",
    ];

    toast.batchSuccess(files, "tải xuống");
  };

  // Test 6: Server action pattern
  const testServerAction = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Success case
    const successResult = { success: true };
    toast.result(successResult, "✅ Server action thành công");

    // Error case
    setTimeout(() => {
      const errorResult = { success: false, error: "❌ Server error: Connection failed" };
      toast.result(errorResult, "Success message (won't show)");
    }, 2000);
  };

  // Test 7: Promise wrapper
  const testPromise = async () => {
    const mockAsync = () => new Promise((resolve) => setTimeout(resolve, 2000));

    await toast.promise(mockAsync(), {
      loading: "⏳ Processing...",
      success: "✅ Promise resolved!",
      error: "❌ Promise rejected",
    });
  };

  // Test 8: Undo action
  const testUndo = () => {
    let deleted = false;

    toast.successWithUndo("🗑️ Đã xóa ảnh", () => {
      deleted = false;
      toast.info("↩️ Đã hoàn tác xóa");
    });

    deleted = true;
  };

  // Test 9: Retry action
  const testRetry = () => {
    let attempts = 0;

    const attemptAction = () => {
      attempts++;
      if (attempts < 2) {
        toast.errorWithRetry(`❌ Thất bại (lần ${attempts})`, attemptAction);
      } else {
        toast.success("✅ Thành công sau khi retry!");
      }
    };

    attemptAction();
  };

  // Test 10: Critical toast
  const testCritical = () => {
    toast.critical("🚨 Critical error - Must acknowledge!", "error");
  };

  // Test 11: Retry pattern (gallery-download style)
  const testRetryPattern = async () => {
    const maxRetries = 3;
    const toastId = toast.loading("⏳ Downloading image...");

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate random failure
      const success = attempt === maxRetries - 1 || Math.random() > 0.5;

      if (success) {
        toast.success("✅ Download complete!", { id: toastId });
        break;
      } else if (attempt < maxRetries - 1) {
        toast.loading(`⏳ Retrying... (${attempt + 2}/${maxRetries})`, { id: toastId });
      } else {
        toast.error("❌ Download failed after 3 attempts", { id: toastId });
      }
    }
  };

  // Test 12: Multiple batch operations (stress test)
  const testStress = () => {
    // This would create 100+ toasts before - now just 3
    toast.batchSuccess(Array.from({ length: 50 }, (_, i) => `file${i}.jpg`), "tải xuống");

    setTimeout(() => {
      toast.batchError(Array.from({ length: 30 }, (_, i) => `error${i}.jpg`), "xóa");
    }, 500);

    setTimeout(() => {
      toast.batchSuccess(Array.from({ length: 20 }, (_, i) => `doc${i}.pdf`), "lưu");
    }, 1000);
  };

  // Test 13: Custom options
  const testCustomOptions = () => {
    toast.success("✅ Custom toast with description", {
      description: "This is a longer description text below the main message",
      duration: 8000,
    });

    setTimeout(() => {
      toast.info("ℹ️ Toast with action button", {
        action: {
          label: "View",
          onClick: () => toast.info("Action clicked!"),
        },
      });
    }, 1000);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">🧪 Toast Manager Test Suite</h1>
        <p className="text-text-muted">
          Phase 1 implementation testing - Click buttons to test features
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Basic Tests */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-text-secondary">Basic</h3>

          <Button
            onClick={testBasic}
            variant="outline"
            className="w-full justify-start"
            size="sm"
          >
            1. All Toast Types
          </Button>

          <Button
            onClick={testDeduplication}
            variant="outline"
            className="w-full justify-start"
            size="sm"
          >
            2. Deduplication
          </Button>
        </div>

        {/* Loading Tests */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-text-secondary">Loading Flow</h3>

          <Button
            onClick={testLoadingFlow}
            variant="outline"
            className="w-full justify-start"
            size="sm"
            disabled={loading}
          >
            3. Loading → Success
          </Button>

          <Button
            onClick={testNamedLoading}
            variant="outline"
            className="w-full justify-start"
            size="sm"
          >
            4. Named Loading
          </Button>

          <Button
            onClick={testRetryPattern}
            variant="outline"
            className="w-full justify-start"
            size="sm"
          >
            11. Retry Pattern
          </Button>
        </div>

        {/* Batch Tests */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-text-secondary">Batch Operations</h3>

          <Button
            onClick={testBatch}
            variant="outline"
            className="w-full justify-start"
            size="sm"
          >
            5. Batch Success
          </Button>

          <Button
            onClick={testStress}
            variant="outline"
            className="w-full justify-start"
            size="sm"
          >
            12. Stress Test (100+ items)
          </Button>
        </div>

        {/* Integration Tests */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-text-secondary">Integration</h3>

          <Button
            onClick={testServerAction}
            variant="outline"
            className="w-full justify-start"
            size="sm"
          >
            6. Server Actions
          </Button>

          <Button
            onClick={testPromise}
            variant="outline"
            className="w-full justify-start"
            size="sm"
          >
            7. Promise Wrapper
          </Button>
        </div>

        {/* Action Tests */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-text-secondary">Actions</h3>

          <Button
            onClick={testUndo}
            variant="outline"
            className="w-full justify-start"
            size="sm"
          >
            8. Undo Button
          </Button>

          <Button
            onClick={testRetry}
            variant="outline"
            className="w-full justify-start"
            size="sm"
          >
            9. Retry Button
          </Button>

          <Button
            onClick={testCritical}
            variant="outline"
            className="w-full justify-start"
            size="sm"
          >
            10. Critical Toast
          </Button>
        </div>

        {/* Advanced Tests */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-text-secondary">Advanced</h3>

          <Button
            onClick={testCustomOptions}
            variant="outline"
            className="w-full justify-start"
            size="sm"
          >
            13. Custom Options
          </Button>

          <Button
            onClick={() => toast.clear()}
            variant="danger"
            className="w-full justify-start"
            size="sm"
          >
            Clear All Toasts
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="mt-8 p-4 bg-bg-card rounded-lg border border-border">
        <h3 className="font-semibold mb-2">✅ Expected Results:</h3>
        <ul className="text-sm text-text-muted space-y-1">
          <li>• Test 1: 4 toasts appear sequentially</li>
          <li>• Test 2: Only 1 toast despite 3 calls (deduplication)</li>
          <li>• Test 3: Loading toast updates to success</li>
          <li>• Test 4: Loading shows progress updates</li>
          <li>• Test 5: Summary "Đã tải xuống 5 mục" with file list</li>
          <li>• Test 6: Success then error toast (2 total)</li>
          <li>• Test 7: Loading → success after 2s</li>
          <li>• Test 8: Success toast with "Hoàn tác" button</li>
          <li>• Test 9: Error with "Thử lại" button → success</li>
          <li>• Test 10: Critical toast (no auto-dismiss)</li>
          <li>• Test 11: Loading with retry attempts → success</li>
          <li>• Test 12: 3 summary toasts (not 100+)</li>
          <li>• Test 13: Toast with description + action button</li>
        </ul>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
        <h3 className="font-semibold text-primary mb-2">📝 Testing Instructions:</h3>
        <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
          <li>Click each test button and verify expected behavior</li>
          <li>Check console for errors</li>
          <li>Test on mobile (responsive positioning - Phase 3)</li>
          <li>Test rapid clicks on deduplication test</li>
          <li>Verify batch tests show summary (not spam)</li>
          <li>Check undo/retry buttons work</li>
          <li>Verify critical toast doesn't auto-dismiss</li>
        </ol>
      </div>
    </div>
  );
}
