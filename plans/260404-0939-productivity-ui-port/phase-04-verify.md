# Phase 04: Verify & Polish

Status: ⬜ Pending
Dependencies: Phase 03

## Objective

Build check, browser audit, so sánh visual với Contract module.

## Implementation Steps

### 1. Build Check

```bash
npm run build
```

- TypeScript errors = 0
- Lint warnings reviewed

### 2. Browser Audit (Mobile 375px)

- [ ] Mở `/productivity` ở 375px
- [ ] Filter row cuộn ngang mượt (pills + SelectPills)
- [ ] Mobile card 5-row layout đúng
- [ ] Tap card → drawer đúng
- [ ] Period tabs hoạt động

### 3. Browser Audit (Desktop 1440px)

- [ ] Mở `/productivity` full width
- [ ] Workload tabs + pills trên 1 hàng
- [ ] So sánh side-by-side với `/contracts`
- [ ] Desktop table không bị ảnh hưởng
- [ ] Filter logic (workload + role + search) kết hợp đúng

## Done Criteria

- [ ] Build thành công
- [ ] Mobile + Desktop audit pass
- [ ] Visual consistency với Contract module
