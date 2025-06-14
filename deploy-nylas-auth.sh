#!/bin/bash

# Script to deploy the updated nylas-auth function with proper JWT verification

echo "Starting deployment of updated nylas-auth function..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Error: supabase CLI is not installed. Please install it first."
    echo "Visit https://supabase.com/docs/guides/cli for installation instructions."
    exit 1
fi

# Ensure we're in the project root
if [ ! -d "supabase/functions" ]; then
    echo "Error: This script must be run from the project root directory."
    exit 1
fi

# Create backup of the original function
echo "Creating backup of the original nylas-auth function..."
if [ -d "supabase/functions/nylas-auth.bak" ]; then
    rm -rf "supabase/functions/nylas-auth.bak"
fi
cp -r "supabase/functions/nylas-auth" "supabase/functions/nylas-auth.bak"
echo "Backup created at supabase/functions/nylas-auth.bak"

# Copy the updated function to the correct location
echo "Copying updated function to the correct location..."
if [ -d "supabase/functions/nylas-auth-updated" ]; then
    rm -rf "supabase/functions/nylas-auth"
    cp -r "supabase/functions/nylas-auth-updated" "supabase/functions/nylas-auth"
    echo "Updated function copied successfully."
else
    echo "Error: Updated function not found at supabase/functions/nylas-auth-updated"
    exit 1
fi

# Deploy the function with proper JWT verification
echo "Deploying nylas-auth function with proper JWT verification..."
supabase functions deploy nylas-auth

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "The nylas-auth function has been deployed with proper JWT verification."
    echo "You can now test the function to ensure it's working correctly."
else
    echo "❌ Deployment failed."
    echo "Restoring backup..."
    rm -rf "supabase/functions/nylas-auth"
    cp -r "supabase/functions/nylas-auth.bak" "supabase/functions/nylas-auth"
    echo "Backup restored. Please check the error message above and try again."
    exit 1
fi

echo ""
echo "If you need to revert to the original function, you can run:"
echo "rm -rf supabase/functions/nylas-auth"
echo "cp -r supabase/functions/nylas-auth.bak supabase/functions/nylas-auth"
echo "supabase functions deploy nylas-auth --no-verify-jwt"
echo ""

exit 0