import { createClient } from '@supabase/supabase-js';

// Check if Supabase environment variables are configured
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required');
}

// Log config for verification (step 1)
console.log('🔧 Supabase Client Config:');
console.log('  URL:', supabaseUrl);
console.log('  Anon Key (first 8):', supabaseAnonKey.substring(0, 8));

// Create and export the Supabase client with explicit storage config
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: window.localStorage,
    detectSessionInUrl: true
  }
});