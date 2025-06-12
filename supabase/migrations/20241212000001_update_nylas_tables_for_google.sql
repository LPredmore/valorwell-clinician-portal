
-- Update nylas_connections table to support Google-specific fields
ALTER TABLE nylas_connections 
ADD COLUMN IF NOT EXISTS connector_id text,
ADD COLUMN IF NOT EXISTS grant_status text,
ADD COLUMN IF NOT EXISTS scopes text[],
ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
ADD COLUMN IF NOT EXISTS sync_errors jsonb;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_nylas_connections_user_provider ON nylas_connections(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_nylas_connections_active ON nylas_connections(is_active) WHERE is_active = true;

-- Create table for tracking sync operations
CREATE TABLE IF NOT EXISTS nylas_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id text NOT NULL REFERENCES nylas_connections(id),
  sync_type text NOT NULL, -- 'full', 'incremental', 'webhook'
  direction text NOT NULL, -- 'inbound', 'outbound', 'bidirectional'
  status text NOT NULL, -- 'pending', 'success', 'error'
  events_processed integer DEFAULT 0,
  errors jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add RLS policies for sync logs
ALTER TABLE nylas_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync logs" ON nylas_sync_logs
  FOR SELECT USING (
    connection_id IN (
      SELECT id FROM nylas_connections WHERE user_id = auth.uid()
    )
  );

-- Create function to handle Google connector creation
CREATE OR REPLACE FUNCTION create_google_connector(
  p_client_id text,
  p_client_secret text,
  p_nylas_api_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  connector_response jsonb;
BEGIN
  -- This function will call the Nylas API to create a Google connector
  -- Implementation depends on available HTTP extension
  
  -- For now, return a placeholder that indicates manual setup is needed
  RETURN jsonb_build_object(
    'status', 'manual_setup_required',
    'message', 'Google connector must be created manually via Nylas dashboard or API',
    'curl_command', format(
      'curl -X POST ''https://api.us.nylas.com/v3/connectors'' --header ''Authorization: Bearer %s'' --header ''Content-Type: application/json'' --data ''{"name": "google-connector", "provider": "google", "settings": {"client_id": "%s", "client_secret": "%s"}, "scope": ["openid", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/calendar"]}''',
      p_nylas_api_key,
      p_client_id,
      p_client_secret
    )
  );
END;
$$;
