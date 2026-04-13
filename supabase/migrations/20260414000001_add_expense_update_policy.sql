-- Add UPDATE policy for expenses (allow creator to update their own expenses)
CREATE POLICY "Expense creator can update" ON public.expenses FOR UPDATE USING (auth.uid() = created_by);

-- Add UPDATE policy for trip_members (to allow members to edit info if needed)
CREATE POLICY "Members can update their own info" ON public.trip_members FOR UPDATE USING (auth.uid() = user_id);
