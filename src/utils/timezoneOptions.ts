
/**
 * Standard IANA timezone options for the application
 * Each timezone includes both the IANA identifier and a user-friendly label
 */
export const timezoneOptions = [
  { value: "America/New_York", label: "Eastern Time (ET) - New York" },
  { value: "America/Chicago", label: "Central Time (CT) - Chicago" },
  { value: "America/Denver", label: "Mountain Time (MT) - Denver" },
  { value: "America/Phoenix", label: "Mountain Time - Arizona (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT) - Los Angeles" },
  { value: "America/Anchorage", label: "Alaska Time (AKT) - Anchorage" },
  { value: "Pacific/Honolulu", label: "Hawaii-Aleutian Time (HST) - Honolulu" },
  { value: "America/Puerto_Rico", label: "Atlantic Time (AT) - Puerto Rico" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT) - London" },
  { value: "Europe/Paris", label: "Central European Time (CET) - Paris" },
  { value: "Europe/Athens", label: "Eastern European Time (EET) - Athens" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (GST) - Dubai" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST) - Kolkata" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST) - Tokyo" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET) - Sydney" },
];

/**
 * Get a timezone option by IANA identifier
 */
export function getTimezoneOption(value: string): { value: string, label: string } | undefined {
  return timezoneOptions.find(option => option.value === value);
}

/**
 * Get a timezone label by IANA identifier
 */
export function getTimezoneLabel(value: string): string {
  const option = getTimezoneOption(value);
  return option ? option.label : value;
}

/**
 * Parse a combined timezone string (e.g., "Eastern Time (ET) - New York (America/New_York)")
 * and extract the IANA identifier
 */
export function extractIanaFromCombinedFormat(combinedFormat: string): string {
  // Check if it's already a valid IANA timezone
  const directMatch = timezoneOptions.find(tz => tz.value === combinedFormat);
  if (directMatch) return directMatch.value;
  
  // Try to extract IANA timezone from format like "Label (America/New_York)"
  const ianaPattern = /\(([A-Za-z_\/]+)\)$/;
  const match = combinedFormat.match(ianaPattern);
  
  if (match && match[1]) {
    // Verify it's a valid timezone option
    const foundOption = timezoneOptions.find(tz => tz.value === match[1]);
    if (foundOption) return foundOption.value;
  }
  
  // Try to match based on label
  for (const option of timezoneOptions) {
    if (combinedFormat.includes(option.label) || 
        combinedFormat.includes(option.value)) {
      return option.value;
    }
  }
  
  // Default to Eastern Time if no match
  return "America/New_York";
}

/**
 * Format a timezone option to a combined string for display
 */
export function formatTimezoneForDisplay(timezone: string): string {
  const option = getTimezoneOption(timezone);
  return option ? `${option.label} (${option.value})` : timezone;
}

/**
 * DEPRECATED: Browser timezone usage eliminated
 * Use getClinicianTimeZone() from useClinicianData.tsx instead
 * @deprecated - Do not use browser timezone
 */
export function getBrowserTimezone(): string {
  console.warn('[DEPRECATED] getBrowserTimezone() - Use clinician timezone from database instead');
  return 'UTC'; // Return UTC as safe fallback
}
