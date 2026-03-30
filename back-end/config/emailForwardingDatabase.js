import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Email Forwarding Supabase Database Client
 * 
 * This is a SEPARATE Supabase instance for the Email Forwarding Bot feature.
 * It is completely isolated from the main Botify Supabase account to:
 * - Avoid conflicts with existing features
 * - Provide independent scaling and backups
 * - Improve security and data isolation
 * - Allow independent monitoring and analytics
 * 
 * Tables:
 * - email_forwarding_configs: Stores user email forwarding configurations
 * - email_forwarding_logs: (Optional) Audit trail of forwarding actions
 */

const emailForwardingSupabaseUrl = process.env.EMAIL_FORWARDING_SUPABASE_URL;
const emailForwardingSupabaseKey = process.env.EMAIL_FORWARDING_SUPABASE_SERVICE_KEY;

// Validate that URL is a valid HTTPS URL
const isValidUrl = emailForwardingSupabaseUrl && /^https?:\/\//.test(emailForwardingSupabaseUrl);

if (!isValidUrl || !emailForwardingSupabaseKey) {
  console.warn('⚠️  Email Forwarding Supabase not configured or invalid');
  if (!isValidUrl && emailForwardingSupabaseUrl) {
    console.warn(`   ERROR: EMAIL_FORWARDING_SUPABASE_URL is not a valid URL: "${emailForwardingSupabaseUrl}"`);
    console.warn(`   Should be like: https://your-email-forwarding-project.supabase.co`);
  }
  if (!emailForwardingSupabaseKey && process.env.EMAIL_FORWARDING_SUPABASE_URL) {
    console.warn('   ERROR: EMAIL_FORWARDING_SUPABASE_SERVICE_KEY is not set');
  }
  console.warn('   Email forwarding feature will not work until properly configured');
}

const emailForwardingSupabase = isValidUrl && emailForwardingSupabaseKey
  ? createClient(emailForwardingSupabaseUrl, emailForwardingSupabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    })
  : null;

if (emailForwardingSupabase) {
  console.log('✅ Connected to Email Forwarding Supabase (separate account)');
}

export default emailForwardingSupabase;
