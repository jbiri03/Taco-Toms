async function uploadPhoto() {
  const file = document.getElementById('photoInput').files[0];
  const formData = new FormData();
  formData.append('photo', file);

  const res = await fetch('http://localhost:4000/upload/photo', {
    method: 'POST',
    body: formData
  });

  const data = await res.json();

  // Auto-fills hidden field
  document.getElementById('photoUrl').value = data.filePath;

  alert('Photo uploaded and added to form');
}

document.getElementById('addItemForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = new FormData(e.target);
  const body = Object.fromEntries(form.entries());

  await fetch('http://localhost:4000/menu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  alert('Menu item added');
});

