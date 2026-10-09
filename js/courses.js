const cards = [...document.querySelectorAll('.catalog-grid .course-card')];
const query = document.querySelector('#course-query');
const cost = document.querySelector('#cost-filter');
const level = document.querySelector('#level-filter');
const category = document.querySelector('#category-filter');
const count = document.querySelector('#catalog-count');
const emptyState = document.querySelector('#no-courses');
const pageSize = 10;
let currentPage = 0;
const pagination = document.createElement('nav');
pagination.className = 'list-pagination';
pagination.setAttribute('aria-label', 'Course pages');
pagination.hidden = true;
document.querySelector('#catalog-grid').insertAdjacentElement('afterend', pagination);

function applyFilters() {
  const term = query.value.trim().toLowerCase();
  const matchingCards = [];
  cards.forEach((card) => {
    const text = `${card.innerText} ${card.dataset.tags}`.toLowerCase();
    const matches = (!term || text.includes(term)) &&
      (cost.value === 'all' || card.dataset.cost === cost.value) &&
      (level.value === 'all' || card.dataset.level === level.value) &&
      (category.value === 'all' || card.dataset.category === category.value);
    if (matches) matchingCards.push(card);
  });
  const pageCount = Math.ceil(matchingCards.length / pageSize);
  currentPage = Math.min(currentPage, Math.max(0, pageCount - 1));
  const visibleCards = new Set(matchingCards.slice(currentPage * pageSize, (currentPage + 1) * pageSize));
  cards.forEach((card) => card.classList.toggle('hidden', !visibleCards.has(card)));
  const visible = matchingCards.length;
  count.textContent = `Showing ${visible} curated ${visible === 1 ? 'course' : 'courses'}`;
  emptyState.hidden = visible !== 0;
  renderPagination(pageCount);
}

function renderPagination(pageCount) {
  pagination.hidden = pageCount <= 1;
  if (pageCount <= 1) { pagination.innerHTML = ''; return; }
  pagination.innerHTML = `<button type="button" data-page="previous" ${currentPage === 0 ? 'disabled' : ''}>← Previous</button><span>Page ${currentPage + 1} of ${pageCount}</span><button type="button" data-page="next" ${currentPage >= pageCount - 1 ? 'disabled' : ''}>Next →</button>`;
  pagination.querySelector('[data-page="previous"]').addEventListener('click', () => { currentPage--; applyFilters(); });
  pagination.querySelector('[data-page="next"]').addEventListener('click', () => { currentPage++; applyFilters(); });
}

document.querySelector('#catalog-search').addEventListener('submit', (event) => {
  event.preventDefault();
  applyFilters();
});
query.addEventListener('input', () => { currentPage = 0; applyFilters(); });
[cost, level, category].forEach((select) => select.addEventListener('change', () => { currentPage = 0; applyFilters(); }));
document.querySelector('#clear-filters').addEventListener('click', () => {
  query.value = '';
  cost.value = 'all';
  level.value = 'all';
  category.value = 'all';
  currentPage = 0;
  applyFilters();
});

const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');
menuToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});
mainNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  mainNav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));
