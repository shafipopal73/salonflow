import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, Clock } from 'lucide-react';

export default function ItemCustomizationDialog({ item, optionGroups, open, onOpenChange, onConfirm, basePrice }) {
  const [selections, setSelections] = useState({});
  const [notes, setNotes] = useState('');
  const [preOrderMode, setPreOrderMode] = useState(false);
  const [arrivalTime, setArrivalTime] = useState('');

  const itemKey = item?.id;
  useEffect(() => {
    if (open) {
      const initial = {};
      (optionGroups || []).forEach(g => {
        if ((g.input_type || 'options') === 'number') {
          if (g.number_items && g.number_items.length > 0) {
            const obj = {};
            g.number_items.forEach((item, i) => { obj[i] = item.min ?? 0; });
            initial[g.id] = obj;
          } else {
            initial[g.id] = g.number_min ?? 0;
          }
        }
      });
      setSelections(initial);
      setNotes('');
      setPreOrderMode(false);
      setArrivalTime('');
    }
  }, [itemKey, open]);

  const extraTotal = useMemo(() => {
    let total = 0;
    (optionGroups || []).forEach(g => {
      const val = selections[g.id];
      const type = g.input_type || 'options';
      if (type === 'options' && Array.isArray(val)) {
        total += val.reduce((s, o) => s + (o.extra_price || 0), 0);
      } else if (type === 'number') {
        if (g.number_items && g.number_items.length > 0 && typeof val === 'object') {
          g.number_items.forEach((item, i) => {
            total += (val[i] ?? item.min ?? 0) * (item.price_per_unit || 0);
          });
        } else if (typeof val === 'number') {
          total += val * (g.number_price_per_unit || 0);
        }
      } else if (type === 'yesno' && (val === 'yes' || val === 'no')) {
        total += val === 'yes' ? (g.yes_price || 0) : (g.no_price || 0);
      }
    });
    return total;
  }, [selections, optionGroups]);

  if (!item || !optionGroups || optionGroups.length === 0) return null;

  const handleSingleSelect = (groupId, option) => {
    setSelections(prev => ({ ...prev, [groupId]: [option] }));
  };

  const handleMultiToggle = (groupId, option) => {
    setSelections(prev => {
      const current = prev[groupId] || [];
      const exists = current.find(o => o.name === option.name);
      if (exists) {
        return { ...prev, [groupId]: current.filter(o => o.name !== option.name) };
      }
      return { ...prev, [groupId]: [...current, option] };
    });
  };

  const setNumberValue = (groupId, value) => {
    setSelections(prev => ({ ...prev, [groupId]: value }));
  };

  const setNumberItemValue = (groupId, itemIndex, value) => {
    setSelections(prev => {
      const current = prev[groupId] || {};
      return { ...prev, [groupId]: { ...current, [itemIndex]: value } };
    });
  };

  const setYesNoValue = (groupId, value) => {
    setSelections(prev => ({ ...prev, [groupId]: value }));
  };

  const totalPrice = (basePrice || 0) + extraTotal;

  const canConfirm = optionGroups.every(g => {
    if (!g.required) return true;
    const val = selections[g.id];
    const type = g.input_type || 'options';
    if (type === 'options') return (val || []).length > 0;
    if (type === 'number') return val !== undefined && val !== null;
    if (type === 'yesno') return val === 'yes' || val === 'no';
    return true;
  });

  const handleConfirm = () => {
    const parts = [];
    optionGroups.forEach(g => {
      const val = selections[g.id];
      const type = g.input_type || 'options';
      if (type === 'options' && Array.isArray(val) && val.length > 0) {
        parts.push(`${g.name}: ${val.map(o => o.name).join(', ')}`);
      } else if (type === 'number') {
        if (g.number_items && g.number_items.length > 0 && typeof val === 'object') {
          g.number_items.forEach((item, i) => {
            const v = val[i] ?? item.min ?? 0;
            const unit = item.unit_label ? ` ${item.unit_label}` : '';
            parts.push(`${item.name || g.name}: ${v}${unit}`);
          });
        } else if (val !== undefined && val !== null) {
          const unit = g.number_unit ? ` ${g.number_unit}` : '';
          parts.push(`${g.name}: ${val}${unit}`);
        }
      } else if (type === 'yesno' && (val === 'yes' || val === 'no')) {
        const label = val === 'yes' ? (g.yes_label || 'Yes') : (g.no_label || 'No');
        parts.push(`${g.name}: ${label}`);
      }
    });
    if (notes.trim()) parts.push(`Notes: ${notes.trim()}`);
    onConfirm(parts.join(' | '), totalPrice, preOrderMode ? arrivalTime : null);
  };

  const renderGroup = (group) => {
    const type = group.input_type || 'options';

    if (type === 'number') {
      // Multi-item mode: each item has its own name, unit label, and config
      if (group.number_items && group.number_items.length > 0) {
        const groupSel = selections[group.id] || {};
        return (
          <div className="space-y-3">
            {group.number_items.map((item, i) => {
              const min = item.min ?? 0;
              const max = item.max;
              const step = item.step ?? 1;
              const unit = item.unit_label;
              const pricePerUnit = item.price_per_unit || 0;
              const currentVal = groupSel[i] ?? min;

              const clamp = (v) => {
                if (v < min) return min;
                if (max !== undefined && max !== null && v > max) return max;
                return v;
              };

              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-24 shrink-0">{item.name || `Item ${i + 1}`}</span>
                  <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => setNumberItemValue(group.id, i, clamp(currentVal - step))}>
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={currentVal}
                    min={min}
                    max={max}
                    step={step}
                    onChange={e => {
                      const v = e.target.value === '' ? min : parseFloat(e.target.value);
                      setNumberItemValue(group.id, i, isNaN(v) ? min : clamp(v));
                    }}
                    className="w-20 text-center"
                  />
                  <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => setNumberItemValue(group.id, i, clamp(currentVal + step))}>
                    <Plus className="w-4 h-4" />
                  </Button>
                  {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
                  {pricePerUnit > 0 && (
                    <span className="text-sm text-muted-foreground ml-auto">+${(pricePerUnit * currentVal).toFixed(2)}</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      }

      // Single-item mode (backward compatible)
      const min = group.number_min ?? 0;
      const max = group.number_max;
      const step = group.number_step ?? 1;
      const unit = group.number_unit;
      const pricePerUnit = group.number_price_per_unit || 0;
      const currentVal = selections[group.id] ?? min;

      const clamp = (v) => {
        if (v < min) return min;
        if (max !== undefined && max !== null && v > max) return max;
        return v;
      };

      return (
        <div className="flex items-center gap-3">
          <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => setNumberValue(group.id, clamp(currentVal - step))}>
            <Minus className="w-4 h-4" />
          </Button>
          <Input
            type="number"
            value={currentVal}
            min={min}
            max={max}
            step={step}
            onChange={e => {
              const v = e.target.value === '' ? min : parseFloat(e.target.value);
              setNumberValue(group.id, isNaN(v) ? min : clamp(v));
            }}
            className="w-20 text-center"
          />
          <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => setNumberValue(group.id, clamp(currentVal + step))}>
            <Plus className="w-4 h-4" />
          </Button>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          {pricePerUnit > 0 && (
            <span className="text-sm text-muted-foreground ml-auto">+${(pricePerUnit * currentVal).toFixed(2)}</span>
          )}
        </div>
      );
    }

    if (type === 'yesno') {
      const val = selections[group.id];
      return (
        <RadioGroup value={val || ''} onValueChange={v => setYesNoValue(group.id, v)}>
          <label className="flex items-center justify-between gap-3 p-2 rounded-lg border cursor-pointer hover:bg-accent">
            <div className="flex items-center gap-3">
              <RadioGroupItem value="yes" id={`${group.id}-yes`} />
              <span className="text-sm">{group.yes_label || 'Yes'}</span>
            </div>
            {(group.yes_price || 0) > 0 && <span className="text-sm text-muted-foreground">+${group.yes_price.toFixed(2)}</span>}
          </label>
          <label className="flex items-center justify-between gap-3 p-2 rounded-lg border cursor-pointer hover:bg-accent">
            <div className="flex items-center gap-3">
              <RadioGroupItem value="no" id={`${group.id}-no`} />
              <span className="text-sm">{group.no_label || 'No'}</span>
            </div>
            {(group.no_price || 0) > 0 && <span className="text-sm text-muted-foreground">+${group.no_price.toFixed(2)}</span>}
          </label>
        </RadioGroup>
      );
    }

    // Default: options type
    if (group.allow_multiple) {
      return (
        <div className="space-y-2">
          {(group.options || []).map(opt => {
            const selected = (selections[group.id] || []).find(o => o.name === opt.name);
            return (
              <label key={opt.name} className="flex items-center justify-between gap-3 p-2 rounded-lg border cursor-pointer hover:bg-accent">
                <div className="flex items-center gap-3">
                  <Checkbox checked={!!selected} onCheckedChange={() => handleMultiToggle(group.id, opt)} />
                  <span className="text-sm">{opt.name}</span>
                </div>
                {opt.extra_price > 0 && <span className="text-sm text-muted-foreground">+${opt.extra_price.toFixed(2)}</span>}
              </label>
            );
          })}
        </div>
      );
    }

    return (
      <RadioGroup
        value={(selections[group.id] || [])[0]?.name || ''}
        onValueChange={(val) => {
          const opt = (group.options || []).find(o => o.name === val);
          if (opt) handleSingleSelect(group.id, opt);
        }}
      >
        {(group.options || []).map(opt => (
          <label key={opt.name} className="flex items-center justify-between gap-3 p-2 rounded-lg border cursor-pointer hover:bg-accent">
            <div className="flex items-center gap-3">
              <RadioGroupItem value={opt.name} id={`${group.id}-${opt.name}`} />
              <span className="text-sm">{opt.name}</span>
            </div>
            {opt.extra_price > 0 && <span className="text-sm text-muted-foreground">+${opt.extra_price.toFixed(2)}</span>}
          </label>
        ))}
      </RadioGroup>
    );
  };

  const minDateTime = () => {
    const d = new Date(Date.now() + 10 * 60 * 1000);
    d.setSeconds(0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Customize {item.name}</span>
            <Badge variant="secondary">${totalPrice.toFixed(2)}</Badge>
          </DialogTitle>
        </DialogHeader>
        {item.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
        )}
        <div className="space-y-5">
          {optionGroups.map(group => (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-sm">{group.name}</Label>
                {group.required && <Badge variant="default" className="text-xs">Required</Badge>}
                {group.input_type === 'options' && group.allow_multiple && <Badge variant="outline" className="text-xs">Choose multiple</Badge>}
              </div>
              {renderGroup(group)}
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="cust-notes">Special Instructions</Label>
            <textarea
              id="cust-notes"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="No sugar, extra hot, etc."
              rows={2}
            />
          </div>
        </div>
        {preOrderMode && (
          <div className="space-y-2">
            <Label htmlFor="cust-arrival">Arrival Time</Label>
            <Input
              id="cust-arrival"
              type="datetime-local"
              value={arrivalTime}
              min={minDateTime()}
              onChange={(e) => setArrivalTime(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The front desk will be alerted 10 minutes before your arrival.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant={preOrderMode ? "outline" : "secondary"}
            onClick={() => setPreOrderMode(!preOrderMode)}
          >
            <Clock className="w-4 h-4 mr-1" /> {preOrderMode ? 'Standard Order' : 'Pre-Arrival'}
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || (preOrderMode && !arrivalTime)}>
            {preOrderMode
              ? `Confirm Pre-Arrival · $${totalPrice.toFixed(2)}`
              : canConfirm ? `Add · $${totalPrice.toFixed(2)}` : 'Select required'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}