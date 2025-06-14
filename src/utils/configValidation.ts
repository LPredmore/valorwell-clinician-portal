
/**
 * Simple environment variable checker - Phase 1 stabilization.
 * Replace overengineered config with minimal approach.
 * Only check most essential envs!
 */
export function isConfigValid(): boolean {
  return !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
}
export function getConfigErrors(): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!import.meta.env.VITE_SUPABASE_URL) errors['VITE_SUPABASE_URL'] = 'Missing Supabase URL';
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) errors['VITE_SUPABASE_ANON_KEY'] = 'Missing Supabase anon key';
  return errors;
}
