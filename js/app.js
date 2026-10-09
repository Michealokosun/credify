const cards = [...document.querySelectorAll('#course-grid .course-card')];
const filters = [...document.querySelectorAll('.filter')];
const resultLabel = document.querySelector('#results-label');
let activeFilter = 'all';

function updateCourses() {
  let visible = 0;
  cards.forEach((card) => {
    const matches = activeFilter === 'all' ||
      (activeFilter === 'data' ? card.dataset.tags.includes('data') :
        activeFilter === 'Free' ? card.dataset.cost === 'Free' :
          activeFilter === 'Beginner' ? card.dataset.level === 'Beginner' : true);
    card.classList.toggle('hidden', !matches);
    if (matches) visible++;
  });
  if (resultLabel) resultLabel.textContent = `Showing ${visible} ${visible === 1 ? 'curated pick' : 'curated picks'}`;
}

filters.forEach((filter) => filter.addEventListener('click', () => {
  filters.forEach((item) => item.classList.remove('active'));
  filter.classList.add('active');
  activeFilter = filter.dataset.filter;
  updateCourses();
}));

const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');
if (menuToggle && mainNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
  mainNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }));
}

const newsletterForm = document.querySelector('#newsletter-form');
if (newsletterForm) newsletterForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = document.querySelector('#email');
  const message = document.querySelector('#form-message');
  if (!email.checkValidity()) { email.reportValidity(); return; }
  message.textContent = 'You’re on the list. Look out for your first Credify note soon.';
  message.style.color = '#b7e9c9';
  email.value = '';
});

const viewMore = document.querySelector('#view-more');
if (viewMore) viewMore.addEventListener('click', (event) => {
  document.querySelectorAll('.news-item.is-hidden').forEach((item) => item.classList.remove('is-hidden'));
  event.currentTarget.remove();
});

document.querySelectorAll('.scholarship-card[data-deadline]').forEach((card) => {
  const deadline = new Date(`${card.dataset.deadline}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  const countdown = card.querySelector('[data-home-countdown]');
  if (!countdown) return;
  if (daysLeft < 0) {
    countdown.textContent = 'Deadline passed';
    countdown.classList.add('closed');
    card.querySelector('.scholarship-card-timing').classList.remove('urgent');
  } else {
    countdown.textContent = daysLeft === 0 ? 'Deadline today' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`;
    card.querySelector('.scholarship-card-timing').classList.toggle('urgent', daysLeft <= 7);
  }
});
