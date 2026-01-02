export function getTemplate({
  redirectPath,
  withError,
  isAccessDenied = false,
  surname = ''
}: {
  redirectPath: string;
  withError: boolean;
  isAccessDenied?: boolean;
  surname?: string;
}): string {
  const title = isAccessDenied ? 'Access Denied' : 'Login Required - IMG Resource Database';
  const heading = isAccessDenied ? 'Access Denied' : 'IMG Login';
  const subHeading = isAccessDenied
    ? `Sorry ${surname}, you don't have permission to access this content.`
    : 'Please enter your details to access this site.';

  let errorMessage = 'Your details are not in our database. Please try again.';
  if (withError && surname === 'empty') errorMessage = 'Please fill in all fields.';

  return `
  <!doctype html>
  <html lang="en" data-theme="dark">

    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title}</title>
      <meta name="description" content="${title}">
      <link rel="shortcut icon" href="https://picocss.com/favicon.ico">
      <link rel="stylesheet" href="https://unpkg.com/@picocss/pico@latest/css/pico.min.css">
      <style>
        body > main { display: flex; flex-direction: column; justify-content: center; min-height: calc(100vh - 7rem); padding: 1rem 0; max-width: 600px;margin: 0 auto; }
        .error { background: #ff4136;border-radius: 10px; color: white; padding: 0.5em 1em; margin-bottom: 1rem; }
        h2 { color: var(--color-h2); }
      </style>
      ${getIdentityBarStyles()}
    </head>

    <body>
      <main>
        <article>
          <hgroup>
            <h1>${heading}</h1>
            <h2>${subHeading}</h2>
          </hgroup>
          
          ${withError ? `<p class="error">${errorMessage}</p>` : ''}
          
          ${isAccessDenied ? `
            <div style="display: flex; gap: 1rem; margin-top: 2rem;align-items: flex-start;">
              <button onclick="history.back()" class="secondary">Go Back</button>
              <form method="post" action="/cfp_login?logout=1" style="flex: 1;">
                <button type="submit" class="contrast">Logout / Switch User</button>
              </form>
            </div>
          ` : `
            <form method="post" action="/cfp_login">
              <input type="hidden" name="redirect" value="${redirectPath}" />
              <input type="text" name="surname" placeholder="Surname" aria-label="Surname" required autofocus>
              <input type="text" name="id_number" placeholder="DAV Member Number (11 Numbers)" aria-label="DAV Member Number (11 Numbers)" minlength="11" maxlength="11" pattern="[0-9]{11}" inputmode="numeric" oninput="this.value = this.value.replace(/[^0-9]/g, '');" required>
              <button type="submit" class="contrast">Login</button>
            </form>
          `}
        </article>
      </main>
    </body>

  </html>
  `;
}

function getIdentityBarStyles(): string {
  return `
    <style>
      #identity-bar {
        background: #1a1a1a; color: #eee;
        padding: 0.5rem 1rem; display: flex; justify-content: space-between;
        align-items: center; font-size: 0.85rem; border-bottom: 1px solid #333; position: sticky;
        top: 0; z-index: 1000; font-family: system-ui, -apple-system, sans-serif;
      }
      #identity-bar a.logout-link {color: #ff4136;text-decoration: none;font-weight: bold;}
      #identity-bar a.logout-link:hover {color: #fff;}
      #identity-bar strong { color: #fff; }
    </style>
  `;
}

export function getIdentityBarHtml(surname: string): string {
  return `
    ${getIdentityBarStyles()}
    <div class="id-bar" id="identity-bar">
      <span>Logged in as: <strong>${surname}</strong></span>
      <a href="/cfp_login?logout=1" 
         onclick="const f=document.createElement('form');f.method='POST';f.action=this.href;document.body.appendChild(f);f.submit();return false;"
         class="logout-link">Logout</a>
    </div>
  `;
}