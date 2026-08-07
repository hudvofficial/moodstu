---
title: "Xác thực & phân quyền"
tags: [nen-tang, bao-mat]
cap-nhat: 2026-08-07
---

# Xác thực & phân quyền

## Ai thật sự dùng hệ thống

Studio 1 người quản trị (admin) + 1 kinh doanh. **Nhân sự khác chưa được cấp đăng nhập.** Thiết bị: PC, mobile, iPad → mọi thay đổi giao diện phải kiểm cả 3 tầng, xem [[responsive-3-tier]].

Nghĩa là: các vai trò `media` / `viewer` (ctv) **đã có code nhưng chưa có người dùng thật**. Đừng suy diễn hành vi đa-người-dùng từ code — thực tế gần như đơn người dùng. Xem [[so-lieu-van-hanh]].

## Chuỗi xác thực

1. **`proxy.ts`** (Next 16 đổi tên từ `middleware.ts`) chạy mọi request trừ asset tĩnh → `updateSession()` refresh cookie Supabase + bơm role claim vào header.
   ⚠️ Matcher phải loại trừ **mọi file service-worker** (`sw.js`, `push-sw.js`, `workbox-*.js`…). Quên một cái → auth trả HTML login → `importScripts()` parse HTML thành JS → SW mới không cài được → **PWA đã cài đóng băng ở bản cũ**. Đã xảy ra với `push-sw.js`.
2. **`app/(protected)/layout.tsx`** → `getAuthenticatedUserContext()`
   - không có phiên → `/login`
   - `isEmployeeDisabled` → `/account-disabled`
3. **Server action** → `withAuth` / `withAuthRead` → `requireXAccess()` → `createAdminClient()`.

## Hai wrapper, chọn đúng cái

| | `withAuth` | `withAuthRead` |
|---|---|---|
| Xác minh | `getVerifiedUser()` — gọi mạng tới GoTrue | `getClaimsUser()` — verify JWT tại chỗ |
| Chi phí | +200–800ms trên mobile/vùng lạnh | ~0 |
| Dùng cho | **mọi thao tác GHI**, luồng bootstrap/đặc quyền | **chỉ đọc** |

Cả hai đều trả về client **service role**. Phân quyền vẫn do `requireXAccess()` bên trong action đảm nhiệm — bỏ nó đi là mất lớp bảo vệ duy nhất.

## Vai trò

`types/roles.ts` định nghĩa 5 vai: `admin · manager · sale · media · viewer`.

| Module | admin | manager | sale | media | viewer |
|---|:-:|:-:|:-:|:-:|:-:|
| dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| moodie | ✅ | ✅ | ✅ | ✅ | ✅ |
| calendar | ✅ | ✅ | ✅ | ✅ | |
| contracts | ✅ | ✅ | ✅ | | |
| crm | ✅ | ✅ | ✅ | | |
| dresses | ✅ | ✅ | ✅ | | |
| productivity | ✅ | ✅ | | ✅ | |
| finance · inventory · reports · employees · printing · settings · services · salaries · goals | ✅ | ✅ | | | |

`admin` và `manager` hiện **quyền hệt nhau** trong `ROLE_PERMISSIONS`. Khác biệt nằm ở các guard hẹp hơn bên dưới.

## Guard hẹp hơn ma trận

Một số hành động không chỉ hỏi "vào được module không" mà còn hỏi "được làm gì trong đó":

| Guard | Cho phép |
|---|---|
| `requireContractWriteAccess` | admin, manager, sale |
| `requireContractDestructiveAccess` | admin, manager |
| `requirePaymentRecordAccess` | admin, manager, sale |
| `requireDressesBookingAccess` | admin, manager, sale |
| `requireDressesCatalogWriteAccess` | admin, manager |
| `requireEmployeesWriteAccess` | admin, manager |
| `requireCodebaseAccess` | **admin** |
| `withAdmin` | người quản trị cài đặt (`canManageSettings`) |

Các `requireXAccess` còn lại (crm, finance, printing, services, inventory, moodie, employees, contracts, dresses) chỉ gọi `canAccess(role, "<module>")` — tức bám đúng bảng ma trận trên.

## ⚠️ Bẫy: `viewer` (app) vs `ctv` (DB)

Enum trong DB là `employee_role_enum = admin | manager | sale | media | ctv`.
Kiểu trong app là `Role = admin | manager | sale | media | viewer`.

Cầu nối:
- `normalizeRole()` map `ctv`/`user`/`viewer`/**mọi giá trị lạ** → `"viewer"`
- `normalizeEmployeeRole()` map ngược `viewer` → `"ctv"`

Hệ quả: **role sai chính tả không báo lỗi, nó âm thầm tụt xuống `viewer`.** Thêm vai trò mới phải sửa cả enum DB lẫn `ROLES` + `ROLE_PERMISSIONS` + hai hàm normalize.

## Nhân sự ≠ tài khoản đăng nhập

- Bảng `employees` là danh bạ nhân sự; không phải ai cũng có tài khoản.
- Có **trigger `on_auth_user_created`** tự tạo dòng `employees` khi tạo auth user → script seed phải `UPDATE`, không `INSERT`.
- `crm_leads.created_by` trỏ `employees.id`, **không phải** auth user id — khác với phần còn lại của hệ thống.

## Chống dò mật khẩu

- Đăng nhập: bảng `login_attempts` (đây là **bảng duy nhất** vai `anon` còn quyền ghi — xem [[bao-mat-du-lieu-rls]]).
- Mật khẩu gallery: `gallery_password_attempts`, 10 lần sai / 15 phút / gallery.

## File liên quan

`proxy.ts` · `lib/supabase/middleware.ts` · `lib/auth_utils.ts` · `types/roles.ts` · `app/(protected)/layout.tsx` · `app/actions/auth.ts` · `app/actions/user-management.ts`
