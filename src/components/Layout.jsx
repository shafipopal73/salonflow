import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scissors, ClipboardList } from 'lucide-react';
import NotificationsDropdown from '@/components/NotificationsDropdown';
import AdminProfileDialog from '@/components/AdminProfileDialog';
import CustomizationDialog from '@/components/CustomizationDialog';
import AdminMenu from '@/components/AdminMenu';
import StylistMenu from '@/components/StylistMenu';
import { SalonCustomizationProvider, useSalonCustomization } from '@/lib/salonCustomizationContext';
import { Image as UIImage } from '@/components/ui/image';
import { useUrlModal } from '@/hooks/useUrlModal';

function LayoutContent() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { adminSettings: settings } = useSalonCustomization();
  const [profileOpen, setProfileOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useUrlModal('customize');

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden safe-area-top safe-area-left safe-area-right">
      <header className="glass-header z-20 mx-3 mt-3 rounded-2xl shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            {settings?.salon_logo_url ? (
              <UIImage src={settings.salon_logo_url} alt="logo" style={{ height: `${settings.logo_size || 32}px`, width: 'auto' }} fittingType="fit" />
            ) : (
              <Scissors className="w-5 h-5 text-primary" />
            )}
            <span className="font-heading font-semibold text-lg">{settings?.salon_display_name || 'Salonflow'}</span>
            {user?.role === 'admin' && (
              <Link to="/front-desk" className="ml-2">
                <Button variant={location.pathname === '/front-desk' ? 'default' : 'ghost'} size="sm">
                  <ClipboardList className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Front Desk</span>
                </Button>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{user?.display_name || user?.full_name || user?.email}</div>
              <Badge variant="secondary" className="capitalize text-xs">{user?.role}</Badge>
            </div>
            <NotificationsDropdown />
            {user?.role === 'admin' ? (
              <AdminMenu
                user={user}
                onProfile={() => setProfileOpen(true)}
                onCustomize={() => setCustomizeOpen(true)}
                onLogout={() => logout()}
              />
            ) : (
              <StylistMenu user={user} onLogout={() => logout()} />
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0 flex flex-col px-3 pt-3 pb-3">
        <Outlet />
      </main>
      <AdminProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <CustomizationDialog open={customizeOpen} onOpenChange={setCustomizeOpen} />
    </div>
  );
}

export default function Layout() {
  return (
    <SalonCustomizationProvider>
      <LayoutContent />
    </SalonCustomizationProvider>
  );
}