
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const timestamp = () => `[${new Date().toISOString()}]`;
  
  console.log(`🔥 ${timestamp()} [create-daily-room] Function invoked:`, {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`🔥 ${timestamp()} [create-daily-room] Handling CORS preflight`);
    return new Response(null, { headers: corsHeaders });
  }

  // Get the Daily API key from environment
  const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY');
  console.log(`🔥 ${timestamp()} [create-daily-room] API Key check:`, {
    hasApiKey: !!DAILY_API_KEY,
    apiKeyLength: DAILY_API_KEY?.length || 0
  });
  
  if (!DAILY_API_KEY) {
    console.error(`🔥 ${timestamp()} [create-daily-room] ❌ DAILY_API_KEY not configured`);
    return new Response(
      JSON.stringify({ error: 'DAILY_API_KEY not configured' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    // Parse the request body
    console.log(`🔥 ${timestamp()} [create-daily-room] Reading request body...`);
    const requestBody = await req.json();
    console.log(`🔥 ${timestamp()} [create-daily-room] Request body:`, requestBody);
    
    const { appointmentId, forceNew } = requestBody;
    
    if (!appointmentId) {
      console.error(`🔥 ${timestamp()} [create-daily-room] ❌ Missing appointmentId`);
      return new Response(
        JSON.stringify({ error: 'Appointment ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Create a new room in Daily.co
    const roomName = `appointment-${appointmentId}`;
    console.log(`🔥 ${timestamp()} [create-daily-room] Processing room:`, {
      roomName,
      forceNew: !!forceNew
    });
    
    // Only check if room exists if not forcing new room creation
    if (!forceNew) {
      // First check if room already exists
      console.log(`🔥 ${timestamp()} [create-daily-room] Checking if room exists:`, roomName);
      const checkResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`
        }
      });
      
      console.log(`🔥 ${timestamp()} [create-daily-room] Check response:`, {
        status: checkResponse.status,
        statusText: checkResponse.statusText,
        ok: checkResponse.ok
      });
      
      if (checkResponse.ok) {
        // Room exists, return its URL
        const roomData = await checkResponse.json();
        console.log(`🔥 ${timestamp()} [create-daily-room] ✅ Room exists, returning URL:`, roomData.url);
        return new Response(
          JSON.stringify({ url: roomData.url }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } else {
      console.log(`🔥 ${timestamp()} [create-daily-room] Force creating new room, deleting old room if it exists`);
      // Try to delete the existing room if forcing new room creation
      try {
        const deleteResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`
          }
        });
        console.log(`🔥 ${timestamp()} [create-daily-room] Delete attempt:`, {
          status: deleteResponse.status,
          statusText: deleteResponse.statusText
        });
      } catch (deleteError) {
        // Ignore delete errors, as the room might not exist
        console.log(`🔥 ${timestamp()} [create-daily-room] Delete error (ignored):`, deleteError);
      }
    }
    
    // Room doesn't exist, create it
    // Set room properties
    const roomProperties = {
      name: roomName,
      privacy: "public", // Make room public to avoid knocking/approval requirements
      properties: {
        exp: null, // No expiration
        enable_screenshare: false,  // Disable screen sharing for Chrome 140 compatibility
        enable_chat: true, // Enable text chat
        start_video_off: true, // Start with video off
        start_audio_off: false, // Start with audio on
        enable_knocking: false, // Disable knocking since room is public
      }
    };
    
    console.log(`🔥 ${timestamp()} [create-daily-room] Creating room with properties:`, roomProperties);
    
    // Make request to Daily.co API
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`
      },
      body: JSON.stringify(roomProperties)
    });
    
    console.log(`🔥 ${timestamp()} [create-daily-room] Daily.co API response:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    // Parse the response
    const data = await response.json();
    console.log(`🔥 ${timestamp()} [create-daily-room] Response data:`, data);
    
    if (!response.ok) {
      console.error(`🔥 ${timestamp()} [create-daily-room] ❌ Daily.co API error:`, data);
      
      // Check if this is a "room already exists" error
      if (data.info && data.info.includes('already exists')) {
        console.log(`🔥 ${timestamp()} [create-daily-room] Room exists error, trying to get existing room`);
        // Try to get the room directly
        const getResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`
          }
        });
        
        if (getResponse.ok) {
          const roomData = await getResponse.json();
          console.log(`🔥 ${timestamp()} [create-daily-room] ✅ Retrieved existing room:`, roomData.url);
          return new Response(
            JSON.stringify({ url: roomData.url }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to create Daily.co room', details: data }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log(`🔥 ${timestamp()} [create-daily-room] ✅ Room created successfully:`, data.url);
    
    // Return the room URL
    return new Response(
      JSON.stringify({ url: data.url }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error(`🔥 ${timestamp()} [create-daily-room] ❌ Catch block error:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
