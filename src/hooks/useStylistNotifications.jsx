import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

function playBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (e) { /* ignore */ }
}

function notify(title, body) {
  playBeep();
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

// Module-level Sets prevent duplicate notifications across hook re-mounts (e.g. React StrictMode)
const stylistKnownMessageIds = new Set();
const stylistCreatedNotificationKeys = new Set();

async function dedupCreateNotification(key, data) {
  if (stylistCreatedNotificationKeys.has(key)) return { isNew: false };
  stylistCreatedNotificationKeys.add(key);
  try {
    if (data.source_id) {
      const existing = await base44.entities.Notification.filter(
        { source_id: data.source_id, type: data.type, target_role: data.target_role },
        '-created_date',
        1
      );
      if (existing.length > 0) return { notification: existing[0], isNew: false };
    }
    const notification = await base44.entities.Notification.create(data);
    return { notification, isNew: true };
  } catch (e) {
    stylistCreatedNotificationKeys.delete(key);
    throw e;
  }
}

export function useStylistNotifications(user) {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    if (!user?.id) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const loadExisting = async () => {
      try {
        const messages = await base44.entities.Message.filter({ salon_id: user.salon_id }, 'created_date', 100);
        messages.forEach(m => stylistKnownMessageIds.add(m.id));
      } catch (e) { /* ignore */ }
    };
    loadExisting();

    // --- Chat messages from admin to this stylist ---
    const unsubMessages = base44.entities.Message.subscribe((event) => {
      if (event.type !== 'create') return;
      if (stylistKnownMessageIds.has(event.data.id)) return;
      stylistKnownMessageIds.add(event.data.id);
      if (!user?.salon_id || event.data.salon_id !== user.salon_id) return;
      if (event.data.sender_id === user.id) return;
      if (event.data.sender_role !== 'admin') return;
      if (event.data.thread_partner_id !== user.id) return;

      const isServiceUpdate = event.data.message_type === 'service_update';
      const title = isServiceUpdate
        ? `Service Update From ${event.data.sender_name}`
        : `New Message From ${event.data.sender_name}`;
      const body = event.data.body || (event.data.media_type ? `Sent a ${event.data.media_type}` : '');

      dedupCreateNotification(`stylist_message:${event.data.id}`, {
        title, body,
        type: isServiceUpdate ? 'service_update' : 'chat',
        salon_id: user.salon_id,
        source_id: event.data.id,
        target_role: 'stylist',
      }).then(r => {
        if (r.isNew) {
          notify(title, body);
          toastRef.current({ title, description: body });
        }
      });
    });

    return () => {
      unsubMessages();
    };
  }, [user?.id, user?.salon_id]);
}