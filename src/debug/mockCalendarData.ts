import { Appointment } from '@/types/appointment';
import { AvailabilityBlock } from '@/types/availability';

export const mockAppointments: Appointment[] = [
  {
    id: 'appointment-1',
    client_id: 'client-1',
    clinician_id: 'clinician-1',
    start_at: '2024-01-08T10:00:00Z',
    end_at: '2024-01-08T11:00:00Z',
    type: 'therapy_session',
    status: 'scheduled',
    notes: 'Initial therapy session',
  },
  {
    id: 'appointment-2',
    client_id: 'client-2',
    clinician_id: 'clinician-1',
    start_at: '2024-01-09T14:00:00Z',
    end_at: '2024-01-09T15:00:00Z',
    type: 'follow_up',
    status: 'confirmed',
    notes: 'Follow-up session',
  },
  {
    id: 'appointment-3',
    client_id: 'client-3',
    clinician_id: 'clinician-1',
    start_at: '2024-01-10T11:00:00Z',
    end_at: '2024-01-10T12:00:00Z',
    type: 'assessment',
    status: 'completed',
    notes: 'Client assessment',
  },
  {
    id: 'appointment-4',
    client_id: 'client-4',
    clinician_id: 'clinician-1',
    start_at: '2024-01-11T09:00:00Z',
    end_at: '2024-01-11T10:00:00Z',
    type: 'therapy_session',
    status: 'scheduled',
    notes: 'Another therapy session',
  },
  {
    id: 'appointment-5',
    client_id: 'client-5',
    clinician_id: 'clinician-1',
    start_at: '2024-01-12T15:00:00Z',
    end_at: '2024-01-12T16:00:00Z',
    type: 'group_therapy',
    status: 'confirmed',
    notes: 'Group therapy session',
  },
];

export const mockAvailabilityBlocks: AvailabilityBlock[] = [
  {
    id: 'block-1',
    clinician_id: 'clinician-1',
    day_of_week: 'monday',
    start_at: '2024-01-08T09:00:00Z',
    end_at: '2024-01-08T12:00:00Z',
    is_active: false,
    is_deleted: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'block-2',
    clinician_id: 'clinician-1',
    day_of_week: 'monday',
    start_at: '2024-01-08T13:00:00Z',
    end_at: '2024-01-08T17:00:00Z',
    is_active: true,
    is_deleted: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'block-3',
    clinician_id: 'clinician-1',
    day_of_week: 'tuesday',
    start_at: '2024-01-09T10:00:00Z',
    end_at: '2024-01-09T14:00:00Z',
    is_active: true,
    is_deleted: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'block-4',
    clinician_id: 'clinician-1',
    day_of_week: 'wednesday',
    start_at: '2024-01-10T09:00:00Z',
    end_at: '2024-01-10T15:00:00Z',
    is_active: true,
    is_deleted: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'block-5',
    clinician_id: 'clinician-1',
    day_of_week: 'thursday',
    start_at: '2024-01-11T08:00:00Z',
    end_at: '2024-01-11T16:00:00Z',
    is_active: true,
    is_deleted: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];
