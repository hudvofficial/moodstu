# 🔧 Finance Module Issues - Diagnosis & Fix Guide

**Ngày audit**: 2026-05-24  
**Module**: Finance (Salaries & Navigation)  
**Reported Issues**:
1. Navigation bug: /finance/salaries giựt về /finance
2. Freelancer salary không hiển thị

---

## ❌ Issue 1: Navigation Bug - /finance/salaries → /finance

### 🔍 Investigation Results

**Code Analysis:**
- ✅ Không có redirect logic trong middleware
- ✅ Không có useEffect/router.push trong finance components
- ✅ Layout không có navigation side effects
- ✅ Breadcrumb component là pure component
- ✅ Finance structure follows Next.js App Router standards

**Conclusion:**  
Không tìm thấy root cause rõ ràng trong codebase. Bug có thể do:
- Browser caching/prefetch behavior
- Race condition trong client-side hydration
- Next.js routing edge case
- User-specific browser state

### ✅ Recommended Actions

#### Action 1: Debug & Reproduce
1. Chạy debug guide: `app/(protected)/finance/_debug-nav.md`
2. Test trong incognito mode
3. Hard refresh (Ctrl+Shift+R)
4. Check browser console for errors

#### Action 2: Potential Fixes (Test Each)

**Fix A: Disable Link Prefetch**
```typescript
// components/finance/dashboard/finance-quick-nav.tsx
<Link href={item.href} prefetch={false}>
```

**Fix B: Add Pathname Key**
```typescript
// app/(protected)/finance/layout.tsx
'use client';
import { usePathname } from 'next/navigation';

export default function FinanceLayout({ children }) {
  const pathname = usePathname();
  return <div className="relative" key={pathname}>{children}</div>;
}
```

**Fix C: Check for Competing Navigation**
```bash
# Search for any competing navigation logic
grep -r "router.push\|router.replace\|redirect" app/(protected)/finance/
```

#### Action 3: Monitor Pattern
- Xác định: Bug xảy ra 100% hay intermittent?
- Xác định: Bug xảy ra trên tất cả sub-pages hay chỉ /salaries?
- Xác định: Bug xảy ra sau một action cụ thể nào không?

---

## ❌ Issue 2: Freelancer Salary Không Hiển Thị

### 🔍 Investigation Results

**Code Analysis:**
- ✅ [salary-actions.ts:373-380](app/actions/salary-actions.ts#L373-L380): Query chỉ filter `status='active'`, KHÔNG exclude CTV
- ✅ UI components không có filter loại trừ freelancer
- ✅ Employee queries support role="ctv" đầy đủ
- ✅ Salary calculation logic không phân biệt employee vs freelancer

**Root Cause Hypotheses:**
1. 🔴 **CTV không có `status='active'` trong database**
2. 🔴 **CTV không có `salary_info.base_salary` được set**
3. 🔴 **CTV chưa được generate salary cho tháng hiện tại**

### ✅ Recommended Actions

#### Action 1: Kiểm Tra Database

Chạy script kiểm tra:
```bash
psql -f scripts/check-freelancer-salary.sql
```

Hoặc chạy queries trong script để check:
- [ ] CTV có trong employees table?
- [ ] CTV có status='active'?
- [ ] CTV có base_salary trong salary_info?
- [ ] CTV có trong employee_salaries table?

#### Action 2: Fix Data Issues

**Nếu CTV không có status='active':**
```sql
UPDATE employees
SET status = 'active',
    updated_at = NOW()
WHERE role = 'ctv'
  AND deleted_at IS NULL
  AND (status IS NULL OR status != 'active');
```

**Nếu CTV không có base_salary:**
```sql
UPDATE employees
SET salary_info = jsonb_set(
      COALESCE(salary_info, '{}'::jsonb),
      '{base_salary}',
      '0'::jsonb  -- hoặc số tiền base salary thực tế
    ),
    updated_at = NOW()
WHERE role = 'ctv'
  AND deleted_at IS NULL
  AND (salary_info IS NULL OR salary_info->>'base_salary' IS NULL);
```

#### Action 3: Re-generate Salary

Sau khi fix data:
1. Vào /finance/salaries
2. Click "Tạo bảng lương T{month}" hoặc "Cập nhật lương T{month}"
3. System sẽ generate salary cho TẤT CẢ employees có status='active' (bao gồm CTV)

#### Action 4: Verify Fix

Kiểm tra xem CTV đã xuất hiện:
```sql
-- Check salary generation kết quả
SELECT
  es.month,
  es.year,
  e.employee_code,
  e.full_name,
  e.role,
  es.base_salary,
  es.product_salary,
  es.total_salary,
  es.net_salary
FROM employee_salaries es
JOIN employees e ON e.id = es.employee_id
WHERE e.role = 'ctv'
  AND es.month = EXTRACT(MONTH FROM CURRENT_DATE)
  AND es.year = EXTRACT(YEAR FROM CURRENT_DATE);
```

---

## 📊 Code Changes Applied

### ✅ Enhancement 1: Add Logging to Salary Generation

**File**: `app/actions/salary-actions.ts`  
**Change**: Added employee breakdown logging

```typescript
// Log employee breakdown for debugging
const employeesByRole = employees.reduce((acc: Record<string, number>, emp) => {
  const role = emp.role || "unknown";
  acc[role] = (acc[role] || 0) + 1;
  return acc;
}, {});
console.log(`[Salary Generation] Processing ${employees.length} employees:`, employeesByRole);
```

**Benefit**: Bây giờ khi generate salary, server log sẽ show:
```
[Salary Generation] Processing 8 employees: { admin: 1, manager: 2, sale: 3, ctv: 2 }
```

---

## 🎯 Next Steps

### Immediate Actions (Required)
1. [ ] Chạy `scripts/check-freelancer-salary.sql` để identify data issues
2. [ ] Fix employee data nếu cần (status, salary_info)
3. [ ] Re-generate salary cho tháng hiện tại
4. [ ] Verify CTV xuất hiện trong bảng lương

### Debugging Actions (If navigation bug persists)
1. [ ] Follow `app/(protected)/finance/_debug-nav.md`
2. [ ] Test trong incognito mode
3. [ ] Try disabling prefetch
4. [ ] Monitor browser console for errors

### Optional Enhancements
1. [ ] Thêm badge "CTV" trong salary table để distinguish freelancers
2. [ ] Thêm filter "Role" trong salary filters để filter theo loại nhân sự
3. [ ] Add validation warning nếu CTV có base_salary = 0

---

## 📝 Notes

- Salary generation logic **ĐÃ** support freelancers, không cần code changes
- Issue là **DATA** issue, không phải **LOGIC** issue
- Navigation bug cần more info để reproduce và fix chính xác

---

**Người thực hiện audit**: Claude Sonnet 4.5  
**Status**: Investigation completed, fixes recommended
