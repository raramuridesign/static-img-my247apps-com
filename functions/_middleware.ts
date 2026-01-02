import { CFP_ALLOWED_PATHS, CFP_COOKIE_KEY } from './constants';
import { verifySession } from './utils';
import { getTemplate, getIdentityBarHtml } from './template';
import users from './data/users.json';
import groupsMapping from './data/groups.json';

export async function onRequest(context: {
  request: Request;
  next: () => Promise<Response>;
  env: { AUTH_SECRET?: string };
}): Promise<Response> {
  const { request, next, env } = context;
  const { pathname, searchParams } = new URL(request.url);
  const { error } = Object.fromEntries(searchParams);
  const cookie = request.headers.get('cookie') || '';
  const secret = env.AUTH_SECRET || 'fallback-secret-change-me';

  // 1. Allow public paths & login endpoint
  if (
    CFP_ALLOWED_PATHS.includes(pathname) ||
    (request.method === "POST" && pathname === '/cfp_login')
  ) {
    return await next();
  }

  // 2. Check for session cookie
  const cookieValue = cookie
    .split(';')
    .find(c => c.trim().startsWith(`${CFP_COOKIE_KEY}=`))
    ?.trim()
    .substring(CFP_COOKIE_KEY.length + 1);

  let user = null;
  if (cookieValue) {
    user = await verifySession(cookieValue, secret);
  }

  // 3. Not logged in -> Show Login Template
  if (!user) {
    return new Response(getTemplate({ redirectPath: pathname, withError: error === '1' }), {
      headers: {
        'content-type': 'text/html',
        'cache-control': 'no-cache'
      }
    });
  }

  // 4. Logged in -> Verify permissions
  const userData = users.find(u => u.id === user.id);
  if (!userData || userData.active !== 1) {
    // Session exists but user is now invalid/inactive
    return new Response(getTemplate({ redirectPath: pathname, withError: true }), {
      headers: {
        'content-type': 'text/html',
        'cache-control': 'no-cache',
        'Set-Cookie': `${CFP_COOKIE_KEY}=; Path=/; Max-Age=0; HttpOnly; Secure`
      }
    });
  }

  const userGroups = userData.groups;
  const restrictedGroups = Object.entries(groupsMapping as Record<string, string[]>)
    .filter(([_, paths]) => paths.some(p => {
      // Flexible prefix matching:
      // - "/folder1/" will match only folder1 and its contents.
      // - "/folderprotected-" will match any folder starting with that prefix.
      return pathname === p || pathname.startsWith(p);
    }))
    .map(([group]) => group);

  const hasAccess = userGroups.includes('All') ||
    restrictedGroups.length === 0 ||
    userGroups.some(g => restrictedGroups.includes(g));

  if (!hasAccess) {
    return new Response(getTemplate({
      redirectPath: pathname,
      withError: false,
      isAccessDenied: true,
      surname: userData.surname
    }), {
      headers: {
        'content-type': 'text/html',
        'cache-control': 'no-cache'
      }
    });
  }

  // 5. Authorized -> Inject Identity Bar and serve content
  const response = await next();
  const contentType = response.headers.get('content-type');

  if (contentType && contentType.includes('text/html')) {
    const identityBarHtml = getIdentityBarHtml(userData.surname);

    const finalResponse = new HTMLRewriter()
      .on('body', {
        element(el: any) {
          el.prepend(identityBarHtml, { html: true });
        },
      })
      .transform(response);

    finalResponse.headers.set('x-auth-user', user.id);
    finalResponse.headers.set('x-auth-status', 'authorized');
    return finalResponse;
  }

  return response;
}