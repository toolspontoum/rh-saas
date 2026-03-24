import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error('Variáveis NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY ausentes no apps/api/.env');
}

const db = createClient(url, key, { auth: { persistSession: false } });

async function count(table) {
  const { count, error } = await db.from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`${table} count: ${error.message}`);
  return count ?? 0;
}

async function clear(table) {
  const { error } = await db.from(table).delete().not('id', 'is', null);
  if (error) throw new Error(`${table} delete: ${error.message}`);
}

const before = {
  time_entry_change_logs: await count('time_entry_change_logs'),
  time_adjustment_requests: await count('time_adjustment_requests'),
  time_entries: await count('time_entries')
};

await clear('time_entry_change_logs');
await clear('time_adjustment_requests');
await clear('time_entries');

const after = {
  time_entry_change_logs: await count('time_entry_change_logs'),
  time_adjustment_requests: await count('time_adjustment_requests'),
  time_entries: await count('time_entries')
};

console.log(JSON.stringify({ ok: true, before, after }, null, 2));
