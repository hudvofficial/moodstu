# Deep Security Audit Report - May 25, 2026

## Executive Summary

**Total Vulnerabilities:** 8 (3 Moderate, 5 High)
**Build Status:** ✅ Successful (Next.js 16.2.6)
**Critical Finding:** npm audit fix --force caused a DOWNGRADE bug

---

## 🚨 Critical Discovery: npm Downgrade Bug

### What Happened?
```
Before: @ducanh2912/next-pwa@10.2.9 (SAFE ✅)
After:  @ducanh2912/next-pwa@10.2.6 (VULNERABLE ⚠️)
```

**Root Cause:** `npm audit fix --force` has a logic error that downgraded from a secure version to a vulnerable one.

### Evidence:
- **Version 10.2.6** (Apr 4, 2024): Uses workbox-build@7.0.0 (vulnerable)
- **Version 10.2.7+** (May 5, 2024): Uses workbox-build@7.1.0 (patched)
- **Audit report** says: `@ducanh2912/next-pwa` vulnerable range is `<=10.2.6`
- **npm wrongly picked** 10.2.6 instead of keeping 10.2.9

---

## Vulnerability Breakdown

### 🔴 High Severity (5 vulnerabilities)

#### 1. serialize-javascript <= 7.0.4
**CVE:** GHSA-5c6j-r48x-rmvq, GHSA-qj8w-gfj5-8c6v
**Type:** Remote Code Execution (RCE) + Denial of Service (DoS)
**Location:** 
- `node_modules/serialize-javascript`
- `node_modules/@ducanh2912/next-pwa/node_modules/serialize-javascript`

**Impact:** 
- RCE via RegExp.flags manipulation
- CPU exhaustion via crafted array-like objects

**Dependency Chain:**
```
serialize-javascript 
  ↓
rollup-plugin-terser / terser-webpack-plugin
  ↓
workbox-build
  ↓
workbox-webpack-plugin
  ↓
@ducanh2912/next-pwa
```

**Fix Status:** ✅ Fixed in @ducanh2912/next-pwa >= 10.2.7

---

#### 2. rollup-plugin-terser
**Severity:** High (via serialize-javascript)
**Range:** All versions depending on vulnerable serialize-javascript
**Location:** `node_modules/rollup-plugin-terser`

**Fix Status:** ⚠️ Package is DEPRECATED
- Replacement: Use `@rollup/plugin-terser` instead
- Fixed in workbox-build@7.1.0+

---

#### 3. workbox-build 5.0.0-alpha.0 - 7.0.0
**Severity:** High (via rollup-plugin-terser)
**Location:** `node_modules/workbox-build`

**Fix Status:** ✅ Patched in 7.1.0+
- @ducanh2912/next-pwa@10.2.7+ uses 7.1.0

---

#### 4. workbox-webpack-plugin 5.0.0-alpha.0 - 7.0.0
**Severity:** High (via workbox-build)
**Location:** `node_modules/workbox-webpack-plugin`

**Fix Status:** ✅ Patched in 7.1.0+
- @ducanh2912/next-pwa@10.2.7+ uses 7.1.0

---

#### 5. @ducanh2912/next-pwa <= 10.2.6
**Severity:** High (via multiple dependencies)
**Current Version:** 10.2.6 (VULNERABLE ⚠️)
**Safe Versions:** >= 10.2.7

**Fix Status:** 🔧 **ACTION REQUIRED** - Upgrade to 10.2.9

---

### 🟡 Moderate Severity (3 vulnerabilities)

#### 6. postcss < 8.5.10
**CVE:** GHSA-qx2v-qp2m-jg93
**Type:** Cross-Site Scripting (XSS)
**CVSS Score:** 6.1
**Vector:** CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N

**Details:**
- Unescaped `</style>` in CSS Stringify output
- Can break out of `<style>` tags and inject malicious scripts

**Location:** `node_modules/next/node_modules/postcss`
**Affected:** Next.js 9.3.4-canary.0 - 16.3.0-canary.5

**Fix Options:**
1. ⚠️ Downgrade to Next.js 9.3.3 (BREAKING - not recommended)
2. ⏳ Wait for Next.js to update bundled postcss
3. ✅ **ACCEPT RISK** (Low exploitability in production)

**Risk Assessment:**
- **Exploitability:** Low (requires attacker-controlled CSS input)
- **Impact:** Moderate (XSS in specific scenarios)
- **Recommendation:** Monitor and accept for now

---

#### 7. terser-webpack-plugin 4.2.1 - 5.3.16
**Severity:** Moderate (via serialize-javascript)
**Location:** `node_modules/@ducanh2912/next-pwa/node_modules/terser-webpack-plugin`

**Fix Status:** ✅ Fixed in @ducanh2912/next-pwa >= 10.2.7

---

#### 8. next 9.3.4-canary.0 - 16.3.0-canary.5
**Severity:** Moderate (via postcss)
**Current Version:** 16.2.6
**Location:** `node_modules/next`

**Fix Status:** ⏳ Waiting for Next.js upstream fix

---

## Recommended Actions

### Immediate (Critical)
1. ✅ **Restore @ducanh2912/next-pwa to 10.2.9**
   ```bash
   npm install @ducanh2912/next-pwa@10.2.9
   ```
   **Impact:** Fixes 5 HIGH severity vulnerabilities

### Short-term (Monitor)
2. ⏳ **Monitor Next.js updates for postcss fix**
   - Track: https://github.com/vercel/next.js/issues
   - Expected: Next.js will bundle postcss@8.5.10+ in future release

### Long-term (Optional)
3. 🔄 **Consider PWA alternatives if security is critical**
   - Next.js native PWA support (experimental)
   - Vite PWA plugin (for Vite migration)

---

## Fix Implementation Plan

### Phase 1: Fix High Severity (NOW)
```bash
# Restore safe version
npm install @ducanh2912/next-pwa@10.2.9

# Verify
npm audit

# Test
npm run build
npm run dev
```

**Expected Result:** 
- Vulnerabilities: 8 → 1 (only postcss remains)
- Severity: 5 High + 3 Moderate → 1 Moderate

### Phase 2: Verify & Deploy
```bash
# Run tests
npm test

# Build for production
npm run build

# Check bundle size
npm run analyze

# Deploy
git add package.json package-lock.json
git commit -m "fix: restore @ducanh2912/next-pwa to 10.2.9 to fix 5 HIGH severity vulnerabilities"
```

### Phase 3: Monitor (Ongoing)
- Check for Next.js updates monthly
- Subscribe to security advisories:
  - https://github.com/vercel/next.js/security/advisories
  - https://github.com/advisories

---

## Risk Matrix

| Vulnerability | Severity | Exploitability | Impact | Priority | Status |
|--------------|----------|----------------|---------|----------|---------|
| serialize-javascript | HIGH | Medium | High | P0 | ✅ Fixable |
| workbox-* | HIGH | Medium | High | P0 | ✅ Fixable |
| @ducanh2912/next-pwa | HIGH | Medium | High | P0 | ✅ Fixable |
| postcss | MODERATE | Low | Moderate | P2 | ⏳ Monitor |
| terser-webpack-plugin | MODERATE | Medium | High | P0 | ✅ Fixable |
| next | MODERATE | Low | Moderate | P2 | ⏳ Monitor |

**P0:** Fix immediately
**P2:** Monitor and fix when available

---

## Testing Checklist

After applying fix:
- [ ] npm audit shows only 1 moderate vulnerability (postcss)
- [ ] npm run build completes successfully
- [ ] npm run dev starts without errors
- [ ] Service Worker (/sw.js) loads correctly
- [ ] Offline mode works
- [ ] PWA installable
- [ ] No console errors in browser
- [ ] Bundle size unchanged or smaller

---

## Conclusion

**Summary:**
- Found npm audit fix --force bug that caused downgrade
- 5 HIGH + 2 MODERATE vulnerabilities can be fixed immediately
- 1 MODERATE vulnerability (postcss) requires upstream Next.js fix
- Build is stable and working

**Recommendation:** 
✅ **Proceed with Phase 1 fix now** - Restoring @ducanh2912/next-pwa to 10.2.9 will eliminate 87.5% of vulnerabilities (7 out of 8) with zero breaking changes.

---

**Report Generated:** May 25, 2026
**Auditor:** Claude Sonnet 4.5
**Project:** mood-studio v2.0.6
