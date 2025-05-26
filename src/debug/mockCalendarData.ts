import { DateTime } from 'luxon';
import { Appointment } from '@/types/appointment';
import { AvailabilityBlock } from '@/types/availability';
import { TimeZoneService } from '@/utils/timeZoneService';

// Helper function to create a date with specific time in a timezone
const createDateTimeInZone = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): DateTime => {
  return DateTime.fromObject(
    { year, month, day, hour, minute },
    { zone: timezone }
  );
};

// Helper to create UTC ISO string from DateTime
const toUTCString = (dt: DateTime): string => {
  return dt.toUTC().toISO();
};

// Generate a week of dates starting from a specific date
export const generateWeekDates = (startDate: Date, timezone: string = TimeZoneService.DEFAULT_TIMEZONE): Date[] => {
  const result: Date[] = [];
  const start = DateTime.fromJSDate(startDate).setZone(timezone).startOf('day');
  
  for (let i = 0; i < 7; i++) {
    const day = start.plus({ days: i });
    result.push(day.toJSDate());
  }
  
  return result;
};

// Generate a week of dates starting from today
export const generateCurrentWeekDates = (timezone: string = TimeZoneService.DEFAULT_TIMEZONE): Date[] => {
  const today = new Date();
  return generateWeekDates(today, timezone);
};

// Mock client data
export const mockClients = [
  {
    id: 'client-1',
    client_first_name: 'John',
    client_last_name: 'Doe',
    client_preferred_name: 'Johnny',
    client_email: 'john.doe@example.com',
    client_phone: '555-123-4567',
    client_status: 'active',
    client_date_of_birth: '1985-05-15',
    client_gender: 'male',
    client_address: '123 Main St',
    client_city: 'Anytown',
    client_state: 'CA',
    client_zipcode: '12345'
  },
  {
    id: 'client-2',
    client_first_name: 'Jane',
    client_last_name: 'Smith',
    client_preferred_name: 'Jane',
    client_email: 'jane.smith@example.com',
    client_phone: '555-987-6543',
    client_status: 'active',
    client_date_of_birth: '1990-10-20',
    client_gender: 'female',
    client_address: '456 Oak Ave',
    client_city: 'Somewhere',
    client_state: 'NY',
    client_zipcode: '67890'
  },
  {
    id: 'client-3',
    client_first_name: 'Robert',
    client_last_name: 'Johnson',
    client_preferred_name: 'Bob',
    client_email: 'bob.johnson@example.com',
    client_phone: '555-456-7890',
    client_status: 'active',
    client_date_of_birth: '1978-03-12',
    client_gender: 'male',
    client_address: '789 Pine St',
    client_city: 'Elsewhere',
    client_state: 'TX',
    client_zipcode: '54321'
  }
];

// Create mock appointments for different scenarios
export const createMockAppointments = (
  timezone: string = TimeZoneService.DEFAULT_TIMEZONE,
  baseDate: Date = new Date()
): Record<string, Appointment[]> => {
  const baseDt = DateTime.fromJSDate(baseDate).setZone(timezone).startOf('day');
  const clinicianId = 'test-clinician-id';
  
  // Normal appointments (well-formed data)
  const normalAppointments: Appointment[] = [
    {
      id: 'appt-1',
      client_id: 'client-1',
      clinician_id: clinicianId,
      start_at: toUTCString(baseDt.set({ hour: 9, minute: 0 })),
      end_at: toUTCString(baseDt.set({ hour: 10, minute: 0 })),
      type: 'Initial Consultation',
      status: 'scheduled',
      client: mockClients[0],
      clientName: 'Johnny Doe'
    },
    {
      id: 'appt-2',
      client_id: 'client-2',
      clinician_id: clinicianId,
      start_at: toUTCString(baseDt.set({ hour: 13, minute: 0 })),
      end_at: toUTCString(baseDt.set({ hour: 14, minute: 0 })),
      type: 'Follow-up',
      status: 'scheduled',
      client: mockClients[1],
      clientName: 'Jane Smith'
    },
    {
      id: 'appt-3',
      client_id: 'client-3',
      clinician_id: clinicianId,
      start_at: toUTCString(baseDt.plus({ days: 1 }).set({ hour: 11, minute: 0 })),
      end_at: toUTCString(baseDt.plus({ days: 1 }).set({ hour: 12, minute: 0 })),
      type: 'Therapy Session',
      status: 'scheduled',
      client: mockClients[2],
      clientName: 'Bob Johnson'
    }
  ];
  
  // Empty data scenario
  const emptyAppointments: Appointment[] = [];
  
  // Malformed data scenario
  const malformedAppointments: Appointment[] = [
    {
      id: 'bad-appt-1',
      client_id: 'missing-client',
      clinician_id: clinicianId,
      start_at: toUTCString(baseDt.set({ hour: 15, minute: 0 })),
      end_at: toUTCString(baseDt.set({ hour: 16, minute: 0 })),
      type: 'Follow-up',
      status: 'scheduled',
      clientName: 'Missing Client'
    },
    {
      id: 'bad-appt-2',
      client_id: 'client-1',
      clinician_id: clinicianId,
      // End time before start time
      start_at: toUTCString(baseDt.plus({ days: 2 }).set({ hour: 14, minute: 0 })),
      end_at: toUTCString(baseDt.plus({ days: 2 }).set({ hour: 13, minute: 0 })),
      type: 'Initial Consultation',
      status: 'scheduled',
      client: mockClients[0],
      clientName: 'Johnny Doe'
    },
    {
      id: 'bad-appt-3',
      client_id: 'client-2',
      clinician_id: clinicianId,
      // Missing end time
      start_at: toUTCString(baseDt.plus({ days: 3 }).set({ hour: 10, minute: 0 })),
      end_at: '',
      type: 'Therapy Session',
      status: 'scheduled',
      client: mockClients[1],
      clientName: 'Jane Smith'
    }
  ];
  
  // Timezone edge cases
  const timezoneCrossoverAppointments: Appointment[] = [
    {
      id: 'tz-appt-1',
      client_id: 'client-1',
      clinician_id: clinicianId,
      // Appointment that crosses midnight in local timezone
      start_at: toUTCString(baseDt.set({ hour: 23, minute: 0 })),
      end_at: toUTCString(baseDt.plus({ days: 1 }).set({ hour: 0, minute: 30 })),
      type: 'Late Session',
      status: 'scheduled',
      client: mockClients[0],
      clientName: 'Johnny Doe'
    },
    {
      id: 'tz-appt-2',
      client_id: 'client-2',
      clinician_id: clinicianId,
      // Appointment during DST transition
      start_at: '2025-03-09T01:30:00.000Z', // Around DST transition in US
      end_at: '2025-03-09T02:30:00.000Z',
      type: 'DST Transition Session',
      status: 'scheduled',
      client: mockClients[1],
      clientName: 'Jane Smith'
    }
  ];
  
  // Overlapping appointments
  const overlappingAppointments: Appointment[] = [
    {
      id: 'overlap-appt-1',
      client_id: 'client-1',
      clinician_id: clinicianId,
      start_at: toUTCString(baseDt.plus({ days: 4 }).set({ hour: 9, minute: 0 })),
      end_at: toUTCString(baseDt.plus({ days: 4 }).set({ hour: 10, minute: 30 })),
      type: 'Initial Consultation',
      status: 'scheduled',
      client: mockClients[0],
      clientName: 'Johnny Doe'
    },
    {
      id: 'overlap-appt-2',
      client_id: 'client-2',
      clinician_id: clinicianId,
      start_at: toUTCString(baseDt.plus({ days: 4 }).set({ hour: 10, minute: 0 })),
      end_at: toUTCString(baseDt.plus({ days: 4 }).set({ hour: 11, minute: 0 })),
      type: 'Follow-up',
      status: 'scheduled',
      client: mockClients[1],
      clientName: 'Jane Smith'
    }
  ];
  
  return {
    normal: normalAppointments,
    empty: [],
    malformed: [],
    timezoneCrossover: [],
    overlapping: [],
    combined: normalAppointments
  };
};

// Create mock availability blocks
export const createMockAvailabilityBlocks = (
  timezone: string = TimeZoneService.DEFAULT_TIMEZONE,
  baseDate: Date = new Date()
): Record<string, AvailabilityBlock[]> => {
  const baseDt = DateTime.fromJSDate(baseDate).setZone(timezone).startOf('day');
  const clinicianId = 'test-clinician-id';
  
  // Normal availability blocks
  const normalBlocks: AvailabilityBlock[] = [
    {
      id: 'avail-1',
      clinician_id: clinicianId,
      day_of_week: 'monday',
      start_at: toUTCString(baseDt.set({ hour: 8, minute: 0 })),
      end_at: toUTCString(baseDt.set({ hour: 12, minute: 0 })),
      is_active: true,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'avail-2',
      clinician_id: clinicianId,
      day_of_week: 'monday',
      start_at: toUTCString(baseDt.set({ hour: 13, minute: 0 })),
      end_at: toUTCString(baseDt.set({ hour: 17, minute: 0 })),
      is_active: true,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'avail-3',
      clinician_id: clinicianId,
      day_of_week: 'tuesday',
      start_at: toUTCString(baseDt.plus({ days: 1 }).set({ hour: 9, minute: 0 })),
      end_at: toUTCString(baseDt.plus({ days: 1 }).set({ hour: 15, minute: 0 })),
      is_active: true,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
  
  // Inactive blocks
  const inactiveBlocks: AvailabilityBlock[] = [
    {
      id: 'inactive-1',
      clinician_id: clinicianId,
      start_at: toUTCString(baseDt.plus({ days: 2 }).set({ hour: 8, minute: 0 })),
      end_at: toUTCString(baseDt.plus({ days: 2 }).set({ hour: 12, minute: 0 })),
      is_active: false
    }
  ];
  
  // Malformed blocks
  const malformedBlocks: AvailabilityBlock[] = [
    {
      id: 'bad-avail-1',
      clinician_id: clinicianId,
      // End time before start time
      start_at: toUTCString(baseDt.plus({ days: 3 }).set({ hour: 14, minute: 0 })),
      end_at: toUTCString(baseDt.plus({ days: 3 }).set({ hour: 13, minute: 0 })),
      is_active: true
    },
    {
      id: 'bad-avail-2',
      clinician_id: clinicianId,
      // Invalid date format
      start_at: 'invalid-date',
      end_at: toUTCString(baseDt.plus({ days: 4 }).set({ hour: 12, minute: 0 })),
      is_active: true
    }
  ];
  
  // Overlapping blocks
  const overlappingBlocks: AvailabilityBlock[] = [
    {
      id: 'overlap-avail-1',
      clinician_id: clinicianId,
      start_at: toUTCString(baseDt.plus({ days: 5 }).set({ hour: 9, minute: 0 })),
      end_at: toUTCString(baseDt.plus({ days: 5 }).set({ hour: 12, minute: 0 })),
      is_active: true
    },
    {
      id: 'overlap-avail-2',
      clinician_id: clinicianId,
      start_at: toUTCString(baseDt.plus({ days: 5 }).set({ hour: 11, minute: 0 })),
      end_at: toUTCString(baseDt.plus({ days: 5 }).set({ hour: 14, minute: 0 })),
      is_active: true
    }
  ];
  
  return {
    normal: normalBlocks,
    inactive: [],
    malformed: [],
    overlapping: [],
    combined: normalBlocks
  };
};

// Create a complete test dataset with appointments and availability blocks
export const createTestDataset = (
  timezone: string = TimeZoneService.DEFAULT_TIMEZONE,
  baseDate: Date = new Date()
): {
  appointments: Record<string, Appointment[]>;
  availabilityBlocks: Record<string, AvailabilityBlock[]>;
  weekDates: Date[];
} => {
  return {
    appointments: createMockAppointments(timezone, baseDate),
    availabilityBlocks: createMockAvailabilityBlocks(timezone, baseDate),
    weekDates: generateWeekDates(baseDate, timezone)
  };
};

// Predefined timezones for testing
export const testTimezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland'
];
