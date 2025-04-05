-- Consolidated schema file for AI Scientific Research Summarizer
-- This file includes all tables, functions, and triggers needed for the application

-- =============================================
-- TABLES
-- =============================================

-- Create profiles table to store additional user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  bio TEXT,
  phone TEXT,
  role TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2) NOT NULL,
  features JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  plan TEXT NOT NULL,
  is_yearly BOOLEAN DEFAULT FALSE,
  amount_paid DECIMAL(10, 2),
  currency TEXT DEFAULT 'INR',
  payment_id TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Create summaries table
CREATE TABLE IF NOT EXISTS public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT,
  file_url TEXT,
  file_type TEXT,
  summary TEXT,
  model TEXT DEFAULT 'gemini',
  word_count INTEGER DEFAULT 0,
  processing_time FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can view subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Service role can manage subscription plans" ON public.subscription_plans;

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.user_subscriptions;

DROP POLICY IF EXISTS "Users can view their own summaries" ON public.summaries;
DROP POLICY IF EXISTS "Users can insert their own summaries" ON public.summaries;
DROP POLICY IF EXISTS "Users can update their own summaries" ON public.summaries;
DROP POLICY IF EXISTS "Users can delete their own summaries" ON public.summaries;
DROP POLICY IF EXISTS "Service role can manage all summaries" ON public.summaries;

-- Create profile policies
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role can manage all profiles" 
  ON public.profiles 
  USING (auth.role() = 'service_role');

-- Create subscription plan policies
CREATE POLICY "Users can view subscription plans" 
  ON public.subscription_plans FOR SELECT 
  USING (true);

CREATE POLICY "Service role can manage subscription plans" 
  ON public.subscription_plans 
  USING (auth.role() = 'service_role');

-- Create user subscription policies
CREATE POLICY "Users can view their own subscriptions" 
  ON public.user_subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" 
  ON public.user_subscriptions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all subscriptions" 
  ON public.user_subscriptions 
  USING (auth.role() = 'service_role');

-- Create summary policies
CREATE POLICY "Users can view their own summaries" 
  ON public.summaries FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own summaries" 
  ON public.summaries FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own summaries" 
  ON public.summaries FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own summaries" 
  ON public.summaries FOR DELETE 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all summaries" 
  ON public.summaries 
  USING (auth.role() = 'service_role');

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Create a profile for the new user
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Create a basic subscription for the new user
  INSERT INTO public.user_subscriptions (
    user_id,
    plan,
    active,
    expires_at
  ) VALUES (
    NEW.id,
    'basic',
    TRUE,
    NOW() + INTERVAL '10 years'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update subscription after payment
CREATE OR REPLACE FUNCTION public.update_subscription_after_payment(
  user_id UUID,
  payment_id TEXT,
  plan_name TEXT,
  is_yearly BOOLEAN
) 
RETURNS BOOLEAN AS $$
DECLARE
  amount DECIMAL(10, 2);
  expiry_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Set amount based on plan and billing cycle
  IF plan_name = 'silver' THEN
    amount := CASE WHEN is_yearly THEN 999 ELSE 99 END;
  ELSIF plan_name = 'gold' THEN
    amount := CASE WHEN is_yearly THEN 1999 ELSE 199 END;
  ELSE
    amount := 0;
  END IF;
  
  -- Set expiry date based on billing cycle
  expiry_date := CASE WHEN is_yearly 
    THEN NOW() + INTERVAL '1 year'
    ELSE NOW() + INTERVAL '30 days'
  END;
  
  -- Mark all existing subscriptions as inactive
  UPDATE public.user_subscriptions
  SET active = FALSE
  WHERE user_id = update_subscription_after_payment.user_id;
  
  -- Create new subscription
  INSERT INTO public.user_subscriptions (
    user_id,
    plan,
    is_yearly,
    amount_paid,
    payment_id,
    active,
    expires_at
  ) VALUES (
    update_subscription_after_payment.user_id,
    plan_name,
    is_yearly,
    amount,
    payment_id,
    TRUE,
    expiry_date
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check daily usage limit
CREATE OR REPLACE FUNCTION public.check_daily_usage_limit(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan TEXT := 'basic';
  daily_limit INTEGER := 5; -- Default basic plan limit
  current_usage INTEGER := 0;
BEGIN
  -- Get user's current plan
  SELECT plan INTO user_plan FROM public.user_subscriptions 
  WHERE user_id = check_daily_usage_limit.user_id AND active = TRUE
  ORDER BY created_at DESC LIMIT 1;
  
  -- Set daily limit based on plan
  IF user_plan = 'silver' THEN
    daily_limit := 20;
  ELSIF user_plan = 'gold' THEN
    daily_limit := 50;
  END IF;
  
  -- Count summaries created today
  SELECT COUNT(*) INTO current_usage 
  FROM public.summaries 
  WHERE user_id = check_daily_usage_limit.user_id 
    AND created_at::date = CURRENT_DATE;
  
  -- Return true if under limit, false if exceeded
  RETURN current_usage < daily_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- STORAGE BUCKETS
-- =============================================

-- Create storage buckets for file uploads
DO $$
BEGIN
  -- Create research-documents bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('research-documents', 'research-documents', TRUE)
  ON CONFLICT (id) DO NOTHING;
  
  -- Create avatars bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', TRUE)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Create policies for research-documents bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to select their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own files" ON storage.objects;

CREATE POLICY "Allow authenticated users to upload files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'research-documents');

CREATE POLICY "Allow authenticated users to select their own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'research-documents');

CREATE POLICY "Allow authenticated users to update their own files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'research-documents');

CREATE POLICY "Allow authenticated users to delete their own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'research-documents');

-- Create policies for avatars bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to select their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own avatars" ON storage.objects;

CREATE POLICY "Allow authenticated users to upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated users to select their own avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated users to update their own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated users to delete their own avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars');
