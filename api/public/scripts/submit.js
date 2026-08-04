const form = document.getElementById('contactForm');
const errorEl = document.getElementById('formError');
const successEl = document.getElementById('formSuccess');

form.addEventListener('submit', async (e) => {
  e.preventDefault(); // stop page navigation

  errorEl.style.display = 'none';
  successEl.style.display = 'none';

  const data = {
    name: form.name.value,
    email: form.email.value,
    phone: form.phone.value,
    subject: form.subject.value,
    message: form.message.value,
  };

  try {
    const res = await fetch('/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      errorEl.textContent = json.error || 'Failed to send message';
      errorEl.style.display = 'block';
      return;
    }

    // Success: show message, keep user on same page
    successEl.style.display = 'block';
    form.reset();
  } catch (err) {
    errorEl.textContent = 'Network error. Please try again.';
    errorEl.style.display = 'block';
  }
});