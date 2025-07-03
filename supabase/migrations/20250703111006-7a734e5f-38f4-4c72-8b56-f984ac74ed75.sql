
-- Create a function to handle video room creation for new appointments
CREATE OR REPLACE FUNCTION create_video_room_for_appointment()
RETURNS TRIGGER AS $$
DECLARE
  video_url TEXT;
  request_result JSONB;
BEGIN
  -- Only create video room for certain appointment types
  IF NEW.type IN ('therapy_session', 'consultation', 'telehealth') THEN
    BEGIN
      -- Make HTTP request to our edge function
      SELECT INTO request_result
        net.http_post(
          url := 'https://gqlkritspnhjxfejvgfg.supabase.co/functions/v1/create-daily-room',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := jsonb_build_object(
            'appointmentId', NEW.id::text,
            'forceNew', false
          )
        );

      -- Extract the video URL from the response
      IF request_result->'body'->>'url' IS NOT NULL THEN
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
        -- Log failure but don't block appointment creation
        INSERT INTO api_logs (endpoint, status, error_message, request_payload)
        VALUES (
          'create-daily-room-trigger',
          'error',
          'No video URL returned from Daily.co API',
          jsonb_build_object('appointmentId', NEW.id)
        );
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't block appointment creation
      INSERT INTO api_logs (endpoint, status, error_message, request_payload)
      VALUES (
        'create-daily-room-trigger',
        'error',
        SQLERRM,
        jsonb_build_object('appointmentId', NEW.id)
      );
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger that fires after appointment insertion
DROP TRIGGER IF EXISTS trigger_create_video_room ON appointments;
CREATE TRIGGER trigger_create_video_room
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION create_video_room_for_appointment();

-- Enable the pg_net extension if not already enabled (for HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;
