// Replace these with your Supabase Project URL and anon/public key.
// NEVER put the service_role key in browser code.
const SUPABASE_URL = "https://nxasqegxheybbsfbscyw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-r9JPHmaPhAhSUV0iRuzVg_l5hqitjm";
const csSupabase = SUPABASE_URL.startsWith("YOUR_") ? null : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.csSupabase = csSupabase;
