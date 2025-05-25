/**
 * Calendar Import/Export Utility
 * Handles importing and exporting calendar data in various formats
 */

import { Appointment } from '@/types/appointment';
import { CalendarFormat, ImportExportOptions, ImportResult, ExportResult } from '@/types/calendarSync';
import { DateTime } from 'luxon';
import { saveAs } from 'file-saver';
import ical, { ICalCalendar } from 'ical-generator';
import Papa from 'papaparse';

/**
 * Export calendar data to a file
 * @param appointments Appointments to export
 * @param options Export options
 */
export const exportCalendarData = async (
  appointments: Appointment[],
  options: ImportExportOptions
): Promise<ExportResult> => {
  // Filter appointments based on options
  let filteredAppointments = appointments;
  
  // Filter by date range if specified
  if (options.dateRange) {
    const startDate = new Date(options.dateRange.startDate);
    const endDate = new Date(options.dateRange.endDate);
    
    filteredAppointments = filteredAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.start_at);
      return appointmentDate >= startDate && appointmentDate <= endDate;
    });
  }
  
  // Filter by appointment types if specified
  if (options.appointmentTypes && options.appointmentTypes.length > 0) {
    filteredAppointments = filteredAppointments.filter(appointment => 
      options.appointmentTypes.includes(appointment.type.toString())
    );
  }
  
  // Filter out cancelled appointments if specified
  if (!options.includeCancelled) {
    filteredAppointments = filteredAppointments.filter(appointment => 
      appointment.status !== 'cancelled' && appointment.status !== 'no_show'
    );
  }
  
  // Export based on format
  switch (options.format) {
    case CalendarFormat.ICAL:
      return exportToICalendar(filteredAppointments, options);
    case CalendarFormat.CSV:
      return exportToCSV(filteredAppointments, options);
    case CalendarFormat.JSON:
      return exportToJSON(filteredAppointments, options);
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
};

/**
 * Import calendar data from a file
 * @param file File to import
 * @param options Import options
 */
export const importCalendarData = async (
  file: File,
  options: ImportExportOptions
): Promise<ImportResult> => {
  // Determine format based on file extension if not specified
  let format = options.format;
  
  if (!format) {
    const extension = file.name.split('.').pop().toLowerCase();
    
    if (extension === 'ics') {
      format = CalendarFormat.ICAL;
    } else if (extension === 'csv') {
      format = CalendarFormat.CSV;
    } else if (extension === 'json') {
      format = CalendarFormat.JSON;
    } else {
      throw new Error(`Unsupported file extension: ${extension}`);
    }
  }
  
  // Import based on format
  switch (format) {
    case CalendarFormat.ICAL:
      return importFromICalendar(file, options);
    case CalendarFormat.CSV:
      return importFromCSV(file, options);
    case CalendarFormat.JSON:
      return importFromJSON(file, options);
    default:
      throw new Error(`Unsupported import format: ${format}`);
  }
};

/**
 * Export appointments to iCalendar format
 * @param appointments Appointments to export
 * @param options Export options
 */
const exportToICalendar = (
  appointments: Appointment[],
  options: ImportExportOptions
): ExportResult => {
  // Create calendar
  const calendar = ical({
    name: 'Valorwell Appointments',
    timezone: 'UTC'
  });
  
  // Add events
  appointments.forEach(appointment => {
    const event = calendar.createEvent({
      start: new Date(appointment.start_at),
      end: new Date(appointment.end_at),
      summary: `${appointment.clientName || 'Appointment'} - ${appointment.type}`,
      description: options.includeNotes ? (appointment.notes || '') : '',
      location: '',
      status: mapAppointmentStatusToICalStatus(appointment.status) as any
    });
    
    // Add client info if specified
    if (options.includeClientInfo && appointment.client) {
      const clientInfo = [
        `Client: ${appointment.client.client_first_name} ${appointment.client.client_last_name}`,
        `Email: ${appointment.client.client_email}`,
        `Phone: ${appointment.client.client_phone}`
      ].join('\n');
      
      event.description(options.includeNotes ? 
        `${clientInfo}\n\n${appointment.notes || ''}` : 
        clientInfo
      );
    }
  });
  
  // Generate iCalendar string
  const icalString = calendar.toString();
  
  // Create blob and save file
  const blob = new Blob([icalString], { type: 'text/calendar;charset=utf-8' });
  const fileName = `valorwell-appointments-${DateTime.now().toFormat('yyyy-MM-dd')}.ics`;
  saveAs(blob, fileName);
  
  return {
    fileName,
    fileSize: blob.size,
    eventCount: appointments.length,
    format: CalendarFormat.ICAL
  };
};

/**
 * Export appointments to CSV format
 * @param appointments Appointments to export
 * @param options Export options
 */
const exportToCSV = (
  appointments: Appointment[],
  options: ImportExportOptions
): ExportResult => {
  // Prepare data
  const csvData = appointments.map(appointment => {
    const row: Record<string, any> = {
      'Subject': `${appointment.clientName || 'Appointment'} - ${appointment.type}`,
      'Start Date': DateTime.fromISO(appointment.start_at).toFormat('yyyy-MM-dd'),
      'Start Time': DateTime.fromISO(appointment.start_at).toFormat('HH:mm:ss'),
      'End Date': DateTime.fromISO(appointment.end_at).toFormat('yyyy-MM-dd'),
      'End Time': DateTime.fromISO(appointment.end_at).toFormat('HH:mm:ss'),
      'All Day Event': 'False',
      'Status': appointment.status,
      'Type': appointment.type
    };
    
    // Add notes if specified
    if (options.includeNotes) {
      row['Description'] = appointment.notes || '';
    }
    
    // Add client info if specified
    if (options.includeClientInfo && appointment.client) {
      row['Client First Name'] = appointment.client.client_first_name || '';
      row['Client Last Name'] = appointment.client.client_last_name || '';
      row['Client Email'] = appointment.client.client_email || '';
      row['Client Phone'] = appointment.client.client_phone || '';
    }
    
    return row;
  });
  
  // Generate CSV string
  const csv = Papa.unparse(csvData);
  
  // Create blob and save file
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const fileName = `valorwell-appointments-${DateTime.now().toFormat('yyyy-MM-dd')}.csv`;
  saveAs(blob, fileName);
  
  return {
    fileName,
    fileSize: blob.size,
    eventCount: appointments.length,
    format: CalendarFormat.CSV
  };
};

/**
 * Export appointments to JSON format
 * @param appointments Appointments to export
 * @param options Export options
 */
const exportToJSON = (
  appointments: Appointment[],
  options: ImportExportOptions
): ExportResult => {
  // Prepare data
  const jsonData = appointments.map(appointment => {
    const event: Record<string, any> = {
      id: appointment.id,
      title: `${appointment.clientName || 'Appointment'} - ${appointment.type}`,
      start: appointment.start_at,
      end: appointment.end_at,
      status: appointment.status,
      type: appointment.type
    };
    
    // Add notes if specified
    if (options.includeNotes) {
      event.notes = appointment.notes || '';
    }
    
    // Add client info if specified
    if (options.includeClientInfo && appointment.client) {
      event.client = {
        firstName: appointment.client.client_first_name,
        lastName: appointment.client.client_last_name,
        email: appointment.client.client_email,
        phone: appointment.client.client_phone
      };
    }
    
    return event;
  });
  
  // Generate JSON string
  const json = JSON.stringify(jsonData, null, 2);
  
  // Create blob and save file
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const fileName = `valorwell-appointments-${DateTime.now().toFormat('yyyy-MM-dd')}.json`;
  saveAs(blob, fileName);
  
  return {
    fileName,
    fileSize: blob.size,
    eventCount: appointments.length,
    format: CalendarFormat.JSON
  };
};

/**
 * Import appointments from iCalendar format
 * @param file File to import
 * @param options Import options
 */
const importFromICalendar = async (
  file: File,
  options: ImportExportOptions
): Promise<ImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const icalData = e.target.result as string;
        const ICAL = require('ical.js');
        const jcalData = ICAL.parse(icalData);
        const comp = new ICAL.Component(jcalData);
        const events = comp.getAllSubcomponents('vevent');
        
        const importedEvents = [];
        const skippedEvents = [];
        const errors = [];
        
        // Process each event
        for (let i = 0; i < events.length; i++) {
          try {
            const event = new ICAL.Event(events[i]);
            
            // Skip events outside date range if specified
            if (options.dateRange) {
              const startDate = new Date(options.dateRange.startDate);
              const endDate = new Date(options.dateRange.endDate);
              const eventStart = event.startDate.toJSDate();
              
              if (eventStart < startDate || eventStart > endDate) {
                skippedEvents.push(i);
                continue;
              }
            }
            
            // Create appointment object
            const appointment = {
              title: event.summary,
              start_at: event.startDate.toJSDate().toISOString(),
              end_at: event.endDate.toJSDate().toISOString(),
              notes: event.description,
              status: mapICalStatusToAppointmentStatus(event.status)
            };
            
            importedEvents.push(appointment);
          } catch (error) {
            errors.push({
              index: i,
              error: error.message,
              eventData: events[i].toString()
            });
          }
        }
        
        resolve({
          totalEvents: events.length,
          importedEvents: importedEvents.length,
          skippedEvents: skippedEvents.length,
          errors
        });
      } catch (error) {
        reject({
          totalEvents: 0,
          importedEvents: 0,
          skippedEvents: 0,
          errors: [{
            index: 0,
            error: `Failed to parse iCalendar file: ${error.message}`
          }]
        });
      }
    };
    
    reader.onerror = () => {
      reject({
        totalEvents: 0,
        importedEvents: 0,
        skippedEvents: 0,
        errors: [{
          index: 0,
          error: 'Failed to read file'
        }]
      });
    };
    
    reader.readAsText(file);
  });
};

/**
 * Import appointments from CSV format
 * @param file File to import
 * @param options Import options
 */
const importFromCSV = async (
  file: File,
  options: ImportExportOptions
): Promise<ImportResult> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const importedEvents = [];
        const skippedEvents = [];
        const errors = [];
        
        // Process each row
        for (let i = 0; i < results.data.length; i++) {
          try {
            const row = results.data[i] as Record<string, string>;
            
            // Check required fields
            if (!row['Subject'] || !row['Start Date'] || !row['Start Time'] || !row['End Date'] || !row['End Time']) {
              errors.push({
                index: i,
                error: 'Missing required fields',
                eventData: row
              });
              continue;
            }
            
            // Parse dates
            const startDate = `${row['Start Date']}T${row['Start Time']}`;
            const endDate = `${row['End Date']}T${row['End Time']}`;
            
            // Skip events outside date range if specified
            if (options.dateRange) {
              const rangeStartDate = new Date(options.dateRange.startDate);
              const rangeEndDate = new Date(options.dateRange.endDate);
              const eventStart = new Date(startDate);
              
              if (eventStart < rangeStartDate || eventStart > rangeEndDate) {
                skippedEvents.push(i);
                continue;
              }
            }
            
            // Create appointment object
            const appointment = {
              title: row['Subject'],
              start_at: DateTime.fromFormat(startDate, 'yyyy-MM-ddTHH:mm:ss').toISO(),
              end_at: DateTime.fromFormat(endDate, 'yyyy-MM-ddTHH:mm:ss').toISO(),
              notes: row['Description'] || '',
              status: row['Status'] || 'scheduled',
              type: row['Type'] || 'appointment'
            };
            
            importedEvents.push(appointment);
          } catch (error) {
            errors.push({
              index: i,
              error: error.message,
              eventData: results.data[i]
            });
          }
        }
        
        resolve({
          totalEvents: results.data.length,
          importedEvents: importedEvents.length,
          skippedEvents: skippedEvents.length,
          importedData: importedEvents,
          errors
        });
      },
      error: (error) => {
        reject({
          totalEvents: 0,
          importedEvents: 0,
          skippedEvents: 0,
          importedData: [],
          errors: [{
            index: 0,
            error: `Failed to parse CSV file: ${error.message}`
          }]
        });
      }
    });
  });
};

/**
 * Import appointments from JSON format
 * @param file File to import
 * @param options Import options
 */
const importFromJSON = async (
  file: File,
  options: ImportExportOptions
): Promise<ImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const jsonData = JSON.parse(e.target.result as string);
        
        if (!Array.isArray(jsonData)) {
          throw new Error('JSON data must be an array of events');
        }
        
        const importedEvents = [];
        const skippedEvents = [];
        const errors = [];
        
        // Process each event
        for (let i = 0; i < jsonData.length; i++) {
          try {
            const event = jsonData[i];
            
            // Check required fields
            if (!event.title || !event.start || !event.end) {
              errors.push({
                index: i,
                error: 'Missing required fields',
                eventData: event
              });
              continue;
            }
            
            // Skip events outside date range if specified
            if (options.dateRange) {
              const startDate = new Date(options.dateRange.startDate);
              const endDate = new Date(options.dateRange.endDate);
              const eventStart = new Date(event.start);
              
              if (eventStart < startDate || eventStart > endDate) {
                skippedEvents.push(i);
                continue;
              }
            }
            
            // Create appointment object
            const appointment = {
              title: event.title,
              start_at: event.start,
              end_at: event.end,
              notes: event.notes || '',
              status: event.status || 'scheduled',
              type: event.type || 'appointment'
            };
            
            importedEvents.push(appointment);
          } catch (error) {
            errors.push({
              index: i,
              error: error.message,
              eventData: jsonData[i]
            });
          }
        }
        
        resolve({
          totalEvents: jsonData.length,
          importedEvents: importedEvents.length,
          skippedEvents: skippedEvents.length,
          importedData: importedEvents,
          errors
        });
      } catch (error) {
        reject({
          totalEvents: 0,
          importedEvents: 0,
          skippedEvents: 0,
          importedData: [],
          errors: [{
            index: 0,
            error: `Failed to parse JSON file: ${error.message}`
          }]
        });
      }
    };
    
    reader.onerror = () => {
      reject({
        totalEvents: 0,
        importedEvents: 0,
        skippedEvents: 0,
        importedData: [],
        errors: [{
          index: 0,
          error: 'Failed to read file'
        }]
      });
    };
    
    reader.readAsText(file);
  });
};

/**
 * Map appointment status to iCalendar status
 * @param status Appointment status
 */
const mapAppointmentStatusToICalStatus = (status: string): 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED' => {
  switch (status) {
    case 'scheduled':
    case 'confirmed':
      return 'CONFIRMED';
    case 'pending':
      return 'TENTATIVE';
    case 'cancelled':
    case 'no_show':
    case 'rescheduled':
      return 'CANCELLED';
    default:
      return 'CONFIRMED';
  }
};

/**
 * Map iCalendar status to appointment status
 * @param status iCalendar status
 */
const mapICalStatusToAppointmentStatus = (status: string): string => {
  switch (status) {
    case 'CONFIRMED':
      return 'confirmed';
    case 'TENTATIVE':
      return 'pending';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'scheduled';
  }
};