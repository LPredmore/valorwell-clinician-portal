/**
 * Analytics Utilities
 * Functions for processing appointment data into analytics metrics
 */

import { DateTime } from "luxon";
import { Appointment, AppointmentStatus } from "@/types/appointment";
import {
  AnalyticsFilter,
  AnalyticsGroupBy,
  AnalyticsTimePeriod,
  AppointmentDistribution,
  AppointmentStatistics,
  AppointmentTrend,
  ClinicianUtilization,
  TimeSlotUtilization
} from "@/types/analytics";
import * as TimeZoneUtils from "@/utils/timeZoneUtils";

/**
 * Calculate basic appointment statistics
 * @param appointments Array of appointments
 * @param filter Optional filter criteria
 * @returns AppointmentStatistics object
 */
export function calculateAppointmentStatistics(
  appointments: Appointment[],
  filter?: Partial<AnalyticsFilter>
): AppointmentStatistics {
  // Apply filters if provided
  const filteredAppointments = filter ? filterAppointments(appointments, filter) : appointments;

  // Count appointments by status
  const completedAppointments = filteredAppointments.filter(
    (appt) => appt.status === AppointmentStatus.COMPLETED
  ).length;
  
  const cancelledAppointments = filteredAppointments.filter(
    (appt) => appt.status === AppointmentStatus.CANCELLED
  ).length;
  
  const noShowAppointments = filteredAppointments.filter(
    (appt) => appt.status === AppointmentStatus.NO_SHOW
  ).length;
  
  const rescheduledAppointments = filteredAppointments.filter(
    (appt) => appt.status === AppointmentStatus.RESCHEDULED
  ).length;

  // Calculate durations
  const durations = filteredAppointments.map((appt) => {
    const start = DateTime.fromISO(appt.start_at);
    const end = DateTime.fromISO(appt.end_at);
    return end.diff(start, "minutes").minutes;
  });

  const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
  const averageDuration = filteredAppointments.length > 0 
    ? totalDuration / filteredAppointments.length 
    : 0;

  return {
    totalAppointments: filteredAppointments.length,
    completedAppointments,
    cancelledAppointments,
    noShowAppointments,
    rescheduledAppointments,
    averageDuration,
    totalDuration
  };
}

/**
 * Filter appointments based on criteria
 * @param appointments Array of appointments
 * @param filter Filter criteria
 * @returns Filtered array of appointments
 */
export function filterAppointments(
  appointments: Appointment[],
  filter: Partial<AnalyticsFilter>
): Appointment[] {
  return appointments.filter((appt) => {
    // Filter by date range
    if (filter.startDate && DateTime.fromISO(appt.start_at) < DateTime.fromISO(filter.startDate)) {
      return false;
    }
    
    if (filter.endDate && DateTime.fromISO(appt.end_at) > DateTime.fromISO(filter.endDate)) {
      return false;
    }

    // Filter by clinician
    if (filter.clinicianIds && filter.clinicianIds.length > 0) {
      if (!filter.clinicianIds.includes(appt.clinician_id)) {
        return false;
      }
    }

    // Filter by appointment type
    if (filter.appointmentTypes && filter.appointmentTypes.length > 0) {
      if (!filter.appointmentTypes.includes(appt.type as any)) {
        return false;
      }
    }

    // Filter by appointment status
    if (filter.appointmentStatuses && filter.appointmentStatuses.length > 0) {
      if (!filter.appointmentStatuses.includes(appt.status as any)) {
        return false;
      }
    }

    // Filter by client
    if (filter.clientIds && filter.clientIds.length > 0) {
      if (!filter.clientIds.includes(appt.client_id)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Group appointments by a specific criterion
 * @param appointments Array of appointments
 * @param groupBy Grouping criterion
 * @param timezone User's timezone
 * @returns Object with groups as keys and appointment arrays as values
 */
export function groupAppointments(
  appointments: Appointment[],
  groupBy: AnalyticsGroupBy,
  timezone: string = "America/Chicago"
): Record<string, Appointment[]> {
  const safeTimezone = TimeZoneUtils.ensureIANATimeZone(timezone);
  const result: Record<string, Appointment[]> = {};

  appointments.forEach((appt) => {
    let key: string;

    switch (groupBy) {
      case AnalyticsGroupBy.CLINICIAN:
        key = appt.clinician_id;
        break;
      
      case AnalyticsGroupBy.CLIENT:
        key = appt.client_id;
        break;
      
      case AnalyticsGroupBy.APPOINTMENT_TYPE:
        key = appt.type.toString();
        break;
      
      case AnalyticsGroupBy.APPOINTMENT_STATUS:
        key = appt.status.toString();
        break;
      
      case AnalyticsGroupBy.DAY_OF_WEEK: {
        const date = TimeZoneUtils.fromUTC(appt.start_at, safeTimezone);
        key = date.weekday.toString(); // 1-7 (Monday-Sunday)
        break;
      }
      
      case AnalyticsGroupBy.HOUR_OF_DAY: {
        const date = TimeZoneUtils.fromUTC(appt.start_at, safeTimezone);
        key = date.hour.toString(); // 0-23
        break;
      }
      
      case AnalyticsGroupBy.MONTH: {
        const date = TimeZoneUtils.fromUTC(appt.start_at, safeTimezone);
        key = date.month.toString(); // 1-12
        break;
      }
      
      default:
        key = "unknown";
    }

    if (!result[key]) {
      result[key] = [];
    }
    
    result[key].push(appt);
  });

  return result;
}

/**
 * Calculate appointment distribution by time
 * @param appointments Array of appointments
 * @param period Time period for distribution
 * @param timezone User's timezone
 * @returns AppointmentDistribution object
 */
export function calculateAppointmentDistribution(
  appointments: Appointment[],
  period: AnalyticsTimePeriod,
  timezone: string = "America/Chicago"
): AppointmentDistribution {
  const safeTimezone = TimeZoneUtils.ensureIANATimeZone(timezone);
  const distribution: AppointmentDistribution = {
    period,
    data: []
  };

  // Group appointments based on the period
  let groupedAppointments: Record<string, Appointment[]>;
  
  switch (period) {
    case AnalyticsTimePeriod.DAILY:
      groupedAppointments = groupAppointments(appointments, AnalyticsGroupBy.DAY_OF_WEEK, safeTimezone);
      
      // Convert day numbers to day names
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      
      // Ensure all days are represented
      for (let i = 0; i < 7; i++) {
        const dayKey = ((i + 1) % 7 + 1).toString(); // Convert to Luxon's 1-7 format
        const appts = groupedAppointments[dayKey] || [];
        
        const totalDuration = appts.reduce((sum, appt) => {
          const start = DateTime.fromISO(appt.start_at);
          const end = DateTime.fromISO(appt.end_at);
          return sum + end.diff(start, "minutes").minutes;
        }, 0);
        
        distribution.data.push({
          timeLabel: dayNames[i],
          count: appts.length,
          duration: totalDuration
        });
      }
      break;
    
    case AnalyticsTimePeriod.WEEKLY:
      // Group by hour of day
      groupedAppointments = groupAppointments(appointments, AnalyticsGroupBy.HOUR_OF_DAY, safeTimezone);
      
      // Ensure all hours are represented
      for (let hour = 0; hour < 24; hour++) {
        const hourKey = hour.toString();
        const appts = groupedAppointments[hourKey] || [];
        
        const totalDuration = appts.reduce((sum, appt) => {
          const start = DateTime.fromISO(appt.start_at);
          const end = DateTime.fromISO(appt.end_at);
          return sum + end.diff(start, "minutes").minutes;
        }, 0);
        
        // Format hour as "1:00 AM", "2:00 PM", etc.
        const hourFormatted = DateTime.fromObject({ hour }, { zone: safeTimezone })
          .toFormat("h:00 a");
        
        distribution.data.push({
          timeLabel: hourFormatted,
          count: appts.length,
          duration: totalDuration
        });
      }
      break;
    
    case AnalyticsTimePeriod.MONTHLY:
      // Group by day of month
      const monthData: Record<string, { count: number; duration: number }> = {};
      
      appointments.forEach(appt => {
        const date = TimeZoneUtils.fromUTC(appt.start_at, safeTimezone);
        const dayOfMonth = date.day;
        const key = dayOfMonth.toString();
        
        if (!monthData[key]) {
          monthData[key] = { count: 0, duration: 0 };
        }
        
        monthData[key].count++;
        
        const start = DateTime.fromISO(appt.start_at);
        const end = DateTime.fromISO(appt.end_at);
        monthData[key].duration += end.diff(start, "minutes").minutes;
      });
      
      // Convert to array and sort by day
      distribution.data = Object.entries(monthData)
        .map(([day, data]) => ({
          timeLabel: `Day ${day}`,
          count: data.count,
          duration: data.duration
        }))
        .sort((a, b) => parseInt(a.timeLabel.split(' ')[1]) - parseInt(b.timeLabel.split(' ')[1]));
      break;
    
    case AnalyticsTimePeriod.QUARTERLY:
      // Group by month within quarter
      groupedAppointments = groupAppointments(appointments, AnalyticsGroupBy.MONTH, safeTimezone);
      
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      
      // Process each month
      for (let month = 1; month <= 12; month++) {
        const monthKey = month.toString();
        const appts = groupedAppointments[monthKey] || [];
        
        const totalDuration = appts.reduce((sum, appt) => {
          const start = DateTime.fromISO(appt.start_at);
          const end = DateTime.fromISO(appt.end_at);
          return sum + end.diff(start, "minutes").minutes;
        }, 0);
        
        distribution.data.push({
          timeLabel: monthNames[month - 1],
          count: appts.length,
          duration: totalDuration
        });
      }
      break;
    
    case AnalyticsTimePeriod.YEARLY:
      // Group by month
      groupedAppointments = groupAppointments(appointments, AnalyticsGroupBy.MONTH, safeTimezone);
      
      const monthNamesYearly = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      
      // Ensure all months are represented
      for (let month = 1; month <= 12; month++) {
        const monthKey = month.toString();
        const appts = groupedAppointments[monthKey] || [];
        
        const totalDuration = appts.reduce((sum, appt) => {
          const start = DateTime.fromISO(appt.start_at);
          const end = DateTime.fromISO(appt.end_at);
          return sum + end.diff(start, "minutes").minutes;
        }, 0);
        
        distribution.data.push({
          timeLabel: monthNamesYearly[month - 1],
          count: appts.length,
          duration: totalDuration
        });
      }
      break;
  }

  return distribution;
}

/**
 * Calculate clinician utilization metrics
 * @param appointments Array of appointments
 * @param clinicianId Clinician ID
 * @param clinicianName Clinician name
 * @param availableHours Available hours per day (default: 8)
 * @param workingDays Working days per week (default: 5)
 * @param filter Optional filter criteria
 * @returns ClinicianUtilization object
 */
export function calculateClinicianUtilization(
  appointments: Appointment[],
  clinicianId: string,
  clinicianName: string,
  availableHours: number = 8,
  workingDays: number = 5,
  filter?: Partial<AnalyticsFilter>
): ClinicianUtilization {
  // Filter appointments for this clinician
  const clinicianFilter: Partial<AnalyticsFilter> = {
    ...filter,
    clinicianIds: [clinicianId]
  };
  
  const clinicianAppointments = filterAppointments(appointments, clinicianFilter);
  
  // Calculate total booked time
  const totalBookedTime = clinicianAppointments.reduce((sum, appt) => {
    const start = DateTime.fromISO(appt.start_at);
    const end = DateTime.fromISO(appt.end_at);
    return sum + end.diff(start, "minutes").minutes;
  }, 0);
  
  // Calculate total available time
  let totalAvailableTime = 0;
  
  if (filter?.startDate && filter?.endDate) {
    const start = DateTime.fromISO(filter.startDate);
    const end = DateTime.fromISO(filter.endDate);
    const daysDiff = end.diff(start, "days").days;
    
    // Calculate working days in the date range
    const workingDaysInRange = Math.ceil(daysDiff * (workingDays / 7));
    
    // Convert to minutes
    totalAvailableTime = workingDaysInRange * availableHours * 60;
  } else {
    // Default to 4 weeks if no date range specified
    totalAvailableTime = 4 * workingDays * availableHours * 60;
  }
  
  // Calculate utilization rate
  const utilizationRate = totalAvailableTime > 0 
    ? (totalBookedTime / totalAvailableTime) * 100 
    : 0;
  
  // Calculate average appointment duration
  const averageAppointmentDuration = clinicianAppointments.length > 0 
    ? totalBookedTime / clinicianAppointments.length 
    : 0;
  
  // Calculate no-show and cancellation rates
  const noShowAppointments = clinicianAppointments.filter(
    (appt) => appt.status === AppointmentStatus.NO_SHOW
  ).length;
  
  const cancelledAppointments = clinicianAppointments.filter(
    (appt) => appt.status === AppointmentStatus.CANCELLED
  ).length;
  
  const noShowRate = clinicianAppointments.length > 0 
    ? (noShowAppointments / clinicianAppointments.length) * 100 
    : 0;
  
  const cancellationRate = clinicianAppointments.length > 0 
    ? (cancelledAppointments / clinicianAppointments.length) * 100 
    : 0;
  
  return {
    clinicianId,
    clinicianName,
    totalAvailableTime,
    totalBookedTime,
    utilizationRate,
    appointmentCount: clinicianAppointments.length,
    averageAppointmentDuration,
    noShowRate,
    cancellationRate
  };
}

/**
 * Calculate time slot utilization
 * @param appointments Array of appointments
 * @param timezone User's timezone
 * @returns Array of TimeSlotUtilization objects
 */
export function calculateTimeSlotUtilization(
  appointments: Appointment[],
  timezone: string = "America/Chicago"
): TimeSlotUtilization[] {
  const safeTimezone = TimeZoneUtils.ensureIANATimeZone(timezone);
  const timeSlotMap: Record<string, TimeSlotUtilization> = {};
  
  // Initialize time slots for all days and hours
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${day}-${hour}`;
      timeSlotMap[key] = {
        dayOfWeek: day,
        hourOfDay: hour,
        totalSlots: 0,
        bookedSlots: 0,
        utilizationRate: 0
      };
    }
  }
  
  // Count booked slots
  appointments.forEach(appt => {
    const start = TimeZoneUtils.fromUTC(appt.start_at, safeTimezone);
    const end = TimeZoneUtils.fromUTC(appt.end_at, safeTimezone);
    
    // Convert to JavaScript day (0-6, Sunday-Saturday)
    const dayOfWeek = start.weekday % 7;
    
    // Handle appointments that span multiple hours
    let currentHour = start.hour;
    const endHour = end.hour;
    
    while (currentHour <= endHour) {
      const key = `${dayOfWeek}-${currentHour}`;
      
      if (timeSlotMap[key]) {
        timeSlotMap[key].bookedSlots++;
        timeSlotMap[key].totalSlots++;
      }
      
      currentHour++;
    }
  });
  
  // Calculate utilization rates
  Object.values(timeSlotMap).forEach(slot => {
    slot.utilizationRate = slot.totalSlots > 0 
      ? (slot.bookedSlots / slot.totalSlots) * 100 
      : 0;
  });
  
  return Object.values(timeSlotMap);
}

/**
 * Calculate appointment trends over time
 * @param appointments Array of appointments
 * @param period Time period for trend
 * @param timezone User's timezone
 * @param filter Optional filter criteria
 * @returns AppointmentTrend object
 */
export function calculateAppointmentTrend(
  appointments: Appointment[],
  period: AnalyticsTimePeriod,
  timezone: string = "America/Chicago",
  filter?: Partial<AnalyticsFilter>
): AppointmentTrend {
  const safeTimezone = TimeZoneUtils.ensureIANATimeZone(timezone);
  const filteredAppointments = filter ? filterAppointments(appointments, filter) : appointments;
  
  const trend: AppointmentTrend = {
    period,
    data: []
  };
  
  // Group appointments by date based on the period
  const dateFormat = period === AnalyticsTimePeriod.DAILY 
    ? "yyyy-MM-dd" 
    : period === AnalyticsTimePeriod.WEEKLY 
      ? "yyyy-'W'WW" 
      : period === AnalyticsTimePeriod.MONTHLY 
        ? "yyyy-MM" 
        : period === AnalyticsTimePeriod.QUARTERLY 
          ? "yyyy-'Q'q" 
          : "yyyy";
  
  const dateMap: Record<string, { count: number; totalDuration: number; availableTime: number }> = {};
  
  // Process each appointment
  filteredAppointments.forEach(appt => {
    const date = TimeZoneUtils.fromUTC(appt.start_at, safeTimezone);
    const dateKey = date.toFormat(dateFormat);
    
    if (!dateMap[dateKey]) {
      dateMap[dateKey] = {
        count: 0,
        totalDuration: 0,
        availableTime: 0
      };
    }
    
    dateMap[dateKey].count++;
    
    const start = DateTime.fromISO(appt.start_at);
    const end = DateTime.fromISO(appt.end_at);
    dateMap[dateKey].totalDuration += end.diff(start, "minutes").minutes;
  });
  
  // Calculate available time for each period (simplified estimation)
  Object.keys(dateMap).forEach(dateKey => {
    // Estimate available time based on period
    // This is a simplified approach - in a real system, you would use actual availability data
    switch (period) {
      case AnalyticsTimePeriod.DAILY:
        dateMap[dateKey].availableTime = 8 * 60; // 8 hours per day
        break;
      case AnalyticsTimePeriod.WEEKLY:
        dateMap[dateKey].availableTime = 5 * 8 * 60; // 5 working days, 8 hours each
        break;
      case AnalyticsTimePeriod.MONTHLY:
        dateMap[dateKey].availableTime = 22 * 8 * 60; // ~22 working days per month
        break;
      case AnalyticsTimePeriod.QUARTERLY:
        dateMap[dateKey].availableTime = 65 * 8 * 60; // ~65 working days per quarter
        break;
      case AnalyticsTimePeriod.YEARLY:
        dateMap[dateKey].availableTime = 260 * 8 * 60; // ~260 working days per year
        break;
    }
  });
  
  // Convert to array and calculate utilization rates
  trend.data = Object.entries(dateMap)
    .map(([date, data]) => ({
      date,
      count: data.count,
      utilizationRate: data.availableTime > 0 
        ? (data.totalDuration / data.availableTime) * 100 
        : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  return trend;
}

/**
 * Export analytics data to CSV format
 * @param data Any analytics data object
 * @returns CSV string
 */
export function exportToCSV(data: any): string {
  if (!data || typeof data !== 'object') {
    return '';
  }
  
  // Handle array data
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return '';
    }
    
    // Get headers from the first object
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        
        // Handle different value types
        if (value === null || value === undefined) {
          return '';
        } else if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        } else {
          return `"${value.toString().replace(/"/g, '""')}"`;
        }
      });
      
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }
  
  // Handle nested object data
  const flattenedData: Record<string, any> = {};
  
  function flattenObject(obj: any, prefix = '') {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        flattenObject(obj[key], `${prefix}${key}_`);
      } else if (Array.isArray(obj[key])) {
        flattenedData[`${prefix}${key}`] = JSON.stringify(obj[key]);
      } else {
        flattenedData[`${prefix}${key}`] = obj[key];
      }
    }
  }
  
  flattenObject(data);
  
  // Convert to CSV
  const headers = Object.keys(flattenedData);
  const csvRows = [headers.join(',')];
  
  const values = headers.map(header => {
    const value = flattenedData[header];
    
    if (value === null || value === undefined) {
      return '';
    } else {
      return `"${value.toString().replace(/"/g, '""')}"`;
    }
  });
  
  csvRows.push(values.join(','));
  
  return csvRows.join('\n');
}

/**
 * Find peak hours based on appointment distribution
 * @param appointments Array of appointments
 * @param timezone User's timezone
 * @returns Array of peak hours (0-23)
 */
export function findPeakHours(
  appointments: Appointment[],
  timezone: string = "America/Chicago"
): number[] {
  const distribution = calculateAppointmentDistribution(
    appointments,
    AnalyticsTimePeriod.WEEKLY,
    timezone
  );
  
  // Sort hours by appointment count
  const sortedHours = [...distribution.data]
    .sort((a, b) => b.count - a.count);
  
  // Get top 25% of hours
  const peakCount = Math.ceil(sortedHours.length * 0.25);
  
  return sortedHours
    .slice(0, peakCount)
    .map(item => {
      // Extract hour from time label (e.g., "9:00 AM" -> 9)
      const hourMatch = item.timeLabel.match(/(\d+):00/);
      if (hourMatch) {
        let hour = parseInt(hourMatch[1]);
        
        // Convert to 24-hour format
        if (item.timeLabel.includes('PM') && hour < 12) {
          hour += 12;
        } else if (item.timeLabel.includes('AM') && hour === 12) {
          hour = 0;
        }
        
        return hour;
      }
      return -1;
    })
    .filter(hour => hour >= 0);
}

/**
 * Find underutilized time slots
 * @param appointments Array of appointments
 * @param timezone User's timezone
 * @param threshold Utilization threshold percentage (default: 30)
 * @returns Array of underutilized time slots
 */
export function findUnderutilizedTimeSlots(
  appointments: Appointment[],
  timezone: string = "America/Chicago",
  threshold: number = 30
): TimeSlotUtilization[] {
  const timeSlots = calculateTimeSlotUtilization(appointments, timezone);
  
  // Filter to business hours (e.g., 8 AM to 6 PM, Monday to Friday)
  const businessHourSlots = timeSlots.filter(slot => 
    slot.dayOfWeek >= 1 && slot.dayOfWeek <= 5 && // Monday to Friday
    slot.hourOfDay >= 8 && slot.hourOfDay <= 18   // 8 AM to 6 PM
  );
  
  // Find slots below threshold
  return businessHourSlots
    .filter(slot => slot.utilizationRate < threshold)
    .sort((a, b) => a.utilizationRate - b.utilizationRate);
}