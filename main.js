/* ─── Theme ──────────────────────────────────────────────────── */

(function () {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.dataset.theme = saved;
})();

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const updateIcon = () => {
    toggle.textContent = document.documentElement.dataset.theme === 'dark' ? '☼' : '☾';
  };
  updateIcon();

  toggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    updateIcon();
  });
});

/* ─── Helpers ────────────────────────────────────────────────── */

function formatDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const SECTION_LABELS = {
  'all':              'All Posts',
  'programming':      'Programming',
  'creative-writing': 'Creative Writing',
  'fun':              'Fun',
  'tea-garden':       'Tea & Garden',
};

/* ─── Rendering ──────────────────────────────────────────────── */

function tagClass(section) {
  if (section === 'creative-writing') return ' tag--creative-writing';
  if (section === 'fun') return ' tag--fun';
  if (section === 'tea-garden') return ' tag--tea-garden';
  return '';
}

function renderPostList(posts, activeSection) {
  const container = document.getElementById('post-list');
  const heading   = document.getElementById('section-heading');
  if (!container) return;

  const filtered = activeSection === 'all'
    ? posts
    : posts.filter((p) => p.section === activeSection);

  if (heading) {
    heading.textContent = SECTION_LABELS[activeSection] || 'Posts';
  }

  if (!filtered.length) {
    container.innerHTML = '<p class="empty-state">No posts in this section yet — check back soon.</p>';
    return;
  }

  container.innerHTML = filtered.map((post) => {
    const section  = post.section || 'programming';
    const extraCls = tagClass(section);

    const tags = (post.tags || [])
      .map((t) => `<span class="tag${extraCls}">${t}</span>`)
      .join('');

    return `
      <a class="post-row" href="post.html?slug=${encodeURIComponent(post.slug)}">
        <span class="post-date">${formatDate(post.date)}</span>
        <div class="post-meta">
          <span class="post-title">${post.title}</span>
          ${post.description ? `<p class="post-description">${post.description}</p>` : ''}
          ${tags ? `<div class="post-tags">${tags}</div>` : ''}
        </div>
      </a>`;
  }).join('');
}

/* ─── Tabs ───────────────────────────────────────────────────── */

function initTabs(posts) {
  const tabContainer = document.getElementById('section-tabs');
  if (!tabContainer) return;

  let activeSection = 'all';

  tabContainer.addEventListener('click', (e) => {
    const tab = e.target.closest('.section-tab');
    if (!tab) return;

    activeSection = tab.dataset.section;

    tabContainer.querySelectorAll('.section-tab').forEach((t) => {
      t.classList.toggle('active', t === tab);
      t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
    });

    renderPostList(posts, activeSection);
  });

  renderPostList(posts, activeSection);
}

/* ─── Boot ───────────────────────────────────────────────────── */

fetch('posts/registry.json')
  .then((res) => {
    if (!res.ok) throw new Error(`Failed to load registry: ${res.status}`);
    return res.json();
  })
  .then(initTabs)
  .catch((err) => {
    const container = document.getElementById('post-list');
    if (container) {
      container.innerHTML = '<p class="empty-state">Could not load posts. Make sure you are running this from a local server.</p>';
    }
    console.error(err);
  });
