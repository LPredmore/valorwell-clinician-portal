
-- This is a migration script to create the user_profiles table
-- Run this in Supabase SQL editor

-- Create the user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  auth_provider TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments for better documentation
COMMENT ON TABLE public.user_profiles IS 'Table to link auth users with profiles across different auth methods';
COMMENT ON COLUMN public.user_profiles.user_id IS 'References the auth.users.id';
COMMENT ON COLUMN public.user_profiles.auth_provider IS 'The provider used for authentication (email, google, etc)';

-- Add RLS policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own profile
CREATE POLICY "Users can read their own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add a function to automatically create a profile after signing up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, auth_provider)
  VALUES (
    NEW.id,
    NEW.email,
    (CASE 
      WHEN NEW.app_metadata->>'provider' IS NOT NULL THEN NEW.app_metadata->>'provider'
      ELSE 'email'
    END)
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    email = EXCLUDED.email,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- Update existing clinicians to link with auth.users if email matches
INSERT INTO public.user_profiles (user_id, email, auth_provider)
SELECT 
  au.id as user_id,
  au.email,
  COALESCE(au.app_metadata->>'provider', 'email') as auth_provider
FROM 
  auth.users au
LEFT JOIN
  public.user_profiles up ON au.id = up.user_id
WHERE
  up.id IS NULL;

-- Update clinicians table to link to auth users
ALTER TABLE public.clinicians
ADD COLUMN IF NOT EXISTS profile_id UUID;

-- Add comment
COMMENT ON COLUMN public.clinicians.profile_id IS 'References the auth.users.id through user_profiles.user_id';

-- Create a function to automatically update clinician-user associations
CREATE OR REPLACE FUNCTION public.link_clinician_to_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.clinicians
  SET profile_id = NEW.user_id
  WHERE clinician_email = NEW.email AND profile_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for linking clinicians to users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_user_profile_created'
  ) THEN
    CREATE TRIGGER on_user_profile_created
      AFTER INSERT ON public.user_profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.link_clinician_to_user();
  END IF;
END
$$;
