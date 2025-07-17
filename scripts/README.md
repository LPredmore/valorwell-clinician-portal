# Email Mismatch Resolution Scripts

## Overview
This directory contains scripts to resolve the 3 identified email mismatches between `auth.users.email` and `clinicians.clinician_email`.

## Setup
1. Install dependencies:
   ```bash
   cd scripts
   npm install
   ```

2. Set environment variables:
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
   # SUPABASE_URL is set to production by default
   ```

## Running the Backfill
```bash
npm run fix-emails
```

## What it does
- Updates `auth.users.email` to match `clinicians.clinician_email` for 3 known mismatches
- Uses the same `supabase.auth.admin.updateUserById()` API as the edge function
- Includes validation, uniqueness checks, and comprehensive logging
- Runs final validation to confirm all mismatches are resolved

## Safety Features
- Email format validation
- Uniqueness checking before updates
- Detailed logging of all operations
- Rollback capability (manual intervention required)
- Final verification step

## Expected Result
After running successfully, `validate_clinician_email_consistency()` should return 0 rows.