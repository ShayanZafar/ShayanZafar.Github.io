// Small progressive enhancements. The page is fully readable without JavaScript.
(() => {
  'use strict';

  const now = new Date();

  // Keep "years of experience" figures current without editing the page.
  // Elements carry a start month, e.g. data-years-since="2012-04".
  document.querySelectorAll('[data-years-since]').forEach((el) => {
    const [year, month] = el.dataset.yearsSince.split('-').map(Number);
    const months = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
    const years = Math.floor(months / 12);
    if (years > 0) el.textContent = String(years);
  });

  document.querySelectorAll('[data-current-year]').forEach((el) => {
    el.textContent = String(now.getFullYear());
  });

  // Expand / collapse the extra highlights on longer roles.
  document.querySelectorAll('.more-toggle').forEach((button) => {
    const role = button.closest('.role');
    const label = button.querySelector('.more-toggle__label');
    const collapsedText = `Show ${button.dataset.moreCount} more`;

    button.addEventListener('click', () => {
      const expanded = role.classList.toggle('is-expanded');
      button.setAttribute('aria-expanded', String(expanded));
      label.textContent = expanded ? 'Show less' : collapsedText;
    });
  });

  // Hairline under the sticky header once the page scrolls.
  const header = document.getElementById('site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Highlight the nav link for the section currently in view.
  const navLinks = new Map(
    [...document.querySelectorAll('.site-nav a[href^="#"]')].map((a) => [a.hash.slice(1), a])
  );

  if ('IntersectionObserver' in window && navLinks.size) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((a) => a.removeAttribute('aria-current'));
          navLinks.get(entry.target.id)?.setAttribute('aria-current', 'true');
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );

    document.querySelectorAll('main > section[id]').forEach((section) => observer.observe(section));
  }
})();
