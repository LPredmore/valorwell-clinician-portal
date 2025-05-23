
# Running the User Profiles Migration

To enable Google Calendar integration and proper user profile linking, you need to create the `user_profiles` table in your Supabase database.

## Instructions

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the SQL from the `create_user_profiles_table.sql` file in the src/migrations folder
4. Run the SQL query

This migration creates:
- A `user_profiles` table to link auth users across different providers (email, Google)
- Functions and triggers to automatically maintain these links
- RLS policies to secure the data

## Verification

After running the migration, you can verify it worked by:

1. Checking that the `user_profiles` table exists in the Database section
2. Logging out and back in - existing users should be automatically linked
3. Testing Google Calendar integration

If you encounter any issues with the migration, check the Supabase logs for errors.

