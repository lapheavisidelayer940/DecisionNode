-- Allow authenticated users to insert their own purchases
-- This is necessary for the client-side mock purchase flow working in beta
CREATE POLICY "Users can insert own purchases" 
ON public.pack_purchases FOR INSERT 
WITH CHECK (auth.uid() = user_id);
