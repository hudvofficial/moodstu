---
title: "Kiểm kê — Enum"
lat-cat: 15-enum
cap-nhat: 2026-09-01
trang-thai: sinh-tu-dong
---

> ⚙️ Sinh tự động từ `pg_type`. ĐỪNG sửa tay.

# Enum

16 enum trong schema public.

| Enum | Giá trị |
|---|---|
| `addon_category_enum` | makeup · trang_phuc · phu_kien · them_gio · khac |
| `approval_status_enum` | pending · approved · rejected |
| `employee_role_enum` | admin · manager · sale · media · ctv |
| `event_type_enum` | chuan_bi · ngay_chup · ngay_to_chuc · hau_ky · giao_san_pham |
| `export_type_enum` | xuat_ban · xuat_thue |
| `gender_enum` | nam · nu · khac |
| `item_type_enum` | dich_vu · san_pham · trang_phuc · phat_sinh |
| `lead_potential_enum` | hot · warm · cold |
| `lead_status_enum` | moi · da_lien_he · hen_gap · da_bao_gia · da_chot · huy |
| `log_source_enum` | trigger · server_action · frontend · system |
| `log_type_enum` | EVENT_CHANGE · ASSIGNMENT · CONFLICT · ERROR · GENERAL |
| `payment_method_enum` | tien_mat · chuyen_khoan |
| `service_type_enum` | studio · ngay_cuoi · combo · baby · gia_dinh · sinh_nhat · bau · concept · couple · ky_yeu · media · khac · outsource |
| `severity_enum` | INFO · WARNING · ERROR · CRITICAL |
| `transaction_type_enum` | hop_dong · hoa_don |
| `work_type_enum` | concept · kich_ban · chup_anh · quay_phim · makeup · tro_ly · cameraman · hau_ky_anh · dung_phim · retouch · premiere · bien_tap · khac |

> ⚠️ Cột trạng thái KHÔNG dùng enum thì DB không chặn giá trị lạ. Đã biết: `work_tasks.status` và `contract_events.status` là `text` tự do.
