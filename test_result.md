#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Shopping list app — Listorix. Latest sprint (Message 193): Remove obstructing scan camera FAB,
  enable bulk multi-line item entry, update profile screen support links, and make Notifications,
  Dark Mode and Currency toggles actually work. OpenAI/Supabase integrations deferred to next sprint
  (will be proxied via FastAPI backend).

frontend:
  - task: "Remove tertiary Scan FAB from home"
    implemented: true
    working: true
    file: "/app/frontend/app/(tabs)/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Scan FAB removed; only the orange + FAB remains. Verified visually via screenshot."

  - task: "Bulk multi-line add (Add Item Sheet)"
    implemented: true
    working: true
    file: "/app/frontend/src/components/AddItemSheet.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Added Single/Bulk toggle chip. Bulk mode accepts newline- or comma-separated items, parses live count, button changes to 'Add N items'. Each item gets keyword-based category auto-detection. Verified — entered 'Milk\\nBread\\nEggs' and button correctly showed 'Add 3 items'."

  - task: "Profile — Send Feedback / Contact Support / Terms / Privacy"
    implemented: true
    working: true
    file: "/app/frontend/app/(tabs)/profile.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "New 'Support' section with 4 actionable rows: Send Feedback (expo-mail-composer + mailto fallback to support@Listorix.com), Contact Support (mailto), Terms of Service & Privacy Policy (open via expo-web-browser). All wired and visible."

  - task: "Dark Mode (system / light / dark)"
    implemented: true
    working: true
    file: "/app/frontend/src/store/settings.tsx, /app/frontend/src/constants/theme.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Built full ThemeContext with light/dark palettes. All screens (home, history, insights, profile, tab bar, empty state, add sheet, modals) refactored to consume useTheme() with memoized createStyles(colors). Theme picker bottom sheet allows System/Light/Dark. Selection persists via AsyncStorage. Verified — switched to Dark, entire UI flips correctly, status bar updates."

  - task: "Currency toggle (INR/USD/EUR/GBP/AED/JPY/CAD/AUD)"
    implemented: true
    working: true
    file: "/app/frontend/src/utils/currency.ts, /app/frontend/app/(tabs)/profile.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Created formatCurrency(amount, code) using locale-aware toLocaleString. Bottom sheet picker with 8 currencies & flag emojis. Replaced all hardcoded ₹ with formatCurrency throughout home/history/insights/profile. Symbol updates everywhere on selection. Verified — switched to USD, all amounts re-render with $ prefix."

  - task: "Notifications toggle with permission request + daily reminder"
    implemented: true
    working: true
    file: "/app/frontend/src/utils/notifications.ts, /app/frontend/src/store/settings.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "expo-notifications wired. On toggle ON: requests permission, schedules daily 6 PM repeating reminder, fires confirmation notification. On toggle OFF: cancels all scheduled notifications. State persists. iOS NSMicrophoneUsageDescription + Android NOTIFICATIONS/RECORD_AUDIO permissions added to app.json."

  - task: "Settings persistence (AsyncStorage)"
    implemented: true
    working: true
    file: "/app/frontend/src/store/settings.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Theme mode, currency, notifications, budget all persist to @listorix:settings:v1 via AsyncStorage and re-hydrate on launch."

backend:
  - task: "OpenAI proxy endpoints (voice/vision)"
    implemented: false
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Deferred to next sprint per user request (P0+P1 only this sprint). Will proxy through FastAPI backend when user provides OpenAI key."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 3
  run_ui: false

test_plan:
  current_focus:
    - "Bulk multi-line add"
    - "Dark Mode (system / light / dark)"
    - "Currency toggle"
    - "Notifications toggle"
    - "Profile — Support links"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: |
        Sprint complete: Family Sharing with Supabase (auth + RLS + Realtime).

        SHIPPED:
        - Sapphire & Champagne Gold premium palette (light + dark). Deep #1E3A8A primary,
          #C9A86A gold accent, warm ivory #FAFAF7 background.
        - Supabase client with SecureStore persistence (AsyncStorage fallback on web)
        - Auth screens: Welcome, Sign up, Log in (email+password via Supabase)
        - Route guards in root _layout.tsx using expo-router segments
        - Data APIs: /api/groups, /api/items (CRUD + bulk)
        - Groups management modal (app/groups.tsx): list/create/invite/leave/delete
        - Invite flow: generates https://listorix.com/join/<token> → native Share sheet
        - Deep link handler: accepts listorix:// and https://listorix.com/join/* URLs, auto-joins group via accept_invite RPC
        - Group switcher pill at top of home, routes to /groups modal
        - Home refactored to use Supabase items scoped by currentGroupId (null = Personal, else = group)
        - Supabase Realtime subscription on items table → live sync + LOCAL notification when another member adds
        - Profile updated to use Supabase user + sign out + "Manage groups" link
        - Personal list stays private (owner_id-scoped, group_id null)

        REQUIRES USER ACTION:
        1. Run /app/supabase/schema.sql in Supabase SQL editor (creates tables, RLS, triggers, accept_invite RPC, enables Realtime on items + group_members)
        2. In Supabase Auth settings, optionally disable "Confirm email" for frictionless signup during testing, or leave it on and have users confirm via email link

        KNOWN LIMITATIONS:
        - Push notifications in background: requires Edge Function + device_tokens wiring (deferred; currently we do LOCAL notifications on realtime events while app is open)
        - Google/Apple OAuth: email+password works now; OAuth providers need configuring in Supabase dashboard
        - Universal link AASA/Digital Asset Links: not hosted on listorix.com yet — for now link opens via scheme listorix:// in Expo Go/dev build

        PENDING VERIFICATION:
        - Full signup → invite → accept flow end-to-end (needs user to run schema.sql first)


backend:
  - task: "Remote Push Notifications via Expo Push API"
    implemented: true
    working: "NA"
    file: "/app/backend/notifications.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: |
            Built FastAPI router /api/notifications/send + /api/notifications/health.
            Reads device_tokens & notification_preferences from Supabase using SUPABASE_SERVICE_ROLE_KEY.
            Resolves audience (group members minus sender), filters by mute / per-event toggle / quiet hours,
            then batches messages to Expo Push API (https://exp.host/--/api/v2/push/send).
            JWT auth: validates Bearer token via Supabase /auth/v1/user.
            REQUIRES USER ACTION: set SUPABASE_SERVICE_ROLE_KEY in /app/backend/.env and run
            /app/supabase/notifications_schema.sql in Supabase SQL editor.
        - working: "NA"
          agent: "main"
          comment: |
            User has now set SUPABASE_SERVICE_ROLE_KEY in /app/backend/.env and run
            /app/supabase/notifications_schema.sql successfully. Backend health endpoint
            /api/notifications/health returns supabase_configured=true. Ready for backend testing.
            Test plan:
              1. GET /api/notifications/health → 200, supabase_configured=true
              2. POST /api/notifications/send WITHOUT auth → 401
              3. POST /api/notifications/send with INVALID Bearer → 401
              4. Sign up a test user via Supabase auth REST (POST {SUPABASE_URL}/auth/v1/signup
                 with apikey=SUPABASE_ANON_KEY), grab access_token from response.
              5. POST /api/notifications/send with valid JWT but no group/no target_user_ids
                 → 200 with sent=0 (empty audience).
              6. POST /api/notifications/send with valid JWT and target_user_ids=[caller_id]
                 (excluded as sender) → 200 with sent=0.
              7. POST /api/notifications/send with valid JWT and target_user_ids=[caller_id]
                 + exclude_user_id="00000000-0000-0000-0000-000000000000" so caller IS targeted.
                 No device_tokens row yet → 200 with sent=0, skipped_no_token>=1.
              8. Verify Pydantic event enum rejects bogus event values (422).
            Supabase URL = https://vdvrkzeproulsrbguhgt.supabase.co
            ANON key = sb_publishable_lZ0cJid7KN-z7yzhikxKPQ_LRfSwTlA
            Backend base = http://localhost:8001  (also reachable via /api ingress)
        - working: true
          agent: "testing"
          comment: |
            Full backend test run executed via curl against http://localhost:8001/api/notifications/*.
            All 11 scenarios from the review request PASSED.

            1) GET /api/notifications/health → 200
               {"ok":true,"supabase_configured":true,"supabase_url_set":true,"service_key_set":true}

            2a) POST /send no Authorization header → 401 {"detail":"Missing bearer token"}
            2b) POST /send Bearer "not-a-real-jwt"  → 401 {"detail":"Invalid auth token"}
            2c) POST /send (valid JWT) event:"totally_bogus" → 422 with Pydantic literal_error listing the 5 valid events.
                NOTE: with an INVALID bearer the auth dependency rejects with 401 before body validation runs (FastAPI resolves Header dependencies before body Pydantic validation in this code path), so to exercise the 422 contract a valid JWT is required. With valid JWT, 422 is correctly returned. Behavior is acceptable.
            2d) POST /send (valid JWT) missing title/body → 422 missing-field error for both "title" and "body".

            3) Real Supabase JWT acquired via POST {SUPABASE_URL}/auth/v1/signup with apikey=ANON.
               Test user: notif_test_1bab5459@listorix.dev
               caller_id (user.id) = 97bd1c92-2c60-4b4a-abac-96402ff6e837
               access_token returned directly (email confirmation disabled, as expected).
               Default notification_preferences row was auto-created by the SQL trigger — confirmed via downstream PATCH responses (204 No Content => row found and updated).

            4a) Empty audience → 200, sent=0, all skipped_*=0, error=null. ✓
            4b) target_user_ids=[caller_id] (caller auto-excluded as sender) → 200, sent=0, all skipped_*=0. ✓
            4c) target_user_ids=[caller_id], exclude_user_id="00000000-..." (force include caller, no device_tokens registered) → 200, sent=0, skipped_no_token=1. ✓
                Proves backend successfully queried notification_preferences AND device_tokens via SUPABASE_SERVICE_ROLE_KEY.

            4d) PATCH item_added=false (PostgREST 204), then repeat 4c → 200, sent=0, skipped_pref_off=1. ✓ Reset to true (204).
            4e) PATCH muted=true (204), then repeat 4c → 200, sent=0, skipped_muted=1. ✓ Reset muted=false (204).
            4f) PATCH quiet_enabled=true, quiet_start=0, quiet_end=23 (204), then repeat 4c → 200, sent=0, skipped_quiet=1. ✓ Reset quiet_enabled=false (204).

            CONCLUSIONS:
            - JWT verification via /auth/v1/user works.
            - Audience resolution (target_user_ids path), sender auto-exclusion, and exclude_user_id override all behave per spec.
            - Service-role reads of notification_preferences and device_tokens succeed (RLS bypassed correctly).
            - Per-event preference filter, master mute filter, and quiet-hours filter each independently produce the correct skip counter.
            - Pydantic Literal validates the 5 allowed event types; required fields enforced.
            - SUPABASE_SERVICE_ROLE_KEY is loaded server-side only; never exposed in any response payload.
            - Test user left in place (harmless). No code changes were made to backend.

            STATUS: /api/notifications/send and /api/notifications/health are working as designed. Marking working: true and needs_retesting: false.



frontend:
  - task: "Push token registration + notification preferences UI"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/notifications-settings.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: |
            New screen /notifications-settings with master mute, per-event toggles
            (item_added, item_checked, member_joined, invite_received, suggestion_reminders),
            quiet hours start/end picker, and test notification button. Profile screen now links here.
            src/lib/push.ts registers Expo push token on auth state SIGNED_IN and stores in device_tokens.
            src/api/notifications.ts client + preference fetch/update.
            Hooked events: index.tsx item add/check, _layout.tsx member_joined on accept_invite.
            NOTE: Remote push tokens require a development build — Expo Go SDK 53+ no longer supports them.
