import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function NotificationsDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  const targetRole = user?.role === 'admin' ? 'admin' : 'stylist';

  useEffect(() => {
    if (!user?.salon_id) return;
    const load = async () => {
      const data = await base44.entities.Notification.filter(
        { salon_id: user.salon_id, target_role: targetRole },
        '-created_date',
        50
      );
      setNotifications(data);
    };
    load();

    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (!user?.salon_id || event.data.salon_id !== user.salon_id) return;
      if (event.data.target_role !== targetRole) return;
      if (event.type === 'create') {
        setNotifications(prev => {
          if (prev.some(n => n.id === event.data.id)) return prev;
          return [event.data, ...prev].slice(0, 50);
        });
      } else if (event.type === 'update') {
        setNotifications(prev => prev.map(n => n.id === event.data.id ? event.data : n));
      } else if (event.type === 'delete') {
        setNotifications(prev => prev.filter(n => n.id !== event.id));
      }
    });
    return unsubscribe;
  }, [user?.id, user?.salon_id, targetRole]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await base44.entities.Notification.updateMany(
        { salon_id: user.salon_id, read: false, target_role: targetRole },
        { $set: { read: true } }
      );
    } catch (err) {
      setNotifications(prev => prev.map(n => ({ ...n, read: false })));
    }
  };

  const clearRead = async () => {
    setNotifications(prev => prev.filter(n => !n.read));
    try {
      await base44.entities.Notification.deleteMany({ read: true, salon_id: user.salon_id, target_role: targetRole });
    } catch (err) {
      // ignore - already removed from local state
    }
  };

  const ADMIN_TAB_MAP = {
    order: 'orders',
    service: 'services',
    service_note: 'services',
    guest_message: 'messages',
    chat: 'chat',
    service_update: 'services',
  };

  const handleNotificationClick = async (n) => {
    if (targetRole === 'admin') {
      const tab = ADMIN_TAB_MAP[n.type];
      if (tab) navigate(`/front-desk?tab=${tab}`);
    } else {
      navigate(`/stylist?tab=chat`);
    }
    if (!n.read) {
      try {
        await base44.entities.Notification.update(n.id, { read: true });
      } catch (e) { /* already deleted */ }
    }
    setOpen(false);
  };

  const formatTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const hasRead = notifications.some(n => n.read);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-heading font-semibold text-sm">Notifications</span>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
                <CheckCheck className="w-3 h-3 mr-1" />
                Mark all read
              </Button>
            )}
            {hasRead && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={clearRead}>
                <Trash2 className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No notifications yet
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? 'bg-primary' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{formatTime(n.created_date)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}