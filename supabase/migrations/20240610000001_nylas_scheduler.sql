
-- Create table for storing Nylas Scheduler configurations
CREATE TABLE nylas_scheduler_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinician_id UUID NOT NULL REFERENCES clinicians(id) ON DELETE CASCADE,
  scheduler_id TEXT NOT NULL,
  public_url TEXT,
  config_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinician_id, scheduler_id)
);

-- Add RLS policies
ALTER TABLE nylas_scheduler_configs ENABLE ROW LEVEL SECURITY;

-- Policies for nylas_scheduler_configs
CREATE POLICY "Clinicians can manage their own scheduler configs" ON nylas_scheduler_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clinicians 
      WHERE id = clinician_id AND user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_nylas_scheduler_configs_clinician_id ON nylas_scheduler_configs(clinician_id);
CREATE INDEX idx_nylas_scheduler_configs_scheduler_id ON nylas_scheduler_configs(scheduler_id);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_nylas_scheduler_configs_updated_at 
  BEFORE UPDATE ON nylas_scheduler_configs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
