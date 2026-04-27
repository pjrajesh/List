# SmartCart - Shopping List App

## Original Problem Statement
User built a shopping list app and requested: (1) code review with honest feedback, and (2) fresh redesigned frontend screens covering all flows.

## Architecture
- **Frontend**: Expo React Native (SDK 54), expo-router v6, TypeScript
- **Routing**: File-based expo-router with `app/(tabs)/` group
- **State**: Local React useState per screen
- **Mock Data**: `/app/frontend/src/data/mockData.ts`
- **Design System**: `/app/frontend/src/constants/theme.ts`

## Design System
- **Primary**: #0B6E4F (Deep Spinach Green)
- **Secondary**: #FA6400 (Saffron Orange)
- **Background**: #F9F8F4 (Warm Cream)
- **Theme**: Fresh Indian Market (Blinkit/Zepto elevated)

## Screens Implemented (2026-04-27)

### 1. Home/List Screen (`app/(tabs)/index.tsx`)
- Green budget card: current spend vs budget with progress bar
- Orange AI insight pill (top spending category)
- Personal/Family tab toggle
- FlatList of items with: checkboxes, category emoji chips, prices
- Checked items auto-sort to bottom with strikethrough
- Add Price modal for unpriced items
- FAB to open Add Item Sheet

### 2. Add Item Bottom Sheet (`src/components/AddItemSheet.tsx`)
- Spring-animated slide-up modal
- Text input for item name
- Price input (optional)
- Horizontal category chip selector (9 categories)
- Orange Voice button (simulated 2.5s recording)
- Orange Scan button (alert placeholder)
- Green Add Item button

### 3. History Screen (`app/(tabs)/history.tsx`)
- Green summary card: total spend, trips, items, avg per trip
- +19% vs last month badge
- Expandable trip cards with items and prices
- LayoutAnimation smooth expand/collapse

### 4. Insights Screen (`app/(tabs)/insights.tsx`)
- Month selector (Feb/Mar/Apr)
- Green hero spend card
- Weekly bar chart (custom ViewBased bars)
- Category breakdown with colored horizontal bars + emoji
- Smart Tips cards

### 5. Profile Screen (`app/(tabs)/profile.tsx`)
- User avatar + name card
- Green budget card with edit modal
- My Lists section (Personal + Family)
- Settings (Notifications toggle, Dark Mode toggle, Currency, Language, Export, About)
- Sign Out button

### 6. Custom Tab Bar (`src/components/CustomTabBar.tsx`)
- Floating pill design with shadow
- Active state: green background pill under icon
- 4 tabs: List, History, Insights, Profile

## What's Been Implemented
- [x] Fresh premium design (green/orange/cream palette)
- [x] All 5 screens + Add Item sheet
- [x] Custom floating tab navigation (flow-based, sticky)
- [x] Interactive checkboxes with animation
- [x] Add price modal flow
- [x] Budget progress tracking
- [x] Dynamic AI insight (auto-calculates top category)
- [x] Expandable history cards
- [x] Custom bar charts
- [x] Full settings page with working toggles
- [x] Sticky bottom navbar (flow-based, not absolute)
- [x] FAB properly positioned (bottom:20, not touching navbar)
- [x] No duplicate profile icon (header has only ... menu)
- [x] List Options sheet: clear checked / clear entire list (no history pollution)
- [x] Swipe left to delete items
- [x] Swipe right / long press to edit items (name, price, category)
- [x] Edit Item modal with pre-populated values
- [x] Rich empty state: animated floating cart, food emoji badges, Add Item CTA, Voice/Scan buttons, Quick Add chips (Milk, Eggs, Atta, Tomatoes, Onions, Bananas)

## Prioritized Backlog

### P0 (Connect to real backend)
- [ ] Replace mock data with Supabase queries
- [ ] Connect voice to expo-av → Supabase transcribe edge function
- [ ] Connect scan to camera → Supabase scan-receipt edge function
- [ ] Real-time Family list sync (Supabase realtime)

### P1 (Core feature gaps)
- [ ] Swipe to delete items
- [ ] Reorder items (drag and drop)
- [ ] List sharing / invite family members
- [ ] Offline-first sync indicator
- [ ] Price history per item ("Milk was ₹65 last time")

### P2 (Enhancements)
- [ ] Dark mode implementation
- [ ] WhatsApp share list feature
- [ ] Smart suggestions ("You always buy Milk - add it?")
- [ ] Budget notifications
- [ ] Multi-language support (Hindi, Tamil, etc.)

## Next Tasks
1. Connect Supabase backend to replace mock data
2. Implement real voice recording with expo-av
3. Add swipe-to-delete on list items
4. Implement real-time family sync
