/code Phase 3: FullpageFormShell xóa header riêng

## Bối cảnh

Phase 1-2 đã xong: system header hiện + ContractForm gửi slots lên. Giờ xóa header riêng trong FullpageFormShell — nó không cần nữa.

## File sửa: components/layout/fullpage-form-shell.tsx

### Thay đổi:

1. Xóa props: breadcrumb, headerRight khỏi interface
2. Xóa toàn bộ <header> block — component không render header nữa
3. Xóa imports không dùng: useScrollDirection, useScrollContainer, cn (nếu body không cần)
4. GIỮ: body layout 2 cột (detail-grid + detail-main + detail-sidebar)
5. GIỮ: rightPanel prop cho desktop panel
6. GIỮ: FormActions — footer riêng vẫn hoạt động

### Kết quả component đơn giản hóa:

```tsx
interface FullpageFormShellProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  className?: string;
}

export function FullpageFormShell({ children, rightPanel, className }: FullpageFormShellProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex-1">
        <div className="lg:px-2 lg:py-0">
          {rightPanel ? (
            <div className="detail-grid">
              <div className="detail-main space-y-6 min-w-0">{children}</div>
              <div className="detail-sidebar hidden lg:flex">
                <div className="sticky top-[72px] space-y-4 w-full">{rightPanel}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">{children}</div>
          )}
        </div>
      </div>
    </div>
  );
}
```

## Gate

1. Đọc tasks/pre-code-checklist.md + tasks/lessons.md + tasks/gates/before-edit.md
2. Mở browser /contracts/create trước khi sửa

## Verify Phase 3

1. npm run build — pass
2. Mobile 375px /contracts/create:
   - KHÔNG còn header kép (header riêng đã xóa)
   - System header hiện đúng (← + title + badge)
   - FormActions footer vẫn hiện
3. Desktop 1440px: layout 2 cột hoạt động

## CHỈ SỬA 1 FILE: fullpage-form-shell.tsx. KHÔNG đụng file khác.
