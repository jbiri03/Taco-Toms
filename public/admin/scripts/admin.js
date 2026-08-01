let adminItems = [];

document.addEventListener('DOMContentLoaded', () => {
  loadMenuAdmin();

  const editForm = document.getElementById('editForm');
  const editCancel = document.getElementById('editCancel');

  editForm.addEventListener('submit', onEditSubmit);
  editCancel.addEventListener('click', () => {
    document.getElementById('editModal').classList.add('hidden');
  });
});

async function loadMenuAdmin() {
  try {
    const res = await fetch('http://localhost:4000/menu');
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
      ? `<img src="../${item.photo_url}" alt="${item.name}" class="menu-item-thumb">`
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

    // Wire up events
    container.querySelectorAll('.availability-toggle').forEach(cb => {
      cb.addEventListener('change', onAvailabilityChange);
    });

    container.querySelectorAll('.edit-button').forEach(btn => {
      btn.addEventListener('click', onEditClick);
    });

    container.querySelectorAll('.delete-button').forEach(btn => {
      btn.addEventListener('click', onDeleteClick);
    });
  } catch (err) {
    console.error('Error loading admin menu:', err);
  }
}

async function onAvailabilityChange(e) {
  const checkbox = e.target;
  const id = checkbox.dataset.id;
  const newAvailable = checkbox.checked ? 1 : 0;

  try {
    await fetch(`http://localhost:4000/menu/${id}/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: newAvailable })
    });

  } catch (err) {
    console.error('Error updating availability:', err);
  }
}

function onEditClick(e) {
  const id = Number(e.target.dataset.id);
  const item = adminItems.find(i => i.id === id);
  if (!item) return;

  // Fill modal fields
  document.getElementById('edit-id').value = item.id;
  document.getElementById('edit-name').value = item.name || '';
  document.getElementById('edit-description').value = item.description || '';
  document.getElementById('edit-category').value = item.category || 'main';
  document.getElementById('edit-available').value = item.available ? '1' : '0';

  // Clear file input (can't prefill, and we don't want to keep old file in memory)
  document.getElementById('edit-photo').value = '';

  // Show modal
  document.getElementById('editModal').classList.remove('hidden');
}

async function onEditSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('edit-id').value;
  const name = document.getElementById('edit-name').value;
  const description = document.getElementById('edit-description').value;
  const category = document.getElementById('edit-category').value;
  const available = parseInt(document.getElementById('edit-available').value, 10);
  const photoInput = document.getElementById('edit-photo');

  const formData = new FormData();
  formData.append('name', name);
  formData.append('description', description);
  formData.append('category', category);
  formData.append('available', available);

  if (photoInput.files[0]) {
    formData.append('photo', photoInput.files[0]);
  }

  try {
    const res = await fetch(`http://localhost:4000/menu/${id}`, {
      method: 'PUT',
      body: formData
    });

    if (!res.ok) {
      const data = await res.json();
      showToast('Failed to update item: ' + (data.error || 'Unknown error'));
      return;
    }

    document.getElementById('editModal').classList.add('hidden');
    loadMenuAdmin();
  } catch (err) {
    console.error('Error updating item:', err);
    showToast('Error updating item');
  }
}

async function onDeleteClick(e) {
  const id = e.target.dataset.id;
  if (!confirm('Delete this menu item?')) return;

  try {
    await fetch(`http://localhost:4000/menu/${id}`, {
      method: 'DELETE'
    });
    loadMenuAdmin();
  } catch (err) {
    console.error('Error deleting item:', err);
  }
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

let deleteId = null;

async function onDeleteClick(e) {
  deleteId = e.target.dataset.id;

  const banner = document.getElementById('deleteBanner');
  banner.classList.add('show');
}

document.getElementById('bannerCancel').addEventListener('click', () => {
  deleteId = null;
  document.getElementById('deleteBanner').classList.remove('show');
});

document.getElementById('bannerConfirm').addEventListener('click', async () => {
  if (!deleteId) return;

  try {
    await fetch(`http://localhost:4000/menu/${deleteId}`, {
      method: 'DELETE'
    });

    showToast('Item deleted');
    loadMenuAdmin(); // refresh cards
  } catch (err) {
    console.error('Error deleting item:', err);
    showToast('Error deleting item');
  }

  deleteId = null;
  document.getElementById('deleteBanner').classList.remove('show');
});
