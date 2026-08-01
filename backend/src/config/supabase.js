import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL || 'https://suunbawrudewmkuuarof.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1dW5iYXdydWRld21rdXVhcm9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzOTIxOTYsImV4cCI6MjEwMDk2ODE5Nn0.vR4tjEIm0ssmfZ-WLG9KYvf-M_EorKCGDxzlhNORMVQ';
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
    },
});
export default supabase;
