const form = document.getElementById('loginForm');
const errorEl = document.getElementById('error');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function authCheck() {
  const res = await fetch('/auth-check', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store'
  });
  return res.ok;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      errorEl.textContent = data.error || 'Invalid credentials';
      return;
    }

    for (let i = 0; i < 10; i++) {
      if (await authCheck()) {
        window.location.replace('/admin/admin.html');
        return;
      }
      await sleep(250);
    }

    errorEl.textContent = 'Login succeeded, but session was not ready yet.';
  } catch (err) {
    console.error(err);
    errorEl.textContent = 'Login failed';
  }
});