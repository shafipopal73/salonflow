import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MobileSelect } from '@/components/ui/mobile-select';
import { Plus, Clock, CheckCircle, StickyNote, Gift } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const NOTE_TYPE_CONFIG = {
  note: { label: 'Note', icon: StickyNote, color: 'text-muted-foreground', badge: 'secondary' },
  extension: { label: 'Extension', icon: Clock, color: 'text-amber-500', badge: 'default' },
  extra_service: { label: 'Extra Service', icon: Gift, color: 'text-green-500', badge: 'default' },
};

export default function ServicesPanel({ mode, user }) {
  const [services, setServices] = useState([]);
  const [notesByService, setNotesByService] = useState({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [noteOpenFor, setNoteOpenFor] = useState(null);
  const [expandedService, setExpandedService] = useState(null);
  const { toast } = useToast();
  const [serviceForm, setServiceForm] = useState({ client_name: '', service_name: '' });
  const [noteForm, setNoteForm] = useState({ note_type: 'note', content: '' });

  useEffect(() => {
    const load = async () => {
      const filter = mode === 'stylist' ? { stylist_id: user.id, salon_id: user.salon_id } : { status: 'ongoing', salon_id: user.salon_id };
      const data = await base44.entities.Service.filter(filter, '-created_date');
      setServices(data);

      const notesMap = {};
      await Promise.all(data.map(async s => {
        const notes = await base44.entities.ServiceNote.filter({ service_id: s.id }, 'created_date');
        notesMap[s.id] = notes;
      }));
      setNotesByService(notesMap);
      setLoading(false);
    };
    load();

    const unsubService = base44.entities.Service.subscribe((event) => {
      if (event.type === 'create') {
        if (!user?.salon_id || event.data.salon_id !== user.salon_id) return;
        setServices(prev => {
          if (mode === 'admin' && event.data.status !== 'ongoing') return prev;
          return [event.data, ...prev];
        });
        setNotesByService(prev => ({ ...prev, [event.data.id]: [] }));
      } else if (event.type === 'update') {
        setServices(prev => {
          const updated = prev.map(s => s.id === event.data.id ? event.data : s);
          if (mode === 'admin') return updated.filter(s => s.status === 'ongoing');
          return updated;
        });
      } else if (event.type === 'delete') {
        setServices(prev => prev.filter(s => s.id !== event.id));
      }
    });

    const unsubNote = base44.entities.ServiceNote.subscribe((event) => {
      if (event.type === 'create') {
        if (!user?.salon_id || event.data.salon_id !== user.salon_id) return;
        setNotesByService(prev => ({
          ...prev,
          [event.data.service_id]: [...(prev[event.data.service_id] || []), event.data],
        }));
      } else if (event.type === 'delete') {
        setNotesByService(prev => ({
          ...prev,
          [event.data.service_id]: (prev[event.data.service_id] || []).filter(n => n.id !== event.id),
        }));
      }
    });

    return () => { unsubService(); unsubNote(); };
  }, [mode, user?.id]);

  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      await base44.entities.Service.create({
        stylist_id: user.id,
        stylist_name: user.full_name || user.email,
        client_name: serviceForm.client_name,
        service_name: serviceForm.service_name,
        status: 'ongoing',
        started_at: new Date().toISOString(),
        salon_id: user.salon_id,
      });
      toast({ title: 'Service started' });
      setServiceForm({ client_name: '', service_name: '' });
      setCreateOpen(false);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    try {
      await base44.entities.ServiceNote.create({
        service_id: noteOpenFor,
        author_id: user.id,
        author_name: user.full_name || user.email,
        note_type: noteForm.note_type,
        content: noteForm.content,
        salon_id: user.salon_id,
      });
      toast({ title: 'Note added' });
      setNoteForm({ note_type: 'note', content: '' });
      setNoteOpenFor(null);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleComplete = async (service) => {
    try {
      await base44.entities.Service.update(service.id, {
        status: 'completed',
        ended_at: new Date().toISOString(),
      });
      toast({ title: 'Service completed' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold">
          {mode === 'stylist' ? 'My Services' : 'Ongoing Services'}
        </h2>
        {mode === 'stylist' && (
          <Button onClick={() => { setServiceForm({ client_name: '', service_name: '' }); setCreateOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />Start Service
          </Button>
        )}
      </div>

      {services.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{mode === 'stylist' ? 'No active services. Start one!' : 'No ongoing services.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map(service => {
            const notes = notesByService[service.id] || [];
            const isExpanded = expandedService === service.id;
            return (
              <Card key={service.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-medium">{service.client_name} — {service.service_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {mode === 'admin' && <span>{service.stylist_name} · </span>}
                        Started {new Date(service.started_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <Badge variant={service.status === 'ongoing' ? 'default' : 'secondary'}>
                      {service.status === 'ongoing' ? 'Ongoing' : 'Completed'}
                    </Badge>
                  </div>

                  {notes.length > 0 && (
                    <div className="text-sm text-muted-foreground mb-2">{notes.length} note{notes.length !== 1 ? 's' : ''}</div>
                  )}

                  {isExpanded && notes.length > 0 && (
                    <div className="space-y-2 mb-3 border-l-2 border-border pl-3">
                      {notes.map(note => {
                        const config = NOTE_TYPE_CONFIG[note.note_type] || NOTE_TYPE_CONFIG.note;
                        const Icon = config.icon;
                        return (
                          <div key={note.id} className="text-sm">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                              <Badge variant={config.badge} className="text-xs">{config.label}</Badge>
                              <span className="text-xs text-muted-foreground">{note.author_name} · {new Date(note.created_date).toLocaleTimeString()}</span>
                            </div>
                            <p className="ml-5">{note.content}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {notes.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => setExpandedService(isExpanded ? null : service.id)}>
                        {isExpanded ? 'Hide' : 'Show'} Notes
                      </Button>
                    )}
                    {mode === 'stylist' && service.status === 'ongoing' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => { setNoteOpenFor(service.id); setNoteForm({ note_type: 'note', content: '' }); }}>
                          <Plus className="w-3 h-3 mr-1" />Add Note
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleComplete(service)}>
                          <CheckCircle className="w-3 h-3 mr-1" />Complete
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Start New Service</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateService} className="space-y-4">
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input value={serviceForm.client_name} onChange={e => setServiceForm({ ...serviceForm, client_name: e.target.value })} required placeholder="Sarah Johnson" />
            </div>
            <div className="space-y-2">
              <Label>Service</Label>
              <Input value={serviceForm.service_name} onChange={e => setServiceForm({ ...serviceForm, service_name: e.target.value })} required placeholder="Haircut & Color" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit">Start</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!noteOpenFor} onOpenChange={(open) => !open && setNoteOpenFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Service Note</DialogTitle></DialogHeader>
          <form onSubmit={handleAddNote} className="space-y-4">
            <div className="space-y-2">
              <Label>Note Type</Label>
              <MobileSelect
                value={noteForm.note_type}
                onValueChange={v => setNoteForm({ ...noteForm, note_type: v })}
                options={[
                  { value: 'note', label: 'General Note' },
                  { value: 'extension', label: 'Service Extended' },
                  { value: 'extra_service', label: 'Extra Service Added' },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                value={noteForm.content}
                onChange={e => setNoteForm({ ...noteForm, content: e.target.value })}
                required
                placeholder={noteForm.note_type === 'extension'
                  ? 'Service extended by 30 min for extra processing'
                  : noteForm.note_type === 'extra_service'
                    ? 'Client added deep conditioning treatment'
                    : 'Enter your note...'}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setNoteOpenFor(null)}>Cancel</Button>
              <Button type="submit">Add Note</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}