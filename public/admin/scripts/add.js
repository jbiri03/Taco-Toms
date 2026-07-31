document.getElementById('addItemForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById('photoInput');
  const hiddenPhotoUrl = document.getElementById('photoUrl');
  const file = fileInput.files[0];

  //Upload photo first, if a file is selected
  if (file) {
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await fetch('http://localhost:4000/upload/photo', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      console.log('Upload response:', data);

      if (!res.ok) {
        alert('Upload failed: ' + (data.error || 'Unknown error'));
        return; // stop if upload fails
      }

      // Save file path into hidden field so it’s included in the form data
      hiddenPhotoUrl.value = data.filePath;
    } catch (err) {
      console.error('Upload error:', err);
      alert('Error uploading photo');
      return; // stop if upload fails
    }
  } else {
    // No file selected
    console.log('No photo selected, continuing without upload');
  }

  //Collect form data 
  const form = new FormData(e.target);
  const body = Object.fromEntries(form.entries());

  // No price handling
    body.available = parseInt(body.available, 10);

    delete body.price;

  console.log('Sending menu item:', body);

  //Send menu item to /menu
  try {
    const res = await fetch('http://localhost:4000/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    console.log('Server response:', data);

    if (!res.ok) {
      alert('Failed to add item: ' + (data.error || 'Unknown error'));
      return;
    }

    alert('Item added!');
    e.target.reset();
    hiddenPhotoUrl.value = ''; // clear hidden field
  } catch (err) {
    console.error('Submit error:', err);
    alert('Error submitting form');
  }
});

function toCents(value) {
  const valueStr = value.toString().trim();
  const numericValue = parseFloat(valueStr.replace(',', '.'));
  return Math.round(numericValue * 100);
}