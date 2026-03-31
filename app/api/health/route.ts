import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const t = Date.now();
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { error } = await sb.from('profiles').select('id').limit(1).maybeSingle();
    const ms = Date.now() - t;
    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ status: 'degraded', supabase: 'error', error: error.message, ms }, { status: 503 });
    }
    return NextResponse.json({ status: 'ok', supabase: 'connected', ms, ts: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ status: 'error', error: e.message, ms: Date.now() - t }, { status: 503 });
  }
}
