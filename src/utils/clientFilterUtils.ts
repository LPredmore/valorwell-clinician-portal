
import { BLOCKED_TIME_CLIENT_ID } from '@/utils/blockedTimeUtils';

// Secret type used by BlockedTimeService
const INTERNAL_BLOCKED_TIME_TYPE = 'INTERNAL_BLOCKED_TIME';

// Client filtering utilities
export const filterRealClients = <T extends { id: string }>(clients: T[]): T[] => {
  if (!clients || !Array.isArray(clients)) {
    console.warn('[clientFilterUtils] Invalid clients array provided:', clients);
    return [];
  }
  
  const filtered = clients.filter(client => {
    if (!client || !client.id) {
      console.warn('[clientFilterUtils] Client missing id:', client);
      return false;
    }
    return client.id !== BLOCKED_TIME_CLIENT_ID;
  });
  
  console.log(`[clientFilterUtils] Filtered ${clients.length - filtered.length} blocked time clients from ${clients.length} total clients`);
  return filtered;
};

// Enhanced appointment filtering utilities that exclude both old and new blocked time
export const filterRealAppointments = <T extends { client_id: string; type?: string }>(appointments: T[]): T[] => {
  if (!appointments || !Array.isArray(appointments)) {
    console.warn('[clientFilterUtils] Invalid appointments array provided:', appointments);
    return [];
  }
  
  const filtered = appointments.filter(appointment => {
    if (!appointment || !appointment.client_id) {
      console.warn('[clientFilterUtils] Appointment missing client_id:', appointment);
      return false;
    }
    
    // Filter out old blocked time approach (fake client)
    if (appointment.client_id === BLOCKED_TIME_CLIENT_ID) {
      return false;
    }
    
    // Filter out new blocked time approach (secret type)
    if (appointment.type === INTERNAL_BLOCKED_TIME_TYPE) {
      return false;
    }
    
    return true;
  });
  
  console.log(`[clientFilterUtils] Filtered ${appointments.length - filtered.length} blocked time appointments from ${appointments.length} total appointments`);
  return filtered;
};

// Check if a client is the blocked time client
export const isBlockedTimeClient = (clientId: string | null | undefined): boolean => {
  if (!clientId) return false;
  return clientId === BLOCKED_TIME_CLIENT_ID;
};

// Check if an appointment is blocked time (both old and new methods)
export const isBlockedTimeAppointment = (appointment: any): boolean => {
  if (!appointment) return false;
  
  // Check old method (fake client)
  if (appointment.client_id === BLOCKED_TIME_CLIENT_ID) {
    return true;
  }
  
  // Check new method (secret type)
  if (appointment.type === INTERNAL_BLOCKED_TIME_TYPE) {
    return true;
  }
  
  return false;
};

// Safe client count that excludes blocked time
export const getRealClientCount = <T extends { id: string }>(clients: T[]): number => {
  return filterRealClients(clients).length;
};

// Safe appointment count that excludes blocked time
export const getRealAppointmentCount = <T extends { client_id: string; type?: string }>(appointments: T[]): number => {
  return filterRealAppointments(appointments).length;
};

// Export the secret type for internal use
export const getInternalBlockedTimeType = (): string => {
  return INTERNAL_BLOCKED_TIME_TYPE;
};
