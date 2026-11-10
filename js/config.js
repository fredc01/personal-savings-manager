// Built-in cloud sync connection, so nobody has to type it in on every device.
// Fill in BOTH values between the quotes, save, commit and push (then redeploy).
// Use ONLY the project URL and the public "anon" / "publishable" key. Both are designed to be public:
// your data is protected by the Row Level Security rules in supabase/schema.sql plus each person's login.
// NEVER put the "service_role" or "secret" key here.
export const SUPABASE_URL = '';      // e.g. 'https://abcd1234.supabase.co'
export const SUPABASE_ANON_KEY = ''; // e.g. 'sb_publishable_...' or 'eyJ...'
