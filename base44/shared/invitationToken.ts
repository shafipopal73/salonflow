const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64urlEncode(data: string): string {
  const bytes = encoder.encode(data);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(data: string): string {
  const padded = data.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const b64 = pad ? padded + '='.repeat(4 - pad) : padded;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return decoder.decode(bytes);
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const bytes = new Uint8Array(signature);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function createInvitationToken(
  email: string,
  salonId: string,
  title: string,
  secret: string
): Promise<string> {
  const payload = base64urlEncode(JSON.stringify({
    email,
    salon_id: salonId,
    title,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  }));
  const signature = await hmacSign(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifyInvitationToken(
  token: string,
  secret: string
): Promise<{ email: string; salon_id: string; title: string } | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;

  const expectedSignature = await hmacSign(payload, secret);
  if (expectedSignature !== signature) return null;

  try {
    const decoded = JSON.parse(base64urlDecode(payload));
    if (decoded.exp && Date.now() > decoded.exp) return null;
    if (!decoded.email || !decoded.salon_id || !decoded.title) return null;
    return {
      email: decoded.email,
      salon_id: decoded.salon_id,
      title: decoded.title,
    };
  } catch {
    return null;
  }
}