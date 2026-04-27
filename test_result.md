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
        P0 + P1 sprint complete. Removed obstructing Scan FAB. Implemented bulk add, full dark mode
        (with theme picker + AsyncStorage persistence), 8-currency picker with locale-aware formatting,
        and working notifications toggle (perm request + daily reminder). Profile screen updated with
        Send Feedback, Contact Support (support@Listorix.com), Terms, Privacy. All verified visually.
        OpenAI/Supabase integrations remain for next sprint per user direction.
