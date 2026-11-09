const html = document.documentElement;
const toast = document.getElementById('toast');
const form = document.getElementById('product-form');
const searchInput = document.getElementById('search');
const locales = window.SmartWarehouseLocales;
const storageKeys = {
  language: 'smart-warehouse-language',
  products: 'smart-warehouse-products',
};

let toastTimer;
let suppressResetToast = false;

function repairArabic(value) {
  if (html.lang !== 'ar' || !/[ØÙÂ]/.test(value)) return value;
  const cp1252 = new Map([['€', 0x80], ['‚', 0x82], ['ƒ', 0x83], ['„', 0x84], ['…', 0x85], ['†', 0x86], ['‡', 0x87], ['ˆ', 0x88], ['‰', 0x89], ['Š', 0x8a], ['‹', 0x8b], ['Œ', 0x8c], ['Ž', 0x8e], ['‘', 0x91], ['’', 0x92], ['“', 0x93], ['”', 0x94], ['•', 0x95], ['–', 0x96], ['—', 0x97], ['˜', 0x98], ['™', 0x99], ['š', 0x9a], ['›', 0x9b], ['œ', 0x9c], ['ž', 0x9e], ['Ÿ', 0x9f]]);
  const bytes = Uint8Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return cp1252.get(character) ?? (code & 255);
  });
  try { return new TextDecoder('utf-8').decode(bytes); } catch { return value; }
}

function localizeDigits(value) {
  return html.lang === 'ar'
    ? String(value).replace(/[0-9]/g, (digit) => String.fromCharCode(0x0660 + Number(digit)))
    : String(value);
}

function showToast(message, duration = 2600) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

function translate(message, values = {}) {
  const locale = locales[html.lang];
  let translated = repairArabic(locale.labels[message] || message);

  Object.entries(values).forEach(([key, value]) => {
    translated = translated.replaceAll(`{${key}}`, localizeDigits(value));
  });

  return localizeDigits(translated);
}

function setLanguage(language) {
  const isArabic = language === 'ar';
  const locale = locales[isArabic ? 'ar' : 'en'];

  html.lang = isArabic ? 'ar' : 'en';
  html.dir = isArabic ? 'rtl' : 'ltr';

  document.querySelectorAll('[data-en]').forEach((element) => {
    const key = element.dataset.en;
    element.textContent = repairArabic(locale.labels[key] || key);
  });

  const forecastLink = [...document.querySelectorAll('.nav-item')].find((link) =>
    link.querySelector('span')?.dataset.en === 'AI forecast'
  );
  const productsLink = [...document.querySelectorAll('.nav-item')].find((link) =>
    link.querySelector('span')?.dataset.en === 'Products'
  );
  productsLink?.classList.toggle('arabic-hidden', isArabic);
  if (isArabic) {
    productsLink?.classList.remove('active');
    forecastLink?.classList.add('active');
  } else {
    forecastLink?.classList.remove('active');
    productsLink?.classList.add('active');
  }

  document.querySelector('.brand-logo').alt = translate('Smart Warehouse');
  document.querySelector('.nav').setAttribute('aria-label', translate('Main navigation'));
  document.querySelector('.bell').setAttribute('aria-label', translate('Notifications'));

  document.getElementById('english').classList.toggle('selected', !isArabic);
  document.getElementById('arabic').classList.toggle('selected', isArabic);
  document.getElementById('english').setAttribute('aria-pressed', String(!isArabic));
  document.getElementById('arabic').setAttribute('aria-pressed', String(isArabic));
  document.getElementById('arabic').textContent = repairArabic(document.getElementById('arabic').textContent);
  document.querySelector('.avatar').textContent = isArabic ? repairArabic('Ù… Ø£') : 'WM';
  document.querySelectorAll('.badge, .team i').forEach((badge) => {
    if (!badge.dataset.enCount) badge.dataset.enCount = badge.textContent.trim();
    badge.textContent = localizeDigits(badge.dataset.enCount);
  });
  document.getElementById('arabic').textContent = 'العربية';
  document.querySelector('.avatar').textContent = isArabic ? 'م أ' : 'WM';

  document.querySelector('.back span[aria-hidden="true"]').textContent = locale.backArrow;
  searchInput.placeholder = repairArabic(locale.searchPlaceholder);
  searchInput.setAttribute('aria-label', translate('Search products'));
  document.getElementById('name').placeholder = repairArabic(locale.namePlaceholder);
  document.getElementById('category').placeholder = repairArabic(locale.categoryPlaceholder);
  document.getElementById('sku').placeholder = repairArabic(locale.skuPlaceholder);
  document.getElementById('purchase').placeholder = isArabic ? localizeDigits('0.00') : '0.00';
  document.getElementById('sell').placeholder = isArabic ? localizeDigits('0.00') : '0.00';
  document.title = repairArabic(locale.title);

  try {
    localStorage.setItem(storageKeys.language, html.lang);
  } catch {}
}

function getProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKeys.products) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

document.getElementById('english').addEventListener('click', () => setLanguage('en'));
document.getElementById('arabic').addEventListener('click', () => setLanguage('ar'));

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const product = Object.fromEntries(new FormData(form).entries());
  product.id = globalThis.crypto?.randomUUID?.() || String(Date.now());

  const products = getProducts();
  products.push(product);

  try {
    localStorage.setItem(storageKeys.products, JSON.stringify(products));
    suppressResetToast = true;
    form.reset();
    suppressResetToast = false;
    document.getElementById('name').focus();
    showToast(translate('Product saved successfully'));
  } catch {
    suppressResetToast = false;
    showToast(translate('Could not save the product in this browser'));
  }
});

form.addEventListener('reset', () => {
  if (!suppressResetToast) showToast(translate('Form cleared'), 1800);
});

searchInput.addEventListener('input', (event) => {
  const query = event.currentTarget.value.trim().toLocaleLowerCase();
  if (!query) return;

  const matches = getProducts().filter((product) =>
    [product.name, product.category, product.sku].some((value) =>
      String(value || '').toLocaleLowerCase().includes(query)
    )
  );
  const matchingNames = matches
    .slice(0, 3)
    .map((product) => product.name)
    .join(locales[html.lang].listSeparator);

  if (matches.length) {
    const message = html.lang === 'ar'
      ? 'Search results: {count} products — {items}'
      : 'Found {count}: {items}';

    showToast(translate(message, { count: matches.length, items: matchingNames }), 2200);
    return;
  }

  showToast(translate('No saved products match this search'), 2200);
});

document.querySelector('.bell').addEventListener('click', () => {
  showToast(translate('You have 5 alerts and 6 purchase orders'));
});

document.querySelectorAll('.nav-item').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();

    const label = link.querySelector('span').dataset.en;
    if (label !== 'Products') {
      showToast(translate('{label} is not available on this page', { label: translate(label) }));
      return;
    }

    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', item === link);
    });
  });
});

document.querySelector('.back').addEventListener('click', (event) => {
  event.preventDefault();
  showToast(translate('You are already in Products'));
});

const teamButton = document.querySelector('.team');
const usersDropdown = document.getElementById('users-dropdown');
const usersList = document.getElementById('active-users-list');
const usersScrollbar = usersDropdown.querySelector('.users-scrollbar');
const usersScrollbarThumb = usersScrollbar.querySelector('.users-scrollbar-thumb');

// Always start with the page visible and the users panel closed, including after refresh.
usersDropdown.hidden = true;
teamButton.setAttribute('aria-expanded', 'false');

function updateUsersScrollbar() {
  const trackHeight = usersScrollbar.clientHeight;
  const maxScroll = usersList.scrollHeight - usersList.clientHeight;
  const thumbHeight = maxScroll > 0
    ? Math.max(24, trackHeight * usersList.clientHeight / usersList.scrollHeight)
    : trackHeight;
  const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
  const thumbTop = maxScroll > 0 ? usersList.scrollTop / maxScroll * maxThumbTop : 0;

  usersScrollbar.hidden = maxScroll <= 0;
  usersScrollbarThumb.style.height = `${thumbHeight}px`;
  usersScrollbarThumb.style.transform = `translateY(${thumbTop}px)`;
  usersScrollbar.setAttribute('aria-valuenow', String(maxScroll > 0 ? Math.round(usersList.scrollTop / maxScroll * 100) : 0));
}

usersList.addEventListener('scroll', updateUsersScrollbar, { passive: true });
new ResizeObserver(updateUsersScrollbar).observe(usersList);
new ResizeObserver(updateUsersScrollbar).observe(usersDropdown);

let usersThumbDragOffset = null;
usersScrollbar.addEventListener('pointerdown', (event) => {
  if (usersScrollbar.hidden) return;
  event.preventDefault();
  usersScrollbar.setPointerCapture(event.pointerId);
  const trackRect = usersScrollbar.getBoundingClientRect();
  const thumbRect = usersScrollbarThumb.getBoundingClientRect();
  const isThumb = event.target === usersScrollbarThumb;
  usersThumbDragOffset = isThumb ? event.clientY - thumbRect.top : thumbRect.height / 2;
  if (!isThumb) moveUsersThumb(event.clientY, trackRect);
});

function moveUsersThumb(clientY, trackRect = usersScrollbar.getBoundingClientRect()) {
  const trackHeight = usersScrollbar.clientHeight;
  const thumbHeight = usersScrollbarThumb.offsetHeight;
  const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
  const maxScroll = usersList.scrollHeight - usersList.clientHeight;
  const thumbTop = Math.min(maxThumbTop, Math.max(0, clientY - trackRect.top - usersThumbDragOffset));
  usersList.scrollTop = maxThumbTop > 0 ? thumbTop / maxThumbTop * maxScroll : 0;
}

usersScrollbar.addEventListener('pointermove', (event) => {
  if (usersThumbDragOffset !== null) moveUsersThumb(event.clientY);
});
function stopUsersThumbDrag() { usersThumbDragOffset = null; }
usersScrollbar.addEventListener('pointerup', stopUsersThumbDrag);
usersScrollbar.addEventListener('pointercancel', stopUsersThumbDrag);
usersScrollbar.addEventListener('keydown', (event) => {
  const page = usersList.clientHeight;
  const keys = { ArrowDown: 40, ArrowUp: -40, PageDown: page, PageUp: -page, Home: -Infinity, End: Infinity };
  if (!(event.key in keys)) return;
  event.preventDefault();
  usersList.scrollTop = event.key === 'Home' ? 0 : event.key === 'End' ? usersList.scrollHeight : usersList.scrollTop + keys[event.key];
});
updateUsersScrollbar();

teamButton.addEventListener('click', () => {
  const isOpen = teamButton.getAttribute('aria-expanded') === 'true';
  teamButton.setAttribute('aria-expanded', String(!isOpen));
  usersDropdown.hidden = isOpen;
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.profile')) {
    usersDropdown.hidden = true;
    teamButton.setAttribute('aria-expanded', 'false');
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    usersDropdown.hidden = true;
    teamButton.setAttribute('aria-expanded', 'false');
  }
});

try {
  const savedLanguage = localStorage.getItem(storageKeys.language);
  setLanguage(savedLanguage === 'ar' ? 'ar' : 'en');
} catch {
  setLanguage('en');
}
