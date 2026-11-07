(() => {
  const image = document.querySelector('#background-image');
  const input = document.querySelector('#background-file');
  const upload = document.querySelector('#background-upload');
  const reset = document.querySelector('#background-reset');
  const status = document.querySelector('.background-status');
  const defaultSource = image.getAttribute('src');
  let currentURL = null;
  let revision = 0;
  let statusTimer;

  // Store the image as a Blob rather than a base64 string in localStorage, which
  // has a small quota. Files stay in this browser and are never sent to a server.
  const database = new Promise((resolve, reject) => {
    const request = indexedDB.open('alfar-portfolio', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('preferences');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Background storage is unavailable.'));
  });

  async function savedImage() {
    const db = await database;
    return new Promise((resolve, reject) => {
      const request = db.transaction('preferences').objectStore('preferences').get('background');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function save(file) {
    const db = await database;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('preferences', 'readwrite');
      const store = transaction.objectStore('preferences');
      if (file) store.put(file, 'background');
      else store.delete('background');
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  function announce(message, temporary = false) {
    clearTimeout(statusTimer);
    status.textContent = message;
    if (temporary) statusTimer = setTimeout(() => { status.textContent = ''; }, 4000);
  }

  function setBusy(busy) {
    upload.disabled = busy;
    reset.disabled = busy;
    upload.setAttribute('aria-busy', String(busy));
  }

  async function showFile(file, expectedRevision) {
    const nextURL = URL.createObjectURL(file);
    const candidate = new Image();
    candidate.src = nextURL;
    try {
      await candidate.decode();
    } catch (error) {
      URL.revokeObjectURL(nextURL);
      throw error;
    }
    if (revision !== expectedRevision) {
      URL.revokeObjectURL(nextURL);
      return false;
    }
    const previousURL = currentURL;
    currentURL = nextURL;
    image.src = nextURL;
    reset.hidden = false;
    if (previousURL) URL.revokeObjectURL(previousURL);
    return true;
  }

  upload.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files[0];
    input.value = ''; // Allow choosing the same file again after resetting.
    if (!file) return;
    if (file.type && !file.type.startsWith('image/')) {
      announce('Choose an image file.');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      announce('Choose an image smaller than 30 MB.');
      return;
    }
    const change = ++revision;
    setBusy(true);
    announce('Updating background…');
    try {
      if (!await showFile(file, change)) return;
      try {
        await save(file);
        announce('Background updated.', true);
      } catch {
        announce('Background changed. This browser could not save it for next time.');
      }
    } catch {
      announce('This image could not be opened. Try a JPG, PNG, or WebP.');
    } finally {
      setBusy(false);
    }
  });

  reset.addEventListener('click', async () => {
    ++revision;
    setBusy(true);
    image.src = defaultSource;
    if (currentURL) URL.revokeObjectURL(currentURL);
    currentURL = null;
    reset.hidden = true;
    try {
      await save(null);
      announce('Background reset.', true);
    } catch {
      announce('Background reset for now. This browser could not save the change.');
    } finally {
      setBusy(false);
    }
  });

  const initialRevision = revision;
  savedImage().then(file => {
    if (file instanceof Blob && revision === initialRevision) return showFile(file, initialRevision);
  }).catch(() => { /* Use the default background when storage is unavailable. */ });
})();
