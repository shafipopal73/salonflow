import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { salon_id } = body;

    if (!salon_id) {
      return Response.json({ error: 'salon_id is required' }, { status: 400 });
    }

    // Service role bypasses RLS so unauthenticated guests can read salon customization.
    // Safe because the data is public branding/theme config (colors, fonts, logo, background media).
    const data = await base44.asServiceRole.entities.SalonCustomization.filter(
      { salon_id },
      '-updated_date',
      10
    );

    // Prefer guest-scoped record; fall back to legacy unscoped record for backward compat
    const guest = data.find(s => s.scope === 'guest') || data.find(s => !s.scope) || data[0] || null;
    // Use admin-scoped record as a fallback for any fields the guest record is missing
    // (e.g. salon_display_name set only on the admin tab)
    const admin = data.find(s => s.scope === 'admin');
    const merged = guest && admin ? { ...admin, ...guest } : guest;

    return Response.json({ customization: merged });
  } catch (error) {
    console.error('getGuestCustomization error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});