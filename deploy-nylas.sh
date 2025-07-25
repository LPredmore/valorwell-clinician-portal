
#!/bin/bash

# Nylas Infrastructure Deployment Script
# This script deploys all necessary Nylas edge functions

echo "🚀 Deploying Nylas Infrastructure..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first."
    echo "   npm install -g supabase"
    exit 1
fi

# Deploy edge functions
echo "📡 Deploying edge functions..."

echo "  - Deploying nylas-auth..."
supabase functions deploy nylas-auth

echo "  - Deploying nylas-events..."
supabase functions deploy nylas-events

echo "  - Deploying nylas-sync-appointments..."
supabase functions deploy nylas-sync-appointments

echo "  - Deploying nylas-scheduler-config..."
supabase functions deploy nylas-scheduler-config

# Apply database migrations
echo "📊 Applying database migrations..."
supabase db push

# List deployed functions
echo "📋 Checking deployed functions..."
supabase functions list

echo "✅ Nylas infrastructure deployment complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Verify all functions are listed above"
echo "2. Test the calendar connection in your app"
echo "3. Check edge function logs for any issues:"
echo "   supabase functions logs nylas-auth"
echo "   supabase functions logs nylas-events"
echo ""
echo "🔧 If you encounter issues:"
echo "1. Check your Nylas API credentials are configured:"
echo "   - NYLAS_CLIENT_ID"
echo "   - NYLAS_CLIENT_SECRET" 
echo "   - NYLAS_API_KEY"
echo "   - NYLAS_CONNECTOR_ID"
echo ""
echo "2. Test infrastructure using the Debug tab in your calendar"

