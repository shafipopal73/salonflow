import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageSquare, User, Search, Trash2, ArrowLeft } from 'lucide-react';
import MessageBubble from '@/components/chat/MessageBubble';
import ConversationItem from '@/components/chat/ConversationItem';
import ChatInput from '@/components/chat/ChatInput';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from
'@/components/ui/alert-dialog';

export default function ChatPanel({ mode, user }) {
  const [messages, setMessages] = useState([]);
  const [stylists, setStylists] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const mobileChatActive = searchParams.get('chat') === 'open';
  const openChat = () => setSearchParams(prev => { const next = new URLSearchParams(prev); next.set('chat', 'open'); return next; });
  const closeChat = () => setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('chat'); return next; }, { replace: true });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDeleteConvConfirm, setShowDeleteConvConfirm] = useState(false);
  const [deletedConversations, setDeletedConversations] = useState(new Set());
  const messagesEndRef = useRef(null);
  const stylistInitRef = useRef(false);

  const loadStylists = useCallback(async () => {
    if (mode !== 'admin' || !user?.salon_id) return;
    try {
      const res = await base44.functions.invoke('getSalonStylists', {});
      const nonAdmins = res.data?.stylists || [];
      setStylists(nonAdmins);
      if (!stylistInitRef.current && nonAdmins.length > 0) {
        setSelectedPartnerId(nonAdmins[0].id);
        stylistInitRef.current = true;
      }
    } catch (err) {
      console.error('Failed to load stylists for chat:', err);
    }
  }, [mode, user?.salon_id]);

  useEffect(() => {
    loadStylists();
  }, [loadStylists]);

  // Auto-refresh stylist list when a user updates their profile
  useEffect(() => {
    if (mode !== 'admin' || !user?.salon_id) return;
    const unsubscribe = base44.entities.User.subscribe((event) => {
      if (event.type === 'update' || event.type === 'create' || event.type === 'delete') {
        loadStylists();
      }
    });
    return unsubscribe;
  }, [mode, user?.salon_id, loadStylists]);

  useEffect(() => {
    if (!user?.id) return;
    if (mode === 'admin' && !user?.salon_id) return;
    const load = async () => {
      try {
        let data;
        if (mode === 'stylist') {
          data = await base44.entities.Message.filter({ thread_partner_id: user.id }, 'created_date');
        } else {
          data = await base44.entities.Message.filter({ salon_id: user.salon_id }, 'created_date', 500);
        }
        setMessages(data);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
console.log('Starting Base44 live message subscription');
const unsubscribe = base44.entities.Message.subscribe((event) => {
  console.log('Live message event received:', event);
      if (event.type === 'create') {
        if (!user?.salon_id || event.data.salon_id !== user.salon_id) return;
        // Restore a deleted conversation if a new message arrives for it
        if (event.data.thread_partner_id) {
          setDeletedConversations((prev) => {
            if (!prev.has(event.data.thread_partner_id)) return prev;
            const next = new Set(prev);
            next.delete(event.data.thread_partner_id);
            return next;
          });
        }
        setMessages((prev) => {
          if (prev.some((m) => m.id === event.data.id)) return prev;
          // Replace any matching pending temp message with the real record
          const withoutPending = prev.filter(m => !(
            m._pending &&
            m.body === event.data.body &&
            m.sender_id === event.data.sender_id &&
            m.thread_partner_id === event.data.thread_partner_id
          ));
          return [...withoutPending, event.data];
        });
      } else if (event.type === 'update') {
        setMessages((prev) => prev.map((m) => m.id === event.data.id ? event.data : m));
      } else if (event.type === 'delete') {
        setMessages((prev) => prev.filter((m) => m.id !== event.id));
      }
    });
    return unsubscribe;
  }, [mode, user?.id, user?.salon_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedPartnerId]);

  const conversationMessages = mode === 'stylist' ?
  messages :
  messages.filter((m) => m.thread_partner_id === selectedPartnerId);

  const unreadIncomingKey = conversationMessages.
  filter((m) => !m.read && m.sender_id !== user.id).
  map((m) => m.id).
  join(',');

  // Mark incoming messages as read when the conversation is viewed
  useEffect(() => {
    if (loading || !unreadIncomingKey) return;
    unreadIncomingKey.split(',').filter(Boolean).forEach((id) => {
      base44.entities.Message.update(id, { read: true });
    });
  }, [unreadIncomingKey, loading, mode, user?.id]);

  const handleSend = async (messageData) => {
    const { body, media_url, media_type } = messageData;
    if (!body && !media_url) return;
    let partnerId, partnerName;
    if (mode === 'stylist') {
      partnerId = user.id;
      partnerName = user.display_name || user.full_name || user.email;
    } else {
      const partner = stylists.find((s) => s.id === selectedPartnerId);
      partnerId = selectedPartnerId;
      partnerName = partner?.display_name || partner?.full_name || partner?.email || 'Stylist';
    }
    const senderName = user.display_name || user.full_name || user.email;
    const senderRole = mode === 'admin' ? 'admin' : 'stylist';

    // Optimistic: render a temp message immediately with a pending state
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tempMessage = {
      id: tempId,
      _pending: true,
      sender_id: user.id,
      sender_name: senderName,
      sender_role: senderRole,
      thread_partner_id: partnerId,
      thread_partner_name: partnerName,
      body: body || '',
      media_url,
      media_type,
      salon_id: user.salon_id,
      created_date: new Date().toISOString(),
      read: false,
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const created = await base44.entities.Message.create({
        sender_id: user.id,
        sender_name: senderName,
        sender_role: senderRole,
        thread_partner_id: partnerId,
        thread_partner_name: partnerName,
        body: body || '',
        media_url,
        media_type,
        salon_id: user.salon_id
      });
      // Replace the temp message with the real record
      setMessages(prev => prev.map(m => m.id === tempId ? created : m));
    } catch (err) {
      // Remove the temp message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      console.error('Failed to send message:', err);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await base44.entities.Message.delete(messageId);
    } catch (err) {

      // Message may have already been deleted via real-time sync — ignore
    }};

  const handleDeleteConversation = async () => {
    const partnerId = selectedPartnerId;
    setDeletedConversations((prev) => new Set(prev).add(partnerId));
    setMessages((prev) => prev.filter((m) => m.thread_partner_id !== partnerId));
    setShowDeleteConvConfirm(false);
    closeChat();
    try {
      await base44.entities.Message.deleteMany({ thread_partner_id: partnerId });
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  if (mode === 'stylist') {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-5 h-5" />
          <h2 className="font-heading text-xl font-semibold">Front Desk Chat</h2>
        </div>
        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 rounded-md">
            {conversationMessages.length === 0 ?
            <div className="text-center py-10 text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No messages yet. Say hi to the front desk!</p>
              </div> :

            <div className="space-y-3">
                {conversationMessages.map((msg) =>
              <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'} ${msg._pending ? 'opacity-60' : ''}`}>
                    <MessageBubble msg={msg} isOwn={msg.sender_id === user.id} canDownload={mode === 'admin'} />
                  </div>
              )}
                <div ref={messagesEndRef} />
              </div>
            }
          </div>
          <ChatInput onSend={handleSend} />
        </Card>
      </div>);

  }

  const stylistsWithMessages = new Set(messages.filter((m) => m.thread_partner_id).map((m) => m.thread_partner_id));
  const unreadByStylist = new Set(messages.filter((m) => !m.read && m.sender_role !== 'admin' && m.thread_partner_id).map((m) => m.thread_partner_id));
  const filteredStylists = stylists.filter((s) => {
    if (deletedConversations.has(s.id)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (s.full_name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-3 flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        <h2 className="font-heading text-xl font-semibold">Stylist Chat</h2>
      </div>
      {stylists.length === 0 ?
      <div className="text-center py-20 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No stylists registered yet. Invite stylists from your dashboard.</p>
        </div> :

      <div className="grid grid-cols-1 grid-rows-1 md:grid-cols-[250px_1fr] gap-4 flex-1 min-h-0">
          <Card className={`overflow-hidden flex-col min-h-0 ${mobileChatActive ? 'hidden' : 'flex'} md:flex`}>
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search stylists..." className="h-8 pl-7 text-sm" />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {filteredStylists.length === 0 ?
            <p className="text-center text-sm text-muted-foreground py-4">No stylists found</p> :
            null}
              {filteredStylists.map((s) => (
                <ConversationItem
                  key={s.id}
                  stylist={s}
                  isSelected={selectedPartnerId === s.id}
                  hasUnread={unreadByStylist.has(s.id)}
                  onSelect={() => { setSelectedPartnerId(s.id); openChat(); }}
                  onDelete={() => { setSelectedPartnerId(s.id); setShowDeleteConvConfirm(true); }}
                />
              ))}
            </div>
          </Card>
          <Card className={`flex-col overflow-hidden min-h-0 ${mobileChatActive ? 'flex' : 'hidden'} md:flex`}>
            {selectedPartnerId ?
          <>
                <div className="flex items-center gap-2 px-4 py-2 border-b">
                  <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 shrink-0 min-h-[44px] min-w-[44px] touch-target" onClick={() => closeChat()}>
                     <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium truncate flex-1">
                    {stylists.find((s) => s.id === selectedPartnerId)?.display_name || stylists.find((s) => s.id === selectedPartnerId)?.full_name || stylists.find((s) => s.id === selectedPartnerId)?.email || 'Stylist'}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setShowDeleteConvConfirm(true)} className="text-destructive hover:text-destructive h-8 min-h-[44px] touch-target">
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete Chat
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {conversationMessages.length === 0 ?
              <div className="text-center py-10 text-muted-foreground">
                      <p>No messages yet. Start the conversation!</p>
                    </div> :

              <div className="space-y-3">
                      {conversationMessages.map((msg) =>
                <div key={msg.id} className={`group flex items-center gap-1.5 ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'} ${msg._pending ? 'opacity-60' : ''}`}>
                          <MessageBubble msg={msg} isOwn={msg.sender_role === 'admin'} canDownload={mode === 'admin'} />
                          <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="md:opacity-0 md:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg touch-target">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                )}
                      <div ref={messagesEndRef} />
                    </div>
              }
                </div>
                <ChatInput onSend={handleSend} />
              </> :

          <div className="flex items-center justify-center text-muted-foreground">Select a stylist to chat</div>
          }
          </Card>
        </div>
      }
      <AlertDialog open={showDeleteConvConfirm} onOpenChange={setShowDeleteConvConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entire conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all messages in this chat. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConversation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}