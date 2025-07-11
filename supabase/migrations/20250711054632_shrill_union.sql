@@ .. @@
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
+CREATE POLICY "Users can create own profile" ON public.profiles
+    FOR INSERT WITH CHECK (auth.uid() = id);
+
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);