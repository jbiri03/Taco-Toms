async function loadMenu() {
  try {
    const res = await fetch('http://localhost:4000/menu/public');
    const items = await res.json();

    const mains = items.filter(item => item.category === 'main');
    const sides = items.filter(item => item.category === 'sides');
    const drinks = items.filter(item => item.category === 'drinks');

    renderCategory('main-text-items', 'main-image-items', mains);
    renderCategory('sides-text-items', 'sides-image-items', sides);
    renderCategory('drinks-text-items', 'drinks-image-items', drinks);

    initScrollSpy();
  } catch (err) {
    console.error('Error loading menu:', err);
  }
}

function renderCategory(textContainerId, imageContainerId, items) {
  const textContainer = document.getElementById(textContainerId);
  const imageContainer = document.getElementById(imageContainerId);

  textContainer.innerHTML = '';
  imageContainer.innerHTML = '';

  items.forEach(item => {
    if (item.photo_url) {
      // Image items: 3-column card grid
      const card = document.createElement('article');
      card.className = 'menu-card';

      card.innerHTML = `
        <img src="${item.photo_url}" alt="${item.name}">
        <div class="menu-card-body">
          <h3>${item.name}</h3>
          ${item.description ? `<p>${item.description}</p>` : ''}
        </div>
      `;

      imageContainer.appendChild(card);
    } else {
      // Text-only items: 2-column list
      const block = document.createElement('article');
      block.className = 'menu-text-item';

      block.innerHTML = `
        <h3>${item.name}</h3>
        ${item.description ? `<p>${item.description}</p>` : ''}
      `;

      textContainer.appendChild(block);
    }
  });
}

// Scroll to section when sidebar button clicked
document.addEventListener('click', event => {
  const btn = event.target;
  if (btn.classList.contains('category-btn') && btn.dataset.target) {
    const targetId = btn.dataset.target;
    const section = document.getElementById(targetId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
});

// Scroll spy: highlight sidebar button based on visible section
function initScrollSpy() {
  const sections = document.querySelectorAll('.menu-category-section');
  const buttons = document.querySelectorAll('.category-btn');

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const category = entry.target.dataset.category;

          buttons.forEach(btn => {
            const target = btn.dataset.target;
            const targetSection = document.getElementById(target);
            const isActive =
              targetSection && targetSection.dataset.category === category;
            btn.classList.toggle('active', isActive);
          });
        }
      });
    },
    {
      root: null,
      threshold: 0.4
    }
  );

  sections.forEach(section => observer.observe(section));
}

document.addEventListener('DOMContentLoaded', loadMenu);