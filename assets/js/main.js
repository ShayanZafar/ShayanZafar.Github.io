// Small progressive enhancements. The page is fully readable without JavaScript.
(() => {
  'use strict';

  const now = new Date();
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

  // Expand / collapse each role's highlights under its one-line summary.
  document.querySelectorAll('.more-toggle').forEach((button) => {
    const role = button.closest('.role');
    const label = button.querySelector('.more-toggle__label');
    const collapsedText = `Show ${button.dataset.count} highlights`;

    button.addEventListener('click', () => {
      const expanded = role.classList.toggle('is-expanded');
      button.setAttribute('aria-expanded', String(expanded));
      label.textContent = expanded ? 'Hide highlights' : collapsedText;
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

  // Live project activity from the GitHub API. The HTML ships with a snapshot,
  // so the section still reads correctly if the API is slow, blocked or rate-limited.
  const relativeDay = (date) => {
    const days = Math.floor((now - date) / 86400000);
    if (days < 1) return 'today';
    if (days < 2) return 'yesterday';
    if (days < 30) return `${days} days ago`;
    return `on ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const commitItem = (commit) => {
    const date = new Date(commit.commit.author.date);
    const link = document.createElement('a');
    link.href = commit.html_url;

    const time = document.createElement('time');
    time.dateTime = commit.commit.author.date;
    time.textContent = `${MONTHS[date.getMonth()]} ${date.getDate()}`;

    const message = document.createElement('span');
    message.textContent = commit.commit.message.split('\n')[0];

    link.append(time, message);
    const item = document.createElement('li');
    item.append(link);
    return item;
  };

  document.querySelectorAll('[data-gh-commits]').forEach(async (list) => {
    const repo = list.dataset.ghCommits;
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=10`);
      if (!response.ok) return;

      const commits = (await response.json())
        .filter((c) => c.parents.length < 2 && c.html_url.startsWith('https://github.com/'))
        .slice(0, 4);
      if (!commits.length) return;

      list.replaceChildren(...commits.map(commitItem));

      const updated = document.querySelector(`[data-gh-updated="${repo}"]`);
      if (updated) updated.textContent = `Updated ${relativeDay(new Date(commits[0].commit.author.date))}`;

      list.closest('.project')?.querySelector('[data-gh-live]')?.removeAttribute('hidden');
    } catch {
      // Keep the snapshot.
    }
  });
})();
