# Modifying nylas-auth Function for Testing

To bypass JWT verification for testing purposes, follow these steps:

1. Go to the Supabase dashboard
2. Navigate to Edge Functions
3. Find and edit the `nylas-auth` function
4. Locate the authentication check section (around line 28-39)
5. Replace it with the following code that includes a test mode:

```typescript
// For testing purposes only - remove in production
const isTestMode = true; // Set to false in production
let user = null;

if (isTestMode) {
  console.log('[nylas-auth] Running in test mode, bypassing authentication');
  user = { id: 'test-user-id' };
} else {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    console.error('[nylas-auth] No authorization header')
    throw new Error('No authorization header')
  }

  const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser()
  if (authError || !authUser) {
    console.error('[nylas-auth] Authentication failed:', authError)
    throw new Error('Authentication failed')
  }
  user = authUser;
}

// Make sure to use the 'user' variable instead of directly referencing 'user.id' in the rest of the code
console.log('[nylas-auth] Authenticated user:', user.id);
```

6. Save the changes
7. Test the function again

## Important Notes

- This modification should only be used for testing purposes
- Remember to set `isTestMode = false` or remove this code before deploying to production
- The `user.id` value is set to 'test-user-id', which may need to be changed to a valid user ID in your system
- Make sure to update any references to `user.id` in the rest of the code to use the new `user` variable

## Testing the Function

After making this change, you can test the function without needing to provide a valid JWT token. This will help isolate whether the issue is with authentication or with the Nylas API integration.