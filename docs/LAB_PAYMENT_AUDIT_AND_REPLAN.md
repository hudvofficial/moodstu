# 🔴 LAB PAYMENT - AUDIT & RE-PLAN (CRITICAL ISSUES)

**Date**: 2026-05-23  
**Status**: ❌ Implementation ẩu - cần rework  
**Issues found by**: User review

---

## 🔍 AUDIT KẾT QUẢ

### ❌ ISSUE 1: NGHIỆP VỤ THIẾU - KHÔNG THỂ TRACK ĐƠN LẺ

#### Current Implementation (SAI):
```
Admin chỉ có thể:
1. Xem tổng công nợ theo lab
2. Thanh toán 1 số tiền bất kỳ
3. System tự FIFO allocate cho các đơn
```

#### Vấn đề:
- ❌ **Admin không thấy danh sách đơn** cần thanh toán
- ❌ **Không chủ động chọn** đơn nào thanh toán
- ❌ **Không track được** đơn nào đã trả, đơn nào chưa
- ❌ **FIFO tự động** nhưng admin không control được
- ❌ **Không có preview** allocation TRƯỚC KHI submit

#### What's missing:
1. **Danh sách đơn chưa thanh toán** - checkbox để chọn
2. **Tính năng chọn đơn** - manual select thay vì chỉ FIFO
3. **Preview rõ ràng** - hiện danh sách đơn SẼ được thanh toán
4. **Partial payment UI** - thanh toán từng phần cho đơn
5. **Quick actions** - "Thanh toán đơn này" từ order detail

---

### ❌ ISSUE 2: UI KHÔNG SSOT - INLINE HARDCODE

#### File: `lab-payment-modal.tsx`

**Violations found:**

```typescript
// ❌ Hardcode colors
<div className="p-3 bg-bg-hover rounded-lg">

// ❌ Inline spacing values
<div className="space-y-4">
<div className="flex items-center gap-2">

// ❌ Custom text styles không dùng tokens
<span className="text-sm font-medium text-text-muted">

// ❌ Border radius hardcode
<div className="border border-border rounded-lg p-3">

// ❌ Icon sizes không consistent
<AlertCircle className="w-4 h-4" />
<ChevronUp className="w-4 h-4" />

// ❌ Padding values inline
className="flex items-center gap-2 px-1 py-1"
```

#### SSOT Tokens NÊN DÙNG:

```css
/* Layout */
.card-base           /* instead of: p-3 bg-bg-hover rounded-lg */
.section-heading     /* instead of: text-sm font-medium */
.form-grid-2col      /* instead of: space-y-4 */

/* Input */
.input-base          /* for form inputs */
.label-base          /* for form labels */

/* Actions */
.form-actions        /* for modal footer buttons */
.btn .btn-primary    /* for buttons */

/* Spacing */
/* Use utilities.css tokens instead of inline values */
```

---

## 📊 COMPARISON: HIỆN TẠI vs ĐÚNG

### Current (SAI):

**Modal workflow:**
```
1. Mở modal
2. Nhập số tiền
3. Chọn phương thức
4. Submit
5. ??? (Không biết đơn nào được thanh toán)
```

**Admin experience:**
- 😕 Không thấy đơn nào cần trả
- 😕 Không control được allocation
- 😕 Chỉ trust vào FIFO tự động
- 😕 Không preview trước khi submit

### Should be (ĐÚNG):

**Modal workflow:**
```
1. Mở modal → XEM DANH SÁCH ĐƠN chưa thanh toán
2. CHỌN đơn nào muốn thanh toán (checkbox)
3. Nhập số tiền (hoặc auto-calculate từ selected)
4. PREVIEW allocation rõ ràng
5. Confirm → Submit
```

**Admin experience:**
- ✅ Thấy rõ tất cả đơn chưa trả
- ✅ Chủ động chọn đơn nào thanh toán
- ✅ Preview allocation trước khi submit
- ✅ Track từng đơn đã thanh toán

---

## 🎯 RE-PLAN: 3 PHASES

### PHASE 1: FIX NGHIỆP VỤ (CRITICAL)

#### 1.1. Danh sách đơn chưa thanh toán

**Add to modal:**
```typescript
<div className="card-base">
  <h3 className="section-heading">Đơn chưa thanh toán ({unpaidOrders.length})</h3>
  
  <div className="max-h-64 overflow-y-auto space-y-2">
    {unpaidOrders.map(order => (
      <label className="flex items-center gap-3 p-3 hover:bg-surface rounded-lg cursor-pointer">
        <input 
          type="checkbox"
          checked={selectedOrders.includes(order.id)}
          onChange={() => toggleOrder(order.id)}
        />
        <div className="flex-1">
          <div className="font-medium">{order.orderCode}</div>
          <div className="text-sm text-text-muted">
            {order.contractCode} · {order.customerName}
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold">{formatCurrency(order.remainingAmount)}</div>
          {order.allocatedAmount > 0 && (
            <div className="text-xs text-text-muted">
              Đã trả: {formatCurrency(order.allocatedAmount)}
            </div>
          )}
        </div>
      </label>
    ))}
  </div>
  
  <div className="flex items-center justify-between pt-2 border-t">
    <span className="text-sm">Đã chọn: {selectedOrders.length} đơn</span>
    <span className="font-semibold">
      Tổng: {formatCurrency(selectedTotal)}
    </span>
  </div>
</div>
```

#### 1.2. Selection modes

```typescript
type SelectionMode = "manual" | "fifo";

// Manual: Admin chọn đơn nào thanh toán
// FIFO: Auto-select oldest orders (current behavior)

<TabsFilter
  tabs={[
    { value: "manual", label: "Chọn đơn" },
    { value: "fifo", label: "Tự động (FIFO)" },
  ]}
  activeTab={selectionMode}
  onChange={setSelectionMode}
/>
```

#### 1.3. Quick actions từ order detail

**Add button in printing order drawer:**
```typescript
// printing-detail-drawer.tsx (NEW FILE)
<Button 
  variant="outline" 
  onClick={handlePayLabForThisOrder}
  className="gap-2"
>
  <WalletCards className="w-4 h-4" />
  Thanh toán lab cho đơn này
</Button>

// Opens LabPaymentModal with this order pre-selected
```

---

### PHASE 2: FIX UI - SSOT COMPLIANCE

#### 2.1. Convert inline styles → SSOT tokens

**File**: `lab-payment-modal.tsx`

**Changes:**

```diff
- <div className="p-3 bg-bg-hover rounded-lg space-y-1">
+ <div className="card-base">

- <span className="text-sm font-medium text-text-muted">
+ <span className="label-base">

- <div className="space-y-4">
+ <div className="form-grid-2col">

- <div className="flex items-center justify-end gap-2 pt-2">
+ <div className="form-actions">
```

#### 2.2. Extract hardcoded values

```typescript
// Before (BAD):
<div className="flex items-center gap-2 px-1 py-1">

// After (GOOD):
<div className="filter-row">  // From utilities.css
```

#### 2.3. Consistent icon sizing

```typescript
// Create icon size standard
const ICON_SIZES = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

// Use everywhere
<AlertCircle className={ICON_SIZES.sm} />
```

---

### PHASE 3: ENHANCE UX

#### 3.1. Payment history improvements

**Current**: Basic list  
**Need**: 
- Filter by date range
- Export to Excel
- Link to related orders
- Show who paid (created_by)

#### 3.2. Debt tracking dashboard

**New page**: `/finance/lab-debts/detail/:labId`

**Features:**
- Timeline of payments
- Unpaid orders list với actions
- Payment trends chart
- Quick pay từng đơn

#### 3.3. Notifications

**After payment:**
- Toast success với details
- Option to print receipt
- Email notification (future)

---

## 📋 IMPLEMENTATION ORDER

### Week 1: Phase 1 (Nghiệp vụ - CRITICAL)
**Priority: P0**

1. ✅ Add unpaid orders list to modal
2. ✅ Add checkbox selection
3. ✅ Add manual/FIFO mode toggle
4. ✅ Update allocation logic để support manual selection
5. ✅ Add "Thanh toán đơn này" button in order detail

**Files to update:**
- `lab-payment-modal.tsx` - Add order list UI
- `lab-queries.ts` - Verify query OK
- `printing-detail-drawer.tsx` - Add quick pay button

### Week 2: Phase 2 (SSOT - HIGH)
**Priority: P1**

1. ✅ Audit all inline styles
2. ✅ Replace với SSOT tokens
3. ✅ Extract hardcoded values
4. ✅ Consistent sizing
5. ✅ Update lab-payment-history-section.tsx
6. ✅ Update lab-detail-drawer.tsx

**Files to update:**
- `lab-payment-modal.tsx` - SSOT refactor
- `lab-payment-history-section.tsx` - SSOT refactor
- `lab-detail-drawer.tsx` - SSOT refactor

### Week 3: Phase 3 (Enhancement - MEDIUM)
**Priority: P2**

1. Payment history filters
2. Export functionality
3. Notifications
4. Receipt printing

---

## 🧪 TESTING PLAN

### Nghiệp vụ tests:
- [ ] Admin xem được tất cả đơn chưa thanh toán
- [ ] Chọn manual 2-3 đơn → thanh toán → verify allocations
- [ ] FIFO mode → verify oldest orders được chọn
- [ ] Partial payment → verify remaining amounts
- [ ] Quick pay từ order detail → verify correct order pre-selected

### SSOT tests:
- [ ] No inline hardcoded colors
- [ ] No custom spacing values
- [ ] All icons same size within context
- [ ] Buttons use .btn classes
- [ ] Cards use .card-base
- [ ] Forms use .form-* classes

---

## 💡 KEY LEARNINGS

### Sai lầm trong lần implement trước:

1. ❌ **Rush implementation** - Không suy nghĩ kỹ workflow
2. ❌ **Skip nghiệp vụ design** - Focus vào code trước khi hiểu nghiệp vụ
3. ❌ **Ignore SSOT** - Không check design system
4. ❌ **No user testing** - Không thử nghĩ như admin sử dụng
5. ❌ **Copy-paste pattern** - Copy từ nơi khác không nghĩ context

### Cách làm đúng:

1. ✅ **Understand nghiệp vụ FIRST** - Admin workflow là gì?
2. ✅ **Design trước code** - Sketch UI, plan data flow
3. ✅ **Check SSOT tokens** - Review design system trước
4. ✅ **Think như user** - Admin dùng có tiện không?
5. ✅ **Iterate** - Phase approach, test từng phase

---

## 🎯 NEXT STEPS

1. **User approval** - Confirm plan này OK
2. **Start Phase 1** - Fix nghiệp vụ trước (critical)
3. **Then Phase 2** - SSOT refactor
4. **Phase 3** - Enhancements (optional)

---

**Estimated rework time**: 
- Phase 1: 4-6 hours
- Phase 2: 2-3 hours  
- Phase 3: 4-6 hours (optional)

**Total**: 6-9 hours cho P0+P1 (Phase 1+2)

---

**TÓM LẠI: Lần trước làm ẩu, thiếu suy nghĩ nghiệp vụ, không follow SSOT. Plan này fix cả 2 vấn đề theo đúng quy trình.**
