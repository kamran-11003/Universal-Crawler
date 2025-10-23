# SmartCrawler Test Sites
**Version**: 1.0.0  
**Last Updated**: 2025-10-23

This document lists test sites for validating SmartCrawler functionality across different web technologies.

---

## 🔴 Critical Test Sites (MUST PASS)

### 1. SauceLabs Demo - React SPA
**URL**: https://www.saucedemo.com  
**Technology**: React (production build)  
**Test Focus**: React SPA form handling, authentication, navigation after login

**Test Credentials**:
- Username: `standard_user`
- Password: `secret_sauce`

**Expected Behavior**:
- ✅ React detected (production)
- ✅ Form filled with proper React events
- ✅ Login successful
- ✅ Navigates to inventory page
- ✅ Discovers 6+ product pages
- ✅ Discovers cart, checkout pages

**Success Criteria**:
- Login success rate: 100%
- Pages discovered: ≥8 pages (login → inventory → 6 products → cart → checkout)
- Real page success: ≥95%

---

### 2. OpenCart Demo - AJAX Authentication
**URL**: https://demo.opencart.com  
**Technology**: PHP + AJAX  
**Test Focus**: AJAX authentication, token detection

**Test Steps**:
1. Click "My Account" → "Login"
2. Use demo credentials (check site for current)
3. Verify AJAX response parsed
4. Verify session token detected
5. Navigate to account pages

**Expected Behavior**:
- ✅ AJAX request detected
- ✅ JSON response parsed
- ✅ Session token stored
- ✅ Authenticated pages accessible

**Success Criteria**:
- Login success rate: 100%
- Token detection: 100%
- Pages discovered: ≥5 pages

---

## 🟡 Secondary Test Sites (Should Pass)

### 3. DemoQA Practice Form
**URL**: https://demoqa.com/automation-practice-form  
**Technology**: HTML5 + jQuery  
**Test Focus**: Complex form detection, label extraction, input types

**Expected Behavior**:
- ✅ Form detected (1 form, not 7 duplicates!)
- ✅ 16 inputs detected (text, radio, checkbox, file, textarea)
- ✅ Labels extracted for all inputs
- ✅ Placeholders captured

**Success Criteria**:
- Forms detected: 1 (deduplicated correctly)
- Labels extracted: 16/16 inputs
- Input types: text, radio, checkbox, file, textarea all detected

---

### 4. Vue.js Official Site
**URL**: https://vuejs.org  
**Technology**: Vue 3  
**Test Focus**: Vue SPA detection, adaptive timing

**Expected Behavior**:
- ✅ Vue detected (version 3)
- ✅ 6s adaptive wait applied
- ✅ Documentation pages discovered
- ✅ Navigation menu links extracted

**Success Criteria**:
- Vue detection: 100%
- Pages discovered: ≥10 pages
- Real page success: ≥90%

---

### 5. HTTPBin Forms
**URL**: https://httpbin.org/forms/post  
**Technology**: Traditional HTML forms  
**Test Focus**: Basic form handling, POST requests

**Expected Behavior**:
- ✅ Form detected
- ✅ All input fields found
- ✅ Submit button detected
- ✅ Form attributes correct (action, method)

**Success Criteria**:
- Form detection: 100%
- Input fields: All found
- Form metadata: Accurate

---

## 🟢 Additional Test Sites (Nice to Have)

### 6. Angular.io
**URL**: https://angular.io  
**Technology**: Angular  
**Test Focus**: Angular SPA detection, 7s adaptive wait

**Expected Behavior**:
- ✅ Angular detected
- ✅ 7s adaptive wait applied
- ✅ Documentation pages discovered

---

### 7. Svelte Official Site
**URL**: https://svelte.dev  
**Technology**: Svelte  
**Test Focus**: Svelte detection, modern framework handling

**Expected Behavior**:
- ✅ Svelte detected (if detectable)
- ✅ Tutorial pages discovered
- ✅ Docs navigation working

---

### 8. GitHub
**URL**: https://github.com  
**Technology**: Ruby + Turbo (Hotwire)  
**Test Focus**: Complex navigation, multi-path auth, dynamic content

**Expected Behavior**:
- ✅ Login paths discovered (/login, /signin)
- ✅ Dynamic content loaded
- ✅ Repository pages discovered

---

### 9. Bootstrap Docs
**URL**: https://getbootstrap.com/docs/  
**Technology**: Static site with interactive components  
**Test Focus**: Modal detection, accordion detection, tab navigation

**Expected Behavior**:
- ✅ Modal components detected
- ✅ Accordion components found
- ✅ Tab navigation discovered
- ✅ Documentation pages crawled

---

### 10. PrestaShop Demo
**URL**: https://demo.prestashop.com  
**Technology**: E-commerce (PHP)  
**Test Focus**: Product pages, cart, checkout flow

**Expected Behavior**:
- ✅ Product listings discovered
- ✅ Add to cart detected
- ✅ Checkout flow pages found

---

## 📊 Test Execution Checklist

### For Each Test Site:

1. **Pre-Test Setup**
   - [ ] Clear browser cache
   - [ ] Reload extension
   - [ ] Open DevTools console (F12)

2. **Execute Test**
   - [ ] Navigate to test URL
   - [ ] Open extension popup
   - [ ] Configure settings (if needed)
   - [ ] Enter credentials (if required)
   - [ ] Start crawl
   - [ ] Monitor console logs

3. **Success Validation**
   - [ ] Check "Real Page Success" percentage (≥95% target)
   - [ ] Verify page count (compare to expected)
   - [ ] Check for console errors
   - [ ] Export crawler_output.json
   - [ ] Upload to visualization app
   - [ ] Verify forms detected correctly
   - [ ] Verify labels extracted
   - [ ] Check for duplicates

4. **Log Results**
   - Date:
   - Site:
   - Real Page Success: __%
   - Pages Discovered: __
   - Forms Detected: __
   - Errors: Y/N
   - Notes:

---

## 🎯 Overall Success Criteria

### Tier 1 (Critical)
- ✅ saucedemo.com: 100% login success, ≥8 pages
- ✅ demo.opencart.com: 100% AJAX auth, ≥5 pages

### Tier 2 (Important)
- ✅ demoqa.com: 1 form (deduplicated), 16/16 labels
- ✅ vuejs.org: Vue detected, ≥10 pages
- ✅ httpbin.org: 100% form detection

### Tier 3 (Nice to Have)
- ⚠️ angular.io, svelte.dev, github.com, getbootstrap.com, demo.prestashop.com

### Global Metrics
- **Real Page Success**: ≥95% across all sites
- **Script Injection Time**: <500ms
- **Memory Usage**: <1GB for 100+ pages
- **Zero Console Errors**: On all critical sites

---

## 🐛 Known Issues

### Issue 1: Form Duplication (FIXED 2025-10-23)
- **Status**: ✅ FIXED
- **Solution**: Input signature-based deduplication
- **Verify**: demoqa.com should show 1 form, not 7

### Issue 2: Empty Labels in Visualization (FIXED 2025-10-23)
- **Status**: ✅ FIXED
- **Solution**: Updated node_analyzer.py to display label + placeholder
- **Verify**: Visualization should show "text | name='firstName' | label='First Name' | placeholder='Enter name'"

### Issue 3: No Navigation After Login (FIXED 2025-10-23)
- **Status**: ✅ FIXED
- **Solution**: Set `useNavigation = true` for authenticated roles
- **Verify**: saucedemo.com should discover 8+ pages after login

---

## 📝 Test Execution Log

| Date | Site | Version | Real Page % | Pages | Forms | Status | Notes |
|------|------|---------|-------------|-------|-------|--------|-------|
| 2025-10-23 | saucedemo.com | 1.0.0 | - | - | - | ⏳ Pending | After latest fixes |
| 2025-10-23 | demo.opencart.com | 1.0.0 | - | - | - | ⏳ Pending | After latest fixes |
| 2025-10-23 | demoqa.com | 1.0.0 | - | 2 | 7 | ❌ Failed | Before dedup fix |
| - | - | - | - | - | - | - | - |

*(Fill in results after testing)*

---

## 🚀 Quick Test Commands

### Test All Critical Sites
```bash
# 1. Reload extension
# Go to: chrome://extensions → SmartCrawler → Reload

# 2. Test saucedemo.com
# Navigate to: https://www.saucedemo.com
# Enter: standard_user / secret_sauce
# Start crawl
# Expected: 8+ pages, 95%+ real

# 3. Test demo.opencart.com
# Navigate to: https://demo.opencart.com
# My Account → Login → Use demo credentials
# Start crawl
# Expected: 5+ pages, AJAX detected

# 4. Test demoqa.com
# Navigate to: https://demoqa.com/automation-practice-form
# Start crawl
# Expected: 1 form (not 7!), 16 labels
```

---

## 💡 Troubleshooting

### Issue: Low Real Page Success (<95%)
**Check**:
- Console logs for "iframe-based crawl failed"
- Offscreen document created: Check for "✅ Offscreen document created"
- Smart synthetic usage: Look for "⚠️ Using smart synthetic data"

**Fix**:
- Verify CONSTANTS loaded
- Check iframe creation in console
- Verify offscreen.html exists

### Issue: No Pages Discovered After Login
**Check**:
- Console logs for "useNavigation = true"
- Look for: "🚀 Starting authenticated crawl with navigation ENABLED"
- Verify multi-role-crawler.js loaded

**Fix**:
- Ensure latest code deployed
- Check line 316 in multi-role-crawler.js: Should be `true` not `false`

### Issue: Duplicate Forms
**Check**:
- Console logs for "🔍 Deduplicating X forms..."
- Should see "✅ Form 1: UNIQUE" and "⏭️ Form 2: DUPLICATE"
- Verify universal-form-handler.js loaded

**Fix**:
- Check deduplicateForms() implementation
- Verify input signature logic

---

**Last Updated**: 2025-10-23  
**Maintainer**: SmartCrawler Team  
**Next Review**: After each major release
