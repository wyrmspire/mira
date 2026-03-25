import { NextResponse } from 'next/server'
import { DEFAULT_USER_ID } from '@/lib/constants'
import { getSupabaseClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dev/diagnostic
 * Dev-only endpoint: reports active adapter, env presence, and row counts.
 */
export async function GET() {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const useJsonFallback = process.env.USE_JSON_FALLBACK === 'true'

  let adapterName: string
  if (useJsonFallback) {
    adapterName = 'JsonFileStorageAdapter (explicit)'
  } else if (supabaseUrl && supabaseKey) {
    adapterName = 'SupabaseStorageAdapter'
  } else {
    adapterName = 'NONE — would fail fast'
  }

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: !!supabaseKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!anonKey,
    USE_JSON_FALLBACK: useJsonFallback,
  }

  // Count rows in key tables if Supabase is available
  let counts: Record<string, number | string> = {}
  if (supabaseUrl && supabaseKey && !useJsonFallback) {
    const client = getSupabaseClient()
    if (client) {
      const tables = [
        'ideas',
        'experience_templates',
        'experience_instances',
        'experience_steps',
        'interaction_events',
        'timeline_events',
        'synthesis_snapshots',
        'realizations',
        'realization_reviews',
      ]
      for (const table of tables) {
        try {
          const { count, error } = await client
            .from(table)
            .select('*', { count: 'exact', head: true })
          counts[table] = error ? `error: ${error.message}` : (count ?? 0)
        } catch (e) {
          counts[table] = `error: ${e instanceof Error ? e.message : String(e)}`
        }
      }
    }
  }

  return NextResponse.json({
    adapter: adapterName,
    env,
    defaultUserId: DEFAULT_USER_ID,
    counts,
    quarantined: {
      projects: 'projects-service returns empty (realizations table has incompatible schema)',
      prs: 'prs-service returns empty (realization_reviews table has incompatible schema)',
      tasks: 'tasks collection removed from TABLE_MAP (use experience_steps directly)',
    },
    timestamp: new Date().toISOString(),
  })
}
