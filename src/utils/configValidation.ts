import { z } from 'zod';

/**
 * Environment variable validation schema using Zod
 * This ensures all required environment variables are present and correctly formatted
 */
export const envSchema = z.object({
  // Supabase configuration
  VITE_SUPABASE_URL: z.string().url('Supabase URL must be a valid URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  
  // Nylas configuration (optional for local development)
  VITE_NYLAS_CLIENT_ID: z.string().optional(),
  VITE_NYLAS_REDIRECT_URI: z.string().url('Nylas redirect URI must be a valid URL').optional(),
  
  // Application configuration
  VITE_APP_URL: z.string().url('App URL must be a valid URL').optional(),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']).optional().default('development'),
  
  // Feature flags
  VITE_ENABLE_DEBUG_TOOLS: z.enum(['true', 'false']).optional().default('false'),
});

// Type for validated environment variables
export type ValidatedEnv = z.infer<typeof envSchema>;

/**
 * Validates environment variables and returns a validated object
 * @returns Object containing validated environment variables
 * @throws Error if validation fails
 */
export function validateEnv(): ValidatedEnv {
  try {
    // Extract environment variables from import.meta.env
    const env = {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
      VITE_NYLAS_CLIENT_ID: import.meta.env.VITE_NYLAS_CLIENT_ID,
      VITE_NYLAS_REDIRECT_URI: import.meta.env.VITE_NYLAS_REDIRECT_URI,
      VITE_APP_URL: import.meta.env.VITE_APP_URL,
      VITE_APP_ENV: import.meta.env.VITE_APP_ENV,
      VITE_ENABLE_DEBUG_TOOLS: import.meta.env.VITE_ENABLE_DEBUG_TOOLS,
    };

    // Validate environment variables against schema
    const result = envSchema.safeParse(env);
    
    if (!result.success) {
      // Format error messages
      const errorMessages = result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      throw new Error(`Environment validation failed:\n${errorMessages}`);
    }
    
    return result.data;
  } catch (error) {
    console.error('Environment validation error:', error);
    throw error;
  }
}

/**
 * Gets a validated configuration object for the application
 * This is the recommended way to access environment variables throughout the app
 */
export function getConfig(): ValidatedEnv {
  // We can add caching here if needed for performance
  return validateEnv();
}

/**
 * Checks if all required environment variables are present
 * @returns True if all required variables are present, false otherwise
 */
export function isConfigValid(): boolean {
  try {
    validateEnv();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Gets detailed configuration validation errors
 * @returns Object containing missing or invalid environment variables
 */
export function getConfigErrors(): Record<string, string> {
  try {
    validateEnv();
    return {};
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors.reduce((acc, err) => {
        const path = err.path.join('.');
        acc[path] = err.message;
        return acc;
      }, {} as Record<string, string>);
    }
    return { 'unknown': 'Unknown configuration error' };
  }
}