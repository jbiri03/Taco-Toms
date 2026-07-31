async function loadMenu() {
  const res = await fetch('http://localhost:4000/menu');
  const items = await res.json();

  const menuDiv = document.getElementById('menu');
  menuDiv.innerHTML = '';

  //UI Display
  items.forEach(item => {
    const card = document.createElement('div');
    card.innerHTML = `
      <img src="${item.photo_url}" alt="${item.name}">
      <h3>${item.name}</h3>
      <p>${item.description}</p>
      <p>$${item.price}</p>
    `;
    menuDiv.appendChild(card);
  });
}

loadMenu();
