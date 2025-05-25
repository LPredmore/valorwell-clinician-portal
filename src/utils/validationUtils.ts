import { 
  isAppointment, 
  isAvailabilityBlock,
  isAvailabilityException,
  validateOrThrow,
  validateArrayOrThrow
} from './typeGuards';
import { Appointment } from '@/types/appointment';
import { AvailabilityBlock, AvailabilityException } from '@/types/availability';
import { CalendarDebugUtils } from './calendarDebugUtils';

// Component name for logging
const COMPONENT_NAME = 'ValidationUtils';

/**
 * Validates API response data against expected schema
 * @param data The data to validate
 * @param schema The schema to validate against
 * @param options Options for validation
 * @returns The validated data or null if validation fails
 */
export function validateApiResponse<T>(
  data: any, 
  schema: (obj: any) => obj is T,
  options: {
    typeName: string;
    allowNull?: boolean;
    allowUndefined?: boolean;
    isArray?: boolean;
    logErrors?: boolean;
  }
): T | T[] | null {
  const { 
    typeName, 
    allowNull = true, 
    allowUndefined = true, 
    isArray = false,
    logErrors = true 
  } = options;
  
  try {
    // Handle null and undefined
    if (data === null) {
      if (allowNull) return null;
      throw new Error(`${typeName} cannot be null`);
    }
    
    if (data === undefined) {
      if (allowUndefined) return null;
      throw new Error(`${typeName} cannot be undefined`);
    }
    
    // Handle array validation
    if (isArray) {
      if (!Array.isArray(data)) {
        throw new Error(`Expected an array of ${typeName}, but got: ${typeof data}`);
      }
      
      return validateArrayOrThrow(data, schema, typeName);
    }
    
    // Handle single object validation
    return validateOrThrow(data, schema, typeName);
  } catch (error) {
    if (logErrors) {
      CalendarDebugUtils.error(COMPONENT_NAME, `Validation error for ${typeName}`, {
        error,
        data: typeof data === 'object' ? JSON.stringify(data).substring(0, 200) + '...' : data
      });
    }
    
    return null;
  }
}

/**
 * Validates appointment data from API
 * @param data The appointment data to validate
 * @param isArray Whether the data is an array of appointments
 * @returns The validated appointment data or null if validation fails
 */
export function validateAppointmentData(
  data: any, 
  isArray = false
): Appointment | Appointment[] | null {
  return validateApiResponse(data, isAppointment, {
    typeName: 'Appointment',
    isArray
  });
}

/**
 * Validates availability block data from API
 * @param data The availability block data to validate
 * @param isArray Whether the data is an array of availability blocks
 * @returns The validated availability block data or null if validation fails
 */
export function validateAvailabilityBlockData(
  data: any,
  isArray = false
): AvailabilityBlock | AvailabilityBlock[] | null {
  return validateApiResponse(data, isAvailabilityBlock, {
    typeName: 'AvailabilityBlock',
    isArray
  });
}

/**
 * Validates availability exception data from API
 * @param data The availability exception data to validate
 * @param isArray Whether the data is an array of availability exceptions
 * @returns The validated availability exception data or null if validation fails
 */
export function validateAvailabilityExceptionData(
  data: any,
  isArray = false
): AvailabilityException | AvailabilityException[] | null {
  return validateApiResponse(data, isAvailabilityException, {
    typeName: 'AvailabilityException',
    isArray
  });
}

/**
 * Schema validation error class
 */
export class SchemaValidationError extends Error {
  public readonly data: any;
  public readonly schema: string;
  
  constructor(message: string, data: any, schema: string) {
    super(message);
    this.name = 'SchemaValidationError';
    this.data = data;
    this.schema = schema;
  }
}

/**
 * Validates data against a schema and throws a SchemaValidationError if validation fails
 * @param data The data to validate
 * @param schema The schema validation function
 * @param schemaName The name of the schema for error reporting
 * @returns The validated data
 * @throws SchemaValidationError if validation fails
 */
export function validateSchema<T>(
  data: any,
  schema: (obj: any) => obj is T,
  schemaName: string
): T {
  try {
    if (schema(data)) {
      return data;
    }
    
    throw new Error(`Data does not match ${schemaName} schema`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new SchemaValidationError(
      `Schema validation failed: ${message}`,
      data,
      schemaName
    );
  }
}

/**
 * Handles schema validation errors
 * @param error The error to handle
 * @param fallback The fallback value to return
 * @param logError Whether to log the error
 * @returns The fallback value
 */
export function handleValidationError<T>(
  error: unknown,
  fallback: T,
  logError = true
): T {
  if (error instanceof SchemaValidationError) {
    if (logError) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Schema validation error', {
        message: error.message,
        schema: error.schema,
        data: typeof error.data === 'object' 
          ? JSON.stringify(error.data).substring(0, 200) + '...' 
          : error.data
      });
    }
  } else if (error instanceof Error) {
    if (logError) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Validation error', error);
    }
  }
  
  return fallback;
}