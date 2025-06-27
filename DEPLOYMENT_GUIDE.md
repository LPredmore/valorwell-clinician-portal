
# Nylas Calendar Integration Deployment Guide

This guide outlines the steps needed to deploy the new Nylas-only calendar system.

## Prerequisites

1. Nylas API Account with API credentials
2. Supabase project with edge functions enabled
3. Domain configured for CORS and redirects

## Deployment Steps

### 1. Database Setup
Run the migration to create Nylas tables:
```sql
-- The migration file 20240615000001_run_nylas_migrations.sql should be applied automatically
-- This creates: nylas_connections, calendar_sync_logs, external_calendar_mappings, nylas_scheduler_configs
```

### 2. Environment Variables Setup
In Supabase, add these secrets:
- `NYLAS_CLIENT_ID` - Your Nylas application client ID  
- `NYLAS_CLIENT_SECRET` - Your Nylas application client secret
- `NYLAS_REDIRECT_URI` - Your OAuth redirect URI (e.g., https://yourdomain.com/auth/callback)

### 3. Deploy Edge Functions
Deploy the Nylas edge functions:
```bash
supabase functions deploy nylas-events
supabase functions deploy nylas-auth  
supabase functions deploy nylas-sync-appointments
supabase functions deploy nylas-scheduler-config
```

### 4. Configure CORS
Update your Supabase CORS settings to allow requests from your domain.

### 5. Test Integration
1. Navigate to the calendar page
2. Connect a calendar (Google, Outlook, etc.)
3. Verify events are displayed
4. Test appointment creation and sync

## Features Included

- ✅ External calendar connection (Google, Outlook, etc.)
- ✅ Two-way event sync
- ✅ Public booking scheduler for clients
- ✅ Real-time calendar display
- ✅ Multi-calendar support
- ✅ Complete legacy calendar removal

## Troubleshooting

- Check edge function logs in Supabase dashboard
- Verify CORS settings allow your domain
- Ensure Nylas credentials are correct
- Check database table creation and RLS policies
