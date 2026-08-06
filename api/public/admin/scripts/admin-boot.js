(async function () {
  const res = await fetch('/auth-check', {
    credentials: 'include',
    cache: 'no-store'
  });

  const body = document.body;
  body.classList.remove('auth-checking', 'authenticated');

  if (!res.ok) {
    window.location.replace('/admin/admin-login.html');
    return;
  }

  body.classList.add('authenticated');

  const app = document.getElementById('adminApp');
  if (app) app.style.display = 'flex';
})();