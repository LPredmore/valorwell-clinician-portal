import { DateTime } from 'luxon';
import { 
  getUserTimeZone,
  formatTimeZoneDisplay,
  convertToTimezone,
  formatWithTimeZone,
  ensureIANATimeZone,
  getTimeZoneDisplayName,
  fromUTC,
  toUTC,
  convertLocalToUTC,
  fromJSDate,
  fromISO,
  now,
  formatDate,
  formatTime,
  formatDateTime,
  isValidTimeZone,
  serializeTimeZone,
  safeClone
} from '../timeZoneUtils';

// Mock TimeZoneService
jest.mock('../timeZoneService', () => ({
  TimeZoneService: {
    DEFAULT_TIMEZONE: 'America/New_York',
    DATE_FORMAT: 'yyyy-MM-dd',
    TIME_FORMAT_AMPM: 'h:mm a',
    now: jest.fn((timezone) => DateTime.now().setZone(timezone)),
    createDateTime: jest.fn((dateStr, timeStr, timezone) => 
      DateTime.fromFormat(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', { zone: timezone })),
    fromJSDate: jest.fn((date, timezone) => 
      DateTime.fromJSDate(date, { zone: timezone })),
    formatDateTime: jest.fn((dt, format) => dt.toFormat(format)),
    ensureIANATimeZone: jest.fn((timezone) => {
      if (timezone === 'Invalid') throw new Error('Invalid timezone');
      return timezone;
    }),
    getTimeZoneDisplayName: jest.fn((timezone) => `${timezone} (Display Name)`),
    fromUTC: jest.fn((utcString, timezone) => 
      DateTime.fromISO(utcString, { zone: 'utc' }).setZone(timezone)),
    convertLocalToUTC: jest.fn((localDateTimeStr, timezone) => 
      DateTime.fromISO(localDateTimeStr, { zone: timezone }).toUTC()),
    formatDate: jest.fn((dateTime, format) => dateTime.toFormat(format)),
    formatTime: jest.fn((dateTime, format) => dateTime.toFormat(format))
  }
}));

describe('timeZoneUtils', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('getUserTimeZone', () => {
    it('should return the browser timezone', () => {
      // Instead of mocking Intl.DateTimeFormat, we'll spy on it
      const originalResolvedOptions = Intl.DateTimeFormat().resolvedOptions;
      const mockResolvedOptions = jest.fn().mockReturnValue({ timeZone: 'America/Los_Angeles' });
      
      // Replace the resolvedOptions method temporarily
      Intl.DateTimeFormat.prototype.resolvedOptions = mockResolvedOptions;
      
      expect(getUserTimeZone()).toBe('America/Los_Angeles');
      
      // Restore the original method
      Intl.DateTimeFormat.prototype.resolvedOptions = originalResolvedOptions;
    });
    
    it('should return default timezone if browser timezone is unavailable', () => {
      // Mock console.error to avoid test output pollution
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Replace the resolvedOptions method with one that throws an error
      const originalResolvedOptions = Intl.DateTimeFormat().resolvedOptions;
      Intl.DateTimeFormat.prototype.resolvedOptions = jest.fn().mockImplementation(() => {
        throw new Error('Timezone not available');
      });
      
      expect(getUserTimeZone()).toBe('America/New_York');
      
      // Restore the original method
      Intl.DateTimeFormat.prototype.resolvedOptions = originalResolvedOptions;
    });
  });

  describe('formatTimeZoneDisplay', () => {
    it('should format timezone for display', () => {
      const result = formatTimeZoneDisplay('America/Los_Angeles');
      expect(result).toBeDefined();
    });
    
    it('should handle invalid timezone', () => {
      const result = formatTimeZoneDisplay('Invalid');
      expect(result).toBe('Invalid');
    });
    
    it('should handle null timezone', () => {
      const result = formatTimeZoneDisplay(null as any);
      expect(result).toBe('America/New_York');
    });
  });

  describe('convertToTimezone', () => {
    it('should convert date and time to specified timezone', () => {
      const result = convertToTimezone('2025-05-15', '10:30', 'America/Los_Angeles');
      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.zone.name).toBe('America/Los_Angeles');
    });
    
    it('should handle invalid inputs', () => {
      const result = convertToTimezone('invalid', '10:30', 'America/Los_Angeles');
      expect(result).toBeDefined();
      expect(result.isValid).toBe(true); // Because it falls back to now()
    });
  });

  describe('formatWithTimeZone', () => {
    it('should format date with timezone', () => {
      const date = new Date('2025-05-15T10:30:00Z');
      const result = formatWithTimeZone(date, 'America/Los_Angeles');
      expect(result).toBeDefined();
    });
    
    it('should use custom format string if provided', () => {
      const date = new Date('2025-05-15T10:30:00Z');
      const result = formatWithTimeZone(date, 'America/Los_Angeles', 'yyyy-MM-dd HH:mm');
      expect(result).toBeDefined();
    });
    
    it('should handle errors gracefully', () => {
      const date = new Date('2025-05-15T10:30:00Z');
      // Force an error by passing an invalid timezone
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = formatWithTimeZone(date, 'Invalid');
      expect(result).toContain(date.toLocaleDateString());
    });
  });

  describe('ensureIANATimeZone', () => {
    it('should return valid timezone unchanged', () => {
      expect(ensureIANATimeZone('America/Los_Angeles')).toBe('America/Los_Angeles');
    });
    
    it('should normalize common timezone abbreviations', () => {
      expect(ensureIANATimeZone('EST')).toBe('America/New_York');
      expect(ensureIANATimeZone('CST')).toBe('America/Chicago');
      expect(ensureIANATimeZone('MST')).toBe('America/Denver');
      expect(ensureIANATimeZone('PST')).toBe('America/Los_Angeles');
    });
    
    it('should handle null or undefined', () => {
      expect(ensureIANATimeZone(null)).toBe('America/New_York');
      expect(ensureIANATimeZone(undefined)).toBe('America/New_York');
    });
    
    it('should handle empty string', () => {
      expect(ensureIANATimeZone('')).toBe('America/New_York');
      expect(ensureIANATimeZone('  ')).toBe('America/New_York');
    });
    
    it('should handle object input', () => {
      const obj = { toString: () => 'America/Los_Angeles' };
      expect(ensureIANATimeZone(obj as any)).toBe('America/Los_Angeles');
    });
  });

  describe('getTimeZoneDisplayName', () => {
    it('should return display name for timezone', () => {
      const result = getTimeZoneDisplayName('America/Los_Angeles');
      expect(result).toBe('America/Los_Angeles (Display Name)');
    });
    
    it('should handle invalid timezone', () => {
      const result = getTimeZoneDisplayName('Invalid');
      expect(result).toBe('Invalid (Display Name)');
    });
  });

  describe('fromUTC', () => {
    it('should convert UTC ISO string to DateTime in specified timezone', () => {
      const result = fromUTC('2025-05-15T10:30:00Z', 'America/Los_Angeles');
      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.zone.name).toBe('America/Los_Angeles');
    });
  });

  describe('toUTC', () => {
    it('should convert DateTime to UTC ISO string', () => {
      const dt = DateTime.fromISO('2025-05-15T10:30:00', { zone: 'America/Los_Angeles' });
      const result = toUTC(dt);
      expect(result).toBeDefined();
      expect(result).toContain('Z'); // UTC ISO strings end with Z
    });
  });

  describe('convertLocalToUTC', () => {
    it('should convert local datetime to UTC', () => {
      const result = convertLocalToUTC('2025-05-15T10:30:00', 'America/Los_Angeles');
      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.zone.name).toBe('utc');
    });
  });

  describe('fromJSDate', () => {
    it('should convert JS Date to DateTime in specified timezone', () => {
      const date = new Date('2025-05-15T10:30:00Z');
      const result = fromJSDate(date, 'America/Los_Angeles');
      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.zone.name).toBe('America/Los_Angeles');
    });
  });

  describe('fromISO', () => {
    it('should convert ISO string to DateTime in specified timezone', () => {
      const result = fromISO('2025-05-15T10:30:00Z', 'America/Los_Angeles');
      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.zone.name).toBe('America/Los_Angeles');
    });
  });

  describe('now', () => {
    it('should return current DateTime in specified timezone', () => {
      const result = now('America/Los_Angeles');
      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.zone.name).toBe('America/Los_Angeles');
    });
  });

  describe('formatDate', () => {
    it('should format DateTime to date string', () => {
      const dt = DateTime.fromISO('2025-05-15T10:30:00', { zone: 'America/Los_Angeles' });
      const result = formatDate(dt);
      expect(result).toBeDefined();
    });
    
    it('should use custom format if provided', () => {
      const dt = DateTime.fromISO('2025-05-15T10:30:00', { zone: 'America/Los_Angeles' });
      const result = formatDate(dt, 'MM/dd/yyyy');
      expect(result).toBeDefined();
    });
  });

  describe('formatTime', () => {
    it('should format DateTime to time string', () => {
      const dt = DateTime.fromISO('2025-05-15T10:30:00', { zone: 'America/Los_Angeles' });
      const result = formatTime(dt);
      expect(result).toBeDefined();
    });
    
    it('should use custom format if provided', () => {
      const dt = DateTime.fromISO('2025-05-15T10:30:00', { zone: 'America/Los_Angeles' });
      const result = formatTime(dt, 'HH:mm');
      expect(result).toBeDefined();
    });
  });

  describe('formatDateTime', () => {
    it('should format DateTime to datetime string', () => {
      const dt = DateTime.fromISO('2025-05-15T10:30:00', { zone: 'America/Los_Angeles' });
      const result = formatDateTime(dt, 'yyyy-MM-dd HH:mm');
      expect(result).toBeDefined();
    });
  });

  describe('isValidTimeZone', () => {
    it('should return true for valid timezone', () => {
      expect(isValidTimeZone('America/Los_Angeles')).toBe(true);
    });
    
    it('should return false for invalid timezone', () => {
      expect(isValidTimeZone('Invalid')).toBe(false);
    });
    
    it('should return false for null or undefined', () => {
      expect(isValidTimeZone(null)).toBe(false);
      expect(isValidTimeZone(undefined)).toBe(false);
    });
  });

  describe('serializeTimeZone', () => {
    it('should return string for valid timezone', () => {
      expect(serializeTimeZone('America/Los_Angeles')).toBe('America/Los_Angeles');
    });
    
    it('should handle null or undefined', () => {
      expect(serializeTimeZone(null)).toBe('America/New_York');
      expect(serializeTimeZone(undefined)).toBe('America/New_York');
    });
    
    it('should handle object input', () => {
      const obj = { toString: () => 'America/Los_Angeles' };
      expect(serializeTimeZone(obj)).toBe('America/Los_Angeles');
    });
  });

  describe('safeClone', () => {
    it('should clone primitive values', () => {
      expect(safeClone(5)).toBe(5);
      expect(safeClone('test')).toBe('test');
      expect(safeClone(true)).toBe(true);
      expect(safeClone(null)).toBe(null);
      expect(safeClone(undefined)).toBe(undefined);
    });
    
    it('should clone Date objects', () => {
      const date = new Date('2025-05-15T10:30:00Z');
      const cloned = safeClone(date);
      expect(cloned).toBeInstanceOf(Date);
      expect(cloned.getTime()).toBe(date.getTime());
      expect(cloned).not.toBe(date); // Different object reference
    });
    
    it('should clone arrays', () => {
      const arr = [1, 2, 3];
      const cloned = safeClone(arr);
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr); // Different object reference
    });
    
    it('should clone objects', () => {
      const obj = { a: 1, b: 'test', c: true };
      const cloned = safeClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj); // Different object reference
    });
    
    it('should handle nested objects', () => {
      const obj = { a: 1, b: { c: 2, d: { e: 3 } } };
      const cloned = safeClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned.b).not.toBe(obj.b); // Different object reference
      expect(cloned.b.d).not.toBe(obj.b.d); // Different object reference
    });
    
    it('should preserve timezone strings', () => {
      const obj = { timezone: 'America/Los_Angeles', user: { user_timezone: 'America/New_York' } };
      const cloned = safeClone(obj);
      expect(cloned).toEqual(obj);
      expect(typeof cloned.timezone).toBe('string');
      expect(typeof cloned.user.user_timezone).toBe('string');
    });
  });
});