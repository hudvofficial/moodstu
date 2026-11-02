// Public-facing feedback for Google OAuth redirects. Never echo arbitrary query values.
export type GoogleOAuthFeedback = {
  tone: "success" | "error" | "warning";
  message: string;
  detail: string;
};

const OAUTH_ERROR_FEEDBACK: Record<string, Omit<GoogleOAuthFeedback, "tone">> = {
  invalid_state: {
    message: "Phiên kết nối Google không còn hợp lệ.",
    detail: "Phiên xác thực có thể đã hết hạn hoặc mở ở tab khác. Hãy chọn Kết nối để thử lại.",
  },
  access_denied: {
    message: "Google chưa được cấp quyền.",
    detail: "Chọn đúng tài khoản studio và cho phép quyền Calendar cùng Drive để hoàn tất.",
  },
  no_code: {
    message: "Google không trả về mã xác thực.",
    detail: "Hãy thực hiện lại thao tác Kết nối từ trang Cài đặt studio.",
  },
  invalid_grant: {
    message: "Mã xác thực Google đã hết hạn.",
    detail: "Hãy thực hiện lại thao tác Kết nối và hoàn tất xác thực trong cùng phiên trình duyệt.",
  },
  missing_refresh_token: {
    message: "Google chưa cấp quyền duy trì kết nối.",
    detail: "Vui lòng kết nối lại và chấp thuận quyền truy cập ngoại tuyến để lịch tiếp tục đồng bộ.",
  },
  missing_access_token: {
    message: "Google không cung cấp mã truy cập.",
    detail: "Hãy thử kết nối lại; nếu lỗi tiếp diễn, kiểm tra cấu hình OAuth của studio.",
  },
  forbidden: {
    message: "Tài khoản không có quyền quản lý kết nối Google.",
    detail: "Hãy đăng nhập bằng tài khoản quản trị Mood Studio.",
  },
  internal_error: {
    message: "Không thể hoàn tất kết nối Google.",
    detail: "Vui lòng thử lại hoặc kiểm tra nhật ký server nếu lỗi tiếp diễn.",
  },
  redirect_uri_mismatch: {
    message: "Đường dẫn xác thực Google chưa được cấu hình đúng.",
    detail: "Hãy kiểm tra Authorized redirect URIs trong Google Cloud Console.",
  },
};

export function getGoogleOAuthFeedback(
  errorCode: string | null,
  successCode: string | null,
  isConnected: boolean,
): GoogleOAuthFeedback | null {
  if (errorCode !== null) {
    const known = Object.hasOwn(OAUTH_ERROR_FEEDBACK, errorCode)
      ? OAUTH_ERROR_FEEDBACK[errorCode]
      : undefined;
    return {
      tone: "error",
      ...(known || {
        message: "Kết nối Google không thành công.",
        detail: "Hãy thử kết nối lại. Nếu lỗi lặp lại, kiểm tra nhật ký server.",
      }),
    };
  }

  if (successCode === "success") {
    return isConnected
      ? {
          tone: "success",
          message: "Google Workspace đã kết nối.",
          detail: "Bạn có thể xem sự kiện Google Calendar trong lịch studio.",
        }
      : {
          tone: "warning",
          message: "Google đã chuyển về Mood Studio nhưng kết nối chưa được xác nhận.",
          detail: "Tải lại trang để kiểm tra; không đồng bộ cho tới khi trạng thái hiển thị Đã kết nối.",
        };
  }

  return null;
}
