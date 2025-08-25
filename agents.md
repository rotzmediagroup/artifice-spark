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

### 🔄 CURRENT SESSION LOG
**Date:** August 25, 2025  
**Time Started:** 14:30 UTC  
**Objective:** Emergency UI recovery and establishing UI protection guidelines

#### Changes Made This Session:
- [x] Reverted to commit `e15457b` to restore working UI after accidental UI breakage
- [x] Created comprehensive agents.md file with critical UI protection rules
- [x] Established strict guidelines prohibiting UI changes without explicit permission
- [x] Documented safe vs forbidden modification areas
- [x] Successfully deployed working UI state to production

#### Issues Encountered:
- **Issue:** UI was accidentally broken when attempting to fix admin panel hover color
- **Solution:** Performed git reset --hard to commit e15457b and redeployed immediately
- **Files Modified:** Created agents.md (new file)

#### UI Impact Assessment:
- **UI Changes Made:** NONE - Reverted all changes to restore original UI
- **Visual Verification:** UI restored to original working state at commit e15457b
- **User Approval:** User demanded immediate revert due to UI breakage

#### Deployment Status:
- [x] Build successful
- [x] Production deployed - https://rotz-image-generator.web.app
- [x] Functionality verified
- [x] UI integrity confirmed - restored to working state

---

## 🎯 CURRENT APPLICATION STATE (August 25, 2025)

### 📍 WHERE WE LEFT OFF:

#### **Current Git State:**
- **Branch:** main
- **Current Commit:** e964ee0 (agents.md creation)
- **Base Working Commit:** e15457b (known working UI state)
- **Deployment:** Live at https://rotz-image-generator.web.app

#### **Pending Issues to Address (WITHOUT UI CHANGES):**

1. **jerome@rotz.host Admin Issues:**
   - **Hover Color Problem:** White text on white background in admin table (needs fixing WITHOUT changing overall UI)
   - **User Deletion Not Working:** Permission/functionality issue preventing user deletion
   - **Approach:** Add targeted fixes to specific elements only with user approval

2. **Video Generation Timeout Fix:**
   - **Status:** NOT APPLIED in current deployment (reverted with UI fix)
   - **Issue:** False "Network error during video generation" messages
   - **Solution Ready:** Remove timeouts for videos, keep heartbeat mechanism
   - **Location:** Would modify src/components/ImageGenerator.tsx handleGenerate function

3. **Video Download Fix:**
   - **Status:** NOT APPLIED in current deployment (reverted with UI fix)
   - **Issue:** Download button for videos not working
   - **Solution Ready:** Add proper .mp4 filename parameter to download calls

#### **Working Features:**
- ✅ Image generation with all styles
- ✅ User authentication and profiles
- ✅ Credit system (image and video credits)
- ✅ Admin panel accessible to jerome@rotz.host
- ✅ Image history and management
- ✅ Share functionality for images/videos
- ❌ Video download buttons (known issue)
- ❌ Video generation timeout handling (known issue)

#### **Technology Stack:**
- **Frontend:** React 18 + TypeScript + Vite
- **UI:** shadcn-ui + Tailwind CSS (DO NOT MODIFY)
- **Backend:** Firebase (Firestore, Auth, Storage)
- **Deployment:** Firebase Hosting
- **API:** N8N webhook for image/video generation

#### **Key Files and Their States:**
- `src/components/ImageGenerator.tsx` - Main UI (DO NOT TOUCH without permission)
- `src/components/AdminPanel.tsx` - Has hover color issue on line 392
- `src/hooks/useUserManagement.ts` - Has deleteUser function that needs debugging
- `src/hooks/useAdmin.ts` - Admin verification logic
- `firestore.rules` - Security rules for jerome@rotz.host

#### **Next Session Should:**
1. Read this agents.md file first
2. Verify current deployment state
3. Ask user which specific issue to address
4. Use ExitPlanMode for any changes
5. Make ONLY backend/logic changes unless UI changes explicitly requested
6. Test thoroughly before deployment
7. Update this section with new progress

#### **Safe Commands to Start Next Session:**
```bash
# Check current state
git status
git log --oneline -5

# Start development
npm run dev

# Test build
npm run build

# Deploy (only after testing)
npm run firebase:deploy
```

#### **CRITICAL REMINDERS:**
- 🚨 NO UI CHANGES without explicit "change the UI" instruction
- 🚨 Current UI is working - DO NOT MODIFY design/styling
- ✅ Backend improvements are safe
- ✅ Console logging and debugging are safe
- ⚠️ Always use ExitPlanMode for planning changes

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

**This agents.md file is the single source of truth for development standards and must be updated after each session with progress and lessons learned.**