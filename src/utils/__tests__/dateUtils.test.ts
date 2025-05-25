import { 
  calculateAge,
  parseDateString,
  formatDateForDB
} from '../dateUtils';

describe('dateUtils', () => {
  describe('calculateAge', () => {
    it('should calculate age correctly from Date object', () => {
      // Create a date 30 years ago
      const today = new Date();
      const dob = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate());
      
      expect(calculateAge(dob)).toBe(30);
    });

    it('should calculate age correctly from ISO string', () => {
      // Create a date 25 years ago
      const today = new Date();
      const year = today.getFullYear() - 25;
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dobString = `${year}-${month}-${day}`;
      
      expect(calculateAge(dobString)).toBe(25);
    });

    it('should handle SQL date format', () => {
      // Create a date 40 years ago
      const today = new Date();
      const year = today.getFullYear() - 40;
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dobString = `${year}-${month}-${day}`;
      
      expect(calculateAge(dobString)).toBe(40);
    });

    it('should return null for invalid date string', () => {
      expect(calculateAge('not-a-date')).toBe(null);
    });

    it('should return null for null input', () => {
      expect(calculateAge(null)).toBe(null);
    });

    it('should return null for undefined input', () => {
      expect(calculateAge(undefined)).toBe(null);
    });

    it('should handle edge case of birthday today', () => {
      const today = new Date();
      const dobString = today.toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
      
      expect(calculateAge(dobString)).toBe(0);
    });

    it('should handle edge case of birthday tomorrow', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const dobString = tomorrow.toISOString().split('T')[0]; // Tomorrow's date in YYYY-MM-DD format
      
      // If birthday is tomorrow, age should be -1 years, which rounds down to 0
      expect(calculateAge(dobString)).toBe(0);
    });

    it('should handle edge case of birthday yesterday', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      
      // Set the year to be exactly 20 years ago
      yesterday.setFullYear(today.getFullYear() - 20);
      
      expect(calculateAge(yesterday)).toBe(20);
    });
  });

  describe('parseDateString', () => {
    it('should parse ISO date string correctly', () => {
      const dateString = '2025-05-15T10:30:00.000Z';
      const result = parseDateString(dateString);
      
      expect(result instanceof Date).toBe(true);
      expect(result?.getUTCFullYear()).toBe(2025);
      expect(result?.getUTCMonth()).toBe(4); // May (0-indexed)
      expect(result?.getUTCDate()).toBe(15);
    });

    it('should parse SQL date format correctly', () => {
      const dateString = '2025-05-15';
      const result = parseDateString(dateString);
      
      expect(result instanceof Date).toBe(true);
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(4); // May (0-indexed)
      expect(result?.getDate()).toBe(15);
    });

    it('should parse MM/DD/YYYY format correctly', () => {
      const dateString = '05/15/2025';
      const result = parseDateString(dateString);
      
      expect(result instanceof Date).toBe(true);
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(4); // May (0-indexed)
      expect(result?.getDate()).toBe(15);
    });

    it('should return null for invalid date string', () => {
      expect(parseDateString('not-a-date')).toBe(null);
    });

    it('should return null for null input', () => {
      expect(parseDateString(null)).toBe(null);
    });

    it('should return null for undefined input', () => {
      expect(parseDateString(undefined)).toBe(null);
    });
  });

  describe('formatDateForDB', () => {
    it('should format Date object correctly for DB', () => {
      const date = new Date(2025, 4, 15); // May 15, 2025
      expect(formatDateForDB(date)).toBe('2025-05-15');
    });

    it('should format ISO string correctly for DB', () => {
      const dateString = '2025-05-15T10:30:00.000Z';
      expect(formatDateForDB(dateString)).toBe('2025-05-15');
    });

    it('should format SQL date string correctly for DB', () => {
      const dateString = '2025-05-15';
      expect(formatDateForDB(dateString)).toBe('2025-05-15');
    });

    it('should handle MM/DD/YYYY format', () => {
      const dateString = '05/15/2025';
      expect(formatDateForDB(dateString)).toBe('2025-05-15');
    });

    it('should return null for invalid date string', () => {
      expect(formatDateForDB('not-a-date')).toBe(null);
    });

    it('should return null for null input', () => {
      expect(formatDateForDB(null)).toBe(null);
    });

    it('should return null for undefined input', () => {
      expect(formatDateForDB(undefined)).toBe(null);
    });
  });
});