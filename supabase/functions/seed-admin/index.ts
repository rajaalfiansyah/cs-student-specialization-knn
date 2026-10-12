import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const email = 'admin@konsentrasi.ac.id'
    const password = 'admin12345'
    const fullName = 'Administrator Sistem'
    const role = 'admin'

    const { data: existingList, error: listErr } = await admin.auth.admin.listUsers()
    if (listErr) throw listErr
    const existing = existingList.users.find((u) => u.email === email)

    let userId: string
    if (existing) {
      userId = existing.id
      await admin.auth.admin.updateUserById(existing.id, { password })
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role },
      })
      if (createErr) throw createErr
      userId = created.user.id
    }

    const { error: upsertErr } = await admin.from('admins').upsert(
      { user_id: userId, email, full_name: fullName, role },
      { onConflict: 'user_id' },
    )
    if (upsertErr) throw upsertErr

    return new Response(
      JSON.stringify({ ok: true, email, password, role, user_id: userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
