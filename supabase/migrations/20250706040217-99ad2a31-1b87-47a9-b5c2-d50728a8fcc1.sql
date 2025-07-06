-- Remove the broken video room creation trigger and function
-- These don't work properly because net.http_post returns request_id, not response data

DROP TRIGGER IF EXISTS trigger_create_video_room ON appointments;
DROP FUNCTION IF EXISTS create_video_room_for_appointment();

-- Log the removal for debugging
INSERT INTO api_logs (endpoint, status, request_payload, response_data)
VALUES (
  'trigger-cleanup',
  'success',
  jsonb_build_object('action', 'removed_broken_video_trigger'),
  jsonb_build_object('message', 'Removed non-functional video room trigger and function')
);