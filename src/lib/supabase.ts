import { createClient } from '@supabase/supabase-js';

// Default values for local development if environment variables are not set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bumxlvadfafrwymmcjed.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bXhsdmFkZmFmcnd5bW1jamVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1OTg1MDIsImV4cCI6MjA1OTE3NDUwMn0.na0s77Lr0mKMvr3NIHm6p53f4vYAcSgmROCmhPMw7Rg';

// Create Supabase client with debug logging in development
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Log Supabase connection status for debugging
if (process.env.NODE_ENV !== 'production') {
  console.log('Supabase initialized with URL:', supabaseUrl);
  
  // Check if keys are properly configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Supabase environment variables not properly configured. Using default values.');
  }
}
