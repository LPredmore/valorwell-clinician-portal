
# Nylas Calendar Integration Setup Guide

## Overview
This guide will help you complete the Nylas calendar integration setup for your application.

## Prerequisites
- Supabase project with CLI access
- Nylas developer account with API credentials
- Domain configured for OAuth redirects

## Step 1: Deploy Database Migration

Run the comprehensive migration to set up all Nylas tables and policies:

```bash
supabase db push
```

This will create:
- `nylas_connections` - Store calendar connections
- `calendar_sync_logs` - Track sync operations
- `external_calendar_mappings` - Map internal to external events
- `nylas_scheduler_configs` - Public booking configurations

## Step 2: Deploy Edge Functions

Deploy all required edge functions:

```bash
# Make the deployment script executable
chmod +x deploy-nylas.sh

# Run the deployment
./deploy-nylas.sh
```

Or deploy individually:
```bash
supabase functions deploy nylas-auth
supabase functions deploy nylas-events
supabase functions deploy nylas-sync-appointments
supabase functions deploy nylas-scheduler-config
```

## Step 3: Configure Nylas API Credentials

In your Supabase dashboard, go to Project Settings > Edge Functions and add these secrets:

1. **NYLAS_CLIENT_ID**: Your Nylas application client ID
2. **NYLAS_CLIENT_SECRET**: Your Nylas application client secret  
3. **NYLAS_REDIRECT_URI**: Your OAuth redirect URI (e.g., `https://yourdomain.com/auth/callback`)

## Step 4: Configure OAuth Redirect

In your Nylas dashboard:
1. Go to your application settings
2. Add your redirect URI to the allowed redirect URIs list
3. Ensure the URI matches what you set in `NYLAS_REDIRECT_URI`

## Step 5: Test the Integration

1. Navigate to your calendar page
2. Click "Connect Calendar" 
3. Go through the OAuth flow
4. Verify that external events appear in your calendar

## Troubleshooting

### Database Errors
- Ensure all migrations have been applied successfully
- Check that RLS policies allow authenticated users access
- Verify table permissions are granted to `authenticated` role

### Edge Function Errors
- Check function deployment status: `supabase functions list`
- View function logs: `supabase functions logs`
- Ensure all environment variables are set correctly

### OAuth Errors
- Verify redirect URI matches between Nylas dashboard and environment variables
- Check that the Nylas application is configured for the correct providers (Google, Outlook, etc.)
- Ensure your domain is properly configured for CORS

### Calendar Not Showing Events
- Check console logs for API errors
- Verify the user has connected at least one calendar
- Ensure the date range includes events that exist

## Expected Behavior After Setup

✅ Calendar connections panel shows "Connect Calendar" button
✅ OAuth flow opens in popup window for calendar selection
✅ Connected calendars appear with provider badges
✅ External events display in the calendar view
✅ Public booking scheduler can be created for clinicians

## Support

If you encounter issues:
1. Check the console logs for specific error messages
2. Verify all setup steps have been completed
3. Test with a fresh calendar connection
4. Check Supabase edge function logs for backend errors
