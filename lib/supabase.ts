import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Browser client for client components
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Check if Supabase is configured with REAL values (not placeholders)
export const isSupabaseConfigured = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    // Reject placeholders and template values
    if (!url || !key) return false;
    if (url.includes('your-project') || url.includes('placeholder') || url === 'https://placeholder.supabase.co') return false;
    if (key === 'placeholder' || key === 'your-anon-key' || key.length < 20) return false;
    return true;
};

// Server client with service role key (for API routes)
export const createServerClient = () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
    return createClient(supabaseUrl, serviceRoleKey);
};
