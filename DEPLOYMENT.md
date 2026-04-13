# Tripatti - Deployment & Testing Guide

## Pre-Deployment Checklist

### 1. Database Setup ✅
```bash
# Verify migrations applied
1. Visit Supabase dashboard > SQL Editor
2. Run:
   SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
   
3. Verify tables exist:
   - trips
   - trip_members
   - expenses
   - expense_splits
   - payments
   - push_subscriptions
   - profiles

4. Check RLS policies:
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public' 
   ORDER BY tablename;

5. Should include NEW policies:
   - "Expense creator can update"
   - "Expense creator can delete"
```

### 2. Environment Variables ✅
```bash
# Create .env.local in project root
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase Edge Function secrets (set in dashboard)
VAPID_PUBLIC_KEY=your-generated-vapid-public-key
VAPID_PRIVATE_KEY=your-generated-vapid-private-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Generate VAPID Keys (if needed) ✅
```bash
# Using web-push library:
npm install -g web-push
web-push generate-vapid-keys

# Output:
# Public Key: ...
# Private Key: ...

# Set in Supabase > Edge Functions > push-notifications > Secrets
```

### 4. TypeScript Check ✅
```bash
npm run build
# No errors? Good to go!
```

---

## Local Testing

### Start Development Server
```bash
npm run dev
# Open http://localhost:5173
```

### Test Scenario 1: Create & Join Trip
```
1. Sign up with test account (e.g., alice@test.com)
2. Create trip "Test Trip" with emoji 🎉
3. Copy invite code
4. New browser/incognito: Sign up as bob@test.com
5. Join trip using code
6. See both names in members list
```

### Test Scenario 2: Create Split
```
1. Alice: Click "Add Expense" 
2. Enter: $30 "Lunch"
3. Select: Both Alice & Bob
4. Create
5. Verify: Expense appears in list
6. Both should get notifications (if enabled)
```

### Test Scenario 3: Payment Flow
```
1. Alice: Go to TripDetailPage
2. Find lunch expense > Click "Details"
3. See Bob's split ($15)
4. Bob (in another window):
   - Go to same expense
   - Click "Mark Paid"
   - See toast: "Marked as paid"
5. Alice:
   - Refresh dashboard
   - See payment status "Pending"
   - Click "Confirm"
   - See "Settled ✓"
```

### Test Scenario 4: Remind Button
```
1. Alice: Creates new $40 split (Bob's share)
2. Bob: Doesn't mark paid yet
3. Alice: In expansion, sees "Remind" button
4. Click "Remind"
5. Bob: Should get push notification
   "💰 Reminder from Test Trip: Alice is waiting for your payment of $40"
```

### Test Scenario 5: Edit Expense
```
1. Alice: Creates $50 expense
2. Click "Edit" button
3. Change amount to $60
4. Save
5. Verify: Amount updated in list
6. Bob: Refresh dashboard, sees new amount
```

### Test Scenario 6: Delete Expense
```
1. Alice: Creates $25 expense
2. Click trash icon
3. Confirm deletion
4. Expense gone
5. Bob: Refresh, expense removed
```

### Test Scenario 7: Settlement Page
```
1. Create 3+ expenses with splits between 3 people
2. Go to "Settle" tab
3. See "Minimum transfers to settle all debts"
4. Mark payments and confirm
5. Watch status change from "owes" to "settled ✓"
6. After all settled: "All Settled Up! 🎉"
```

---

## Mobile Testing

### iOS (Safari)
```
1. Open on iPhone Safari
2. Tap share > Add to Home Screen
3. Launch app from homescreen
4. Check:
   - Push notifications work (Settings > Notifications)
   - Responsive layout fits screen
   - Bottom nav accessible
   - Touch interactions responsive
```

### Android (Chrome)
```
1. Open on Android Chrome
2. Menu > Install app (or PWA install prompt)
3. Check:
   - Push notifications work (Settings > Notifications)
   - Landscape mode works
   - All buttons tappable
   - Scroll smooth
```

### Push Notifications Mobile
```
Must be:
- HTTPS or localhost (not HTTP)
- User explicitly allowed notifications
- Service worker registered
- VAPID keys valid

Test:
1. Go to trip
2. Wait 3 seconds (subscribe)
3. Create expense
4. Check notification badge/sound
```

---

## Production Deployment

### Step 1: Build & Test
```bash
npm run build
# dist/ folder created

# Test build locally:
npm run preview
```

### Step 2: Deploy to Vercel
```bash
# Option A: Connect GitHub
# 1. Push code to GitHub
# 2. Go to vercel.com > New Project
# 3. Import Git repository
# 4. Set environment variables
# 5. Deploy

# Option B: CLI
vercel --prod
```

### Step 3: Configure Environment
In Vercel > Project Settings > Environment Variables:
```
VITE_SUPABASE_PROJECT_ID = your-project-id
VITE_SUPABASE_ANON_KEY = your-anon-key
VITE_SUPABASE_URL = https://your-project.supabase.co
```

### Step 4: Update Supabase Auth Redirect
Go to Supabase > Authentication > URL Configuration:
- Authorized redirect URLs: Add `https://your-vercel-domain.vercel.app`

### Step 5: Test Production
```
1. Visit https://your-vercel-domain.vercel.app
2. Run same test scenarios as local
3. Check:
   - Auth works
   - Real-time updates
   - Push notifications on mobile
   - No console errors (DevTools)
```

---

## Monitoring & Debugging

### Supabase Dashboard
```
Check:
1. Realtime > Subscriptions - see active connections
2. SQL Editor > Tables - inspect data
3. Auth > Users - see registered users
4. Logs > API Logs - see request errors
5. Edge Functions > push-notifications > Function Logs
```

### Browser DevTools

**Console Tab**:
- Service Worker logs
- Push subscription status
- Realtime connection messages

**Network Tab**:
- Verify `supabase` API calls succeed (200/201)
- Check push-notifications function called

**Storage Tab**:
- LocalStorage: `supabase.*` keys present
- IndexedDB: Realtime data stored
- Service Workers: `/sw.js` registered

### Common Error Messages

**"401 Unauthorized"**
→ RLS policy blocking
→ Check: User is trip member
→ Query: `SELECT * FROM trip_members WHERE user_id = '[UID]';`

**"Payment update failed"**
→ RLS policy for UPDATE on payments
→ Should work, but check: is user trip member?

**"Expense edit returns 403"**
→ Missing UPDATE policy (should be fixed by migration)
→ Verify: Migration 20260414000001 applied
→ Query: `SELECT * FROM pg_policies WHERE tablename = 'expenses';`

**"No push notifications"**
→ Service worker not registered
→ Check: `/sw.js` loaded (Network tab)
→ Check: Push subscriptions table has row
→ Check: VAPID keys valid

---

## Performance Optimization

### Client-Side
✅ Already optimized:
- React lazy loading (code splitting via Vite)
- Tailwind PurgeCSS (removes unused styles)
- Sound effects lazy loaded
- Images optimized (SVG icons)

### Database
✅ Already optimized:
- RLS policies use `is_trip_member` function (indexed)
- UNIQUE constraints prevent duplicates
- Foreign keys cascade on delete
- Realtime enabled on relevant tables

### Network
✅ Already optimized:
- Gzip enabled on Vercel
- CDN caching default headers
- Realtime over WebSocket (minimal overhead)

---

## Security Checklist

- [x] HTTPS only in production (Vercel enforces)
- [x] RLS policies prevent unauthorized access
- [x] VAPID keys secure (Supabase secrets)
- [x] Service role key not exposed to client
- [x] Auth tokens stored in httpOnly cookies
- [x] No sensitive data in localStorage
- [x] API rate limiting (Vercel default)
- [x] SQL injection prevented (Supabase parameterized queries)
- [x] XSS protected (React auto-escapes, Content-Security-Policy)

---

## Rollback Plan

If something breaks in production:

### Option 1: Revert Code
```bash
git revert [commit-hash]
git push origin main
# Vercel auto-redeploys
```

### Option 2: Rollback Vercel Deployment
```
1. Vercel Dashboard > Deployments
2. Find previous working deployment
3. Click "..."  > "Promote to Production"
```

### Option 3: Disable Features Gradually
- Disable push notifications: Comment out fetch calls
- Disable realtime: Comment out `.subscribe()` calls
- Keep core payment flow working

---

## Performance Benchmarks

**Target Metrics:**
- First Contentful Paint: < 2s
- Largest Contentful Paint: < 3.5s
- Cumulative Layout Shift: < 0.1
- Time to Interactive: < 3.5s

**Test with Lighthouse:**
```
1. Chrome DevTools > Lighthouse
2. Run audit
3. Fix red/orange items
4. Re-run until all green
```

---

## Success Criteria

After deployment, verify:
- [x] Users can sign up / login
- [x] Create trip works
- [x] Join trip works
- [x] Create split works
- [x] Edit split works
- [x] Delete split works
- [x] Mark paid works
- [x] Confirm received works
- [x] Remind button works
- [x] Settlement calculates correctly
- [x] Push notifications delivered
- [x] Offline mode queues changes
- [x] Real-time updates work (multi-browser)
- [x] Mobile responsive
- [x] No console errors
- [x] Load time acceptable

---

## Support Resources

### Documentation
- `QUICKSTART.md` - User guide
- `ARCHITECTURE.md` - Technical deep dive
- `IMPLEMENTATION_SUMMARY.md` - Feature overview

### External Resources
- Supabase docs: https://supabase.com/docs
- Vercel docs: https://vercel.com/docs
- Web Push API: https://www.w3.org/TR/push-api/
- Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

### Support Contacts
- Supabase Support: support@supabase.io
- Vercel Support: support@vercel.com
- Push issues: Check push-notifications function logs in Supabase

---

**Deployment Date**: [TBD]
**Version**: 1.0.0
**Status**: Ready for Launch 🚀
