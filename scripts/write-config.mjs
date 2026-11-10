// Writes js/config.js into a build folder from the SUPABASE_URL and SUPABASE_ANON_KEY environment variables,
// so the connection details never have to be committed to the repository.
// If the variables are not set, the config.js from the repository is left untouched.
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

function looksLikeSecret(key) {
  if (/^sb_secret_/i.test(key)) return true;
  try { return JSON.parse(Buffer.from(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()).role === 'service_role'; } catch { return false; }
}

export async function writeConfig(jsDir) {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = (process.env.SUPABASE_ANON_KEY || '').trim();
  if (!url && !key) { console.log('SUPABASE_URL / SUPABASE_ANON_KEY not set: using js/config.js from the repository.'); return; }
  if (!url || !key) throw new Error('Set BOTH SUPABASE_URL and SUPABASE_ANON_KEY, or neither.');
  if (!/^https:\/\/[^/\s]+$/i.test(url)) throw new Error('SUPABASE_URL must look like https://abcd1234.supabase.co');
  if (looksLikeSecret(key)) throw new Error('SUPABASE_ANON_KEY is a SECRET key. Use the public anon / publishable key. Build stopped so it is not published.');
  const body = `// Generated at build time from environment variables. Do not edit.\nexport const SUPABASE_URL = ${JSON.stringify(url)};\nexport const SUPABASE_ANON_KEY = ${JSON.stringify(key)};\n`;
  await writeFile(path.join(jsDir, 'config.js'), body);
  console.log('Wrote js/config.js from environment variables.');
}
