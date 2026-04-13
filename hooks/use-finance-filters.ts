import { useMemo } from "react";

// Tách ra biến tĩnh để chỉ khởi tạo đúng 1 lần khi load app.
export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const m = index + 1;
  return { value: String(m), label: `Tháng ${m}` };
});

/**
 * Hook quản lý các filter dùng chung cho toàn bộ module Finance.
 * Đảm bảo mọi dropdown option được memoized (tránh re-render khi gõ/nhập liệu).
 * 
 * @param baseYear Năm làm mốc để sinh danh sách năm (ví dụ hiển thị năm trước, năm hiện tại, và 2 năm tới).
 */
export function useFinanceFilters(baseYear: number = new Date().getFullYear()) {
  const yearOptions = useMemo(() => {
    // Thường sinh ra mảng [Năm ngoái, Năm nay, Năm tới, Năm tới nữa]
    return [baseYear - 1, baseYear, baseYear + 1, baseYear + 2].map((y) => ({
      value: String(y),
      label: String(y),
    }));
  }, [baseYear]);

  return {
    monthOptions: MONTH_OPTIONS,
    yearOptions,
  };
}
