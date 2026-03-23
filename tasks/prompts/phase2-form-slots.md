/code Phase 2: ContractForm dùng HeaderSlotsContext

## Bối cảnh

Phase 1 đã xong: app-shell.tsx tách FORM_PAGE_PATTERNS → Header HIỆN cho /contracts/create. Giờ cần cho ContractForm gửi slots (← Back, title, badge) lên system header.

## File sửa: components/contracts/form/index.tsx

### Pattern mẫu: contract-detail-client.tsx L91-112

```tsx
const setHeaderSlots = useSetHeaderSlots();
useEffect(() => {
  setHeaderSlots({
    leftSlot: (
      <Link href="/contracts" className="lg:hidden btn-icon shrink-0">
        <ArrowLeft size={20} />
      </Link>
    ),
    titleOverride: contract.contract_code,
    hideSearch: true,
    rightSlot: (<ContractActionsMenu ... />),
  });
  return () => setHeaderSlots({});
}, [deps]);
```

### Thay đổi cần làm:

1. Thêm imports:
   ```tsx
   import { useSetHeaderSlots } from "@/contexts/header-slots-context";
   import Link from "next/link";
   import { ArrowLeft } from "lucide-react";
   ```

2. Trong component body, thêm useEffect:
   ```tsx
   const setHeaderSlots = useSetHeaderSlots();
   useEffect(() => {
     setHeaderSlots({
       leftSlot: (
         <Link href="/contracts" className="lg:hidden btn-icon shrink-0">
           <ArrowLeft size={20} />
         </Link>
       ),
       titleOverride: isEditMode ? "Sửa hợp đồng" : "Tạo hợp đồng mới",
       hideSearch: true,
       rightSlot: contractCode ? (
         <div className="flex items-center gap-2 rounded-md bg-interactive/10 text-interactive px-3 py-1.5 shrink-0">
           <span className="text-caption font-bold">{contractCode}</span>
         </div>
       ) : undefined,
     });
     return () => setHeaderSlots({});
   }, [setHeaderSlots, isEditMode, contractCode]);
   ```

3. Xóa breadcrumb + headerRight props truyền vào FullpageFormShell (Phase 3 sẽ xóa props khỏi component)

## Gate

1. Đọc tasks/pre-code-checklist.md + tasks/lessons.md + tasks/gates/before-edit.md
2. Đọc contract-detail-client.tsx L91-112 để xác nhận pattern
3. Mở browser /contracts/create trước khi sửa

## Verify Phase 2

1. npm run build — pass
2. Mobile 375px /contracts/create:
   - Header: ← Back + "Tạo hợp đồng mới" + HĐ badge
   - Header sticky, ẩn/hiện khi scroll
   - BottomNav ẨN, FormActions footer hiện
3. Desktop 1440px: header hiện đúng

## CHỈ SỬA 1 FILE: form/index.tsx. KHÔNG đụng file khác.
