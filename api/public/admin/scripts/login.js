const form = document.getElementById('loginForm');
const errorEl = document.getElementById('error');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
    const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
        errorEl.textContent = data.error || 'Invalid credentials';
        return;
    }

    window.location.href = '/admin/admin.html';
    } catch (err) {
    console.error(err);
    errorEl.textContent = 'Login failed';
    }
});