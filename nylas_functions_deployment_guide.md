# Nylas Functions Deployment Guide

This guide provides instructions for deploying the updated Nylas Edge Functions with JWT verification bypass for testing purposes.

## Overview

We've created updated versions of all Nylas Edge Functions with JWT verification bypass to help diagnose and fix the issues with the Nylas integration:

1. `nylas-auth-updated.ts` - Authentication and OAuth flow
2. `nylas-events-updated.ts` - Fetching calendar events
3. `nylas-scheduler-config-updated.ts` - Managing scheduler configurations
4. `nylas-sync-appointments-updated.ts` - Syncing appointments with calendars

## Deployment Steps

### 1. Deploy nylas-auth Function

1. Go to the Supabase dashboard
2. Navigate to Edge Functions
3. Find the existing nylas-auth function and click on it
4. Click "Edit" or "Delete and recreate" (if edit is not available)
5. Copy the entire content from the `nylas-auth-updated.ts` file
6. Paste it into the editor
7. Save/Deploy the function

### 2. Deploy nylas-events Function

1. Go to the Supabase dashboard
2. Navigate to Edge Functions
3. Find the existing nylas-events function and click on it
4. Click "Edit" or "Delete and recreate" (if edit is not available)
5. Copy the entire content from the `nylas-events-updated.ts` file
6. Paste it into the editor
7. Save/Deploy the function

### 3. Deploy nylas-scheduler-config Function

1. Go to the Supabase dashboard
2. Navigate to Edge Functions
3. Find the existing nylas-scheduler-config function and click on it
4. Click "Edit" or "Delete and recreate" (if edit is not available)
5. Copy the entire content from the `nylas-scheduler-config-updated.ts` file
6. Paste it into the editor
7. Save/Deploy the function

### 4. Deploy nylas-sync-appointments Function

1. Go to the Supabase dashboard
2. Navigate to Edge Functions
3. Find the existing nylas-sync-appointments function and click on it
4. Click "Edit" or "Delete and recreate" (if edit is not available)
5. Copy the entire content from the `nylas-sync-appointments-updated.ts` file
6. Paste it into the editor
7. Save/Deploy the function

## Testing the Functions

### Testing nylas-auth

1. Go to the Supabase dashboard
2. Navigate to Edge Functions
3. Find the nylas-auth function and click on it
4. Click "Test function"
5. Set the HTTP method to POST
6. Set the request body to:
```json
{
  "action": "initialize"
}
```
7. Click "Send Request"
8. You should receive a successful response with an OAuth URL

### Testing nylas-events

1. Go to the Supabase dashboard
2. Navigate to Edge Functions
3. Find the nylas-events function and click on it
4. Click "Test function"
5. Set the HTTP method to POST
6. Set the request body to:
```json
{
  "action": "fetch_events",
  "startDate": "2025-06-01T00:00:00.000Z",
  "endDate": "2025-06-30T23:59:59.999Z"
}
```
7. Click "Send Request"
8. You should receive a successful response with events (if any) and connections

### Testing nylas-scheduler-config

1. Go to the Supabase dashboard
2. Navigate to Edge Functions
3. Find the nylas-scheduler-config function and click on it
4. Click "Test function"
5. Set the HTTP method to POST
6. Set the request body to:
```json
{
  "action": "create_scheduler",
  "clinicianId": "CLINICIAN_ID_HERE"
}
```
7. Replace `CLINICIAN_ID_HERE` with a valid clinician ID
8. Click "Send Request"
9. You should receive a successful response with scheduler details

### Testing nylas-sync-appointments

1. Go to the Supabase dashboard
2. Navigate to Edge Functions
3. Find the nylas-sync-appointments function and click on it
4. Click "Test function"
5. Set the HTTP method to POST
6. Set the request body to:
```json
{
  "action": "sync_calendar_to_appointments",
  "clinicianId": "CLINICIAN_ID_HERE",
  "startDate": "2025-06-01T00:00:00.000Z",
  "endDate": "2025-06-30T23:59:59.999Z"
}
```
7. Replace `CLINICIAN_ID_HERE` with a valid clinician ID
8. Click "Send Request"
9. You should receive a successful response with sync details

## Important Notes

1. The JWT verification bypass is for testing purposes only and should be removed before deploying to production.
2. The test mode uses a dummy user ID (`test-user-id`). You may need to replace this with a valid user ID for your specific testing scenario.
3. After testing, remember to set `isTestMode = false` or remove the test mode code before deploying to production.
4. If you encounter any issues, check the function logs for detailed error messages.

## Troubleshooting

### Common Issues

1. **Invalid action**: Make sure you're sending a valid action in the request body.
2. **Database errors**: Check that the tables exist and RLS policies are correctly configured.
3. **API errors**: Verify that the Nylas API credentials are correctly configured in the Supabase secrets.
4. **Connection errors**: Ensure that there are active calendar connections for the user/clinician.

### Checking Logs

1. Go to the Supabase dashboard
2. Navigate to Edge Functions
3. Find the function you want to check
4. Click on "Logs" to view the function logs
5. Look for error messages or warnings that might help diagnose the issue