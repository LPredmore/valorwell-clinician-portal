#!/usr/bin/env node

/**
 * Backfill Script for Clinician Email Mismatches
 * 
 * This script resolves the 3 identified email mismatches by updating auth.users.email
 * to match clinicians.clinician_email using the same admin API as the edge function.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gqlkritspnhjxfejvgfg.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

// Create admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Known mismatches to fix (based on analysis)
 */
const MISMATCHES_TO_FIX = [
  {
    id: '281b4187-b23b-4fab-8b13-c7a54b81e41c',
    auth_email: 'clevenger3055@yahoo.com',
    clinician_email: 'Clevenger3055@yahoo.com',
    reason: 'Case difference - use clinician_email as canonical'
  },
  {
    id: '7077bf00-2ac9-42ea-b45a-2ceb4e4f98a0', 
    auth_email: 'info+dummy@valorwell.org',
    clinician_email: 'info+owner@valorwell.org',
    reason: 'User updated clinician email - use new value'
  },
  {
    id: '60c3eb77-80ce-4dc6-8f75-07ee5a5ce627',
    auth_email: 'scdfarrow@icloud.com', 
    clinician_email: 'stacefarrow@protonmail.com',
    reason: 'Different emails - manual review needed, using clinician_email'
  }
];

async function validateEmailFormat(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function checkEmailUniqueness(email, excludeUserId) {
  const { data, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    throw new Error(`Failed to check email uniqueness: ${error.message}`);
  }
  
  const existingUser = data.users.find(user => 
    user.email?.toLowerCase() === email.toLowerCase() && user.id !== excludeUserId
  );
  
  return !existingUser;
}

async function updateUserEmail(userId, newEmail, reason) {
  console.log(`\n🔄 Processing: ${userId}`);
  console.log(`   Reason: ${reason}`);
  console.log(`   New email: ${newEmail}`);
  
  try {
    // Validate email format
    if (!await validateEmailFormat(newEmail)) {
      throw new Error(`Invalid email format: ${newEmail}`);
    }
    
    // Check email uniqueness
    if (!await checkEmailUniqueness(newEmail, userId)) {
      throw new Error(`Email already exists: ${newEmail}`);
    }
    
    // Update auth.users.email using admin API
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      email: newEmail
    });
    
    if (error) {
      throw new Error(`Admin update failed: ${error.message}`);
    }
    
    console.log(`   ✅ SUCCESS: Updated auth.users.email to ${newEmail}`);
    
    // Verify the sync worked by checking both tables
    const { data: verification } = await supabase
      .from('clinicians')
      .select('clinician_email')
      .eq('id', userId)
      .single();
      
    if (verification?.clinician_email !== newEmail) {
      console.log(`   ⚠️  WARNING: Clinician table still shows: ${verification?.clinician_email}`);
    } else {
      console.log(`   ✅ VERIFIED: Both tables now synchronized`);
    }
    
    return { success: true, userId, newEmail };
    
  } catch (error) {
    console.error(`   ❌ FAILED: ${error.message}`);
    return { success: false, userId, newEmail, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting Email Mismatch Backfill Script');
  console.log(`📊 Processing ${MISMATCHES_TO_FIX.length} known mismatches\n`);
  
  const results = [];
  
  // Process each mismatch
  for (const mismatch of MISMATCHES_TO_FIX) {
    const result = await updateUserEmail(
      mismatch.id,
      mismatch.clinician_email,
      mismatch.reason
    );
    results.push(result);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary report
  console.log('\n📋 BACKFILL SUMMARY:');
  console.log('=' .repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ FAILED UPDATES:');
    failed.forEach(f => {
      console.log(`   ${f.userId}: ${f.error}`);
    });
  }
  
  // Final validation
  console.log('\n🔍 Running final validation...');
  try {
    const { data: remainingMismatches, error } = await supabase
      .rpc('validate_clinician_email_consistency');
      
    if (error) {
      console.error('   Validation query failed:', error.message);
    } else if (remainingMismatches && remainingMismatches.length === 0) {
      console.log('   ✅ SUCCESS: No remaining email mismatches found!');
    } else {
      console.log(`   ⚠️  WARNING: ${remainingMismatches?.length || 0} mismatches still remain`);
      if (remainingMismatches && remainingMismatches.length > 0) {
        remainingMismatches.forEach(m => {
          console.log(`     ${m.clinician_id}: ${m.auth_email} vs ${m.clinician_email}`);
        });
      }
    }
  } catch (validationError) {
    console.error('   Validation failed:', validationError.message);
  }
  
  console.log('\n🏁 Backfill script completed.');
}

// Run the script
main().catch(error => {
  console.error('💥 Script failed with error:', error);
  process.exit(1);
});