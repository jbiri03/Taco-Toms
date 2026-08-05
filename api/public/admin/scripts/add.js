document.getElementById('addItemForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById('photoInput');
  const hiddenPhotoUrl = document.getElementById('photoUrl');
  const file = fileInput.files[0];

  if (file) {
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await fetch('https://tacotomslonchera.com/upload/photo', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      console.log('Upload response:', data);

      if (!res.ok) {
        showToast('Upload failed: ' + (data.error || 'Unknown error'));
        return;
      }

      hiddenPhotoUrl.value = data.filePath;
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Error uploading photo');
      return;
    }
  } else {
    console.log('No photo selected, continuing without upload');
  }

  const form = new FormData(e.target);
  const body = Object.fromEntries(form.entries());

  body.available = parseInt(body.available, 10);
  delete body.price;

  console.log('Sending menu item:', body);

  try {
    const res = await fetch('https://tacotomslonchera.com/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    console.log('Server response:', data);

    if (!res.ok) {
      showToast('Failed to add item: ' + (data.error || 'Unknown error'));
      return;
    }

    showToast('Item added!');
    loadMenuAdmin();
    e.target.reset();
    hiddenPhotoUrl.value = '';
  } catch (err) {
    console.error('Submit error:', err);
    showToast('Error submitting form');
  }
});

function toCents(value) {
  const valueStr = value.toString().trim();
  const numericValue = parseFloat(valueStr.replace(',', '.'));
  return Math.round(numericValue * 100);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 2000);
}

async function loadMenuAdmin() {
  try {
    const res = await fetch('https://tacotomslonchera.com/menu');
    adminItems = await res.json();

    const container = document.getElementById('menu-items-container');
    container.innerHTML = '';

    adminItems.forEach(item => {
      const row = document.createElement('div');
      row.className = 'menu-item-row';

      const availableChecked = item.available ? 'checked' : '';
      const categoryLabel =
        item.category.charAt(0).toUpperCase() + item.category.slice(1);

      row.innerHTML = `
        ${item.photo_url
          ? `<img src="${item.photo_url}" alt="${item.name}" class="menu-item-thumb">`
          : `<div class="menu-item-no-image">No Image</div>`
        }
        <div class="menu-item-main">
          <div class="menu-item-name">${item.name}</div>
          <div class="menu-item-description">${item.description || ''}</div>
          <div class="menu-item-category">Category: ${categoryLabel}</div>
        </div>
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <label class="menu-item-available">
            <input type="checkbox"
                   class="availability-toggle"
                   data-id="${item.id}"
                   ${availableChecked}>
            <span class="menu-item-available-text">Available</span>
          </label>
          <div class="menu-item-actions">
            <button class="edit-button" data-id="${item.id}">Edit</button>
            <button class="delete-button" data-id="${item.id}">Delete</button>
          </div>
        </div>
      `;

      container.appendChild(row);
    });
  } catch (err) {
    console.error('Error loading menu admin:', err);
  }
}