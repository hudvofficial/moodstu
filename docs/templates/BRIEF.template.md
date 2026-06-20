# BRIEF: {Tieu de ngan}

> **Module:** {module-name}
> **Priority:** {P0-khẩn | P1-cao | P2-trung bình | P3-thấp}
> **Status:** Draft → Approved → In Progress → Done
> **Created:** {YYYY-MM-DD}
> **Author:** {user | agent}

---

## 1. Boi canh

<!-- TAI SAO can lam viec nay? 2-3 cau, khong qua 5 dong -->

## 2. Yeu cau

### 2.1 Phai co (Must)

- [ ] {Yeu cau 1 — cu the, do luong duoc}
- [ ] {Yeu cau 2}

### 2.2 Nen co (Should)

- [ ] {Yeu cau khong bat buoc nhung co gia tri}

### 2.3 KHONG lam (Won't)

- {Gi NGOAI scope — ghi ro de agent khong tu y them}

## 3. Rang buoc

<!-- Dieu kien cung ma coder PHAI tuan thu -->

- **Module isolation:** chi dong file trong `{module}/` va `actions/{module}-*.ts`
- **DB:** {co migration khong? chi ALTER hay tao bang moi?}
- **Responsive:** verify @768px + @1024px
- **Finance rule:** {co lien quan revalidatePath / optimistic khong?}

## 4. Tieu chi thanh cong

<!-- Main agent dung cai nay de xac nhan DONE — phai do luong duoc -->

| # | Tieu chi | Cach verify |
|---|----------|-------------|
| S1 | {Mo ta} | {npm run build pass / screenshot @768 / Network tab < Xms} |
| S2 | {Mo ta} | {Cach verify cu the} |

## 5. Tai lieu lien quan

- Spec: `docs/specs/{module}.md`
- Plan hien tai: `docs/plans/{YYMMDD}-{slug}/plan.md`
- LESSONS: `plans/260603-native-feel-performance/LESSONS.md`
