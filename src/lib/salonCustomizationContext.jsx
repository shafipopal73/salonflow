import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { applyCustomization, DEFAULTS } from '@/lib/salonTheme';

const SalonCustomizationContext = createContext(null);

export function SalonCustomizationProvider({ children }) {
  const { user } = useAuth();
  const [adminSettings, setAdminSettings] = useState(null);
  const [guestSettings, setGuestSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    if (!user?.salon_id) {
      setLoading(false);
      return;
    }
    try {
      const all = await base44.entities.SalonCustomization.filter({ salon_id: user.salon_id });
      const admin = all.find(s => s.scope === 'admin') || all.find(s => !s.scope) || null;
      const guest = all.find(s => s.scope === 'guest') || null;
      setAdminSettings(admin);
      setGuestSettings(guest);
    } catch (err) {
      console.error('Failed to load salon customization:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.salon_id]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!user?.salon_id) return;
    const unsubscribe = base44.entities.SalonCustomization.subscribe((event) => {
      if (event.data?.salon_id !== user.salon_id) return;
      if (event.type !== 'create' && event.type !== 'update') return;
      if (event.data.scope === 'guest') {
        setGuestSettings(event.data);
      } else {
        // 'admin' or legacy unscoped → treat as admin
        setAdminSettings(event.data);
      }
    });
    return unsubscribe;
  }, [user?.salon_id]);

  // Apply admin settings to :root (this provider wraps admin/stylist pages only)
  useEffect(() => {
    applyCustomization(adminSettings || DEFAULTS);
  }, [adminSettings]);

  // Re-apply customization when the theme (light/dark) toggles so that
  // dark mode uses the standardized navy theme and light mode restores branding.
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      applyCustomization(adminSettings || DEFAULTS);
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [adminSettings]);

  const updateSettings = useCallback(async (scope, updates) => {
    if (!user?.salon_id) return;
    const current = scope === 'admin' ? adminSettings : guestSettings;
    if (current) {
      const updated = await base44.entities.SalonCustomization.update(current.id, updates);
      if (scope === 'admin') setAdminSettings(updated);
      else setGuestSettings(updated);
      return updated;
    }
    const created = await base44.entities.SalonCustomization.create({
      ...updates,
      salon_id: user.salon_id,
      scope,
    });
    if (scope === 'admin') setAdminSettings(created);
    else setGuestSettings(created);
    return created;
  }, [user?.salon_id, adminSettings, guestSettings]);

  return (
    <SalonCustomizationContext.Provider
      value={{
        adminSettings: adminSettings || DEFAULTS,
        guestSettings: guestSettings || DEFAULTS,
        loading,
        updateSettings,
        reload: loadSettings,
      }}
    >
      {children}
    </SalonCustomizationContext.Provider>
  );
}

export function useSalonCustomization() {
  const ctx = useContext(SalonCustomizationContext);
  if (!ctx) throw new Error('useSalonCustomization must be used within SalonCustomizationProvider');
  return ctx;
}