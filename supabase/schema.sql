-- Create Daily Entries Table
CREATE TABLE IF NOT EXISTS public.daily_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    work_description TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Prevent duplicate entry for same date per user
    UNIQUE(auth_user_id, date)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;

-- Policy 1: Employees can insert their own entries
CREATE POLICY "Employees can insert their own entries" 
ON public.daily_entries FOR INSERT 
WITH CHECK (auth.uid() = auth_user_id);

-- Policy 2: Employees can view their own entries
CREATE POLICY "Employees can view own entries" 
ON public.daily_entries FOR SELECT 
USING (auth.uid() = auth_user_id);

-- Policy 3: Managers can view list of entries for their team members
CREATE POLICY "Managers can view team entries" 
ON public.daily_entries FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.employees e 
        WHERE e.auth_user_id = public.daily_entries.auth_user_id 
        AND e.manager_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1)
    )
);

-- Policy 4: HR can view ALL entries
CREATE POLICY "HR can view all entries" 
ON public.daily_entries FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.employees 
        WHERE auth_user_id = auth.uid() AND role = 'hr'
    )
);

-- Policy 5: Managers can UPDATE status of their team's entries
CREATE POLICY "Managers can update team entries" 
ON public.daily_entries FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.employees e 
        WHERE e.auth_user_id = public.daily_entries.auth_user_id 
        AND e.manager_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1)
    )
);

-- Policy 6: HR can UPDATE any entry status (if required)
CREATE POLICY "HR can update all entries" 
ON public.daily_entries FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.employees 
        WHERE auth_user_id = auth.uid() AND role = 'hr'
    )
);
