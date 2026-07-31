async function loadMenu() {
  const res = await fetch('http://localhost:4000/menu');
  const items = await res.json();

  // Filter items by category
  const mains = items.filter(item => item.category === 'main');
  const sides = items.filter(item => item.category === 'sides');
  const drinks = items.filter(item => item.category === 'drinks');

  renderCategory('main-items', mains);
  renderCategory('sides-items', sides);
  renderCategory('drinks-items', drinks);
}

function renderCategory(containerId, items) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'menu-card';

    const parts = [];

    // Image (photo_url is like "uploads/filename.png")
    if (item.photo_url) {
      parts.push(`<img src="admin/${item.photo_url}" alt="${item.name}">`);
    }

    parts.push(`<h3>${item.name}</h3>`);

    if (item.description) {
      parts.push(`<p>${item.description}</p>`);
    }


    card.innerHTML = parts.join('');
    container.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', loadMenu);