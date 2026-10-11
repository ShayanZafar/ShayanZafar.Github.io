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

  // Project activity from GitHub. Each deploy publishes a snapshot of it (assets/data/github.json, written by
  // the Site workflow), so the cards don't depend on GitHub's limit for anonymous visitors (60 API requests an
  // hour per address). The page shows the snapshot and calls GitHub's API only when the snapshot is missing or
  // over 12 hours old. A failed call leaves what's shown: the snapshot, or the commits written into the HTML.
  const GITHUB_SNAPSHOT = '/assets/data/github.json';
  const SNAPSHOT_MAX_AGE = 12 * 3600000;
  const GITHUB_API = 'https://api.github.com/';

  const commitLists = document.querySelectorAll('[data-gh-commits]');
  const repoList = document.querySelector('[data-gh-repos]');

  // Fetched once, and only on pages that show GitHub activity. A missing or unreadable file reads as null.
  const snapshot = commitLists.length || repoList
    ? fetch(GITHUB_SNAPSHOT).then((response) => (response.ok ? response.json() : null)).catch(() => null)
    : null;

  // Fills one block from the snapshot, then from GitHub's API only if the snapshot is missing or stale.
  // `pick` finds the block's list in the snapshot, `path` is the API request, `show` renders a list.
  const fill = async (pick, path, show) => {
    const data = await snapshot;
    const takenAt = new Date(data?.generatedAt);
    let fresh = false;
    if (data && !Number.isNaN(takenAt.getTime())) {
      try {
        const items = pick(data);
        if (Array.isArray(items)) {
          show(items, { takenAt });
          fresh = now - takenAt < SNAPSHOT_MAX_AGE;
        }
      } catch {
        // A snapshot that can't be read counts as missing.
      }
    }
    if (fresh) return;

    try {
      const response = await fetch(GITHUB_API + path);
      if (response.ok) show(await response.json(), { live: true });
    } catch {
      // Keep what's shown: the snapshot, or what the page shipped with.
    }
  };

  const relativeDay = (date) => {
    const days = Math.floor((now - date) / 86400000);
    if (days < 1) return 'today';
    if (days < 2) return 'yesterday';
    if (days < 30) return `${days} days ago`;
    return `on ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const timeAgo = (date) => {
    const minutes = Math.floor((now - date) / 60000);
    if (minutes < 2) return 'just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
    return relativeDay(date);
  };

  // Each block says where its list came from: "Live" from GitHub's API, or "Synced 3 hours ago" from the snapshot.
  const showSource = (badge, source) => {
    if (!badge) return;
    if (source.live) {
      const dot = document.createElement('span');
      dot.className = 'live-badge__dot';
      dot.setAttribute('aria-hidden', 'true');
      badge.replaceChildren(dot, 'Live');
      badge.title = 'Loaded from GitHub just now';
    } else {
      const time = document.createElement('time');
      time.dateTime = source.takenAt.toISOString();
      time.textContent = timeAgo(source.takenAt);
      badge.replaceChildren('Synced ', time);
      badge.title = 'From the snapshot of GitHub published with the site';
    }
    badge.classList.toggle('live-badge--snapshot', !source.live);
    badge.hidden = false;
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

  commitLists.forEach((list) => {
    const repo = list.dataset.ghCommits;
    const updated = document.querySelector(`[data-gh-updated="${repo}"]`);
    const kind = document.querySelector(`[data-gh-kind="${repo}"]`);
    const activeKind = kind?.textContent;
    const badge = list.closest('.project')?.querySelector('[data-gh-source]');

    const show = (items, source) => {
      if (!Array.isArray(items)) return;
      const commits = items
        .filter((c) => c.parents.length < 2 && c.html_url.startsWith('https://github.com/'))
        .slice(0, 4);
      if (!commits.length) return;

      list.replaceChildren(...commits.map(commitItem));

      const latest = new Date(commits[0].commit.author.date);
      if (updated) updated.textContent = `Updated ${relativeDay(latest)}`;

      // Only claim "in active development" while there have been commits in the last 90 days.
      if (kind) kind.textContent = now - latest > 90 * 86400000 ? 'Personal project' : activeKind;

      showSource(badge, source);
    };

    fill((data) => data.commits?.[repo], `repos/${repo}/commits?per_page=10`, show);
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

    // Repos without a description show just their name and details.
    const description = document.createElement('p');
    description.className = 'repo__desc';
    description.textContent = repo.description || '';

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

    card.append(name, ...(repo.description ? [description] : []), meta);

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

  if (repoList) {
    const { ghRepos: user, ghExclude = '', ghDays = '365', ghMax = '6' } = repoList.dataset;
    const exclude = new Set(ghExclude.toLowerCase().split(/[\s,]+/).filter(Boolean));
    const cutoff = now - Number(ghDays) * 86400000;
    const block = repoList.closest('[data-gh-repos-block]');

    // The block stays hidden until a list arrives; the "All repositories" link works without it.
    const show = (items, source) => {
      if (!Array.isArray(items)) return;
      const repos = items
        .filter((r) => !r.fork && !r.archived && !exclude.has(r.name.toLowerCase()))
        .filter((r) => {
          const topics = r.topics || [];
          if (topics.includes('hide-from-site')) return false;
          return topics.includes('portfolio') || new Date(r.pushed_at) >= cutoff;
        })
        .slice(0, Number(ghMax));
      if (!repos.length) return;

      repoList.replaceChildren(...repos.map(repoCard));
      block?.removeAttribute('hidden');
      showSource(block?.querySelector('[data-gh-source]'), source);
    };

    fill((data) => data.repos, `users/${user}/repos?sort=pushed&per_page=100`, show);
  }
})();
