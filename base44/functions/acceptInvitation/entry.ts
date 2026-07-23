import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { verifyInvitationToken } from '../../shared/invitationToken.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invite_token } = await req.json();
    if (!invite_token) {
      return Response.json({ error: 'Missing invitation token' }, { status: 400 });
    }

    const secret = Deno.env.get('BASE44_APP_ID') || '';
    const invitation = await verifyInvitationToken(invite_token, secret);
    if (!invitation) {
      return Response.json({ error: 'Invalid or expired invitation' }, { status: 403 });
    }

    // Verify the authenticated user's email matches the invitation
    if (user.email !== invitation.email) {
      return Response.json({ error: 'Invitation does not match your account' }, { status: 403 });
    }

    // Securely set salon_id and title on the backend — never trust client-supplied values
    await base44.asServiceRole.entities.User.update(user.id, {
      salon_id: invitation.salon_id,
      title: invitation.title,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('acceptInvitation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});