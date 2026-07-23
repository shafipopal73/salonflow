import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.salon_id) return Response.json({ error: 'No salon associated' }, { status: 403 });

    console.log('getSalonStylists: user=', user.email, 'salon_id=', user.salon_id);

    // Service role bypasses User entity frontend restrictions
    const all = await base44.asServiceRole.entities.User.filter({ salon_id: user.salon_id });
    console.log('getSalonStylists: found', all.length, 'total users with matching salon_id');

    // Return non-admin users (stylists) with safe fields only
    const stylists = all
      .filter(u => u.role !== 'admin')
      .map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        salon_id: u.salon_id,
        title: u.title,
        display_name: u.display_name,
        username: u.username,
        chair_number: u.chair_number,
        profile_picture_url: u.profile_picture_url,
      }));

    return Response.json({ stylists });
  } catch (error) {
    console.error('getSalonStylists error:', error);
    return Response.json({ error: error.message || 'Failed to fetch stylists' }, { status: 500 });
  }
});