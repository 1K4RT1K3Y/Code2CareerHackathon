import { NextResponse } from 'next/server';
import { getApiAuth } from '@/lib/supabase/api-auth';

export async function guardAiRequest() {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    return NextResponse.json(
      { error: 'AI Gateway is not configured yet. Add AI_GATEWAY_API_KEY to .env.local and restart the dev server.' },
      { status: 503 },
    );
  }

  const auth = await getApiAuth();
  if (auth.configured && !auth.user) {
    return NextResponse.json(
      { error: 'Please sign in to use AI learning features.', detail: auth.error || undefined },
      { status: 401 },
    );
  }
  return null;
}

export function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}
