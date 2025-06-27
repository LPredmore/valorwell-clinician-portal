
import { BLOCKED_TIME_CLIENT_ID } from '@/utils/blockedTimeUtils';

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

// Appointment filtering utilities
export const filterRealAppointments = <T extends { client_id: string }>(appointments: T[]): T[] => {
  if (!appointments || !Array.isArray(appointments)) {
    console.warn('[clientFilterUtils] Invalid appointments array provided:', appointments);
    return [];
  }
  
  const filtered = appointments.filter(appointment => {
    if (!appointment || !appointment.client_id) {
      console.warn('[clientFilterUtils] Appointment missing client_id:', appointment);
      return false;
    }
    return appointment.client_id !== BLOCKED_TIME_CLIENT_ID;
  });
  
  console.log(`[clientFilterUtils] Filtered ${appointments.length - filtered.length} blocked time appointments from ${appointments.length} total appointments`);
  return filtered;
};

// Check if a client is the blocked time client
export const isBlockedTimeClient = (clientId: string | null | undefined): boolean => {
  if (!clientId) return false;
  return clientId === BLOCKED_TIME_CLIENT_ID;
};

// Safe client count that excludes blocked time
export const getRealClientCount = <T extends { id: string }>(clients: T[]): number => {
  return filterRealClients(clients).length;
};
