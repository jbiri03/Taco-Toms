let adminItems = [];

document.addEventListener('DOMContentLoaded', () => {
  loadMenuAdmin();

  const editForm = document.getElementById('editForm');
  const editCancel = document.getElementById('editCancel');
  const logoutBtn = document.getElementById('logoutBtn');

  editForm.addEventListener('submit', onEditSubmit);
  editCancel.addEventListener('click', () => {
    document.getElementById('editModal').classList.add('hidden');
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
});

async function loadMenuAdmin() {
  try {
    const res = await fetch('/menu', { credentials: 'include' });
    if (!res.ok) {
      if (res.status === 401) {
        // Not logged in → redirect to login
        window.location.replace('/admin/admin-login.html');
        return;
      }
      throw new Error('Failed to load menu');
    }

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
    showToast('Error loading menu items');
  }
}

async function onAvailabilityChange(e) {
  const checkbox = e.target;
  const id = checkbox.dataset.id;
  const newAvailable = checkbox.checked ? 1 : 0;

  try {
    const res = await fetch(`/menu/${id}/availability`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: newAvailable })
    });

    if (!res.ok) {
      const data = await res.json();
      console.error('Failed to update availability', data);
      showToast('Failed to update availability');
    }
  } catch (err) {
    console.error('Error updating availability:', err);
    showToast('Error updating availability');
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

  // Clear file input
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
    const res = await fetch(`/menu/${id}`, {
      method: 'PUT',
      credentials: 'include',
      body: formData
    });

    if (!res.ok) {
      const data = await res.json();
      showToast('Failed to update item: ' + (data.error || 'Unknown error'));
      return;
    }

    document.getElementById('editModal').classList.add('hidden');
    loadMenuAdmin();
    showToast('Item updated');
  } catch (err) {
    console.error('Error updating item:', err);
    showToast('Error updating item');
  }
}

let deleteId = null;

function onDeleteClick(e) {
  deleteId = e.target.dataset.id;

  const banner = document.getElementById('deleteBanner');
  if (banner) {
    banner.classList.add('show');
  } else {
    // Fallback if no banner: simple confirm
    if (!confirm('Delete this menu item?')) {
      deleteId = null;
      return;
    }
    performDelete(deleteId);
  }
}

document.getElementById('bannerCancel')?.addEventListener('click', () => {
  deleteId = null;
  document.getElementById('deleteBanner').classList.remove('show');
});

document.getElementById('bannerConfirm')?.addEventListener('click', async () => {
  if (!deleteId) return;
  await performDelete(deleteId);
  deleteId = null;
  document.getElementById('deleteBanner').classList.remove('show');
});

async function performDelete(id) {
  try {
    const res = await fetch(`/menu/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!res.ok) {
      const data = await res.json();
      showToast('Failed to delete item: ' + (data.error || 'Unknown error'));
      return;
    }

    showToast('Item deleted');
    loadMenuAdmin();
  } catch (err) {
    console.error('Error deleting item:', err);
    showToast('Error deleting item');
  }
}

async function handleLogout() {
  try {
    const res = await fetch('/logout', {
      method: 'POST',
      credentials: 'include'
    });

    if (!res.ok) {
      console.error('Logout failed');
      showToast('Logout failed');
      return;
    }

    // Redirect to login page after logout
    window.location.replace('/admin/admin-login.html');
  } catch (err) {
    console.error('Logout error:', err);
    showToast('Logout failed');
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 2000);
}