import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { Image as UIImage } from '@/components/ui/image';
import { Save, User, Armchair, Trash2, AlertTriangle, Camera, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function StylistProfile({ onSaved }) {
  const { user, checkUserAuth, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [chairNumber, setChairNumber] = useState(user?.chair_number || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(user?.profile_picture_url || '');
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    setPhotoUrl(user?.profile_picture_url || '');
  }, [user?.profile_picture_url]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please choose an image under 5MB.', variant: 'destructive' });
      return;
    }
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ profile_picture_url: file_url });
      setPhotoUrl(file_url);
      await checkUserAuth();
      toast({ title: 'Photo updated!', description: 'Your profile picture has been updated.' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const newName = displayName.trim();
      const oldName = user?.display_name || user?.full_name || '';
      await base44.auth.updateMe({
        display_name: newName,
        username: username.trim(),
        chair_number: chairNumber.trim(),
        profile_picture_url: photoUrl,
      });

      // Update all messages so chat names stay in sync
      if (newName && newName !== oldName) {
        try {
          await base44.entities.Message.updateMany(
            { sender_id: user.id },
            { $set: { sender_name: newName } }
          );
          await base44.entities.Message.updateMany(
            { thread_partner_id: user.id },
            { $set: { thread_partner_name: newName } }
          );
        } catch (err) {
          console.error('Failed to sync message names:', err);
        }
      }

      await checkUserAuth();
      toast({ title: 'Profile updated!', description: 'Your changes have been saved.' });
      onSaved?.();
    } catch (err) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await base44.entities.User.delete(user.id);
      logout();
    } catch (err) {
      toast({ title: 'Failed to delete account', description: err.message, variant: 'destructive' });
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-border">
              {photoUrl ? (
                <UIImage src={photoUrl} alt="Profile" className="w-full h-full object-cover" fittingType="fill" />
              ) : (
                <User className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 disabled:opacity-50"
            >
              {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>
          <p className="text-xs text-muted-foreground">Click the camera icon to upload a profile picture</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="display-name"><User className="w-3.5 h-3.5 inline mr-1" />Display Name</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your name as it appears to others"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="username"><User className="w-3.5 h-3.5 inline mr-1" />Username</Label>
          <Input
            id="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Choose a display username"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="chair-number"><Armchair className="w-3.5 h-3.5 inline mr-1" />Chair Number (optional)</Label>
          <Input
            id="chair-number"
            value={chairNumber}
            onChange={e => setChairNumber(e.target.value)}
            placeholder="e.g. Chair 3"
          />
          <p className="text-xs text-muted-foreground">
            This will appear on your orders when the chair/table option is enabled at the front desk.
          </p>
        </div>
        <Button type="submit" disabled={saving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </form>
      <div className="pt-4 border-t">
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Delete Account?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action is irreversible. Deleting your account will permanently remove all your stylist data, including your profile, services, messages, and orders. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? 'Deleting...' : 'Delete My Account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}