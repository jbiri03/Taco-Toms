/* menu.js
   - Fetch with timeout + retry/backoff
   - Decode images before inserting <img>
   - Overall short wait on page open, then persistent background retries for images (cache-busted)
   - Placeholders replaced as images finish
*/

const MENU_API = 'https://tacotomslonchera.com/menu/public';
const FETCH_TIMEOUT_MS = 60000;           // fetch timeout for JSON (ms)
const PER_IMAGE_TIMEOUT_MS = 90000;       // per-image load+decode timeout (ms)
const OVERALL_IMAGE_WAIT_MS = 15000;      // how long to wait on page open for images before hiding loader (ms)
const TOTAL_IMAGE_RETRY_TIME_MS = 5 * 60 * 1000; // keep retrying images up to 5 minutes
const MAX_FETCH_RETRIES = 8;              // JSON fetch attempts
const RETRY_BASE_MS = 3000;               // base backoff for fetch
const IMAGE_RETRY_BASE_MS = 2000;         // base backoff for image retries
const CACHE_KEY = 'menu-public-cache-v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;  // 6 hours
const IMAGE_CACHE_BUST = true;

/* ===== Utilities ===== */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
function jitter(ms) { return ms + Math.floor(Math.random() * 800); }
function getFetchRetryDelay(attempt) { return Math.min(RETRY_BASE_MS * Math.pow(2, attempt), 30000) + Math.floor(Math.random() * 1000); }
function getImageRetryDelay(attempt) { return Math.min(IMAGE_RETRY_BASE_MS * Math.pow(2, attempt), 30000) + Math.floor(Math.random() * 800); }
function withCacheBust(url) { const sep = url.includes('?') ? '&' : '?'; return `${url}${sep}_cb=${Date.now()}`; }

/* ===== UI helpers ===== */
function showLoading(show, message = 'Loading menu...') {
  const loader = document.getElementById('menu-loading');
  if (!loader) return;
  loader.classList.toggle('hidden', !show);
  loader.setAttribute('aria-hidden', String(!show));
  const text = loader.querySelector('[data-loading-text]');
  if (text) text.textContent = message;
}
function showError(message) {
  const err = document.getElementById('menu-error');
  if (!err) return;
  err.innerHTML = `
    <div class="menu-error-inner" role="alert">
      <p>${escapeHtml(message)}</p>
      <button id="menu-retry-btn" class="btn">Retry</button>
    </div>
  `;
  err.classList.remove('hidden');
  const btn = document.getElementById('menu-retry-btn');
  btn?.addEventListener('click', () => {
    err.classList.add('hidden');
    loadMenu();
  });
}
function clearError() {
  const err = document.getElementById('menu-error');
  if (!err) return;
  err.innerHTML = '';
  err.classList.add('hidden');
}

/* ===== Cache ===== */
function saveMenuCache(items) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), items })); } catch (_) {}
}
function loadMenuCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.items || !Array.isArray(parsed.items)) return null;
    if (parsed.timestamp && Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed.items;
  } catch (_) { return null; }
}

/* ===== Fetch JSON with timeout + retry ===== */
async function fetchMenuOnce() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(MENU_API, { cache: 'no-store', signal: controller.signal });
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}
async function fetchMenuUntilSuccess() {
  let attempt = 0;
  while (attempt < MAX_FETCH_RETRIES) {
    try {
      if (attempt > 0) {
        showLoading(true, `Still loading menu... retrying (${attempt + 1})`);
        await sleep(getFetchRetryDelay(attempt - 1));
      } else {
        showLoading(true, 'Loading menu...');
      }
      const items = await fetchMenuOnce();
      return items;
    } catch (err) {
      console.error(`Menu fetch attempt ${attempt + 1} failed:`, err);
      attempt += 1;
      if (attempt >= MAX_FETCH_RETRIES) throw err;
    }
  }
  throw new Error('Exceeded maximum retries');
}

/* ===== Image loading helpers ===== */
async function loadImageOnce(url, timeoutMs = PER_IMAGE_TIMEOUT_MS) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { img.src = ''; } catch (_) {}
      resolve({ status: 'timeout' });
    }, timeoutMs);

    function finalize(result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    }

    img.onload = async () => {
      try {
        if (typeof img.decode === 'function') await img.decode();
        if (img.naturalWidth && img.naturalHeight) finalize({ status: 'loaded', img });
        else finalize({ status: 'error' });
      } catch (e) {
        finalize({ status: 'error' });
      }
    };
    img.onerror = () => finalize({ status: 'error' });

    try { img.src = url; } catch (e) { finalize({ status: 'error' }); }
  });
}

/* Preload images but don't block longer than overallTimeoutMs.
   Returns { loadedMap: Map(url => HTMLImageElement), pending: [url] }
*/
async function preloadImagesWithOverallTimeout(items, overallTimeoutMs = OVERALL_IMAGE_WAIT_MS) {
  const urls = [...new Set((items || []).filter(i => i.photo_url).map(i => i.photo_url))];
  const loadedMap = new Map();
  if (urls.length === 0) return { loadedMap, pending: [] };

  const resultMap = new Map(); // url -> result object
  // Start all loads
  urls.forEach(url => {
    loadImageOnce(url, PER_IMAGE_TIMEOUT_MS).then(res => resultMap.set(url, res)).catch(err => resultMap.set(url, { status: 'error' }));
  });

  const start = Date.now();
  // Wait until either all results are present or overall timeout
  while (Date.now() - start < overallTimeoutMs) {
    if (resultMap.size === urls.length) break;
    // small sleep
    // eslint-disable-next-line no-await-in-loop
    await sleep(100);
  }

  // Collect loaded and pending
  const pending = [];
  for (const url of urls) {
    const r = resultMap.get(url);
    if (r && r.status === 'loaded' && r.img instanceof HTMLImageElement) {
      loadedMap.set(url, r.img);
    } else {
      pending.push(url);
    }
  }

  return { loadedMap, pending };
}

/* Replace placeholders for a url with the provided image element (clone).
   Uses dataset.photoUrl on .menu-card-placeholder to match elements.
*/
function replacePlaceholdersWithImage(url, imageElement) {
  if (!url || !imageElement) return;
  const placeholders = Array.from(document.querySelectorAll('.menu-card-placeholder'));
  placeholders.forEach(ph => {
    if (ph.dataset.photoUrl !== url) return;
    const card = ph.closest('.menu-card');
    if (!card) return;
    const imgNode = imageElement.cloneNode(false);
    imgNode.alt = ph.dataset.alt || '';
    card.insertBefore(imgNode, ph);
    ph.remove();
  });
}

/* Persistent background retries: keep retrying each url until success or TOTAL_IMAGE_RETRY_TIME_MS elapsed.
   Uses cache-busting on retry attempts to bypass CDN/edge caches if enabled.
*/
const persistentImageRetryState = new Map(); // url -> { startTs, attempt, running }

async function startPersistentImageRetries(urls) {
  for (const url of urls) {
    if (!url) continue;
    const existing = persistentImageRetryState.get(url);
    if (existing && existing.running) continue;

    const state = existing || { startTs: Date.now(), attempt: 0, running: true };
    state.running = true;
    persistentImageRetryState.set(url, state);

    (async function retryLoop(u) {
      let st = persistentImageRetryState.get(u) || { startTs: Date.now(), attempt: 0, running: true };
      while (true) {
        const elapsed = Date.now() - st.startTs;
        if (elapsed >= TOTAL_IMAGE_RETRY_TIME_MS) {
          persistentImageRetryState.set(u, { ...st, running: false, done: false, timedOut: true });
          break;
        }

        const attemptUrl = (st.attempt === 0 || !IMAGE_CACHE_BUST) ? u : withCacheBust(u);
        try {
          const res = await loadImageOnce(attemptUrl, Math.min(PER_IMAGE_TIMEOUT_MS, 30000));
          if (res.status === 'loaded') {
            // Replace placeholders using the original url key (not cache-busted)
            replacePlaceholdersWithImage(u, res.img);
            persistentImageRetryState.set(u, { ...st, running: false, done: true });
            break;
          }
        } catch (e) {
          // ignore: we'll backoff and retry
        }

        st.attempt += 1;
        persistentImageRetryState.set(u, st);
        const delay = getImageRetryDelay(st.attempt - 1);
        // eslint-disable-next-line no-await-in-loop
        await sleep(delay);
      }
    })(url);
  }
}

/* ===== Rendering =====
   - Text always rendered (accessibility).
   - Visual: if image loaded, append <img> clone; else append placeholder with data-photo-url so retries can replace it.
*/
function renderCategory(textContainerId, imageContainerId, items, loadedImageMap = new Map()) {
  const textContainer = document.getElementById(textContainerId);
  const imageContainer = document.getElementById(imageContainerId);
  if (!textContainer || !imageContainer) return;
  textContainer.innerHTML = '';
  imageContainer.innerHTML = '';

  if (!items || items.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'menu-empty';
    emptyMsg.textContent = 'No items available.';
    textContainer.appendChild(emptyMsg);
    return;
  }

  items.forEach(item => {
    // Text block
    const block = document.createElement('article');
    block.className = 'menu-text-item';
    block.innerHTML = `
      <h3>${escapeHtml(item.name)}</h3>
      ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
    `;
    textContainer.appendChild(block);

    // Image card
    if (item.photo_url) {
      const card = document.createElement('article');
      card.className = 'menu-card';

      const loadedImg = loadedImageMap.get(item.photo_url);
      if (loadedImg instanceof HTMLImageElement) {
        const imgNode = loadedImg.cloneNode(false);
        imgNode.alt = item.name ? item.name : '';
        card.appendChild(imgNode);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'menu-card-placeholder';
        placeholder.setAttribute('aria-hidden', 'true');
        placeholder.dataset.photoUrl = item.photo_url;
        placeholder.dataset.alt = item.name ? item.name : '';
        placeholder.textContent = 'Image loading...';
        card.appendChild(placeholder);
      }

      const body = document.createElement('div');
      body.className = 'menu-card-body';
      body.innerHTML = `
        <h3>${escapeHtml(item.name)}</h3>
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
      `;
      card.appendChild(body);

      imageContainer.appendChild(card);
    }
  });
}

function renderMenu(items, loadedImageMap = new Map()) {
  const mains = items.filter(i => i.category === 'main');
  const sides = items.filter(i => i.category === 'sides');
  const drinks = items.filter(i => i.category === 'drinks');
  const others = items.filter(i => !['main','sides','drinks'].includes(i.category));

  renderCategory('main-text-items', 'main-image-items', mains, loadedImageMap);
  renderCategory('sides-text-items', 'sides-image-items', sides, loadedImageMap);
  renderCategory('drinks-text-items', 'drinks-image-items', drinks, loadedImageMap);

  if (others.length) renderCategory('other-text-items', 'other-image-items', others, loadedImageMap);

  if (document.querySelectorAll('.menu-category-section').length) initScrollSpy();
}

/* ===== Main flow =====
   - show cached text immediately,
   - fetch live menu,
   - try to preload images but no longer than OVERALL_IMAGE_WAIT_MS,
   - render available images and placeholders, hide loader,
   - keep retrying pending images in background until they appear or TOTAL_IMAGE_RETRY_TIME_MS elapses.
*/
async function loadMenu() {
  showLoading(true, 'Loading menu...');
  clearError();

  const cached = loadMenuCache();
  if (cached) {
    renderMenu(cached, new Map());
    const cachedUrls = [...new Set(cached.filter(i => i.photo_url).map(i => i.photo_url))];
    startPersistentImageRetries(cachedUrls);
  }

  try {
    const items = await fetchMenuUntilSuccess();

    showLoading(true, 'Loading images (finalizing)…');

    const { loadedMap, pending } = await preloadImagesWithOverallTimeout(items, OVERALL_IMAGE_WAIT_MS);

    renderMenu(items, loadedMap);

    if (pending && pending.length) startPersistentImageRetries(pending);

    saveMenuCache(items);
  } catch (err) {
    console.error('Error loading menu:', err);
    if (!cached) {
      if (err.name === 'AbortError') showError('The menu is taking too long to load. Please try again.');
      else showError('Failed to load menu. Please try again.');
    } else {
      showError('Showing saved menu data for now. Live refresh failed.');
    }
  } finally {
    showLoading(false);
  }
}

/* ===== Scroll / category buttons ===== */
document.addEventListener('click', event => {
  const btn = event.target;
  if (btn.classList && btn.classList.contains('category-btn') && btn.dataset.target) {
    const targetId = btn.dataset.target;
    const section = document.getElementById(targetId);
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

function initScrollSpy() {
  const sections = document.querySelectorAll('.menu-category-section');
  const buttons = document.querySelectorAll('.category-btn');
  if (!sections.length || !buttons.length) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const category = entry.target.dataset.category;
        buttons.forEach(btn => {
          const target = btn.dataset.target;
          const targetSection = document.getElementById(target);
          const isActive = targetSection && targetSection.dataset.category === category;
          btn.classList.toggle('active', isActive);
        });
      }
    });
  }, { root: null, threshold: 0.4 });
  sections.forEach(s => observer.observe(s));
}

/* Start */
document.addEventListener('DOMContentLoaded', loadMenu);