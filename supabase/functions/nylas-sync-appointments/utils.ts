
import { createHash } from "https://deno.land/std@0.168.0/hash/mod.ts";
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Type Definitions
export interface NylasConnection {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  provider: string;
  email: string;
  calendar_ids?: string[];
  [key: string]: any;
}

// Helper to create a consistent hash for an event
export const createEventHash = (event: any): string => {
  const data = {
    title: event.title,
    start: event.when.start_time,
    end: event.when.end_time,
    description: event.description,
    location: event.location,
    participants: event.participants?.map((p: any) => p.email).sort()
  };
  const hash = createHash("sha-256");
  hash.update(JSON.stringify(data));
  return hash.toString();
}

// Helper to refresh Nylas token if expired
export const getRefreshedNylasConnection = async (connection: NylasConnection, supabaseAdmin: SupabaseClient): Promise<NylasConnection> => {
  const tokenExpiresAt = new Date(connection.token_expires_at || 0).getTime();
  const now = Date.now();
  const buffer = 5 * 60 * 1000; // 5 minutes buffer

  if (tokenExpiresAt > now + buffer) {
    // Token is still valid
    return connection;
  }

  console.log(`[nylas-utils] Token for connection ${connection.id} is expiring or expired. Refreshing...`);
  
  const nylasClientId = Deno.env.get('NYLAS_CLIENT_ID');
  const nylasClientSecret = Deno.env.get('NYLAS_CLIENT_SECRET');

  if (!nylasClientId || !nylasClientSecret) {
    throw new Error('Nylas client credentials are not configured.');
  }

  const response = await fetch('https://api.us.nylas.com/v3/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: nylasClientId,
      client_secret: nylasClientSecret,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[nylas-utils] Failed to refresh token for grant ${connection.id}:`, errorText);
    throw new Error('Failed to refresh Nylas token.');
  }

  const tokenData = await response.json();
  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  const { data: updatedConnection, error: updateError } = await supabaseAdmin
    .from('nylas_connections')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token, // Nylas might return a new refresh token
      token_expires_at: newExpiresAt,
    })
    .eq('id', connection.id)
    .select()
    .single();

  if (updateError) {
    console.error(`[nylas-utils] Failed to update connection with new token:`, updateError);
    throw updateError;
  }
  
  console.log(`[nylas-utils] Token refreshed and updated successfully for connection ${connection.id}.`);
  return updatedConnection;
};
