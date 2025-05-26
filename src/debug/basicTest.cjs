console.log('CommonJS test running!');
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'exists' : 'missing'
});