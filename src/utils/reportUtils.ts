/**
 * Report Utilities
 * Functions for generating and exporting reports
 */

import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { DateTime } from "luxon";
import { Appointment } from "@/types/appointment";
import {
  AnalyticsFilter,
  AnalyticsTimePeriod,
  AppointmentDistribution,
  AppointmentStatistics,
  AppointmentTrend,
  ClinicianUtilization,
  ReportConfig,
  ReportTemplateType
} from "@/types/analytics";
import * as AnalyticsUtils from "@/utils/analyticsUtils";
import * as TimeZoneUtils from "@/utils/timeZoneUtils";

/**
 * Generate a report based on configuration
 * @param config Report configuration
 * @param appointments Array of appointments
 * @param timezone User's timezone
 * @returns Report data object
 */
export function generateReport(
  config: ReportConfig,
  appointments: Appointment[],
  timezone: string = "America/Chicago"
): any {
  const safeTimezone = TimeZoneUtils.ensureIANATimeZone(timezone);
  const filteredAppointments = AnalyticsUtils.filterAppointments(appointments, config.filter);
  
  // Base report data
  const report: any = {
    title: config.title,
    description: config.description || "",
    generatedAt: DateTime.now().setZone(safeTimezone).toISO(),
    timeRange: {
      startDate: config.filter.startDate,
      endDate: config.filter.endDate
    },
    filter: config.filter
  };
  
  // Add template-specific data
  switch (config.templateType) {
    case ReportTemplateType.SUMMARY:
      report.statistics = AnalyticsUtils.calculateAppointmentStatistics(
        filteredAppointments,
        config.filter
      );
      
      if (config.includeCharts) {
        report.distribution = AnalyticsUtils.calculateAppointmentDistribution(
          filteredAppointments,
          config.filter.startDate && config.filter.endDate
            ? getTimePeriodForDateRange(config.filter.startDate, config.filter.endDate)
            : AnalyticsTimePeriod.WEEKLY,
          safeTimezone
        );
      }
      break;
      
    case ReportTemplateType.DETAILED:
      report.statistics = AnalyticsUtils.calculateAppointmentStatistics(
        filteredAppointments,
        config.filter
      );
      
      if (config.includeCharts) {
        report.distribution = AnalyticsUtils.calculateAppointmentDistribution(
          filteredAppointments,
          AnalyticsTimePeriod.WEEKLY,
          safeTimezone
        );
        
        report.trend = AnalyticsUtils.calculateAppointmentTrend(
          filteredAppointments,
          AnalyticsTimePeriod.MONTHLY,
          safeTimezone,
          config.filter
        );
      }
      
      if (config.includeRawData) {
        report.appointments = filteredAppointments.map(appt => ({
          id: appt.id,
          clientName: appt.clientName || `${appt.client?.client_first_name || ""} ${appt.client?.client_last_name || ""}`.trim(),
          clinicianId: appt.clinician_id,
          startAt: TimeZoneUtils.fromUTC(appt.start_at, safeTimezone).toFormat("yyyy-MM-dd HH:mm"),
          endAt: TimeZoneUtils.fromUTC(appt.end_at, safeTimezone).toFormat("yyyy-MM-dd HH:mm"),
          type: appt.type,
          status: appt.status
        }));
      }
      break;
      
    case ReportTemplateType.COMPARATIVE:
      // For comparative reports, we need to split the date range in half
      if (config.filter.startDate && config.filter.endDate) {
        const startDate = DateTime.fromISO(config.filter.startDate);
        const endDate = DateTime.fromISO(config.filter.endDate);
        const midPoint = startDate.plus(endDate.diff(startDate).shiftTo('milliseconds').mapUnits(n => n / 2));
        
        const firstHalfFilter: AnalyticsFilter = {
          ...config.filter,
          endDate: midPoint.toISO()
        };
        
        const secondHalfFilter: AnalyticsFilter = {
          ...config.filter,
          startDate: midPoint.toISO()
        };
        
        report.firstPeriod = {
          timeRange: {
            startDate: firstHalfFilter.startDate,
            endDate: firstHalfFilter.endDate
          },
          statistics: AnalyticsUtils.calculateAppointmentStatistics(
            filteredAppointments,
            firstHalfFilter
          )
        };
        
        report.secondPeriod = {
          timeRange: {
            startDate: secondHalfFilter.startDate,
            endDate: secondHalfFilter.endDate
          },
          statistics: AnalyticsUtils.calculateAppointmentStatistics(
            filteredAppointments,
            secondHalfFilter
          )
        };
        
        // Calculate percentage changes
        report.changes = calculatePercentageChanges(
          report.firstPeriod.statistics,
          report.secondPeriod.statistics
        );
      }
      break;
      
    case ReportTemplateType.UTILIZATION:
      // Group appointments by clinician
      const clinicianAppointments: Record<string, Appointment[]> = {};
      const clinicianNames: Record<string, string> = {};
      
      filteredAppointments.forEach(appt => {
        if (!clinicianAppointments[appt.clinician_id]) {
          clinicianAppointments[appt.clinician_id] = [];
        }
        
        clinicianAppointments[appt.clinician_id].push(appt);
        
        // Store clinician name if available (would typically come from a clinician service)
        clinicianNames[appt.clinician_id] = `Clinician ${appt.clinician_id.substring(0, 8)}`;
      });
      
      // Calculate utilization for each clinician
      report.clinicianUtilization = Object.entries(clinicianAppointments).map(
        ([clinicianId, appts]) => AnalyticsUtils.calculateClinicianUtilization(
          appts,
          clinicianId,
          clinicianNames[clinicianId] || clinicianId,
          8, // Default 8 hours per day
          5, // Default 5 days per week
          config.filter
        )
      );
      
      // Sort by utilization rate (highest first)
      report.clinicianUtilization.sort((a, b) => b.utilizationRate - a.utilizationRate);
      
      // Calculate overall utilization
      report.overallUtilization = {
        totalAvailableTime: report.clinicianUtilization.reduce(
          (sum: number, util: ClinicianUtilization) => sum + util.totalAvailableTime, 0
        ),
        totalBookedTime: report.clinicianUtilization.reduce(
          (sum: number, util: ClinicianUtilization) => sum + util.totalBookedTime, 0
        ),
        utilizationRate: 0,
        appointmentCount: filteredAppointments.length
      };
      
      report.overallUtilization.utilizationRate = report.overallUtilization.totalAvailableTime > 0
        ? (report.overallUtilization.totalBookedTime / report.overallUtilization.totalAvailableTime) * 100
        : 0;
      break;
      
    case ReportTemplateType.CLIENT_ACTIVITY:
      // Group appointments by client
      const clientAppointments: Record<string, Appointment[]> = {};
      
      filteredAppointments.forEach(appt => {
        if (!clientAppointments[appt.client_id]) {
          clientAppointments[appt.client_id] = [];
        }
        
        clientAppointments[appt.client_id].push(appt);
      });
      
      // Calculate statistics for each client
      report.clientActivity = Object.entries(clientAppointments).map(([clientId, appts]) => {
        const clientName = appts[0].clientName || 
          `${appts[0].client?.client_first_name || ""} ${appts[0].client?.client_last_name || ""}`.trim() || 
          `Client ${clientId.substring(0, 8)}`;
        
        const stats = AnalyticsUtils.calculateAppointmentStatistics(appts);
        
        return {
          clientId,
          clientName,
          appointmentCount: stats.totalAppointments,
          completedAppointments: stats.completedAppointments,
          cancelledAppointments: stats.cancelledAppointments,
          noShowAppointments: stats.noShowAppointments,
          noShowRate: stats.totalAppointments > 0 
            ? (stats.noShowAppointments / stats.totalAppointments) * 100 
            : 0,
          cancellationRate: stats.totalAppointments > 0 
            ? (stats.cancelledAppointments / stats.totalAppointments) * 100 
            : 0,
          averageDuration: stats.averageDuration
        };
      });
      
      // Sort by appointment count (highest first)
      report.clientActivity.sort((a: any, b: any) => b.appointmentCount - a.appointmentCount);
      
      // Calculate overall client statistics
      report.overallClientStatistics = {
        totalClients: report.clientActivity.length,
        averageAppointmentsPerClient: report.clientActivity.length > 0
          ? filteredAppointments.length / report.clientActivity.length
          : 0,
        averageNoShowRate: report.clientActivity.length > 0
          ? report.clientActivity.reduce((sum: number, client: any) => sum + client.noShowRate, 0) / report.clientActivity.length
          : 0,
        averageCancellationRate: report.clientActivity.length > 0
          ? report.clientActivity.reduce((sum: number, client: any) => sum + client.cancellationRate, 0) / report.clientActivity.length
          : 0
      };
      break;
      
    case ReportTemplateType.CLINICIAN_PERFORMANCE:
      // Similar to utilization but with additional performance metrics
      // Group appointments by clinician
      const clinicianPerformanceData: Record<string, Appointment[]> = {};
      const clinicianPerformanceNames: Record<string, string> = {};
      
      filteredAppointments.forEach(appt => {
        if (!clinicianPerformanceData[appt.clinician_id]) {
          clinicianPerformanceData[appt.clinician_id] = [];
        }
        
        clinicianPerformanceData[appt.clinician_id].push(appt);
        
        // Store clinician name if available
        clinicianPerformanceNames[appt.clinician_id] = `Clinician ${appt.clinician_id.substring(0, 8)}`;
      });
      
      // Calculate performance metrics for each clinician
      report.clinicianPerformance = Object.entries(clinicianPerformanceData).map(
        ([clinicianId, appts]) => {
          const utilization = AnalyticsUtils.calculateClinicianUtilization(
            appts,
            clinicianId,
            clinicianPerformanceNames[clinicianId] || clinicianId,
            8, // Default 8 hours per day
            5, // Default 5 days per week
            config.filter
          );
          
          const stats = AnalyticsUtils.calculateAppointmentStatistics(appts);
          
          return {
            ...utilization,
            completionRate: stats.totalAppointments > 0
              ? (stats.completedAppointments / stats.totalAppointments) * 100
              : 0,
            efficiency: utilization.utilizationRate > 0 && stats.totalAppointments > 0
              ? (stats.completedAppointments / stats.totalAppointments) * utilization.utilizationRate
              : 0
          };
        }
      );
      
      // Sort by efficiency (highest first)
      report.clinicianPerformance.sort((a: any, b: any) => b.efficiency - a.efficiency);
      break;
  }
  
  return report;
}

/**
 * Calculate percentage changes between two statistics objects
 * @param first First period statistics
 * @param second Second period statistics
 * @returns Object with percentage changes
 */
function calculatePercentageChanges(
  first: AppointmentStatistics,
  second: AppointmentStatistics
): Record<string, number> {
  const calculateChange = (a: number, b: number): number => {
    if (a === 0) return b > 0 ? 100 : 0;
    return ((b - a) / a) * 100;
  };
  
  return {
    totalAppointments: calculateChange(first.totalAppointments, second.totalAppointments),
    completedAppointments: calculateChange(first.completedAppointments, second.completedAppointments),
    cancelledAppointments: calculateChange(first.cancelledAppointments, second.cancelledAppointments),
    noShowAppointments: calculateChange(first.noShowAppointments, second.noShowAppointments),
    rescheduledAppointments: calculateChange(first.rescheduledAppointments, second.rescheduledAppointments),
    averageDuration: calculateChange(first.averageDuration, second.averageDuration),
    totalDuration: calculateChange(first.totalDuration, second.totalDuration)
  };
}

/**
 * Determine the appropriate time period for a date range
 * @param startDate Start date (ISO string)
 * @param endDate End date (ISO string)
 * @returns Appropriate time period
 */
function getTimePeriodForDateRange(startDate: string, endDate: string): AnalyticsTimePeriod {
  const start = DateTime.fromISO(startDate);
  const end = DateTime.fromISO(endDate);
  const daysDiff = end.diff(start, "days").days;
  
  if (daysDiff <= 7) {
    return AnalyticsTimePeriod.DAILY;
  } else if (daysDiff <= 31) {
    return AnalyticsTimePeriod.WEEKLY;
  } else if (daysDiff <= 90) {
    return AnalyticsTimePeriod.MONTHLY;
  } else if (daysDiff <= 365) {
    return AnalyticsTimePeriod.QUARTERLY;
  } else {
    return AnalyticsTimePeriod.YEARLY;
  }
}

/**
 * Export report to PDF
 * @param report Report data object
 * @returns PDF document as Blob
 */
export function exportReportToPDF(report: any): Blob {
  // Create new PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add title
  doc.setFontSize(18);
  doc.text(report.title, pageWidth / 2, 20, { align: "center" });
  
  // Add description if available
  if (report.description) {
    doc.setFontSize(12);
    doc.text(report.description, pageWidth / 2, 30, { align: "center" });
  }
  
  // Add generation date
  doc.setFontSize(10);
  doc.text(
    `Generated: ${DateTime.fromISO(report.generatedAt).toFormat("yyyy-MM-dd HH:mm")}`,
    pageWidth - 15,
    10,
    { align: "right" }
  );
  
  // Add time range
  doc.text(
    `Period: ${DateTime.fromISO(report.timeRange.startDate).toFormat("yyyy-MM-dd")} to ${DateTime.fromISO(report.timeRange.endDate).toFormat("yyyy-MM-dd")}`,
    15,
    40
  );
  
  let yPosition = 50;
  
  // Add statistics if available
  if (report.statistics) {
    doc.setFontSize(14);
    doc.text("Appointment Statistics", 15, yPosition);
    yPosition += 10;
    
    const statsData = [
      ["Total Appointments", report.statistics.totalAppointments.toString()],
      ["Completed Appointments", report.statistics.completedAppointments.toString()],
      ["Cancelled Appointments", report.statistics.cancelledAppointments.toString()],
      ["No-Show Appointments", report.statistics.noShowAppointments.toString()],
      ["Rescheduled Appointments", report.statistics.rescheduledAppointments.toString()],
      ["Average Duration (min)", report.statistics.averageDuration.toFixed(1)],
      ["Total Duration (min)", report.statistics.totalDuration.toFixed(1)]
    ];
    
    (doc as any).autoTable({
      startY: yPosition,
      head: [["Metric", "Value"]],
      body: statsData,
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Add clinician utilization if available
  if (report.clinicianUtilization) {
    doc.setFontSize(14);
    doc.text("Clinician Utilization", 15, yPosition);
    yPosition += 10;
    
    const utilizationData = report.clinicianUtilization.map((util: ClinicianUtilization) => [
      util.clinicianName,
      `${util.utilizationRate.toFixed(1)}%`,
      util.appointmentCount.toString(),
      `${util.noShowRate.toFixed(1)}%`,
      `${util.cancellationRate.toFixed(1)}%`
    ]);
    
    (doc as any).autoTable({
      startY: yPosition,
      head: [["Clinician", "Utilization", "Appointments", "No-Show Rate", "Cancellation Rate"]],
      body: utilizationData,
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    
    // Add overall utilization
    if (report.overallUtilization) {
      doc.setFontSize(12);
      doc.text(`Overall Utilization: ${report.overallUtilization.utilizationRate.toFixed(1)}%`, 15, yPosition);
      yPosition += 10;
    }
  }
  
  // Add client activity if available
  if (report.clientActivity) {
    doc.setFontSize(14);
    doc.text("Client Activity", 15, yPosition);
    yPosition += 10;
    
    const clientData = report.clientActivity.slice(0, 10).map((client: any) => [
      client.clientName,
      client.appointmentCount.toString(),
      client.completedAppointments.toString(),
      `${client.noShowRate.toFixed(1)}%`,
      `${client.cancellationRate.toFixed(1)}%`
    ]);
    
    (doc as any).autoTable({
      startY: yPosition,
      head: [["Client", "Appointments", "Completed", "No-Show Rate", "Cancellation Rate"]],
      body: clientData,
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Add comparative data if available
  if (report.changes) {
    doc.setFontSize(14);
    doc.text("Period Comparison", 15, yPosition);
    yPosition += 10;
    
    const changeData = Object.entries(report.changes).map(([key, value]) => [
      key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      `${(value as number).toFixed(1)}%`,
      (value as number) >= 0 ? "Increase" : "Decrease"
    ]);
    
    (doc as any).autoTable({
      startY: yPosition,
      head: [["Metric", "Change", "Direction"]],
      body: changeData,
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Add appointments if available
  if (report.appointments && report.appointments.length > 0) {
    // Add a new page if we're running out of space
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.text("Appointment Details", 15, yPosition);
    yPosition += 10;
    
    const appointmentData = report.appointments.map((appt: any) => [
      appt.clientName,
      appt.startAt,
      appt.type,
      appt.status
    ]);
    
    (doc as any).autoTable({
      startY: yPosition,
      head: [["Client", "Date & Time", "Type", "Status"]],
      body: appointmentData,
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202] }
    });
  }
  
  // Return the PDF as a blob
  return doc.output("blob");
}

/**
 * Schedule a report for automated delivery
 * @param config Report configuration with scheduled delivery settings
 * @returns Boolean indicating success
 */
export function scheduleReport(config: ReportConfig): boolean {
  // This would typically integrate with a backend service for scheduling
  // For now, we'll just validate the configuration
  
  if (!config.scheduledDelivery) {
    return false;
  }
  
  const { frequency, recipients } = config.scheduledDelivery;
  
  // Validate frequency
  if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
    return false;
  }
  
  // Validate recipients
  if (!recipients || recipients.length === 0) {
    return false;
  }
  
  // Validate email format
  const validEmails = recipients.every(email => 
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
  
  if (!validEmails) {
    return false;
  }
  
  // For weekly reports, validate day of week
  if (frequency === 'weekly' && 
      (config.scheduledDelivery.dayOfWeek === undefined || 
       config.scheduledDelivery.dayOfWeek < 0 || 
       config.scheduledDelivery.dayOfWeek > 6)) {
    return false;
  }
  
  // For monthly reports, validate day of month
  if (frequency === 'monthly' && 
      (config.scheduledDelivery.dayOfMonth === undefined || 
       config.scheduledDelivery.dayOfMonth < 1 || 
       config.scheduledDelivery.dayOfMonth > 31)) {
    return false;
  }
  
  // In a real implementation, this would save the schedule to a database
  // and set up the actual scheduling mechanism
  
  return true;
}