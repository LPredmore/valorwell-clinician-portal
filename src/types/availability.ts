
/**
 * Represents an availability block for a clinician in the UTC-only data model.
 * This type matches the schema of the availability_blocks table.
 */
export interface AvailabilityBlock {
  id: string;
  clinician_id: string;
  start_at: string; // UTC ISO string
  end_at: string;   // UTC ISO string
  is_active: boolean;
  recurring_pattern?: any; // You can define a more specific type if the structure is known
}
