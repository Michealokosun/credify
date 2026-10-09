const list = document.querySelector('#scholarship-list');
const cards = [...list.querySelectorAll('.opportunity-card')];
const query = document.querySelector('#scholarship-query');
const study = document.querySelector('#study-filter');
const destination = document.querySelector('#destination-filter');
const count = document.querySelector('#scholarship-count');
const emptyState = document.querySelector('#no-scholarships');
const DAY_MS = 24 * 60 * 60 * 1000;
const pageSize = 10;
let currentPage = 0;
const pagination = document.createElement('nav');
pagination.className = 'list-pagination';
pagination.setAttribute('aria-label', 'Scholarship pages');
pagination.hidden = true;
list.insertAdjacentElement('afterend', pagination);

function updateDeadlines() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  cards.forEach((card) => {
    const deadline = new Date(`${card.dataset.deadline}T00:00:00`);
    const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / DAY_MS);
    const badge = card.querySelector('.opportunity-status');
    const countdown = card.querySelector('[data-countdown]');
    if (daysLeft < 0) {
      badge.textContent = 'CLOSED';
      badge.classList.add('closed');
      countdown.textContent = 'Deadline passed';
      countdown.classList.add('closed');
      card.querySelector('.deadline-box').classList.remove('urgent');
      card.dataset.expired = 'true';
    } else {
      badge.textContent = 'OPEN';
      badge.classList.remove('closed');
      countdown.textContent = daysLeft === 0 ? 'Deadline today' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`;
      countdown.classList.remove('closed');
      card.querySelector('.deadline-box').classList.toggle('urgent', daysLeft <= 7);
      card.dataset.expired = 'false';
    }
  });
  cards.sort((a, b) => new Date(a.dataset.deadline) - new Date(b.dataset.deadline));
  cards.forEach((card) => list.append(card));
}

function applyFilters() {
  const term = query.value.trim().toLowerCase();
  const matchingCards = [];
  cards.forEach((card) => {
    const text = `${card.innerText} ${card.dataset.tags}`.toLowerCase();
    const studyTags = card.dataset.study.split(' ');
    const destinationTags = card.dataset.destination.split(' ');
    const matches = card.dataset.expired !== 'true' && (!term || text.includes(term)) &&
      (study.value === 'all' || studyTags.includes(study.value)) &&
      (destination.value === 'all' || destinationTags.includes(destination.value));
    if (matches) matchingCards.push(card);
  });
  const pageCount = Math.ceil(matchingCards.length / pageSize);
  currentPage = Math.min(currentPage, Math.max(0, pageCount - 1));
  const visibleCards = new Set(matchingCards.slice(currentPage * pageSize, (currentPage + 1) * pageSize));
  cards.forEach((card) => { card.hidden = !visibleCards.has(card); });
  const visible = matchingCards.length;
  count.textContent = `Showing ${visible} open ${visible === 1 ? 'scholarship' : 'scholarships'}`;
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

updateDeadlines();
applyFilters();
document.querySelector('#scholarship-search').addEventListener('submit', (event) => {
  event.preventDefault();
  applyFilters();
});
query.addEventListener('input', () => { currentPage = 0; applyFilters(); });
[study, destination].forEach((select) => select.addEventListener('change', () => { currentPage = 0; applyFilters(); }));
document.querySelector('#reset-scholarship-filters').addEventListener('click', () => {
  query.value = '';
  study.value = 'all';
  destination.value = 'all';
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
