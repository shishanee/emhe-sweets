'use strict';
const menuConfig = window.CHOCOLATE_EMIN_MENU;
const products = menuConfig.products;
const productsById = Object.fromEntries(products.map(function (product) { return [product.id, product]; }));
// Keep the existing storage key so the rebrand preserves customers' baskets.
const cartKey = 'chocolateemin-cart';
const currency = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
const catalog = document.querySelector('#catalog');
const categoryNav = document.querySelector('#categories');
const searchInput = document.querySelector('#menu-search');
const cartDialog = document.querySelector('#cart-dialog');
const checkoutForm = document.querySelector('#checkout-form');
const whatsappLink = document.querySelector('#whatsapp-order');
const copyOrderButton = document.querySelector('#copy-order');
const toast = document.querySelector('.toast');
let activeCategory = 'all';
let cart = readCart();
let toastTimer;

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
  });
}
function icon(name) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + escapeHTML(name) + '"/></svg>'; }
function price(amount) { return currency.format(amount); }
function normalize(value) { return value.toLocaleLowerCase('ru').replace(/ё/g, 'е').trim(); }
function readCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(cartKey) || '{}');
    return Object.fromEntries(Object.entries(stored).filter(function (entry) {
      return Object.hasOwn(productsById, entry[0]) && Number.isInteger(entry[1]) && entry[1] > 0 && entry[1] <= 99;
    }));
  } catch { return {}; }
}
function saveCart() {
  try { localStorage.setItem(cartKey, JSON.stringify(cart)); } catch { /* Cart remains available in memory. */ }
}
function cartCount() { return Object.values(cart).reduce(function (sum, amount) { return sum + amount; }, 0); }
function cartTotal() {
  return Object.entries(cart).reduce(function (sum, entry) { return sum + productsById[entry[0]].price * entry[1]; }, 0);
}
function productControls(product) {
  const quantity = cart[product.id] || 0;
  const id = escapeHTML(product.id);
  const name = escapeHTML(product.name);
  if (!quantity) return '<button type="button" class="add-button" data-action="increase" data-id="' + id + '" aria-label="Добавить: ' + name + '">' + icon('plus') + ' В корзину</button>';
  return '<div class="quantity-control">' +
    '<button type="button" data-action="decrease" data-id="' + id + '" aria-label="Уменьшить количество: ' + name + '">' + icon('minus') + '</button>' +
    '<output aria-label="Количество">' + quantity + '</output>' +
    '<button type="button" data-action="increase" data-id="' + id + '" aria-label="Увеличить количество: ' + name + '"' + (quantity >= 99 ? ' disabled' : '') + '>' + icon('plus') + '</button></div>';
}
function renderCategories() {
  const categories = [{ id: 'all', name: 'Всё меню', icon: 'grid' }].concat(menuConfig.categories);
  categoryNav.innerHTML = categories.map(function (category) {
    const count = products.filter(function (product) { return category.id === 'all' || product.category === category.id; }).length;
    return '<button class="category-button" type="button" data-category="' + escapeHTML(category.id) + '" aria-pressed="' + (category.id === activeCategory) + '">' +
      icon(category.icon) + escapeHTML(category.name) + '<span class="category-count">' + count + '</span></button>';
  }).join('');
}
function productCard(product) {
  return '<article class="product-card" data-focus-context="menu-' + escapeHTML(product.id) + '">' +
    '<div class="product-image"><img src="' + escapeHTML(product.image) + '" alt="' + escapeHTML(product.name) + '" loading="lazy" decoding="async" width="720" height="720">' +
    (product.portion ? '<span class="portion-label">' + escapeHTML(product.portion) + '</span>' : '') + '</div>' +
    '<div class="product-content"><h4>' + escapeHTML(product.name) + '</h4><p class="product-description">' + escapeHTML(product.description) + '</p>' +
    '<span class="product-price">' + price(product.price) + '</span><div class="product-controls" data-product-controls="' + escapeHTML(product.id) + '">' + productControls(product) + '</div></div></article>';
}
function renderCatalog() {
  const query = normalize(searchInput.value);
  const filtered = products.filter(function (product) {
    const category = menuConfig.categories.find(function (item) { return item.id === product.category; });
    return (activeCategory === 'all' || product.category === activeCategory) &&
      normalize(product.name + ' ' + product.description + ' ' + (category ? category.name : '')).includes(query);
  });
  const selected = menuConfig.categories.find(function (category) { return category.id === activeCategory; });
  document.querySelector('#menu-title').textContent = query ? 'Результаты поиска' : selected ? selected.name : 'Всё меню';
  document.querySelector('#menu-count').textContent = 'Позиций: ' + filtered.length;
  if (!filtered.length) {
    catalog.innerHTML = '<div class="empty-results">' + icon('search') + '<h3>Ничего не нашлось</h3><p>Попробуйте другое название или откройте всё меню.</p><button type="button" data-reset-search>Показать всё меню</button></div>';
    return;
  }
  catalog.innerHTML = menuConfig.categories.map(function (category) {
    const group = filtered.filter(function (product) { return product.category === category.id; });
    if (!group.length) return '';
    return '<section class="menu-group" aria-label="' + escapeHTML(category.name) + '"><div class="group-heading">' +
      icon(category.icon) + '<h3>' + escapeHTML(category.name) + '</h3><span>' + group.length + '</span></div>' +
      '<div class="product-grid">' + group.map(productCard).join('') + '</div></section>';
  }).join('');
}
function cartContents(context) {
  const entries = Object.entries(cart);
  if (!entries.length) return '<div class="cart-empty">' + icon('bag') + '<h3>Здесь будет ваш заказ</h3><p>Добавьте что-нибудь вкусное<br>из меню</p></div>';
  return entries.map(function (entry) {
    const product = productsById[entry[0]];
    return '<article class="cart-item" data-focus-context="' + context + '-' + escapeHTML(product.id) + '">' +
      '<img class="cart-item-image" src="' + escapeHTML(product.image) + '" alt="" width="64" height="64">' +
      '<div class="cart-item-info"><h3>' + escapeHTML(product.name) + '</h3><div class="cart-item-meta">' +
      (product.portion ? escapeHTML(product.portion) + ' · ' : '') + price(product.price) + '</div><div class="cart-item-bottom">' +
      productControls(product) + '<span class="cart-item-price">' + price(product.price * entry[1]) + '</span></div></div></article>';
  }).join('');
}
function updateOrderLink() {
  const hasItems = cartCount() > 0;
  const phone = String(menuConfig.whatsappNumber || '').replace(/\D/g, '');
  whatsappLink.setAttribute('aria-disabled', String(!hasItems));
  if (hasItems) whatsappLink.href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(buildOrderMessage());
  else whatsappLink.removeAttribute('href');
  copyOrderButton.disabled = !hasItems;
  document.querySelector('#whatsapp-hint').textContent = phone ?
    'В WhatsApp останется отправить готовое сообщение.' : 'Выберите получателя и отправьте готовое сообщение в WhatsApp.';
}
function renderCart() {
  const count = cartCount();
  document.querySelectorAll('[data-cart-count]').forEach(function (element) { element.textContent = count; });
  document.querySelectorAll('[data-cart-total]').forEach(function (element) { element.textContent = price(cartTotal()); });
  document.querySelectorAll('[data-checkout]').forEach(function (button) { button.disabled = count === 0; });
  document.querySelector('.mobile-cart-bar').hidden = count === 0;
  document.querySelector('.header-cart').setAttribute('aria-label', 'Корзина, позиций: ' + count);
  document.querySelector('#sidebar-items').innerHTML = cartContents('sidebar');
  document.querySelector('#dialog-items').innerHTML = cartContents('dialog');
  checkoutForm.hidden = count === 0;
  updateOrderLink();
}
function updateAfterQuantityChange() {
  const active = document.activeElement;
  const context = active.closest('[data-focus-context]');
  const focusedId = active.dataset.id;
  const focusedAction = active.dataset.action;
  const focusedContext = context && context.dataset.focusContext;
  document.querySelectorAll('[data-product-controls]').forEach(function (element) {
    element.innerHTML = productControls(productsById[element.dataset.productControls]);
  });
  renderCart();
  if (focusedContext && focusedId && focusedAction) {
    const scope = document.querySelector('[data-focus-context="' + focusedContext + '"]');
    if (scope) {
      const next = scope.querySelector('[data-id="' + focusedId + '"][data-action="' + focusedAction + '"]') || scope.querySelector('button');
      if (next && !next.disabled) next.focus({ preventScroll: true });
    }
  }
}
function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = setTimeout(function () { toast.classList.remove('visible'); }, 2200);
}
function openCart() {
  renderCart();
  if (!cartDialog.open) cartDialog.showModal();
  document.body.style.overflow = 'hidden';
}
function buildOrderMessage() {
  const data = new FormData(checkoutForm);
  const name = String(data.get('customerName') || '').trim();
  const comment = String(data.get('comment') || '').trim();
  const address = String(data.get('deliveryAddress') || '').trim();
  const paymentMethods = { cash: 'Наличные', cashless: 'Безналичный расчёт' };
  const payment = paymentMethods[data.get('paymentMethod')] || 'Не выбран';
  const lines = Object.entries(cart).map(function (entry, index) {
    const product = productsById[entry[0]];
    return (index + 1) + '. ' + product.name + (product.portion ? ' (' + product.portion + ')' : '') + ' × ' + entry[1] + ' — ' + price(product.price * entry[1]);
  });
  return 'Здравствуйте! Хочу заказать в EmHe.Sweets:\n\n' + lines.join('\n') +
    '\n\nСумма заказа: ' + price(cartTotal()) + (name ? '\nИмя: ' + name : '') +
    '\nАдрес доставки: ' + address + '\nОплата: ' + payment +
    (comment ? '\nПожелания: ' + comment : '') + '\n\nПодскажите, пожалуйста, когда можно доставить заказ.';
}

document.addEventListener('click', function (event) {
  const quantityButton = event.target.closest('[data-action][data-id]');
  if (quantityButton) {
    const id = quantityButton.dataset.id;
    if (!Object.hasOwn(productsById, id)) return;
    const current = cart[id] || 0;
    const next = current + (quantityButton.dataset.action === 'increase' ? 1 : -1);
    if (next > 99) return;
    if (next <= 0) delete cart[id]; else cart[id] = next;
    saveCart();
    updateAfterQuantityChange();
    if (!current && next > 0) showToast('Добавлено: ' + productsById[id].name);
    return;
  }
  const categoryButton = event.target.closest('[data-category]');
  if (categoryButton) {
    activeCategory = categoryButton.dataset.category;
    categoryNav.querySelectorAll('[data-category]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.category === activeCategory));
    });
    renderCatalog();
    categoryButton.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return;
  }
  if (event.target.closest('[data-reset-search]')) {
    activeCategory = 'all';
    searchInput.value = '';
    renderCategories();
    renderCatalog();
    searchInput.focus({ preventScroll: true });
    return;
  }
  if (event.target.closest('[data-open-cart]')) openCart();
  if (event.target.closest('[data-close-cart]')) cartDialog.close();
});
searchInput.addEventListener('input', renderCatalog);
checkoutForm.addEventListener('input', function () {
  checkoutForm.elements.deliveryAddress.setCustomValidity('');
  updateOrderLink();
});
checkoutForm.addEventListener('change', updateOrderLink);
function validateCheckout() {
  const addressInput = checkoutForm.elements.deliveryAddress;
  addressInput.setCustomValidity(addressInput.value.trim() ? '' : 'Укажите адрес доставки.');
  return checkoutForm.reportValidity();
}
whatsappLink.addEventListener('click', function (event) {
  if (!cartCount() || !validateCheckout()) event.preventDefault();
});
checkoutForm.addEventListener('submit', function (event) { event.preventDefault(); });
cartDialog.addEventListener('close', function () { document.body.style.overflow = ''; });
cartDialog.addEventListener('click', function (event) { if (event.target === cartDialog) cartDialog.close(); });
copyOrderButton.addEventListener('click', async function () {
  if (!cartCount() || !validateCheckout()) return;
  try { await navigator.clipboard.writeText(buildOrderMessage()); showToast('Заказ скопирован'); }
  catch { showToast('Не удалось скопировать. Откройте заказ в WhatsApp.'); }
});
window.addEventListener('storage', function (event) {
  if (event.key === cartKey || event.key === null) { cart = readCart(); updateAfterQuantityChange(); }
});
renderCategories();
renderCatalog();
renderCart();
