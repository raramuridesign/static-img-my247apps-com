import { CFP_COOKIE_MAX_AGE, CFP_COOKIE_KEY } from './constants';
import { getSessionValue } from './utils';
import users from './data/users.json';

export async function onRequestPost(context: {
  request: Request;
  env: { AUTH_SECRET?: string };
}): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const logout = url.searchParams.get('logout');

  // Handle Logout
  if (logout === '1') {
    return new Response('', {
      status: 302,
      headers: {
        'Set-Cookie': `${CFP_COOKIE_KEY}=; Path=/; Max-Age=0; HttpOnly; Secure`,
        'Cache-Control': 'no-cache',
        Location: '/'
      }
    });
  }

  const body = await request.formData();
  const surnameInput = body.get('surname')?.toString().trim() || '';
  const idInput = body.get('id_number')?.toString().trim() || '';
  const redirectPath = body.get('redirect')?.toString() || '/';

  if (!surnameInput || !idInput) {
    return new Response('', {
      status: 302,
      headers: {
        'Cache-Control': 'no-cache',
        Location: `${redirectPath}?error=empty`
      }
    });
  }

  // Find user (case-insensitive surname, exact ID match)
  const user = users.find(u =>
    u.id === idInput &&
    u.surname.toLowerCase() === surnameInput.toLowerCase() &&
    u.active === 1
  );

  if (user) {
    // Valid user. Set signed session cookie.
    const secret = env.AUTH_SECRET || 'fallback-secret-change-me';
    const sessionValue = await getSessionValue(user.id, user.surname, secret);

    return new Response('', {
      status: 302,
      headers: {
        'Set-Cookie': `${CFP_COOKIE_KEY}=${sessionValue}; Max-Age=${CFP_COOKIE_MAX_AGE}; Path=/; HttpOnly; Secure`,
        'Cache-Control': 'no-cache',
        Location: redirectPath
      }
    });
  } else {
    // Invalid credentials. Redirect with error.
    return new Response('', {
      status: 302,
      headers: {
        'Cache-Control': 'no-cache',
        Location: `${redirectPath}?error=1`
      }
    });
  }
}