import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { url } = await req.json();
    if (!url) return Response.json({ error: 'URL is required' }, { status: 400 });

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    // Use LLM with web search to analyze the website — direct fetch() from the
    // server gets blocked (429/403) by most sites (Cloudflare, rate limits, etc.).
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Visit the website at ${targetUrl} and analyze its visual design. Extract the brand's color palette and typography.

Identify:
1. primary_color — the most prominent brand color (used for buttons, headers, logo, or primary branding). Return as a hex code.
2. secondary_color — a secondary brand color used for secondary UI elements. Return as a hex code.
3. accent_color — a color used for highlights, links, or calls-to-action. Return as a hex code.
4. font_heading — the font family name used for headings/titles.
5. font_body — the font family name used for body text.
6. site_name — the business or website name shown on the page.
7. all_colors — up to 8 hex color codes found in the site's design (exclude pure black #000000 and white #ffffff).

Return exact hex codes. If a font is a generic family (sans-serif, serif), return "Inter" instead.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          primary_color: { type: 'string', description: 'Hex color code e.g. #1a2b3c' },
          secondary_color: { type: 'string', description: 'Hex color code' },
          accent_color: { type: 'string', description: 'Hex color code' },
          font_heading: { type: 'string', description: 'Font family name for headings' },
          font_body: { type: 'string', description: 'Font family name for body text' },
          site_name: { type: 'string', description: 'Business or website name' },
          all_colors: { type: 'array', items: { type: 'string' }, description: 'Up to 8 hex color codes' },
        },
        required: ['primary_color', 'secondary_color', 'accent_color', 'font_heading', 'font_body'],
      },
    });

    const data = result || {};

    const fixColor = (c) => {
      if (!c) return '#000000';
      c = String(c).trim();
      if (!c.startsWith('#')) c = '#' + c;
      if (!/^#[0-9a-f]{6}$/i.test(c)) return '#000000';
      return c.toLowerCase();
    };

    const colors = Array.isArray(data.all_colors) ? data.all_colors.map(fixColor).filter((c) => c !== '#000000' && c !== '#ffffff').slice(0, 8) : [];

    return Response.json({
      primary_color: fixColor(data.primary_color),
      secondary_color: fixColor(data.secondary_color),
      accent_color: fixColor(data.accent_color),
      font_heading: data.font_heading || 'Inter',
      font_body: data.font_body || 'Inter',
      card_background_color: '#ffffff',
      card_border_color: '#e5e7eb',
      site_name: data.site_name || null,
      all_colors: colors,
      all_fonts: [data.font_heading, data.font_body].filter(Boolean).slice(0, 5),
    });
  } catch (error) {
    console.error('analyzeWebsite error:', error.message || error);
    return Response.json({ error: error.message || 'Failed to analyze website' }, { status: 500 });
  }
});