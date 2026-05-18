# Phase 02: Remove Redundant "Tạo KH mới" Standalone Button

Status: ⬜ Pending  
Dependencies: Phase 01  
Effort: ~10 dòng xóa

## Objective

Xóa nút "Tạo khách hàng mới" riêng lẻ bên cạnh search bar. Dropdown search đã có option "Tạo KH mới" ở cuối danh sách kết quả — đó là đủ.

## Vấn đề hiện tại

File: `ContractCustomerSection.tsx`

**Nơi 1 — Trong dropdown** (line 182-199):
```tsx
<Button onClick={customer.openCreateCustomer}>
  <UserPlus /> Tạo khách hàng mới
  {customer.searchQuery && <p>với tên "{customer.searchQuery}"</p>}
</Button>
```
→ ✅ GIỮ — contextual, hiện trong dropdown results, pre-fill tên từ search query

**Nơi 2 — Standalone button** (line 204-214):
```tsx
{!customer.showDropdown && (
  <Button onClick={customer.openCreateCustomer}>
    <UserPlus /> Tạo khách hàng mới
  </Button>
)}
```
→ ❌ XÓA — redundant, luôn visible bên cạnh search bar khi dropdown đóng

## Implementation

### Xóa block standalone button

File: `components/contracts/form/ContractCustomerSection.tsx`  
Lines: 204-214

```diff
          </div>
- 
-           {!customer.showDropdown && (
-             <Button
-               unstyled
-               type="button"
-               onClick={customer.openCreateCustomer}
-               className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-interactive hover:underline"
-             >
-               <UserPlus className="h-4 w-4" />
-               <span className="max-lg:hidden">Tạo khách hàng mới</span>
-             </Button>
-           )}
        </div>
```

### Flow sau khi fix

1. User mở form → thấy `🔍 [Tìm kiếm khách hàng...]` — CHỈ search bar, không có nút riêng
2. User gõ tên → dropdown mở → cuối danh sách luôn có "Tạo KH mới với tên X"
3. User không gõ gì → focus search → dropdown mở → vẫn có option "Tạo KH mới"
4. Entry point duy nhất: qua dropdown

### Cần xác nhận

- Dropdown có hiện "Tạo KH mới" khi search query rỗng không? Check `customer.showDropdown` trigger logic trong `useContractCustomer.ts`
- Nếu dropdown chỉ hiện khi có query → user không có cách tạo KH mới khi search rỗng → cần adjust trigger

## Test Criteria

- [ ] Nút "Tạo khách hàng mới" standalone KHÔNG CÒN bên cạnh search bar
- [ ] Focus search bar → dropdown mở → option "Tạo KH mới" có ở cuối
- [ ] Gõ tên → dropdown shows results + "Tạo KH mới với tên X"
- [ ] Click "Tạo KH mới" trong dropdown → modal mở đúng
- [ ] Mobile: tương tự, không bị mất affordance

---
Next Phase: phase-03-merge-notes.md
