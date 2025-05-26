require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const clinicianId = 'fba185bb-53cb-4be9-88b6-3d379255f667';
console.log(`Testing clinician query for ID: ${clinicianId}`);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testClinicianQuery() {
  try {
    const { data: clinician, error } = await supabase
      .from('clinicians')
      .select('*')
      .eq('id', clinicianId)
      .single();

    if (error) throw error;
    
    console.log('Clinician data:', {
      id: clinician.id,
      email: clinician.email,
      roles: clinician.roles,
      is_active: clinician.is_active
    });

    if (!clinician) {
      console.error('Clinician not found');
      return;
    }

    console.log('Verification complete');
  } catch (error) {
    console.error('Error:', error);
  }
}

testClinicianQuery();