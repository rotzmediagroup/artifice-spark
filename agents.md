# Development Agent Guidelines

## 🚨 CRITICAL UI PROTECTION RULES

### ⚠️ NEVER CHANGE THE UI WITHOUT EXPLICIT INSTRUCTIONS

**THIS IS THE MOST IMPORTANT RULE - VIOLATION REQUIRES IMMEDIATE REVERT**

- **ABSOLUTELY FORBIDDEN**: Making any UI changes, styling modifications, or design alterations unless the user explicitly requests it
- **This includes**:
  - Changing CSS classes, colors, layouts, spacing, fonts, or any visual styling
  - Modifying component structure, JSX elements, or HTML markup
  - Adding/removing UI components, sections, or visual elements
  - Changing hover states, animations, transitions, or visual effects
  - Altering responsive design, breakpoints, or mobile layouts
  - Modifying table styling, button appearances, or form designs
  - Changing background colors, text colors, borders, or shadows
  - Updating component props that affect visual appearance
- **ONLY EXCEPTION**: When user explicitly says "change the UI", "modify the design", or "update the styling"
- **VIOLATION CONSEQUENCE**: Immediate `git reset --hard` to previous working state and emergency redeployment

### ✅ SAFE OPERATIONS (No UI Impact)
- Backend logic changes (hooks, contexts, utilities, API calls)
- Database operations, queries, and Firestore rules
- Authentication and security enhancements
- Bug fixes that don't affect visual appearance
- Adding console logging, debugging code, or error handling
- Function logic improvements and performance optimizations

---

## 🎯 AGENT CONFIGURATION

**Agent:** Claude Code running in VSCode  
**Purpose:** Full-stack development with enterprise-grade standards  
**Primary Directive:** Maintain UI integrity while enhancing functionality  
**Workflow:** Analyze → Plan → Implement → Test → Deploy → Document  

---

## 🔥 CORE DEVELOPMENT PRINCIPLES

### ⚡ NEVER SIMPLIFY UNLESS EXPLICITLY TOLD
- **Always implement full features** - no shortcuts or simplified versions
- **Complete functionality first** - then optimize if needed
- **Full security implementation** - enterprise-grade from day one
- **Complete error handling** - robust production-ready code
- **Full testing coverage** - unit, integration, and security tests

### 🛠️ MANDATORY WORKFLOW SEQUENCE
1. **ANALYZE** - Understand the request and identify UI vs non-UI changes
2. **PLAN** - Present plan using ExitPlanMode for user approval
3. **IMPLEMENT** - Full feature with complete functionality
4. **TEST** - Comprehensive testing (unit, integration, security)
5. **FIX** - Resolve all errors and issues in full version
6. **COMMIT** - Git commit with descriptive message
7. **DEPLOY** - Deploy to production with verification
8. **DOCUMENT** - Update this agents.md with changes made

### 📝 PROGRESS TRACKING REQUIREMENTS
- **Always use TodoWrite** for multi-step tasks
- **Update todos in real-time** as tasks are completed
- **Record all changes made** with timestamps
- **Document any issues encountered** and how they were resolved
- **Track deployment status** and any configuration changes
- **Note any pending tasks** or known issues

---

## 🚀 DEVELOPMENT WORKFLOW

### 1. ANALYSIS PHASE
```bash
# Always analyze the request first
- Is this a UI change? → STOP and confirm with user
- Is this backend logic? → SAFE to proceed
- Does it affect visual appearance? → REQUIRES explicit permission
```

**Analysis Standards:**
- **UI Impact Assessment** - Determine if any visual changes are involved
- **Risk Evaluation** - Assess potential for breaking existing functionality
- **Scope Definition** - Clearly define what will and won't be changed
- **User Confirmation** - Use ExitPlanMode for any potentially risky changes

### 2. IMPLEMENTATION PHASE
```bash
npm run dev          # Start development server
npm run test:watch   # Run tests in watch mode (if available)
```

**Implementation Standards:**
- **TypeScript strict mode** - no any types unless absolutely necessary
- **Complete error handling** - try/catch for all async operations
- **Full type definitions** - interfaces for all data structures
- **Security by design** - validation and sanitization built-in
- **No UI modifications** - unless explicitly requested

### 3. TESTING PHASE
```bash
npm run build        # Test build process
npm run lint         # Code quality checks (if available)
```

**Testing Requirements:**
- **Build verification** - Ensure code compiles without errors
- **Functionality testing** - Verify features work as expected
- **UI integrity check** - Confirm no unintended visual changes
- **Error boundary testing** - Test edge cases and error conditions

### 4. ERROR RESOLUTION PHASE
**NEVER use simplified versions to bypass errors**

**Error Resolution Process:**
1. **Analyze the full error** - understand root cause
2. **Research proper solution** - use official documentation
3. **Implement complete fix** - address underlying issue
4. **Test the fix thoroughly** - ensure no regressions
5. **Document the solution** - update this file with resolution

### 5. VERSION CONTROL PHASE
```bash
git add .
git commit -m "type: descriptive message of changes"
git push origin main
```

**Commit Message Standards:**
- `feat:` - New features (non-UI)
- `fix:` - Bug fixes
- `security:` - Security improvements
- `refactor:` - Code refactoring (no UI changes)
- `docs:` - Documentation updates
- `deploy:` - Deployment configurations

### 6. DEPLOYMENT PHASE
```bash
npm run firebase:deploy    # Full deployment
```

**Deployment Checklist:**
- [ ] All tests passing
- [ ] Build successful
- [ ] No UI changes unless requested
- [ ] Functionality verified
- [ ] Error handling tested

---

## 📊 PROGRESS TRACKING

### 🔄 LATEST SESSION LOG
**Date:** August 25, 2025  
**Time Started:** 17:00 UTC  
**Objective:** Complete all remaining backend fixes and resolve pending issues

#### Changes Made This Session:
- [x] Fixed video generation timeout false errors (commit 6c297dd)
- [x] Fixed video download buttons with proper .mp4 filenames (commit 6c297dd)
- [x] Added debugging logs for user deletion troubleshooting (commit 6c297dd) 
- [x] Fixed admin panel hover color contrast issue (commit d807fa5)
- [x] Updated agents.md documentation to reflect resolved state
- [x] Successfully deployed all fixes to production

#### Issues Encountered:
- **Issue:** Previous agents.md documentation was outdated showing issues as pending
- **Solution:** Updated documentation to accurately reflect all resolved issues
- **Files Modified:** ImageGenerator.tsx, AdminPanel.tsx, useUserManagement.ts, agents.md

#### UI Impact Assessment:
- **UI Changes Made:** Minimal targeted fix for admin hover contrast only
- **Visual Verification:** Admin panel hover text now properly visible
- **User Approval:** Fix was specifically requested for known accessibility issue

#### Deployment Status:
- [x] Build successful - no compilation errors
- [x] Production deployed - https://rotz-image-generator.web.app
- [x] All functionality verified working
- [x] Video generation works without timeout errors
- [x] Video downloads work with proper filenames
- [x] Admin panel hover colors fixed

---

## 🎯 CURRENT APPLICATION STATE (August 28, 2025 - Post Video Timeout Fix)

### 📍 WHERE WE LEFT OFF:

#### **Current Git State:**
- **Branch:** main
- **Current Version:** 1.11.1
- **Latest Commits:** 
  - `0c15d3e` - Version bump to 1.11.1 for video timeout fix release
  - `633e240` - Video timeout fix + code structure improvements  
  - `e55f659` - Webhook and reference image fixes
- **GitHub Release:** v1.11.1 created with detailed changelog
- **Deployment:** Live at https://rotz-image-generator.web.app ✅

#### **RESOLVED Issues (All Fixed):**

1. **🔥 CRITICAL: Video Generation Timeout (FIXED v1.11.1):**
   - ✅ **Issue:** Videos timing out after 60 seconds with "Network error during video generation"
   - ✅ **Root Cause:** Artificial 45-second timeout + polling mechanism cancelling N8N requests
   - ✅ **Solution:** Reverted to no-timeout approach using `signal: undefined` for videos
   - ✅ **Technical:** Enhanced fetch with `keepalive: true`, `Connection: keep-alive`
   - ✅ **Result:** Videos now complete successfully in 2-5 minutes

2. **Code Quality Improvements:**
   - ✅ **ESLint Warnings:** Reduced from 8 to 3 (62% improvement)
   - ✅ **UI Components:** Separated variants into dedicated files (5 new files created)
   - ✅ **Architecture:** Better React Fast Refresh compliance

3. **Previous Fixes (Still Working):**
   - ✅ **Admin Panel:** Hover contrast fixed 
   - ✅ **Reference Images:** All modes working correctly
   - ✅ **Image 2 Video:** Full configuration options available

#### **Working Features:**
- ✅ Image generation with all styles
- ✅ User authentication and profiles
- ✅ Credit system (image and video credits)
- ✅ Admin panel accessible to jerome@rotz.host
- ✅ Image history and management
- ✅ Share functionality for images/videos
- ✅ Video download buttons (FIXED - working with .mp4 filenames)
- ✅ Video generation timeout handling (FIXED - no more false network errors)

#### **Technology Stack:**
- **Frontend:** React 18 + TypeScript + Vite
- **UI:** shadcn-ui + Tailwind CSS (DO NOT MODIFY)
- **Backend:** Firebase (Firestore, Auth, Storage)
- **Deployment:** Firebase Hosting
- **API:** N8N webhook for image/video generation

#### **Key Files and Their Current States:**
- `src/components/ImageGenerator.tsx` - **RECENTLY MODIFIED** - Video timeout fix applied ✅
- `src/components/ui/` - **5 NEW FILES ADDED** - Component variants separated ✅
- `package.json` - **UPDATED** to version 1.11.1 ✅
- All other files: Stable and working ✅

#### **ESLint Status:**
- **Remaining:** 3 warnings (cosmetic, decided to leave as-is)
  - `src/components/ui/form.tsx` - useFormField hook export
  - `src/components/ui/sidebar.tsx` - useSidebar hook export  
  - `src/contexts/AuthContext.tsx` - useAuth hook export (HIGH RISK to change)
- **Status:** Acceptable - 62% improvement achieved (8→3 warnings)

#### **Next Session Should:**
1. **Read this agents.md file first** - Contains complete continuity information
2. **Verify current state:** `git status` and `npm run build` to confirm stability
3. **Ask user for direction** - What to work on next (all major issues resolved)
4. **Use ExitPlanMode** for any changes that might affect functionality
5. **Focus on new features** rather than fixing cosmetic ESLint warnings
6. **Test thoroughly** before any deployments
7. **Update this section** with new progress after each session

#### **Safe Commands to Start Next Session:**
```bash
# Verify git state (should show clean working tree)
git status
git log --oneline -5

# Check current version (should be 1.11.1)
grep '"version"' package.json

# Test build (should pass without errors)
npm run build

# Check ESLint status (should show 3 warnings)
npm run lint

# Start development server
npm run dev

# Deploy only if changes made
npm run firebase:deploy
```

#### **Expected States After Reboot:**
- **Git Status:** Clean working tree, no uncommitted changes
- **Version:** 1.11.1 in package.json
- **Build:** Successful with no errors
- **ESLint:** 3 warnings (form.tsx, sidebar.tsx, AuthContext.tsx)  
- **TypeScript:** No errors with `npx tsc --noEmit`
- **App Status:** All functionality working, video timeout fixed

#### **CRITICAL REMINDERS FOR NEXT SESSION:**
- 🚨 **Major video timeout issue is RESOLVED** - Videos work in 2-5 minutes
- 🚨 **NO UI CHANGES** without explicit "change the UI" instruction  
- ✅ **All core functionality working** - focus on new features if user wants
- ✅ **3 ESLint warnings remaining** - decided to leave as-is (cosmetic only)
- ⚠️ **Always use ExitPlanMode** for any functional changes
- 📋 **Read this agents.md first** - contains complete session history

---

## 🔧 TECHNICAL STANDARDS

### 💻 Code Quality Requirements
- **Consistent formatting** - Use project's prettier/eslint config
- **Meaningful variable names** - Self-documenting code
- **Proper commenting** - Explain complex logic only
- **Error handling** - Graceful failure and recovery
- **Performance considerations** - Efficient algorithms and data structures

### 🔐 Security Standards
- **Input validation** - Sanitize all user inputs
- **Authentication** - Proper user verification
- **Authorization** - Role-based access control
- **Data encryption** - Sensitive data protection
- **Secure communications** - HTTPS/TLS for all external calls

### 📱 Platform Considerations (NO UI CHANGES)
- **Functionality preservation** - Maintain existing user experience
- **Performance optimization** - Backend improvements only
- **Error handling** - Better user feedback without UI changes
- **Security enhancements** - Improve safety without affecting design

---

## 🚨 EMERGENCY RECOVERY

### 💾 Backup and Recovery Protocol
If UI is accidentally broken:

1. **IMMEDIATE ACTION**: Stop all work
2. **REVERT**: `git reset --hard [last-working-commit]`
3. **REDEPLOY**: `npm run firebase:deploy` immediately
4. **VERIFY**: Confirm UI is restored
5. **DOCUMENT**: Record what went wrong in this file

### 🔄 Session Recovery Checklist
- [ ] Read last session log in this file
- [ ] Check git status and recent commits
- [ ] Verify UI is intact and functional
- [ ] Run build to confirm current state
- [ ] Check deployment status
- [ ] Resume development from documented point

---

## 📝 PROJECT-SPECIFIC CONTEXT

### 📋 Current Project Configuration
**Tech Stack:** React 18 + TypeScript + Vite + Firebase  
**UI Library:** shadcn-ui + Tailwind CSS  
**Database:** Firestore  
**Hosting:** Firebase Hosting  
**Authentication:** Firebase Auth  

### 🔧 Key Components
- **ImageGenerator.tsx** - Main image generation interface (DO NOT MODIFY UI)
- **AdminPanel.tsx** - Admin user management (DO NOT MODIFY UI)
- **UserMenu.tsx** - User dropdown menu (DO NOT MODIFY UI)
- **AuthModal.tsx** - Authentication interface (DO NOT MODIFY UI)

### 📚 Safe Modification Areas
- **Backend Hooks** - useAuth, useCredits, useStorage, useAdmin
- **Firebase Integration** - contexts/AuthContext.tsx
- **Utility Functions** - lib/ directory
- **API Logic** - Non-visual functionality improvements

### 🚫 FORBIDDEN Modification Areas (Without Explicit Permission)
- **All .tsx component files** - Unless modifying non-UI logic only
- **CSS/Styling** - Any visual styling modifications
- **Component Structure** - JSX markup changes
- **UI Libraries** - shadcn-ui component modifications

---

## 🎖️ QUALITY GATES

Before any commit/deployment:
- [ ] No unintended UI changes made
- [ ] Build process successful
- [ ] Core functionality verified
- [ ] Error handling tested
- [ ] Security considerations addressed
- [ ] Documentation updated
- [ ] User approval obtained (for UI changes)

---

**REMEMBER: The primary directive is to maintain the existing UI while enhancing backend functionality. When in doubt about UI impact, ask the user for explicit permission before proceeding.**

**Never change the payload structure that is being sent with the webhook call**

**This agents.md file is the single source of truth for development standards and must be updated after each session with progress and lessons learned.**

---

## 🔐 ENVIRONMENT CREDENTIALS BACKUP

**CRITICAL:** These credentials are needed for the application to function. Store securely:

```env
# Firebase Configuration for rotz-image-generator
# Retrieved from Firebase CLI
VITE_FIREBASE_API_KEY=AIzaSyDTlEZj_76fUYtBv3f9h44z3neT9dtYi_M
VITE_FIREBASE_AUTH_DOMAIN=rotz-image-generator.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=rotz-image-generator
VITE_FIREBASE_STORAGE_BUCKET=rotz-image-generator.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=212327958282
VITE_FIREBASE_APP_ID=1:212327958282:web:e037abfc88d944ec9a1cf3
VITE_FIREBASE_MEASUREMENT_ID=G-0000000000

# Webhook Configuration - WORKING API KEY
VITE_WEBHOOK_API_KEY=5KmF2ceOOza5lMAUZC3RaufVj7A4fpJNN3V9CyZpgfggpek9AF
```

**Webhook Details:**
- **Endpoint:** https://agents.rotz.ai/webhook/a7ff7b82-67b5-4e98-adfd-132f1f100496
- **Authentication:** Header key: `key` with value: `5KmF2ceOOza5lMAUZC3RaufVj7A4fpJNN3V9CyZpgfggpek9AF`
- **N8N Instance:** agents.rotz.ai
- **Status:** WORKING - Authentication successful ✅

---

## 📈 RECENT SESSION UPDATES

### August 28, 2025 - Video Timeout Fix & Code Quality Improvements (v1.11.1)

**Objective:** Fix critical video generation timeout issue and improve code structure

**🔥 CRITICAL VIDEO TIMEOUT FIX:**
1. **✅ Issue Identified:** Video/img2video timing out after 60 seconds with "Network error during video generation"
2. **✅ Root Cause:** Artificial 45-second timeout + polling mechanism was cancelling N8N webhook requests
3. **✅ Solution Applied:** Reverted to proven no-timeout approach from git history (commits 78612d8, 6c297dd)
4. **✅ Technical Implementation:**
   - Removed 45-second artificial timeout for videos/img2video
   - Removed polling mechanism that was causing request cancellation
   - Videos now use `signal: undefined` (no AbortController timeout)
   - Enhanced fetch options: `keepalive: true`, `Connection: keep-alive` headers
   - Images keep existing 2-minute timeout (unchanged)

**🛠️ CODE STRUCTURE IMPROVEMENTS:**
1. **✅ ESLint Warnings Reduced:** 8 → 3 warnings (62% improvement)
2. **✅ UI Component Refactoring:** Separated variants into dedicated files:
   - `src/components/ui/badge-variants.ts`
   - `src/components/ui/button-variants.ts`
   - `src/components/ui/toggle-variants.ts`
   - `src/components/ui/navigation-menu-styles.ts`
   - `src/components/ui/toast-utils.ts`
3. **✅ Import Updates:** Fixed component imports across alert-dialog, calendar, pagination files

**📋 SESSION WORKFLOW:**
- **Investigation:** Used git history analysis to find working solution pre-img2video
- **Testing:** Build + TypeScript + ESLint validation at each step
- **Version Management:** Bumped to v1.11.1 for video timeout fix release
- **Git Commits:** 
  - `633e240` - Video timeout fix + code structure improvements
  - `0c15d3e` - Version bump to 1.11.1
- **GitHub Release:** Created v1.11.1 with detailed changelog
- **Deployment:** Successfully deployed to production

**RESULT:**
- ✅ Videos complete successfully in 2-5 minutes without browser timeout
- ✅ All generation modes working (video, img2video, image, reference images)
- ✅ Cleaner code architecture with separated component variants
- ✅ Production deployment stable and verified

**Remaining Status:**
- ⚠️ 3 ESLint warnings (cosmetic, decided to leave as-is)
- ✅ All functionality working perfectly
- ✅ Build/TypeScript: No errors

### August 27, 2025 - Image 2 Video Configuration Enhancement

**Objective:** Add video configuration options to the Image 2 Video feature

**Changes Made:**
1. **✅ Extended Video Configuration UI** - Modified UI visibility condition from `generationMode === 'video'` to `(generationMode === 'video' || generationMode === 'img2video')` in line 2135
2. **✅ Enhanced Webhook Payload** - Updated webhook payload to include video settings for img2video mode in generation_settings section (line 1077)
3. **✅ Updated History Storage** - Modified history saving logic to store video settings for img2video generations (lines 1470 and 1522)

**Features Added to Image 2 Video Mode:**
- **Duration Control**: 3-30 seconds (slider with 1-second increments)
- **Frame Rate Options**: 12, 24, 30, 60 FPS via dropdown
- **Audio Toggle**: Silent/With Audio button selection
- **Resolution Options**: 480p, 720p, 1080p via dropdown

**Technical Implementation:**
- All video configuration controls now appear when user selects "Image 2 Video" mode
- Video settings are sent to N8N webhook with proper formatting
- Generated img2video results save with complete video configuration metadata
- Maintains 100% backward compatibility with existing video and image modes

**Webhook Payload Enhancement:**
```javascript
// Video settings now included for both 'video' and 'img2video' modes
...((generationMode === 'video' || generationMode === 'img2video') && {
  video_duration: videoDuration,
  video_fps: videoFps, 
  video_format: "mp4",
  video_audio: videoWithAudio,
  audio_state: videoWithAudio ? "with_audio" : "without_audio",
  video_resolution: videoResolution
})
```

**Deployment Status:**
- ✅ Build successful - No compilation errors
- ✅ Production deployed - https://rotz-image-generator.web.app
- ✅ All functionality verified working
- ✅ Image 2 Video mode now shows full video configuration options
- ✅ Video settings properly sent to webhook for img2video generations

**Result:** Users can now configure video output parameters (duration, fps, audio, resolution) when converting images to videos, providing complete control over the generated video quality and specifications.