(async function () {
  const res = await fetch('/auth-check', {
    credentials: 'include',
    cache: 'no-store'
  });

  if (!res.ok) {
    window.location.replace('/admin/admin-login.html');
    return;
  }

  document.body.classList.remove('auth-checking');
  document.body.classList.add('authenticated');
})();

const app = document.getElementById('adminApp');
app.style.display = 'block';