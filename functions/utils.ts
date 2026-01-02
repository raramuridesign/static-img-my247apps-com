import { CFP_COOKIE_KEY } from './constants';

export async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.prototype.map
    .call(new Uint8Array(buf), (x) => ('00' + x.toString(16)).slice(-2))
    .join('');
}

export async function getSessionValue(id: string, surname: string, secret: string): Promise<string> {
  const payload = btoa(`${id}|${surname}`);
  const signature = await sha256(`${payload}|${secret}`);
  return `${payload}.${signature}`;
}

export async function verifySession(sessionValue: string, secret: string): Promise<{ id: string, surname: string } | null> {
  const [payload, signature] = sessionValue.split('.');
  if (!payload || !signature) return null;

  const expectedSignature = await sha256(`${payload}|${secret}`);
  if (signature !== expectedSignature) return null;

  try {
    const decoded = atob(payload);
    const [id, surname] = decoded.split('|');
    return { id, surname };
  } catch (e) {
    return null;
  }
}

// Removed getCookieKeyValue as it is no longer used in the new authentication system.