# /plan — Compact Drawer Event Timeline

## Mục tiêu

Tối ưu `drawer-event-timeline.tsx` (134 dòng) trên desktop drawer. Hiện tại 8 sự kiện hiển thị stepper dọc quá dài (~500px). Cần giảm ~45% chiều cao.

## Giải pháp đã brainstorm & chọn

**Compact stepper + collapse completed events:**
- Event "Xong" → condensed 1 dòng: `✅ 📋 Chuẩn Bị · Studio Mood    Xong`
- Event "Chờ"/"Đang làm" → giữ đầy đủ 2 dòng (title + date/location)
- Giảm spacing `pb-4` → `pb-2`
- Giữ nguyên stepper line + icons

## File cần sửa

### `components/contracts/drawer-event-timeline.tsx`

**Thay đổi 1: Spacing (L96)**
```tsx
// TRƯỚC:
<div className={`flex-1 ${isLast ? "" : "pb-4"}`}>

// SAU:
<div className={`flex-1 ${isLast ? "" : "pb-2"}`}>
```

**Thay đổi 2: Collapse completed events (L96-125)**

Nếu `event.status === "hoan_thanh"` → render dạng compact:
```tsx
{event.status === "hoan_thanh" ? (
  // Compact: 1 dòng — title · location    Xong
  <div className={`flex-1 ${isLast ? "" : "pb-2"}`}>
    <div className="flex items-center gap-1.5">
      <span className="text-sm leading-none">{config.icon}</span>
      <span className="text-body-sm font-medium text-text-main truncate">
        {config.label}
      </span>
      {event.location && (
        <span className="text-tiny text-text-muted truncate">· {event.location}</span>
      )}
      <span className="text-tiny text-success ml-auto shrink-0">Xong</span>
    </div>
  </div>
) : (
  // Full: title + date + location (giữ nguyên code hiện tại L96-125)
)}
```

## Verify

1. Mở browser desktop → `/contracts` → click vào 1 hợp đồng có events
2. Tab "Sự kiện" trong drawer
3. Event "Xong" chỉ hiện 1 dòng
4. Event "Chờ"/"Đang làm" hiện đầy đủ date + location
5. Stepper line vẫn nối liền các events
6. Build pass

## Constraint

- ✅ Chỉ sửa `drawer-event-timeline.tsx`
- ✅ Giữ nguyên stepper line pattern
- ✅ Giữ nguyên tất cả thông tin (condensed, không xóa)
- ❌ KHÔNG đổi logic sort, status, hay data
