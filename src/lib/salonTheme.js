export const DEFAULTS = {
  salon_display_name: '',
  salon_logo_url: '',
  logo_size: 32,
  menu_background_image: '',
  menu_background_video: '',
  bg_overlay_opacity: 80,
  primary_color: '#1D1D1F',
  secondary_color: '#5B6470',
  accent_color: '#1D1D1F',
  text_color: '#1D1D1F',
  card_background_color: '#FFFFFF',
  card_border_color: '#E2E8F0',
  card_text_color: '#1D1D1F',
  card_radius: 20,
  font_heading: 'Inter',
  font_body: 'Inter',
};

export const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Lora', label: 'Lora' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Raleway', label: 'Raleway' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Work Sans', label: 'Work Sans' },
];

const loadedFonts = {};

export function ensureFontLoaded(fontName) {
  if (!fontName || loadedFonts[fontName]) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
  loadedFonts[fontName] = true;
}

function hexToHslObject(hex) {
  if (!hex) return null;
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) return null;
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hexToHsl(hex) {
  const hsl = hexToHslObject(hex);
  if (!hsl) return null;
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

function foregroundFor(hslStr) {
  if (!hslStr) return null;
  const lightness = parseFloat(hslStr.split(' ')[2]) / 100;
  return lightness < 0.5 ? '0 0% 100%' : '0 0% 9%';
}

/**
 * Converts the admin's primary brand color into an accessible accent for dark mode.
 * Preserves the hue, boosts saturation to at least 55%, and sets lightness to 68%
 * so the color reads clearly on deep navy backgrounds without inverting.
 */
export function generateDarkAccent(hex) {
  const hsl = hexToHslObject(hex);
  if (!hsl) return null;
  // If the brand color is near-grayscale (black, white, grey), fall back to
  // the standard Telegram-inspired blue accent.
  if (hsl.s < 12) {
    return '204 70% 63%';
  }
  const s = Math.max(hsl.s, 55);
  return `${hsl.h} ${s}% 68%`;
}

// CSS variables that admin branding can override in light mode.
// In dark mode these are cleared so the standardized navy theme takes effect.
const BRANDING_VARS = [
  '--primary', '--primary-foreground',
  '--secondary', '--secondary-foreground',
  '--accent', '--accent-foreground',
  '--foreground',
  '--card', '--card-foreground',
  '--border', '--input',
  '--ring',
];

export function applyCustomization(settings) {
  const root = document.documentElement;
  const s = { ...DEFAULTS, ...settings };
  const isDark = root.classList.contains('dark');

  // Fonts and radius are theme-independent
  if (s.card_radius != null) {
    root.style.setProperty('--radius', `${s.card_radius / 16}rem`);
  }
  if (s.font_heading) {
    ensureFontLoaded(s.font_heading);
    root.style.setProperty('--font-heading', `'${s.font_heading}', ui-sans-serif, system-ui, sans-serif`);
  }
  if (s.font_body) {
    ensureFontLoaded(s.font_body);
    root.style.setProperty('--font-body', `'${s.font_body}', ui-sans-serif, system-ui, sans-serif`);
  }

  // Clear all branding overrides from the previous application so that
  // switching themes doesn't leave stale inline values.
  BRANDING_VARS.forEach(v => root.style.removeProperty(v));

  if (isDark) {
    // Dark mode: standardized navy theme across all tenants.
    // Only the accessible accent (derived from the brand primary) is applied;
    // all other colors come from the CSS .dark rules.
    const darkAccent = generateDarkAccent(s.primary_color);
    if (darkAccent) {
      root.style.setProperty('--primary', darkAccent);
      root.style.setProperty('--primary-foreground', '210 30% 14%');
      root.style.setProperty('--ring', darkAccent);
    }
    return;
  }

  // Light mode: apply all admin branding colors
  const primary = hexToHsl(s.primary_color);
  if (primary) {
    root.style.setProperty('--primary', primary);
    const primaryFg = foregroundFor(primary);
    if (primaryFg) root.style.setProperty('--primary-foreground', primaryFg);
  }

  const secondary = hexToHsl(s.secondary_color);
  if (secondary) {
    root.style.setProperty('--secondary', secondary);
    const secondaryFg = foregroundFor(secondary);
    if (secondaryFg) root.style.setProperty('--secondary-foreground', secondaryFg);
  }

  const accent = hexToHsl(s.accent_color);
  if (accent) {
    root.style.setProperty('--accent', accent);
    const accentFg = foregroundFor(accent);
    if (accentFg) root.style.setProperty('--accent-foreground', accentFg);
  }

  const textColor = hexToHsl(s.text_color);
  if (textColor) root.style.setProperty('--foreground', textColor);

  const cardBg = hexToHsl(s.card_background_color);
  if (cardBg) root.style.setProperty('--card', cardBg);

  const cardText = hexToHsl(s.card_text_color);
  if (cardText) root.style.setProperty('--card-foreground', cardText);

  const cardBorder = hexToHsl(s.card_border_color);
  if (cardBorder) root.style.setProperty('--border', cardBorder);
}