import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { salonName, subdomain } = await req.json();

    if (!salonName) {
      return Response.json({ error: 'Salon name is required' }, { status: 400 });
    }

    // Create the salon record (service role bypasses RLS)
    const salon = await base44.asServiceRole.entities.Salon.create({
      name: salonName,
      subdomain: subdomain || null,
      owner_user_id: user.id,
    });

    // Promote the user to admin and associate them with the new salon
    await base44.asServiceRole.entities.User.update(user.id, {
      salon_id: salon.id,
      role: 'admin',
    });

    return Response.json({ success: true, salonId: salon.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});