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

      const latest = new Date(commits[0].commit.author.date);
      const updated = document.querySelector(`[data-gh-updated="${repo}"]`);
      if (updated) updated.textContent = `Updated ${relativeDay(latest)}`;

      // Only claim "in active development" while there have been commits in the last 90 days.
      const kind = document.querySelector(`[data-gh-kind="${repo}"]`);
      if (kind && now - latest > 90 * 86400000) kind.textContent = 'Side project';

      list.closest('.project')?.querySelector('[data-gh-live]')?.removeAttribute('hidden');
    } catch {
      // Keep the snapshot.
    }
  });

  // Other repositories, listed automatically so new projects appear without editing the page:
  // own public repos (not forks or archived) pushed within data-gh-days, plus any tagged "portfolio".
  // A repo tagged "hide-from-site" never appears.
  const LANGUAGE_COLORS = {
    Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6', 'C#': '#178600', HTML: '#e34c26',
    CSS: '#563d7c', 'C++': '#f34b7d', C: '#555555', Go: '#00ADD8', Rust: '#dea584', Java: '#b07219',
    Shell: '#89e051', PowerShell: '#012456', Ruby: '#701516', Swift: '#F05138', Kotlin: '#A97BFF',
    'Jupyter Notebook': '#DA5B0B',
  };

  const httpUrl = (url) => (typeof url === 'string' && /^https?:\/\//.test(url) ? url : null);

  const repoCard = (repo) => {
    const card = document.createElement('li');
    card.className = 'repo';

    const name = document.createElement('a');
    name.className = 'repo__name';
    name.href = repo.html_url.startsWith('https://github.com/') ? repo.html_url : 'https://github.com/';
    name.target = '_blank';
    name.rel = 'noopener';
    name.textContent = repo.name;

    const description = document.createElement('p');
    description.className = 'repo__desc';
    description.textContent = repo.description || 'No description yet.';

    const meta = document.createElement('p');
    meta.className = 'repo__meta';
    if (repo.language) {
      const language = document.createElement('span');
      language.className = 'repo__lang';
      const dot = document.createElement('span');
      dot.className = 'repo__dot';
      dot.style.background = LANGUAGE_COLORS[repo.language] || 'var(--text-faint)';
      language.append(dot, repo.language);
      meta.append(language);
    }
    const pushed = document.createElement('span');
    pushed.textContent = `Updated ${relativeDay(new Date(repo.pushed_at))}`;
    meta.append(pushed);
    if (repo.stargazers_count > 0) {
      const stars = document.createElement('span');
      stars.textContent = `★ ${repo.stargazers_count}`;
      meta.append(stars);
    }

    card.append(name, description, meta);

    const homepage = httpUrl(repo.homepage);
    if (homepage) {
      const live = document.createElement('a');
      live.className = 'repo__link';
      live.href = homepage;
      live.target = '_blank';
      live.rel = 'noopener';
      live.textContent = 'Live site';
      card.append(live);
    }
    return card;
  };

  const repoList = document.querySelector('[data-gh-repos]');
  if (repoList) {
    (async () => {
      const { ghRepos: user, ghExclude = '', ghDays = '365', ghMax = '6' } = repoList.dataset;
      const exclude = new Set(ghExclude.toLowerCase().split(/[\s,]+/).filter(Boolean));
      const cutoff = now - Number(ghDays) * 86400000;
      try {
        const response = await fetch(`https://api.github.com/users/${user}/repos?sort=pushed&per_page=100`);
        if (!response.ok) return;

        const repos = (await response.json())
          .filter((r) => !r.fork && !r.archived && !exclude.has(r.name.toLowerCase()))
          .filter((r) => {
            const topics = r.topics || [];
            if (topics.includes('hide-from-site')) return false;
            return topics.includes('portfolio') || new Date(r.pushed_at) >= cutoff;
          })
          .slice(0, Number(ghMax));
        if (!repos.length) return;

        repoList.replaceChildren(...repos.map(repoCard));
        repoList.closest('[data-gh-repos-block]')?.removeAttribute('hidden');
      } catch {
        // Leave the block hidden; the "All repositories" link still works.
      }
    })();
  }
})();
