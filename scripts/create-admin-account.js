// Script to create admin account for info@valorwell.org
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://gqlkritspnhjxfejvgfg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbGtyaXRzcG5oanhmZWp2Z2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3NjQ0NDUsImV4cCI6MjA1ODM0MDQ0NX0.BtnTfcjvHI55_fs_zor9ffQ9Aclg28RSfvgZrWpMuYs'
)

async function createAdminAccount() {
  try {
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email: 'info@valorwell.org',
        userData: {
          first_name: 'Lucas',
          last_name: 'Predmore',
          preferred_name: 'Luke',
          role: 'clinician',
          temp_password: '$V@l0rW3ll',
          is_admin: true
        }
      }
    })

    if (error) {
      console.error('Error creating admin account:', error)
    } else {
      console.log('Admin account created successfully:', data)
    }
  } catch (error) {
    console.error('Failed to create admin account:', error)
  }
}

createAdminAccount()