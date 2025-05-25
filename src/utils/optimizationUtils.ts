/**
 * Optimization Utilities
 * Functions for identifying scheduling inefficiencies and generating optimization suggestions
 */

import { DateTime } from "luxon";
import { Appointment, AppointmentStatus } from "@/types/appointment";
import { SchedulingOptimizationSuggestion, TimeSlotUtilization } from "@/types/analytics";
import * as TimeZoneUtils from "@/utils/timeZoneUtils";
import * as AnalyticsUtils from "@/utils/analyticsUtils";
import { v4 as uuidv4 } from "uuid";

/**
 * Generate optimization suggestions based on appointment data
 * @param appointments Array of appointments
 * @param timezone User's timezone
 * @param optimizationGoal Optimization goal ('utilization', 'gaps', 'balance')
 * @returns Array of optimization suggestions
 */
export function generateOptimizationSuggestions(
  appointments: Appointment[],
  timezone: string = "America/Chicago",
  optimizationGoal: 'utilization' | 'gaps' | 'balance' = 'utilization'
): SchedulingOptimizationSuggestion[] {
  const suggestions: SchedulingOptimizationSuggestion[] = [];
  
  // Add suggestions based on different optimization strategies
  suggestions.push(...identifyGapFillingOpportunities(appointments, timezone));
  suggestions.push(...identifyReschedulingOpportunities(appointments, timezone));
  suggestions.push(...identifyAvailabilityAdjustments(appointments, timezone));
  
  // Filter and prioritize suggestions based on optimization goal
  const prioritizedSuggestions = prioritizeSuggestions(suggestions, optimizationGoal);
  
  return prioritizedSuggestions;
}

/**
 * Identify opportunities to fill gaps in the schedule
 * @param appointments Array of appointments
 * @param timezone User's timezone
 * @returns Array of optimization suggestions
 */
function identifyGapFillingOpportunities(
  appointments: Appointment[],
  timezone: string
): SchedulingOptimizationSuggestion[] {
  const suggestions: SchedulingOptimizationSuggestion[] = [];
  const safeTimezone = TimeZoneUtils.ensureIANATimeZone(timezone);
  
  // Group appointments by clinician and day
  const clinicianDayMap: Record<string, Record<string, Appointment[]>> = {};
  
  appointments.forEach(appt => {
    const clinicianId = appt.clinician_id;
    const date = TimeZoneUtils.fromUTC(appt.start_at, safeTimezone).toFormat('yyyy-MM-dd');
    
    if (!clinicianDayMap[clinicianId]) {
      clinicianDayMap[clinicianId] = {};
    }
    
    if (!clinicianDayMap[clinicianId][date]) {
      clinicianDayMap[clinicianId][date] = [];
    }
    
    clinicianDayMap[clinicianId][date].push(appt);
  });
  
  // For each clinician and day, identify gaps between appointments
  Object.entries(clinicianDayMap).forEach(([clinicianId, dayMap]) => {
    Object.entries(dayMap).forEach(([date, dayAppointments]) => {
      // Sort appointments by start time
      const sortedAppointments = [...dayAppointments].sort(
        (a, b) => DateTime.fromISO(a.start_at).toMillis() - DateTime.fromISO(b.start_at).toMillis()
      );
      
      // Find gaps between appointments
      for (let i = 0; i < sortedAppointments.length - 1; i++) {
        const currentAppt = sortedAppointments[i];
        const nextAppt = sortedAppointments[i + 1];
        
        const currentEnd = DateTime.fromISO(currentAppt.end_at);
        const nextStart = DateTime.fromISO(nextAppt.start_at);
        
        const gapMinutes = nextStart.diff(currentEnd, 'minutes').minutes;
        
        // If gap is between 30 and 90 minutes, suggest filling it
        if (gapMinutes >= 30 && gapMinutes <= 90) {
          suggestions.push({
            id: uuidv4(),
            type: 'ADD_AVAILABILITY',
            priority: gapMinutes >= 60 ? 'HIGH' : 'MEDIUM',
            description: `Fill ${gapMinutes}-minute gap on ${date} between ${currentEnd.toFormat('h:mm a')} and ${nextStart.toFormat('h:mm a')}`,
            impact: {
              utilizationIncrease: (gapMinutes / 480) * 100, // Assuming 8-hour workday
              additionalAppointments: 1,
              timeGained: gapMinutes
            },
            affectedClinicianIds: [clinicianId],
            suggestedChanges: {
              fromDate: currentEnd.toISO(),
              toDate: nextStart.toISO()
            }
          });
        }
      }
    });
  });
  
  return suggestions;
}

/**
 * Identify opportunities to reschedule appointments for better utilization
 * @param appointments Array of appointments
 * @param timezone User's timezone
 * @returns Array of optimization suggestions
 */
function identifyReschedulingOpportunities(
  appointments: Appointment[],
  timezone: string
): SchedulingOptimizationSuggestion[] {
  const suggestions: SchedulingOptimizationSuggestion[] = [];
  const safeTimezone = TimeZoneUtils.ensureIANATimeZone(timezone);
  
  // Find underutilized time slots
  const underutilizedSlots = AnalyticsUtils.findUnderutilizedTimeSlots(appointments, safeTimezone);
  
  // Find peak hours
  const peakHours = AnalyticsUtils.findPeakHours(appointments, safeTimezone);
  
  // Group appointments by day of week and hour
  const appointmentsByTimeSlot: Record<string, Appointment[]> = {};
  
  appointments.forEach(appt => {
    const start = TimeZoneUtils.fromUTC(appt.start_at, safeTimezone);
    const dayOfWeek = start.weekday % 7; // Convert to 0-6 format
    const hourOfDay = start.hour;
    
    const key = `${dayOfWeek}-${hourOfDay}`;
    
    if (!appointmentsByTimeSlot[key]) {
      appointmentsByTimeSlot[key] = [];
    }
    
    appointmentsByTimeSlot[key].push(appt);
  });
  
  // For each peak hour, suggest moving appointments to underutilized slots
  peakHours.forEach(peakHour => {
    // Find appointments in peak hours
    const peakDaySlots = [1, 2, 3, 4, 5]; // Monday to Friday
    
    peakDaySlots.forEach(day => {
      const peakKey = `${day}-${peakHour}`;
      const peakAppointments = appointmentsByTimeSlot[peakKey] || [];
      
      if (peakAppointments.length > 0) {
        // Find suitable underutilized slots
        const suitableSlots = underutilizedSlots.filter(slot => 
          slot.dayOfWeek !== day || slot.hourOfDay !== peakHour
        );
        
        if (suitableSlots.length > 0) {
          // Sort by utilization rate (lowest first)
          suitableSlots.sort((a, b) => a.utilizationRate - b.utilizationRate);
          
          const targetSlot = suitableSlots[0];
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          
          // Create suggestion to move an appointment
          suggestions.push({
            id: uuidv4(),
            type: 'MOVE_APPOINTMENT',
            priority: 'MEDIUM',
            description: `Move an appointment from peak hour (${peakHour}:00) on ${dayNames[day]} to underutilized slot on ${dayNames[targetSlot.dayOfWeek]} at ${targetSlot.hourOfDay}:00`,
            impact: {
              utilizationIncrease: (100 - targetSlot.utilizationRate) / 2, // Rough estimate
              additionalAppointments: 0,
              timeGained: 0
            },
            affectedAppointmentIds: [peakAppointments[0].id],
            affectedClinicianIds: [peakAppointments[0].clinician_id],
            affectedClientIds: [peakAppointments[0].client_id],
            suggestedChanges: {
              fromTime: `${peakHour}:00`,
              toTime: `${targetSlot.hourOfDay}:00`
            }
          });
        }
      }
    });
  });
  
  return suggestions;
}

/**
 * Identify opportunities to adjust clinician availability
 * @param appointments Array of appointments
 * @param timezone User's timezone
 * @returns Array of optimization suggestions
 */
function identifyAvailabilityAdjustments(
  appointments: Appointment[],
  timezone: string
): SchedulingOptimizationSuggestion[] {
  const suggestions: SchedulingOptimizationSuggestion[] = [];
  const safeTimezone = TimeZoneUtils.ensureIANATimeZone(timezone);
  
  // Calculate time slot utilization
  const timeSlots = AnalyticsUtils.calculateTimeSlotUtilization(appointments, safeTimezone);
  
  // Find consistently underutilized slots (utilization < 20%)
  const severelyUnderutilizedSlots = timeSlots.filter(slot => 
    slot.dayOfWeek >= 1 && slot.dayOfWeek <= 5 && // Monday to Friday
    slot.hourOfDay >= 8 && slot.hourOfDay <= 18 && // 8 AM to 6 PM
    slot.utilizationRate < 20 && 
    slot.totalSlots > 0
  );
  
  // Group by day of week
  const slotsByDay: Record<number, TimeSlotUtilization[]> = {};
  
  severelyUnderutilizedSlots.forEach(slot => {
    if (!slotsByDay[slot.dayOfWeek]) {
      slotsByDay[slot.dayOfWeek] = [];
    }
    
    slotsByDay[slot.dayOfWeek].push(slot);
  });
  
  // Find consecutive underutilized hours
  Object.entries(slotsByDay).forEach(([dayStr, slots]) => {
    const day = parseInt(dayStr);
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
    
    // Sort by hour
    slots.sort((a, b) => a.hourOfDay - b.hourOfDay);
    
    // Find consecutive hours
    let consecutiveStart = -1;
    let consecutiveEnd = -1;
    
    for (let i = 0; i < slots.length; i++) {
      if (i === 0 || slots[i].hourOfDay !== slots[i-1].hourOfDay + 1) {
        // Start of a new sequence
        consecutiveStart = slots[i].hourOfDay;
      }
      
      consecutiveEnd = slots[i].hourOfDay;
      
      // If we have at least 2 consecutive hours or reached the end of the array
      if ((consecutiveEnd - consecutiveStart >= 1) && 
          (i === slots.length - 1 || slots[i+1].hourOfDay !== consecutiveEnd + 1)) {
        
        suggestions.push({
          id: uuidv4(),
          type: 'REMOVE_AVAILABILITY',
          priority: 'LOW',
          description: `Consider reducing availability on ${dayName} from ${consecutiveStart}:00 to ${consecutiveEnd + 1}:00 due to consistent underutilization`,
          impact: {
            utilizationIncrease: 5, // Rough estimate
            additionalAppointments: 0,
            timeGained: 0
          },
          suggestedChanges: {
            fromTime: `${consecutiveStart}:00`,
            toTime: `${consecutiveEnd + 1}:00`
          }
        });
        
        // Reset for next sequence
        consecutiveStart = -1;
        consecutiveEnd = -1;
      }
    }
  });
  
  return suggestions;
}

/**
 * Prioritize suggestions based on optimization goal
 * @param suggestions Array of optimization suggestions
 * @param optimizationGoal Optimization goal
 * @returns Prioritized array of suggestions
 */
function prioritizeSuggestions(
  suggestions: SchedulingOptimizationSuggestion[],
  optimizationGoal: 'utilization' | 'gaps' | 'balance'
): SchedulingOptimizationSuggestion[] {
  // Create a copy to avoid modifying the original array
  const result = [...suggestions];
  
  switch (optimizationGoal) {
    case 'utilization':
      // Prioritize by utilization increase
      result.sort((a, b) => b.impact.utilizationIncrease - a.impact.utilizationIncrease);
      break;
      
    case 'gaps':
      // Prioritize by gap filling (additional appointments)
      result.sort((a, b) => {
        // First by additional appointments
        if (b.impact.additionalAppointments !== a.impact.additionalAppointments) {
          return b.impact.additionalAppointments - a.impact.additionalAppointments;
        }
        // Then by time gained
        return b.impact.timeGained - a.impact.timeGained;
      });
      break;
      
    case 'balance':
      // Balance between different types of suggestions
      const typeOrder: Record<string, number> = {
        'MOVE_APPOINTMENT': 1,
        'ADD_AVAILABILITY': 2,
        'RESCHEDULE_CLIENT': 3,
        'REMOVE_AVAILABILITY': 4
      };
      
      // Group by type
      const groupedByType: Record<string, SchedulingOptimizationSuggestion[]> = {};
      
      result.forEach(suggestion => {
        if (!groupedByType[suggestion.type]) {
          groupedByType[suggestion.type] = [];
        }
        
        groupedByType[suggestion.type].push(suggestion);
      });
      
      // Sort each group by priority and impact
      Object.values(groupedByType).forEach(group => {
        group.sort((a, b) => {
          // First by priority
          const priorityOrder: Record<string, number> = {
            'HIGH': 1,
            'MEDIUM': 2,
            'LOW': 3
          };
          
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          
          // Then by utilization increase
          return b.impact.utilizationIncrease - a.impact.utilizationIncrease;
        });
      });
      
      // Interleave suggestions from different types
      result.length = 0;
      
      // Get types in order
      const types = Object.keys(typeOrder).sort((a, b) => typeOrder[a] - typeOrder[b]);
      
      // Take suggestions from each type in a round-robin fashion
      let hasMore = true;
      let index = 0;
      
      while (hasMore) {
        hasMore = false;
        
        for (const type of types) {
          if (groupedByType[type] && index < groupedByType[type].length) {
            result.push(groupedByType[type][index]);
            hasMore = true;
          }
        }
        
        index++;
      }
      
      break;
  }
  
  return result;
}

/**
 * Apply optimization suggestion to appointments
 * @param suggestion Optimization suggestion
 * @param appointments Array of appointments
 * @param timezone User's timezone
 * @returns Updated array of appointments
 */
export function applyOptimizationSuggestion(
  suggestion: SchedulingOptimizationSuggestion,
  appointments: Appointment[],
  timezone: string = "America/Chicago"
): Appointment[] {
  const safeTimezone = TimeZoneUtils.ensureIANATimeZone(timezone);
  const result = [...appointments];
  
  switch (suggestion.type) {
    case 'MOVE_APPOINTMENT':
      if (suggestion.affectedAppointmentIds && suggestion.affectedAppointmentIds.length > 0) {
        const appointmentId = suggestion.affectedAppointmentIds[0];
        const appointmentIndex = result.findIndex(appt => appt.id === appointmentId);
        
        if (appointmentIndex >= 0) {
          const appointment = result[appointmentIndex];
          
          // Parse the suggested time changes
          if (suggestion.suggestedChanges.fromTime && suggestion.suggestedChanges.toTime) {
            const fromHour = parseInt(suggestion.suggestedChanges.fromTime.split(':')[0]);
            const toHour = parseInt(suggestion.suggestedChanges.toTime.split(':')[0]);
            
            // Calculate the hour difference
            const hourDiff = toHour - fromHour;
            
            // Apply the change
            const startDt = DateTime.fromISO(appointment.start_at);
            const endDt = DateTime.fromISO(appointment.end_at);
            
            const newStartDt = startDt.plus({ hours: hourDiff });
            const newEndDt = endDt.plus({ hours: hourDiff });
            
            // Update the appointment
            result[appointmentIndex] = {
              ...appointment,
              start_at: newStartDt.toISO(),
              end_at: newEndDt.toISO()
            };
          }
        }
      }
      break;
      
    case 'RESCHEDULE_CLIENT':
      // Similar to MOVE_APPOINTMENT but would involve client communication
      // This would typically be handled by the application's scheduling system
      break;
      
    case 'ADD_AVAILABILITY':
    case 'REMOVE_AVAILABILITY':
      // These suggestions affect availability, not appointments directly
      // They would be handled by the application's availability management system
      break;
  }
  
  return result;
}

/**
 * Generate explanation for an optimization suggestion
 * @param suggestion Optimization suggestion
 * @returns Detailed explanation string
 */
export function generateSuggestionExplanation(
  suggestion: SchedulingOptimizationSuggestion
): string {
  let explanation = `${suggestion.description}\n\n`;
  
  explanation += `Impact:\n`;
  explanation += `- Utilization increase: ${suggestion.impact.utilizationIncrease.toFixed(1)}%\n`;
  
  if (suggestion.impact.additionalAppointments > 0) {
    explanation += `- Additional appointments possible: ${suggestion.impact.additionalAppointments}\n`;
  }
  
  if (suggestion.impact.timeGained > 0) {
    const hours = Math.floor(suggestion.impact.timeGained / 60);
    const minutes = suggestion.impact.timeGained % 60;
    
    explanation += `- Time gained: `;
    
    if (hours > 0) {
      explanation += `${hours} hour${hours !== 1 ? 's' : ''}`;
      if (minutes > 0) {
        explanation += ` and `;
      }
    }
    
    if (minutes > 0) {
      explanation += `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    explanation += `\n`;
  }
  
  explanation += `\nReasoning:\n`;
  
  switch (suggestion.type) {
    case 'MOVE_APPOINTMENT':
      explanation += `Moving this appointment from a peak hour to an underutilized time slot will help balance the schedule and improve overall utilization. This change reduces congestion during busy periods while making better use of available time during slower periods.`;
      break;
      
    case 'ADD_AVAILABILITY':
      explanation += `There is a gap in the schedule that could be filled with a new appointment. By utilizing this gap, you can increase the number of appointments without extending working hours.`;
      break;
      
    case 'REMOVE_AVAILABILITY':
      explanation += `This time slot has been consistently underutilized. Removing it from available hours could help focus availability on more popular times and potentially reduce operational costs.`;
      break;
      
    case 'RESCHEDULE_CLIENT':
      explanation += `Rescheduling this client to a different time would help optimize the overall schedule by improving utilization rates and creating more efficient appointment sequences.`;
      break;
  }
  
  return explanation;
}

/**
 * Check if a suggestion can be automatically applied
 * @param suggestion Optimization suggestion
 * @returns Boolean indicating if suggestion can be auto-applied
 */
export function canAutoApplySuggestion(
  suggestion: SchedulingOptimizationSuggestion
): boolean {
  // Only certain types of suggestions can be automatically applied
  switch (suggestion.type) {
    case 'MOVE_APPOINTMENT':
      // Can only auto-apply if it's not affecting a client appointment
      return !suggestion.affectedClientIds || suggestion.affectedClientIds.length === 0;
      
    case 'ADD_AVAILABILITY':
      // Adding availability can typically be automated
      return true;
      
    case 'REMOVE_AVAILABILITY':
      // Removing availability can typically be automated if no appointments are affected
      return !suggestion.affectedAppointmentIds || suggestion.affectedAppointmentIds.length === 0;
      
    case 'RESCHEDULE_CLIENT':
      // Client rescheduling should never be automated
      return false;
      
    default:
      return false;
  }
}