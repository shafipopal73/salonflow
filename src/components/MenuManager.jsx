import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MobileSelect } from '@/components/ui/mobile-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Coffee, FolderPlus, Gift, Upload, X, SlidersHorizontal } from 'lucide-react';
import { Reorder } from 'framer-motion';
import DraggableCategory from '@/components/DraggableCategory';
import DraggableItemCard from '@/components/DraggableItemCard';
import { useToast } from '@/components/ui/use-toast';
import { Image as UIImage } from '@/components/ui/image';
import { useAuth } from '@/lib/AuthContext';
import OptionGroupManager from '@/components/OptionGroupManager';

export default function MenuManager() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', id: null });
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', category: '', price: '', description: '', image_url: '', available: true, complimentary: false });
  const [uploading, setUploading] = useState(false);
  const reorderingRef = useRef(false);
  const reorderTimerRef = useRef(null);
  const pendingCatReorderRef = useRef(null);
  const pendingItemReorderRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, image_url: file_url }));
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const salonId = user?.salon_id;

  useEffect(() => {
    if (!salonId) return;
    const load = async () => {
      const [itemData, catData] = await Promise.all([
        base44.entities.MenuItem.filter({ salon_id: salonId }, 'display_order'),
        base44.entities.MenuCategory.filter({ salon_id: salonId }, 'display_order')
      ]);
      setItems(itemData);
      setCategories(catData);
      setLoading(false);
    };
    load();

    const unsubItems = base44.entities.MenuItem.subscribe((event) => {
      if (reorderingRef.current) return;
      if (event.data?.salon_id && event.data.salon_id !== salonId) return;
      if (event.type === 'create') setItems(prev => [...prev, event.data]);
      else if (event.type === 'update') setItems(prev => prev.map(i => i.id === event.data.id ? event.data : i));
      else if (event.type === 'delete') setItems(prev => prev.filter(i => i.id !== event.id));
    });

    const unsubCats = base44.entities.MenuCategory.subscribe((event) => {
      if (reorderingRef.current) return;
      if (event.data?.salon_id && event.data.salon_id !== salonId) return;
      if (event.type === 'create') {
        setCategories(prev => [...prev, event.data]);
      }
      else if (event.type === 'update') setCategories(prev => prev.map(c => c.id === event.data.id ? event.data : c).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      else if (event.type === 'delete') setCategories(prev => prev.filter(c => c.id !== event.id));
    });

    return () => { unsubItems(); unsubCats(); };
  }, [salonId]);

  const existingCategoryNames = categories.map(c => c.name);
  const complimentarySet = new Set(categories.filter(c => c.complimentary).map(c => c.name));

  // Item dialog handlers
  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', category: existingCategoryNames[0] || '', price: '', description: '', image_url: '', available: true, complimentary: false });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      price: item.price?.toString() || '',
      description: item.description || '',
      image_url: item.image_url || '',
      available: item.available,
      complimentary: item.complimentary || false,
    });
    setDialogOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      category: form.category,
      price: form.price ? parseFloat(form.price) : null,
      description: form.description,
      image_url: form.image_url || null,
      available: form.available,
      complimentary: form.complimentary,
      salon_id: user?.salon_id,
    };
    try {
      if (editing) {
        await base44.entities.MenuItem.update(editing.id, payload);
        toast({ title: 'Item updated' });
      } else {
        await base44.entities.MenuItem.create(payload);
        toast({ title: 'Item added' });
      }
      setDialogOpen(false);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await base44.entities.MenuItem.delete(item.id);
      toast({ title: 'Item deleted' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const toggleItemComplimentary = async (item) => {
    try {
      await base44.entities.MenuItem.update(item.id, { complimentary: !item.complimentary });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Category handlers
  const openAddCategory = () => {
    setCatForm({ name: '', id: null });
    setCatDialogOpen(true);
  };

  const openEditCategory = (cat) => {
    setCatForm({ name: cat.name, id: cat.id });
    setCatDialogOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (catForm.id) {
        const oldCat = categories.find(c => c.id === catForm.id);
        const oldName = oldCat.name;
        await base44.entities.MenuCategory.update(catForm.id, { name: catForm.name });
        // Update all items with the old category name
        const itemsToUpdate = items.filter(i => i.category === oldName);
        if (itemsToUpdate.length > 0) {
          await base44.entities.MenuItem.bulkUpdate(itemsToUpdate.map(i => ({ id: i.id, category: catForm.name })));
        }
        toast({ title: 'Category renamed' });
      } else {
        await base44.entities.MenuCategory.create({ name: catForm.name, complimentary: false, display_order: categories.length, salon_id: user?.salon_id });
        toast({ title: 'Category created' });
      }
      setCatDialogOpen(false);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const toggleComplimentary = async (cat) => {
    try {
      await base44.entities.MenuCategory.update(cat.id, { complimentary: !cat.complimentary });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (!confirm(`Delete category "${cat.name}"? Items will remain but lose their category grouping.`)) return;
    try {
      await base44.entities.MenuCategory.delete(cat.id);
      toast({ title: 'Category deleted' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Group items by category, sorted by display_order within each
  const grouped = {};
  items.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });
  Object.keys(grouped).forEach(cat => {
    grouped[cat].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  });
  // Render categories in their display_order, not insertion order
  const sortedCategoryNames = categories.map(c => c.name).filter(name => grouped[name]);

  const flushReorder = () => {
    if (pendingCatReorderRef.current) {
      const payload = pendingCatReorderRef.current;
      pendingCatReorderRef.current = null;
      base44.entities.MenuCategory.bulkUpdate(payload)
        .catch(err => toast({ title: 'Reorder failed', description: err.message, variant: 'destructive' }))
        .finally(() => {
          if (!pendingCatReorderRef.current && !pendingItemReorderRef.current) reorderingRef.current = false;
        });
    }
    if (pendingItemReorderRef.current) {
      const payload = pendingItemReorderRef.current;
      pendingItemReorderRef.current = null;
      base44.entities.MenuItem.bulkUpdate(payload)
        .catch(err => toast({ title: 'Reorder failed', description: err.message, variant: 'destructive' }))
        .finally(() => {
          if (!pendingCatReorderRef.current && !pendingItemReorderRef.current) reorderingRef.current = false;
        });
    }
  };

  const scheduleReorderFlush = () => {
    if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
    reorderTimerRef.current = setTimeout(() => {
      reorderTimerRef.current = null;
      flushReorder();
    }, 600);
  };

  const handleCategoryReorder = (reorderedIds) => {
    const reordered = reorderedIds.map(id => categories.find(c => c.id === id)).filter(Boolean);
    setCategories(reordered);
    reorderingRef.current = true;
    pendingCatReorderRef.current = reordered.map((cat, index) => ({ id: cat.id, display_order: index }));
    scheduleReorderFlush();
  };

  const handleItemReorder = (categoryName, reorderedIds) => {
    const reorderedItems = reorderedIds.map(id => items.find(i => i.id === id)).filter(Boolean);
    const firstIndex = items.findIndex(i => i.category === categoryName);
    if (firstIndex === -1) return;
    const before = items.slice(0, firstIndex);
    const after = items.slice(firstIndex).filter(i => i.category !== categoryName);
    const reorderedWithOrder = reorderedItems.map((item, index) => ({ ...item, display_order: index }));
    setItems([...before, ...reorderedWithOrder, ...after]);
    reorderingRef.current = true;
    pendingItemReorderRef.current = reorderedItems.map((item, index) => ({ id: item.id, display_order: index }));
    scheduleReorderFlush();
  };

  return (
    <div className="space-y-6">
      {/* Category Management */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-lg font-semibold">Categories</h3>
          <Button variant="outline" size="sm" onClick={openAddCategory}><FolderPlus className="w-4 h-4 mr-2" />New Category</Button>
        </div>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories yet. Create one to get started.</p>
        ) : (
          <Reorder.Group axis="y" values={categories.map(c => c.id)} onReorder={handleCategoryReorder} className="flex flex-col gap-2 touch-pan-y">
            {categories.map(cat => (
              <DraggableCategory key={cat.id} value={cat.id} cat={cat} onEdit={openEditCategory} onToggle={toggleComplimentary} onDelete={handleDeleteCategory} />
            ))}
          </Reorder.Group>
        )}
      </div>

      <div className="border-t" />

      {/* Item Management */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">Menu items</p>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Item</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Coffee className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No menu items yet. Add your first item!</p>
        </div>
      ) : (
        <>
        {sortedCategoryNames.map(category => {
          const categoryItems = grouped[category];
          return (
          <div key={category} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-heading text-lg font-semibold">{category}</h3>
              {complimentarySet.has(category) && <Badge variant="default"><Gift className="w-3 h-3 mr-1" />Complimentary</Badge>}
            </div>
            <Reorder.Group axis="y" values={categoryItems.map(i => i.id)} onReorder={(ids) => handleItemReorder(category, ids)} className="flex flex-col gap-3 touch-pan-y">
              {categoryItems.map(item => (
                <DraggableItemCard key={item.id} value={item.id} item={item} isCategoryComplimentary={complimentarySet.has(category)} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleItemComplimentary} />
              ))}
            </Reorder.Group>
          </div>
          );
        })}
        </>
      )}

      {/* Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Item' : 'Add Menu Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Cappuccino" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <MobileSelect
                value={form.category}
                onValueChange={v => setForm({ ...form, category: v })}
                placeholder="Select a category"
                options={existingCategoryNames.map(c => ({ value: c, label: c }))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input id="price" type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="3.50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Rich espresso with steamed milk" />
            </div>
            <div className="space-y-2">
              <Label>Item Picture</Label>
              {form.image_url ? (
                <div className="relative">
                  <UIImage src={form.image_url} alt="Item preview" className="w-full h-40 rounded-lg" fittingType="fill" />
                  <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={() => setForm({ ...form, image_url: '' })}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                  {uploading && <span className="text-sm text-muted-foreground shrink-0">Uploading...</span>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch id="available" checked={form.available} onCheckedChange={v => setForm({ ...form, available: v })} />
              <Label htmlFor="available">Available on menu</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="complimentary" checked={form.complimentary} onCheckedChange={v => setForm({ ...form, complimentary: v })} />
              <Label htmlFor="complimentary">Complimentary (free)</Label>
            </div>
            {editing && (
              <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  <Label className="font-semibold">Customization Options</Label>
                </div>
                <p className="text-xs text-muted-foreground">Let guests pick modifiers like milk type, sugar level, or decaf.</p>
                <OptionGroupManager menuItemId={editing.id} salonId={user?.salon_id} />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? 'Save' : 'Add'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{catForm.id ? 'Rename Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Category Name</Label>
              <Input id="cat-name" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="Coffee" required autoFocus />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setCatDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{catForm.id ? 'Save' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}