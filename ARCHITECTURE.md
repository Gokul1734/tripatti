# Tripatti - Complete Trip Expense Splitting App

## Overview
Tripatti is a full-featured expense splitting app for group trips. It allows anyone to create trips, join via invite codes, create and manage expense splits, track payments, and settle debts with a focus on simplicity and clarity.

## Complete User Flow

### 1. **Authentication** (AuthPage)
- Users authenticate via email/password or social login (Lovable Cloud Auth)
- Profile auto-created with display name and avatar
- User ID stored for all subsequent operations

### 2. **Trips Management** (TripsPage)
#### Create a Trip
- User enters: Trip name, emoji, currency
- System generates unique 6-char invite code
- User auto-added as first member with color assignment
- Can share code to invite others

#### Join a Trip
- User enters trip code
- System validates code, checks if already member
- New member added with assigned color from `MEMBER_COLORS` array
- User auto-subscribes to push notifications

### 3. **Trip Dashboard** (TripDetailPage)
Shows complete trip status:
- **Summary Stats**: Total paid amount, member count, unsettled payment count
- **Members Section**: Each member card shows:
  - First name + color-coded initial
  - Outstanding amount to pay (red)
  - Outstanding amount to receive (green)
  - Pending payments with badges (amber)

### 4. **Expense Management**

#### Creating a Split
- **Anyone** in the trip can create an expense
- Steps:
  1. Specify amount, description, category
  2. Select who paid (default: current user)
  3. Select members to split among (default: all)
  4. System calculates per-person share
  5. Expense created with splits inserted for each member
  6. Split creator notified via push

**Data Structure**:
```
expenses: { id, trip_id, description, amount, paid_by_member_id, created_by, category, ... }
expense_splits: { id, expense_id, member_id }
```

#### Editing a Split
- Only **split creator** can edit
- Form pre-fills with current values
- On save: updates expense record, replaces all splits

#### Deleting a Split
- Only **split creator** can delete
- Deletes: expense_splits rows + expense row
- Confirmation required

#### Viewing Splits (Inline Expansion)
- Each expense card has a "Details" button
- Click to expand and see:
  - Member avatar + name
  - Their share amount
  - Payment status for that split
  - Action buttons based on role

### 5. **Payment Management** (Per-Split)

Each split in the expansion view shows one of these statuses:

#### For Split Member (owing person):
- **No payment yet**: "Mark Paid" button
  - Creates payment row with `confirmed_by_payer=true`
  - Payer notified via push
  
- **Payment marked by payer**: "Confirm Paid" button (for owning member after payer marks)
  - Sets `confirmed_by_receiver=true`
  - Marks split as "Settled"

#### For Split Creator (expense creator):
- Can see "Remind" button (Bell icon) for any unpaid split
  - Sends push notification to defaulter with amount and payer name
  - Only appears when split has no payment yet

#### For Payer (paid_by_member_id):
- Sees "Confirm" button when member marks paid
  - Sets `confirmed_by_receiver=true` to confirm receipt

**Payment Row Structure**:
```
payments: {
  id, trip_id, from_member_id, to_member_id, amount,
  confirmed_by_payer (bool), confirmed_by_receiver (bool)
}
```

### 6. **Settlement Tracking** (Settlements Page)

This page calculates **minimum transfers needed**:
- Aggregates all expenses + splits
- Calculates per-member balance (who owes whom overall)
- Uses deque algorithm to find min transfers
- Shows pending vs. settled transfers
- Users can mark payments and confirm from this view

### 7. **Push Notifications**

Triggered by:
- Expense created: Notifies all split members + payer
- Payment marked: Payer notified when member marks paid
- Payment confirmed: Receiver notified when payer confirms
- Remind button: Split creator sends custom reminder to defaulter

Uses Edge Function at `/functions/push-notifications`:
- Actions: `send-notification` (all trip members), `send-notification-to-user` (single member)
- Reads VAPID keys from environment
- Stores subscriptions in `push_subscriptions` table

---

## Data Model & RLS Policies

### Tables
| Table | Purpose | Key RLS |
|-------|---------|---------|
| `trips` | Trip metadata | Trip members can view; creator can manage |
| `trip_members` | Membership tracking | Members can view/manage own; join via invite code |
| `expenses` | Expense records | Trip members can create/view; creator can update/delete |
| `expense_splits` | Split assignments | Trip members can manage |
| `payments` | Payment tracking | Trip members can view/create/update |
| `push_subscriptions` | Push endpoints | Users manage own subscriptions |

### Key RLS Policies
✅ Trip members can view trips
✅ Trip members can create expenses
✅ **Expense creator can update** (ADDED: `/migrations/20260414000001_add_expense_update_policy.sql`)
✅ **Expense creator can delete**
✅ Trip members can manage splits
✅ Trip members can manage payments

---

## Feature Checklist

### ✅ Implemented Features
- [x] Create trips with invite codes
- [x] Join trips via code
- [x] Anyone can create expense splits
- [x] Expense edit by creator
- [x] Expense delete by creator
- [x] Inline expansion of splits
- [x] Per-split payment marking (Mark Paid)
- [x] Per-split payment confirmation (Confirm)
- [x] Push notifications for payments
- [x] Remind defaulters (Bell icon)
- [x] Per-member pay/receive totals with pending badges
- [x] Settlement page with min-transfer algorithm
- [x] Summary stats (total paid, members, unsettled)
- [x] Offline support (sync queue)
- [x] Service worker for push
- [x] Auto-subscribe to push on login

### 🔍 Validations & Edge Cases
- [x] Prevent duplicate trip joins
- [x] Prevent editing own payment confirmation
- [x] Prevent non-creators from editing/deleting expenses
- [x] Handle empty expense splits gracefully
- [x] Prevent circular payments
- [x] Duplicate split prevention (UNIQUE constraint)

---

## Database Setup

### Required Migrations (in order)
1. `20260413021857_*.sql` - Initial schema (trips, expenses, splits, payments, push_subscriptions, RLS)
2. `20260414000001_add_expense_update_policy.sql` - Add UPDATE policy for expense creators

### Deploy Migrations
```bash
npx supabase migration up
```

### Environment Variables
```
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_ANON_KEY=your-anon-key
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (for Edge Function)
```

---

## API Endpoints

### Push Notifications Edge Function
**POST** `/functions/v1/push-notifications`

**Actions**:
- `send-notification`: Notify all trip members
  ```json
  { "action": "send-notification", "tripId": "...", "title": "...", "message": "...", "excludeUserId": "..." }
  ```
- `send-notification-to-user`: Notify specific user
  ```json
  { "action": "send-notification-to-user", "toUserId": "...", "title": "...", "message": "..." }
  ```
- `get-vapid-key`: Retrieve public VAPID key
  ```json
  { "action": "get-vapid-key" }
  ```

---

## Component Structure

```
src/pages/
  └─ Index.tsx (tab router, push subscription trigger)

src/components/
  ├─ TripsPage.tsx (create/join trips)
  ├─ TripDetailPage.tsx (dashboard + expense management)
  ├─ AddExpensePage.tsx (create/edit expenses)
  ├─ SettlePage.tsx (settlement calculations)
  ├─ AuthPage.tsx (login/signup)
  ├─ BottomNav.tsx (navigation)
  └─ MobileShell.tsx (layout wrapper)

src/hooks/
  ├─ useAuth.tsx (auth context)
  ├─ useTrips.tsx (trips + realtime subscriptions)
  └─ use-toast.ts (toast notifications)

src/lib/
  ├─ push-notifications.ts (client push setup)
  ├─ sounds.ts (UI feedback sounds)
  ├─ offline-sync.ts (offline queue)
  └─ calculations.ts (balance/settlement math)

src/integrations/supabase/
  ├─ client.ts (supabase client)
  └─ types.ts (database types)
```

---

## Testing Checklist

### E2E Flow
- [ ] Create trip → Join trip → Create split → Mark paid → Confirm → See settled ✓

### Per-User Roles
- [ ] Expense creator can: edit, delete, remind defaulters
- [ ] Owing member can: mark as paid, confirm payment
- [ ] Payer can: confirm receipt of payment
- [ ] Other members can: view splits, see own balance

### Push Notifications
- [ ] Service worker registers on login
- [ ] Notification sent when split created
- [ ] Notification sent when payment marked
- [ ] Remind button sends custom notification
- [ ] Notifications work on mobile (iOS/Android)

### Edge Cases
- [ ] Empty trip (no expenses) shows "Add Expense"
- [ ] Split with single member works
- [ ] Currency formatting correct for different regions
- [ ] Offline mode queues operations
- [ ] RLS blocks unauthorized access (tested via SQL console)

---

## Known Limitations & Future Improvements

### Current
- Payments matched by amount (could add `expense_id` foreign key for robustness)
- Simple push sender (could use web-push library for production)
- No expense request/approval workflow
- No tips/partial payments

### Recommended Enhancements
1. **Expense ID linking**: Add `expense_id` to `payments` table
2. **Robust push**: Replace fetch-based sender with web-push library
3. **Activity log**: Show who did what and when
4. **Photo receipts**: Store receipt images
5. **Recurring expenses**: Auto-split monthly bills
6. **Export**: PDF/CSV of expenses and settlements
7. **Admin controls**: Trip creator can remove members, freeze expenses

---

## Deployment

### Frontend
```bash
npm run build
```
Deploy `dist/` to Vercel / Netlify / GitHub Pages

### Backend
Supabase handles Edge Functions deployment automatically when pushed to git.

### Environment
- Set `VITE_SUPABASE_PROJECT_ID` and keys in deployment platform
- Set VAPID keys and `SUPABASE_SERVICE_ROLE_KEY` in Supabase Edge Function secrets

---

## Support & Debugging

### Common Issues

**Expense edit fails**
- Check: RLS policy exists in DB
- Run: `20260414000001_add_expense_update_policy.sql` migration

**Push notifications not received**
- Check: Service worker registered (`/sw.js`)
- Check: User subscribed (check `push_subscriptions` table)
- Check: VAPID keys set in function

**Payments not recorded**
- Check: User is trip member (not permissions error)
- Check: Payment row created with correct member IDs
- Browser console for network errors

**Realtime updates not working**
- Check: Realtime enabled in Supabase
- Check: Tables added to publication (`supabase_realtime`)
- Check: Auth user matches trip member

---

**Build Date**: April 14, 2026  
**Version**: 1.0.0
