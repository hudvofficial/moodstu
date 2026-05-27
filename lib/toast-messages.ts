/**
 * 🎯 Toast Messages (Phase 2: Content)
 *
 * Centralized toast message constants
 *
 * Benefits:
 * - Easy to translate (i18n-ready)
 * - Consistent wording
 * - Type-safe with TypeScript
 * - Find/replace friendly
 * - No typos/duplicates
 *
 * @example
 * import { TOAST_MESSAGES } from "@/lib/toast-messages";
 * toast.success(TOAST_MESSAGES.SAVE_SUCCESS);
 * toast.error(TOAST_MESSAGES.GALLERY.DOWNLOAD_ERROR);
 */

// ═══════════════════════════════════════════
// GENERIC MESSAGES (Common across app)
// ═══════════════════════════════════════════

export const TOAST_MESSAGES = {
  // Save operations
  SAVE_SUCCESS: "Đã lưu thành công",
  SAVE_ERROR: "Không thể lưu",

  // Create operations
  CREATE_SUCCESS: "Đã tạo thành công",
  CREATE_ERROR: "Không thể tạo",

  // Update operations
  UPDATE_SUCCESS: "Đã cập nhật",
  UPDATE_ERROR: "Không thể cập nhật",

  // Delete operations
  DELETE_SUCCESS: "Đã xóa",
  DELETE_ERROR: "Không thể xóa",

  // Generic
  LOADING: "Đang xử lý...",
  SUCCESS: "Thao tác thành công",
  ERROR: "Có lỗi xảy ra",

  // Network
  NETWORK_ERROR: "Lỗi kết nối mạng",
  TIMEOUT_ERROR: "Yêu cầu quá thời gian chờ",

  // Permissions
  PERMISSION_DENIED: "Bạn không có quyền thực hiện thao tác này",

  // ═══════════════════════════════════════════
  // AUTHENTICATION & AUTHORIZATION
  // ═══════════════════════════════════════════

  AUTH: {
    // Login
    LOGIN_SUCCESS: "Đăng nhập thành công",
    LOGIN_ERROR: "Đăng nhập thất bại",
    LOGIN_INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng",

    // Logout
    LOGOUT_SUCCESS: "Đã đăng xuất",

    // Password
    PASSWORD_RESET_SUCCESS: "Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.",
    PASSWORD_RESET_ERROR: "Không thể đặt lại mật khẩu",
    PASSWORD_RESET_SENT: "Đã gửi email đặt lại mật khẩu",

    // Auth errors
    AUTH_LINK_INVALID: "Liên kết xác thực không hợp lệ hoặc đã hết hạn",
    SESSION_EXPIRED: "Phiên đăng nhập đã hết hạn",
  },

  // ═══════════════════════════════════════════
  // GALLERY & IMAGES
  // ═══════════════════════════════════════════

  GALLERY: {
    // Create
    CREATE_SUCCESS: "Tạo album thành công",
    CREATE_ERROR: "Không thể tạo album",

    // Update
    UPDATE_SUCCESS: "Cập nhật album thành công",
    UPDATE_ERROR: "Không thể cập nhật album",

    // Delete
    DELETE_SUCCESS: "Đã xóa album",
    DELETE_ERROR: "Không thể xóa album",

    // Share
    SHARE_SUCCESS: "Đã tạo link chia sẻ",
    SHARE_ERROR: "Không thể tạo link chia sẻ",
    COPY_LINK_SUCCESS: "Đã sao chép link",

    // Sync
    SYNC_START: "Đang đồng bộ với Drive...",
    SYNC_SUCCESS: (count: number) => `Đã đồng bộ ${count} ảnh`,
    SYNC_ERROR: "Không thể đồng bộ với Drive",
    SYNC_DRIVE_ERROR: "Vui lòng kiểm tra quyền truy cập thư mục Drive",

    // Download
    DOWNLOAD_START: "Đang tải ảnh...",
    DOWNLOAD_SUCCESS: (fileName?: string) =>
      fileName ? `Đã tải ${fileName}` : "Đã tải ảnh",
    DOWNLOAD_ERROR: (fileName?: string) =>
      fileName ? `Không thể tải ${fileName}` : "Không thể tải ảnh. Vui lòng thử lại sau.",
    DOWNLOAD_BATCH_START: (count: number) => `Đang tải ${count} ảnh...`,
    DOWNLOAD_BATCH_SUCCESS: (count: number) =>
      `Đã tải ${count} ảnh. Kiểm tra thư mục Downloads.`,
    DOWNLOAD_RETRY: (attempt: number, max: number) =>
      `Thử lại... (${attempt}/${max})`,

    // Selection
    SELECT_LIMIT_EXCEEDED: (limit: number) =>
      `Chỉ được chọn tối đa ${limit} ảnh`,
    SELECTION_SAVED: "Đã lưu lựa chọn",

    // Password
    PASSWORD_SET_SUCCESS: "Đã đặt mật khẩu cho album",
    PASSWORD_INVALID: "Mật khẩu không đúng",
  },

  // ═══════════════════════════════════════════
  // CONTRACTS & EVENTS
  // ═══════════════════════════════════════════

  CONTRACT: {
    // Create
    CREATE_SUCCESS: "Đã tạo hợp đồng",
    CREATE_ERROR: "Không thể tạo hợp đồng",

    // Update
    UPDATE_SUCCESS: "Đã cập nhật hợp đồng",
    UPDATE_ERROR: "Không thể cập nhật hợp đồng",

    // Delete
    DELETE_SUCCESS: "Đã xóa hợp đồng",
    DELETE_ERROR: "Không thể xóa hợp đồng",

    // Status
    STATUS_UPDATED: "Đã cập nhật trạng thái",

    // Events
    EVENT_CREATE_SUCCESS: "Đã thêm sự kiện",
    EVENT_UPDATE_SUCCESS: "Đã cập nhật sự kiện",
    EVENT_DELETE_SUCCESS: "Đã xóa sự kiện",

    // Tasks
    TASK_COMPLETE_SUCCESS: "Đã hoàn thành task",
    TASK_INCOMPLETE_SUCCESS: "Đã đánh dấu chưa hoàn thành",

    // Notes
    NOTE_ADD_SUCCESS: "Đã thêm ghi chú",
    NOTE_UPDATE_SUCCESS: "Đã cập nhật ghi chú",
    NOTE_DELETE_SUCCESS: "Đã xóa ghi chú",

    // Checklist
    CHECKLIST_UPDATE_SUCCESS: "Đã cập nhật checklist",
  },

  // ═══════════════════════════════════════════
  // CALENDAR & SCHEDULING
  // ═══════════════════════════════════════════

  CALENDAR: {
    EVENT_CREATE_SUCCESS: "Đã thêm sự kiện vào lịch",
    EVENT_UPDATE_SUCCESS: "Đã cập nhật sự kiện",
    EVENT_DELETE_SUCCESS: "Đã xóa sự kiện",
    EVENT_MOVE_SUCCESS: "Đã di chuyển sự kiện",

    SYNC_GOOGLE_SUCCESS: "Đã đồng bộ với Google Calendar",
    SYNC_GOOGLE_ERROR: "Không thể đồng bộ với Google Calendar",
  },

  // ═══════════════════════════════════════════
  // CUSTOMERS & CRM
  // ═══════════════════════════════════════════

  CUSTOMER: {
    CREATE_SUCCESS: "Đã thêm khách hàng",
    CREATE_ERROR: "Không thể thêm khách hàng",

    UPDATE_SUCCESS: "Đã cập nhật thông tin khách hàng",
    UPDATE_ERROR: "Không thể cập nhật khách hàng",

    DELETE_SUCCESS: "Đã xóa khách hàng",
    DELETE_ERROR: "Không thể xóa khách hàng",

    CONVERT_TO_CONTRACT_SUCCESS: "Đã chuyển thành hợp đồng",

    LEAD_CREATE_SUCCESS: "Đã thêm lead mới",
    LEAD_STATUS_UPDATED: "Đã cập nhật trạng thái lead",
  },

  // ═══════════════════════════════════════════
  // FINANCE & PAYMENTS
  // ═══════════════════════════════════════════

  FINANCE: {
    // Receipts
    RECEIPT_CREATE_SUCCESS: "Đã ghi nhận phiếu thu",
    RECEIPT_UPDATE_SUCCESS: "Đã cập nhật phiếu thu",
    RECEIPT_DELETE_SUCCESS: "Đã xóa phiếu thu",

    // Expenses
    EXPENSE_CREATE_SUCCESS: "Đã ghi nhận chi phí",
    EXPENSE_UPDATE_SUCCESS: "Đã cập nhật chi phí",
    EXPENSE_DELETE_SUCCESS: "Đã xóa chi phí",

    // Debts
    DEBT_CREATE_SUCCESS: "Đã ghi nhận công nợ",
    DEBT_PAYMENT_SUCCESS: "Đã ghi nhận thanh toán",
    DEBT_DELETE_SUCCESS: "Đã xóa công nợ",

    // Salaries
    SALARY_CALCULATE_SUCCESS: "Đã tính lương",
    SALARY_PAY_SUCCESS: "Đã ghi nhận trả lương",
    SALARY_UPDATE_SUCCESS: "Đã cập nhật lương",

    // Budget & Goals
    GOAL_CREATE_SUCCESS: "Đã tạo mục tiêu",
    GOAL_CONTRIBUTE_SUCCESS: "Đã ghi nhận đóng góp",
    BUDGET_UPDATE_SUCCESS: "Đã cập nhật ngân sách",

    // Close books
    CLOSE_CREATE_SUCCESS: "Đã khóa sổ",
    CLOSE_ERROR: "Không thể khóa sổ",

    // QR Payment
    QR_GENERATED: "Đã tạo mã QR thanh toán",
  },

  // ═══════════════════════════════════════════
  // INVENTORY & STOCK
  // ═══════════════════════════════════════════

  INVENTORY: {
    // Items
    ITEM_CREATE_SUCCESS: "Đã thêm vật tư",
    ITEM_UPDATE_SUCCESS: "Đã cập nhật vật tư",
    ITEM_DELETE_SUCCESS: "Đã xóa vật tư",

    // Stock
    STOCK_IN_SUCCESS: "Đã ghi nhận nhập kho",
    STOCK_OUT_SUCCESS: "Đã ghi nhận xuất kho",
    STOCK_LOW_WARNING: (item: string) => `Cảnh báo: ${item} sắp hết`,

    // Orders
    ORDER_CREATE_SUCCESS: "Đã tạo đơn đặt hàng",
    ORDER_RECEIVE_SUCCESS: "Đã ghi nhận nhận hàng",
  },

  // ═══════════════════════════════════════════
  // PRINTING & LAB ORDERS
  // ═══════════════════════════════════════════

  PRINTING: {
    ORDER_CREATE_SUCCESS: "Đã tạo đơn in",
    ORDER_UPDATE_SUCCESS: "Đã cập nhật đơn in",
    ORDER_CANCEL_SUCCESS: "Đã hủy đơn in",

    PAYMENT_DEPOSIT_SUCCESS: "Đã ghi nhận cọc",
    PAYMENT_FINAL_SUCCESS: "Đã ghi nhận thanh toán cuối",

    STATUS_UPDATED: "Đã cập nhật trạng thái đơn in",
  },

  // ═══════════════════════════════════════════
  // SERVICES & PACKAGES
  // ═══════════════════════════════════════════

  SERVICE: {
    CREATE_SUCCESS: "Đã tạo dịch vụ",
    UPDATE_SUCCESS: "Đã cập nhật dịch vụ",
    DELETE_SUCCESS: "Đã xóa dịch vụ",

    CATEGORY_CREATE_SUCCESS: "Đã tạo danh mục",
    CATEGORY_UPDATE_SUCCESS: "Đã cập nhật danh mục",
    CATEGORY_DELETE_SUCCESS: "Đã xóa danh mục",
  },

  // ═══════════════════════════════════════════
  // EMPLOYEES & TEAM
  // ═══════════════════════════════════════════

  EMPLOYEE: {
    CREATE_SUCCESS: "Đã thêm nhân viên",
    UPDATE_SUCCESS: "Đã cập nhật thông tin nhân viên",
    DELETE_SUCCESS: "Đã xóa nhân viên",

    LINK_SUCCESS: "Đã liên kết tài khoản",
    UNLINK_SUCCESS: "Đã hủy liên kết tài khoản",

    ROLE_UPDATE_SUCCESS: "Đã cập nhật vai trò",
  },

  // ═══════════════════════════════════════════
  // SETTINGS & CONFIGURATION
  // ═══════════════════════════════════════════

  SETTINGS: {
    UPDATE_SUCCESS: "Đã lưu cài đặt",
    UPDATE_ERROR: "Không thể lưu cài đặt",

    STUDIO_INFO_UPDATE_SUCCESS: "Đã cập nhật thông tin studio",
    PROFILE_UPDATE_SUCCESS: "Đã cập nhật thông tin cá nhân",

    LOGO_UPLOAD_SUCCESS: "Đã cập nhật logo",
    LOGO_UPLOAD_ERROR: "Không thể tải logo",

    INTEGRATION_CONNECT_SUCCESS: "Đã kết nối",
    INTEGRATION_DISCONNECT_SUCCESS: "Đã ngắt kết nối",

    CARD_ADD_SUCCESS: "Đã thêm thẻ thanh toán",
    CARD_REMOVE_SUCCESS: "Đã xóa thẻ thanh toán",
  },

  // ═══════════════════════════════════════════
  // FILE UPLOADS & MEDIA
  // ═══════════════════════════════════════════

  UPLOAD: {
    START: "Đang tải lên...",
    SUCCESS: "Tải lên thành công",
    ERROR: "Không thể tải lên",

    FILE_TOO_LARGE: (maxSize: string) =>
      `File quá lớn. Kích thước tối đa: ${maxSize}`,
    FILE_TYPE_INVALID: "Định dạng file không được hỗ trợ",

    BATCH_SUCCESS: (count: number) => `Đã tải lên ${count} file`,
  },

  // ═══════════════════════════════════════════
  // REPORTS & ANALYTICS
  // ═══════════════════════════════════════════

  REPORTS: {
    GENERATE_START: "Đang tạo báo cáo...",
    GENERATE_SUCCESS: "Báo cáo đã sẵn sàng",
    GENERATE_ERROR: "Không thể tạo báo cáo",

    EXPORT_START: "Đang xuất dữ liệu...",
    EXPORT_SUCCESS: "Đã xuất dữ liệu",
    EXPORT_ERROR: "Không thể xuất dữ liệu",
  },
} as const;

// ═══════════════════════════════════════════
// TYPE HELPERS (for TypeScript autocomplete)
// ═══════════════════════════════════════════

export type ToastMessage = typeof TOAST_MESSAGES;
export type ToastMessageKey = keyof typeof TOAST_MESSAGES;
