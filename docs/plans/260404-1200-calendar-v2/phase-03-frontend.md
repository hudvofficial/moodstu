# Phase 03: SWR Core Structure

Status: ⬜ Pending

## Objective

Xây dựng lớp kết nối dữ liệu Frontend với chiến lược Pure Client Fetch + Loading Skeleton (không xài SSR prefetch gây cồng kềnh caching).

## Requirements

### Functional

- [ ] Khởi tạo route `app/(protected)/calendar/page.tsx` TRỐNG. Chỉ return `<CalendarWrapper />`.
- [ ] Cấu trúc fetch **Pure Client Fetching** VÀ Loading Skeleton. (KHÔNG SSR prefetch để tránh overload overhead authenticate action, dựa hoàn toàn vào SWR trên Client component `CalendarWrapper`).
- [ ] Cấu hình Cache Key: BẮT BUỘC sử dụng String Key sẵn có từ repo SSOT. Lấy `cacheKeys.calendar(month, year)` từ thư viện `lib/swr.ts`. Khi có Filter con (status, employee), nhúng chúng vào state nội sinh của SWR hoặc key phụ nếu muốn, nhưng Core Cache Key phải dựa vào hàm lib.
- [ ] Render Skeleton `<CalendarSkeleton />` chớp nháy màu gradient khi SWR đang `isLoading`.

## Implementation Steps

1. [ ] Wrap root bằng SWR Provider `useSWR(cacheKey, fetcher)`.
2. [ ] Toolbar: Nối Filter (SelectPill Nhân Sự + Status) vào State SWR.

## Files to Create/Modify

- `app/(protected)/calendar/page.tsx`
- `components/calendar/calendar-wrapper.tsx`
- `hooks/use-calendar-data.ts`
