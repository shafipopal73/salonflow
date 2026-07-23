import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { applyCustomization, DEFAULTS } from '@/lib/salonTheme';

export function useGuestCustomization(salonId) {
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    if (!salonId) return;
    const load = async () => {
      try {
        const response = await base44.functions.invoke('getGuestCustomization', { salon_id: salonId });
        const data = response.data?.customization;
        if (data) {
          setSettings({ ...DEFAULTS, ...data });
        }
      } catch (err) {
        console.error('Failed to load salon customization:', err);
      }
    };
    load();

    // Re-fetch merged customization whenever any SalonCustomization record changes
    // (admin or guest scope) so the guest menu always reflects the latest branding.
    const unsubscribe = base44.entities.SalonCustomization.subscribe((event) => {
      if (event.data?.salon_id !== salonId) return;
      load();
    });
    return unsubscribe;
  }, [salonId]);

  useEffect(() => {
    applyCustomization(settings);
  }, [settings]);

  // Re-apply customization when the theme (light/dark) toggles so that
  // dark mode uses the standardized navy theme and light mode restores branding.
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      applyCustomization(settings);
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [settings]);

  return settings;
}