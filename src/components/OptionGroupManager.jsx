import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Plus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function OptionGroupManager({ menuItemId, salonId }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!menuItemId) return;
    const load = async () => {
      try {
        const data = await base44.entities.MenuItemOptionGroup.filter({ menu_item_id: menuItemId });
        setGroups(data);
      } catch (err) {
        toast({ title: 'Error loading options', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();

    const unsub = base44.entities.MenuItemOptionGroup.subscribe((event) => {
      if (event.data?.menu_item_id !== menuItemId) return;
      if (event.type === 'create') setGroups(prev => [...prev, event.data]);
      else if (event.type === 'update') setGroups(prev => prev.map(g => g.id === event.data.id ? event.data : g));
      else if (event.type === 'delete') setGroups(prev => prev.filter(g => g.id !== event.id));
    });

    return () => unsub();
  }, [menuItemId]);

  const addGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await base44.entities.MenuItemOptionGroup.create({
        name: newGroupName.trim(),
        input_type: 'options',
        options: [],
        required: false,
        allow_multiple: false,
        menu_item_id: menuItemId,
        salon_id: salonId,
      });
      setNewGroupName('');
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const updateGroup = async (group, changes) => {
    try {
      await base44.entities.MenuItemOptionGroup.update(group.id, changes);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const deleteGroup = async (group) => {
    if (!confirm(`Delete option group "${group.name}"?`)) return;
    try {
      await base44.entities.MenuItemOptionGroup.delete(group.id);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const addOption = async (group, name, price) => {
    if (!name.trim()) return;
    const newOption = { name: name.trim(), extra_price: price ? parseFloat(price) : 0 };
    const updatedOptions = [...(group.options || []), newOption];
    await updateGroup(group, { options: updatedOptions });
  };

  const removeOption = async (group, optName) => {
    const updatedOptions = (group.options || []).filter(o => o.name !== optName);
    await updateGroup(group, { options: updatedOptions });
  };

  const toggleExpanded = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading options...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={newGroupName}
          onChange={e => setNewGroupName(e.target.value)}
          placeholder="New option group (e.g. Milk, Sugar, Decaf)"
          className="text-sm"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGroup(); } }}
        />
        <Button type="button" size="sm" variant="outline" onClick={addGroup}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {groups.length === 0 && (
        <p className="text-xs text-muted-foreground">No option groups yet. Add one to allow customization.</p>
      )}

      {groups.map(group => (
        <OptionGroupCard
          key={group.id}
          group={group}
          expanded={expandedId === group.id}
          onToggle={() => toggleExpanded(group.id)}
          onUpdate={(changes) => updateGroup(group, changes)}
          onDelete={() => deleteGroup(group)}
          onAddOption={(name, price) => addOption(group, name, price)}
          onRemoveOption={(optName) => removeOption(group, optName)}
        />
      ))}
    </div>
  );
}

function OptionGroupCard({ group, expanded, onToggle, onUpdate, onDelete, onAddOption, onRemoveOption }) {
  const [optName, setOptName] = useState('');
  const [optPrice, setOptPrice] = useState('');
  const [editName, setEditName] = useState(group.name);

  useEffect(() => {
    setEditName(group.name);
  }, [group.name]);

  const handleNameBlur = () => {
    if (editName.trim() && editName !== group.name) {
      onUpdate({ name: editName.trim() });
    } else {
      setEditName(group.name);
    }
  };

  const updateNumberItem = (idx, changes) => {
    const items = (group.number_items || []).map((it, i) => i === idx ? { ...it, ...changes } : it);
    onUpdate({ number_items: items });
  };

  const addNumberItem = () => {
    const items = [...(group.number_items || []), { name: '', unit_label: '', price_per_unit: 0, min: 0, step: 1 }];
    onUpdate({ number_items: items });
  };

  const removeNumberItem = (idx) => {
    const items = (group.number_items || []).filter((_, i) => i !== idx);
    onUpdate({ number_items: items });
  };

  const inputType = group.input_type || 'options';

  const handleAdd = () => {
    if (!optName.trim()) return;
    onAddOption(optName, optPrice);
    setOptName('');
    setOptPrice('');
  };

  const typeLabel = { options: 'Options', number: 'Number', yesno: 'Yes/No' }[inputType];

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between p-3">
        <div onClick={onToggle} className="flex items-center gap-2 flex-1 text-left cursor-pointer">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={handleNameBlur}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => { if (e.key === 'Enter') { e.target.blur(); } }}
            className="text-sm font-medium bg-transparent border-none focus:outline-none focus:underline px-0 max-w-[160px]"
          />
          <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
          {inputType === 'options' && <Badge variant="outline" className="text-xs">{(group.options || []).length} opts</Badge>}
          {group.required && <Badge variant="default" className="text-xs">Required</Badge>}
          {inputType === 'options' && group.allow_multiple && <Badge variant="secondary" className="text-xs">Multi</Badge>}
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 touch-target" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </Button>
      </div>
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t pt-3">
          {/* Input Type Selector */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Input Type</Label>
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <button type="button" className={cn("flex-1 px-3 py-1.5 text-xs rounded-md transition-colors", inputType === 'options' ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground")} onClick={() => onUpdate({ input_type: 'options' })}>Options</button>
              <button type="button" className={cn("flex-1 px-3 py-1.5 text-xs rounded-md transition-colors", inputType === 'number' ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground")} onClick={() => onUpdate({ input_type: 'number' })}>Number</button>
              <button type="button" className={cn("flex-1 px-3 py-1.5 text-xs rounded-md transition-colors", inputType === 'yesno' ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground")} onClick={() => onUpdate({ input_type: 'yesno' })}>Yes/No</button>
            </div>
          </div>

          {/* Required / Allow Multiple */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={group.required || false} onCheckedChange={v => onUpdate({ required: v })} />
              <Label className="text-xs">Required</Label>
            </div>
            {inputType === 'options' && (
              <div className="flex items-center gap-2">
                <Switch checked={group.allow_multiple || false} onCheckedChange={v => onUpdate({ allow_multiple: v })} />
                <Label className="text-xs">Allow multiple</Label>
              </div>
            )}
          </div>

          {/* Options config */}
          {inputType === 'options' && (
            <>
              <div className="space-y-1">
                {(group.options || []).map(opt => (
                  <div key={opt.name} className="flex items-center justify-between py-1 px-2 rounded hover:bg-accent">
                    <span className="text-sm">{opt.name}</span>
                    <div className="flex items-center gap-2">
                      {opt.extra_price > 0 && <span className="text-sm text-muted-foreground">+${opt.extra_price.toFixed(2)}</span>}
                      <button type="button" onClick={() => onRemoveOption(opt.name)} className="text-destructive hover:text-destructive/80">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input value={optName} onChange={e => setOptName(e.target.value)} placeholder="Option name" className="text-sm h-8" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }} />
                <Input value={optPrice} onChange={e => setOptPrice(e.target.value)} placeholder="0.00" type="number" step="0.01" className="text-sm h-8 w-20" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }} />
                <Button type="button" size="sm" variant="outline" className="h-8 touch-target" onClick={handleAdd}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </>
          )}

          {/* Number config - multiple items with unit labels */}
          {inputType === 'number' && (
            <div className="space-y-2">
              {(group.number_items || []).map((item, idx) => (
                <div key={idx} className="space-y-2 rounded-md border p-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={item.name || ''}
                      onChange={e => updateNumberItem(idx, { name: e.target.value })}
                      placeholder="Item name (e.g. Sugar)"
                      className="text-sm h-8 flex-1"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 touch-target" onClick={() => removeNumberItem(idx)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Unit label</Label>
                      <Input
                        value={item.unit_label || ''}
                        onChange={e => updateNumberItem(idx, { unit_label: e.target.value })}
                        placeholder="e.g. tsp, shots"
                        className="text-sm h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Price per unit</Label>
                      <Input
                        value={item.price_per_unit ?? 0}
                        onChange={e => updateNumberItem(idx, { price_per_unit: e.target.value ? parseFloat(e.target.value) : 0 })}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="text-sm h-8"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Min</Label>
                      <Input
                        value={item.min ?? 0}
                        onChange={e => updateNumberItem(idx, { min: e.target.value ? parseFloat(e.target.value) : 0 })}
                        type="number"
                        step="1"
                        className="text-sm h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Max</Label>
                      <Input
                        value={item.max ?? ''}
                        onChange={e => updateNumberItem(idx, { max: e.target.value ? parseFloat(e.target.value) : undefined })}
                        type="number"
                        step="1"
                        placeholder="—"
                        className="text-sm h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Step</Label>
                      <Input
                        value={item.step ?? 1}
                        onChange={e => updateNumberItem(idx, { step: e.target.value ? parseFloat(e.target.value) : 1 })}
                        type="number"
                        step="0.5"
                        className="text-sm h-8"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={addNumberItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add item
              </Button>
            </div>
          )}

          {/* Yes/No config */}
          {inputType === 'yesno' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Yes label</Label>
                  <Input value={group.yes_label || ''} onChange={e => onUpdate({ yes_label: e.target.value })} placeholder="Yes" className="text-sm h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Yes price</Label>
                  <Input value={group.yes_price ?? ''} onChange={e => onUpdate({ yes_price: e.target.value ? parseFloat(e.target.value) : 0 })} type="number" step="0.01" placeholder="0.00" className="text-sm h-8" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">No label</Label>
                  <Input value={group.no_label || ''} onChange={e => onUpdate({ no_label: e.target.value })} placeholder="No" className="text-sm h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">No price</Label>
                  <Input value={group.no_price ?? ''} onChange={e => onUpdate({ no_price: e.target.value ? parseFloat(e.target.value) : 0 })} type="number" step="0.01" placeholder="0.00" className="text-sm h-8" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}