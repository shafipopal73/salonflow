import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify the request is authenticated — prevents unauthenticated external callers
    // from triggering notifications. The workflow engine provides auth context.
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { order_id } = body;

    if (!order_id) {
      return Response.json({ error: 'Missing order_id' }, { status: 400 });
    }

    // Fetch the actual order from the database instead of trusting request body.
    // This ensures the notification is only created for a real pre-arrival order
    // and all content (item_name, salon_id, guest_name, arrival_time) comes from
    // the verified record — not from an unauthenticated caller.
    let order;
    try {
      order = await base44.asServiceRole.entities.Order.get(order_id);
    } catch {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!order.is_pre_order || !order.arrival_time) {
      return Response.json({ error: 'Order is not a pre-arrival order' }, { status: 400 });
    }

    const arrivalDate = new Date(order.arrival_time);
    const arrivalStr = arrivalDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    await base44.asServiceRole.entities.Notification.create({
      title: 'Pre-Arrival Order Alert',
      body: `${order.requested_by_name || 'Guest'} arrives at ${arrivalStr} — pre-ordered: ${order.item_name}`,
      type: 'order',
      salon_id: order.salon_id,
      source_id: order_id,
      target_role: 'admin',
      read: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to send pre-arrival alert:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});