import { createClient } from '@/lib/supabase/server';

export async function getApiAuth() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );

  // Allows local exploration without Supabase credentials. Add credentials to enable auth enforcement.
  if (!configured) return { configured: false, user: null, error: null };

  const supabase = await createClient();
  if (!supabase) return { configured: true, user: null, error: 'Supabase is not configured correctly.' };
  const { data, error } = await supabase.auth.getUser();
  return { configured: true, user: data.user, error: error?.message ?? null };
}
