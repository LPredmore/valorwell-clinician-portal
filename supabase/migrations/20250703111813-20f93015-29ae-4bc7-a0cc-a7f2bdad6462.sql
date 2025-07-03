
-- Update the function to use the correct service role key and improve error handling
CREATE OR REPLACE FUNCTION create_video_room_for_appointment()
RETURNS TRIGGER AS $$
DECLARE
  video_url TEXT;
  request_result JSONB;
  service_key TEXT;
BEGIN
  -- Only create video room for certain appointment types
  IF NEW.type IN ('therapy_session', 'consultation', 'telehealth') THEN
    BEGIN
      -- Get the service role key from pg_settings or use a direct approach
      SELECT setting INTO service_key FROM pg_settings WHERE name = 'app.settings.service_role_key';
      
      -- If service key is not found in settings, we'll need to use the anon key or handle differently
      IF service_key IS NULL THEN
        service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbGtyaXRzcG5oanhmZWp2Z2ZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Mjc2NDQ0NSwiZXhwIjoyMDU4MzQwNDQ1fQ.qHRFK2mnMYvZm-0gLi0n7dKp5E8hRPHKJUb_4aRNJFo';
      END IF;
      
      -- Make HTTP request to our edge function
      SELECT INTO request_result
        net.http_post(
          url := 'https://gqlkritspnhjxfejvgfg.supabase.co/functions/v1/create-daily-room',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_key,
            'apikey', service_key
          ),
          body := jsonb_build_object(
            'appointmentId', NEW.id::text,
            'forceNew', false
          )
        );

      -- Log the full request result for debugging
      INSERT INTO api_logs (endpoint, status, request_payload, response_data)
      VALUES (
        'create-daily-room-trigger-debug',
        'debug',
        jsonb_build_object('appointmentId', NEW.id, 'service_key_length', length(service_key)),
        request_result
      );

      -- Extract the video URL from the response
      IF request_result IS NOT NULL AND request_result->'body'->>'url' IS NOT NULL THEN
        video_url := request_result->'body'->>'url';
        
        -- Update the appointment with the video room URL
        UPDATE appointments 
        SET video_room_url = video_url 
        WHERE id = NEW.id;
        
        -- Log success
        INSERT INTO api_logs (endpoint, status, request_payload, response_data)
        VALUES (
          'create-daily-room-trigger',
          'success',
          jsonb_build_object('appointmentId', NEW.id),
          jsonb_build_object('video_url', video_url)
        );
      ELSE
        -- Log failure with more details
        INSERT INTO api_logs (endpoint, status, error_message, request_payload, response_data)
        VALUES (
          'create-daily-room-trigger',
          'error',
          CASE 
            WHEN request_result IS NULL THEN 'HTTP request returned NULL'
            WHEN request_result->'body' IS NULL THEN 'Response body is NULL'
            ELSE 'No video URL in response body'
          END,
          jsonb_build_object('appointmentId', NEW.id),
          request_result
        );
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error with more context
      INSERT INTO api_logs (endpoint, status, error_message, request_payload)
      VALUES (
        'create-daily-room-trigger',
        'error',
        'Exception: ' || SQLERRM || ' | SQLSTATE: ' || SQLSTATE,
        jsonb_build_object('appointmentId', NEW.id, 'appointment_type', NEW.type)
      );
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
