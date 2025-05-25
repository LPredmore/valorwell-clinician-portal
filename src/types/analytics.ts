/**
 * Analytics Data Models
 * This file contains type definitions for calendar analytics features
 */

import { AppointmentStatus, AppointmentType } from "./appointment";

/**
 * Time period for analytics aggregation
 */
export enum AnalyticsTimePeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

/**
 * Filter options for analytics data
 */
export interface AnalyticsFilter {
  startDate: string;
  endDate: string;
  clinicianIds?: string[];
  appointmentTypes?: AppointmentType[];
  appointmentStatuses?: AppointmentStatus[];
  clientIds?: string[];
  groupBy?: AnalyticsGroupBy;
}

/**
 * Grouping options for analytics data
 */
export enum AnalyticsGroupBy {
  CLINICIAN = 'clinician',
  CLIENT = 'client',
  APPOINTMENT_TYPE = 'appointmentType',
  APPOINTMENT_STATUS = 'appointmentStatus',
  DAY_OF_WEEK = 'dayOfWeek',
  HOUR_OF_DAY = 'hourOfDay',
  MONTH = 'month'
}

/**
 * Basic appointment statistics
 */
export interface AppointmentStatistics {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  rescheduledAppointments: number;
  averageDuration: number; // in minutes
  totalDuration: number; // in minutes
}

/**
 * Appointment distribution by time
 */
export interface AppointmentDistribution {
  period: AnalyticsTimePeriod;
  data: Array<{
    timeLabel: string; // e.g., "Monday", "9:00 AM", "January"
    count: number;
    duration: number; // in minutes
  }>;
}

/**
 * Clinician utilization metrics
 */
export interface ClinicianUtilization {
  clinicianId: string;
  clinicianName: string;
  totalAvailableTime: number; // in minutes
  totalBookedTime: number; // in minutes
  utilizationRate: number; // percentage (0-100)
  appointmentCount: number;
  averageAppointmentDuration: number; // in minutes
  noShowRate: number; // percentage (0-100)
  cancellationRate: number; // percentage (0-100)
}

/**
 * Time slot utilization data
 */
export interface TimeSlotUtilization {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  hourOfDay: number; // 0-23
  totalSlots: number;
  bookedSlots: number;
  utilizationRate: number; // percentage (0-100)
}

/**
 * Appointment trend data over time
 */
export interface AppointmentTrend {
  period: AnalyticsTimePeriod;
  data: Array<{
    date: string; // ISO date string
    count: number;
    utilizationRate: number; // percentage (0-100)
  }>;
}

/**
 * Optimization suggestion for scheduling
 */
export interface SchedulingOptimizationSuggestion {
  id: string;
  type: 'MOVE_APPOINTMENT' | 'ADD_AVAILABILITY' | 'REMOVE_AVAILABILITY' | 'RESCHEDULE_CLIENT';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  impact: {
    utilizationIncrease: number; // percentage points
    additionalAppointments: number;
    timeGained: number; // in minutes
  };
  affectedAppointmentIds?: string[];
  affectedClinicianIds?: string[];
  affectedClientIds?: string[];
  suggestedChanges: {
    fromDate?: string; // ISO date string
    toDate?: string; // ISO date string
    fromTime?: string; // ISO time string
    toTime?: string; // ISO time string
  };
}

/**
 * Report template types
 */
export enum ReportTemplateType {
  SUMMARY = 'summary',
  DETAILED = 'detailed',
  COMPARATIVE = 'comparative',
  UTILIZATION = 'utilization',
  CLIENT_ACTIVITY = 'clientActivity',
  CLINICIAN_PERFORMANCE = 'clinicianPerformance'
}

/**
 * Report configuration
 */
export interface ReportConfig {
  title: string;
  description?: string;
  templateType: ReportTemplateType;
  filter: AnalyticsFilter;
  includeCharts: boolean;
  includeRawData: boolean;
  scheduledDelivery?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    recipients: string[]; // email addresses
  };
}

/**
 * Analytics dashboard configuration
 */
export interface AnalyticsDashboardConfig {
  timeRange: {
    startDate: string;
    endDate: string;
  };
  widgets: Array<{
    id: string;
    type: 'APPOINTMENT_COUNT' | 'UTILIZATION_RATE' | 'DISTRIBUTION_CHART' | 'TREND_CHART' | 'TOP_CLIENTS' | 'TOP_CLINICIANS';
    title: string;
    filter?: Partial<AnalyticsFilter>;
    size: 'small' | 'medium' | 'large';
    position: {
      row: number;
      col: number;
    };
  }>;
}