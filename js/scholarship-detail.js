const page = document.querySelector('.detail-page[data-deadline]');
const deadline = new Date(`${page.dataset.deadline}T00:00:00`);
const today = new Date();
today.setHours(0, 0, 0, 0);
const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
const deadlineBox = document.querySelector('[data-countdown-box]');
const countdown = document.querySelector('[data-countdown]');
const status = document.querySelector('.deadline-open');

if (daysLeft < 0) {
  status.textContent = 'CLOSED';
  deadlineBox.classList.add('closed');
  countdown.textContent = 'Deadline passed';
} else {
  countdown.textContent = daysLeft === 0 ? 'Deadline today' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`;
  deadlineBox.classList.toggle('urgent', daysLeft <= 7);
}

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
