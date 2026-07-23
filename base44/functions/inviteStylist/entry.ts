import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { createInvitationToken } from '../../shared/invitationToken.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin') {
      return Response.json({ error: 'Only admins can invite stylists' }, { status: 403 });
    }

    const { email, title, salonId } = await req.json();

    if (!email || !title) {
      return Response.json({ error: 'Email and title are required' }, { status: 400 });
    }

    // Invite the user — platform sends the invitation email
    await base44.users.inviteUser(email.trim(), 'user');

    // Generate a signed invitation token so salon_id/title are verified on the backend
    // during registration — not trusted from client-supplied URL params.
    const secret = Deno.env.get('BASE44_APP_ID') || '';
    const token = await createInvitationToken(email.trim(), salonId, title.trim(), secret);

    const origin = req.headers.get('origin') || '';
    const link = `${origin}/register?email=${encodeURIComponent(email.trim())}&invite_token=${encodeURIComponent(token)}`;

    return Response.json({ success: true, link });
  } catch (error) {
    console.error('inviteStylist error:', error);
    return Response.json({ error: error.message || 'Failed to invite stylist' }, { status: 500 });
  }
});