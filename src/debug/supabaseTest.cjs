require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('Testing Supabase connection...');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl ? 'exists' : 'missing');
console.log('Supabase Key:', supabaseKey ? 'exists' : 'missing');

const supabase = createClient(supabaseUrl, supabaseKey);

// Test basic query
supabase
  .from('clinicians')
  .select('*')
  .limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.error('Query failed:', error);
      return;
    }
    console.log('First clinician ID:', data?.[0]?.id);
  })
  .catch(err => {
    console.error('Connection failed:', err);
  });