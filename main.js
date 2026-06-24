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
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  const searchInfo  = document.getElementById('search-info');
  const searchCount = document.getElementById('search-count');
  
  if (!container) return;

  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

  // 1. Filter by section
  let filtered = activeSection === 'all'
    ? posts
    : posts.filter((p) => p.section === activeSection);

  // 2. Filter by search query if present
  if (query) {
    filtered = filtered.filter((post) => {
      const matchesMeta = 
        post.title.toLowerCase().includes(query) ||
        (post.description && post.description.toLowerCase().includes(query)) ||
        (post.tags && post.tags.some(t => t.toLowerCase().includes(query))) ||
        (post.section && post.section.toLowerCase().includes(query));
      
      const matchesContent = post.fullText && post.fullText.toLowerCase().includes(query);
      
      return matchesMeta || matchesContent;
    });
  }

  // Update section heading
  if (heading) {
    if (query) {
      heading.textContent = `Search results in ${SECTION_LABELS[activeSection] || 'All'}`;
    } else {
      heading.textContent = SECTION_LABELS[activeSection] || 'Posts';
    }
  }

  // Update search count & clear button visibility
  if (searchClear) {
    searchClear.style.display = query ? 'inline-block' : 'none';
  }
  if (searchInfo) {
    searchInfo.style.display = query ? 'flex' : 'none';
  }
  if (searchCount) {
    const count = filtered.length;
    searchCount.textContent = count === 1 ? '1 post found' : `${count} posts found`;
  }

  if (!filtered.length) {
    container.innerHTML = '<p class="empty-state">No matching posts found — try another search query or check back later.</p>';
    return;
  }

  container.innerHTML = filtered.map((post) => {
    const section  = post.section || 'programming';
    const extraCls = tagClass(section);

    const tags = (post.tags || [])
      .map((t) => `<span class="tag${extraCls}" data-tag="${t}">${t}</span>`)
      .join('');

    return `
      <div class="post-row" data-href="post.html?slug=${encodeURIComponent(post.slug)}">
        <span class="post-date">${formatDate(post.date)}</span>
        <div class="post-meta">
          <a class="post-title" href="post.html?slug=${encodeURIComponent(post.slug)}">${post.title}</a>
          ${post.description ? `<p class="post-description">${post.description}</p>` : ''}
          ${tags ? `<div class="post-tags">${tags}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

/* ─── Search & Tag Filtering ─────────────────────────────────── */

let contentIndexLoaded = false;

function startBackgroundIndexing(posts) {
  const indexingIndicator = document.getElementById('search-indexing');
  if (indexingIndicator) {
    indexingIndicator.style.display = 'inline';
    indexingIndicator.textContent = '// indexing full text...';
  }

  // Fetch posts in background
  const fetchPromises = posts.map(async (post) => {
    try {
      const res = await fetch(`posts/${post.slug}.md`);
      if (res.ok) {
        post.fullText = await res.text();
      }
    } catch (e) {
      console.warn(`Failed to index full text for ${post.slug}`, e);
    }
  });

  Promise.all(fetchPromises).then(() => {
    contentIndexLoaded = true;
    if (indexingIndicator) {
      indexingIndicator.textContent = '// index ready';
      setTimeout(() => {
        indexingIndicator.style.opacity = '0';
        setTimeout(() => {
          indexingIndicator.style.display = 'none';
          indexingIndicator.style.opacity = '1';
        }, 300);
      }, 2000);
    }
    // Re-run search if user has already typed something
    const searchInput = document.getElementById('search-input');
    if (searchInput && searchInput.value.trim()) {
      const activeTab = document.querySelector('.section-tab.active');
      const activeSection = activeTab ? activeTab.dataset.section : 'all';
      renderPostList(posts, activeSection);
    }
  });
}

/* ─── Tabs & Listeners ───────────────────────────────────────── */

function initTabs(posts) {
  const tabContainer = document.getElementById('section-tabs');
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  const postListContainer = document.getElementById('post-list');
  
  if (!tabContainer) return;

  let activeSection = 'all';

  // Section Tab Clicking
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

  // Search Input Typing
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderPostList(posts, activeSection);
    });
  }

  // Clear Search Clicking
  if (searchClear && searchInput) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      renderPostList(posts, activeSection);
      searchInput.focus();
    });
  }

  // Row and Tag Click Delegation
  if (postListContainer) {
    postListContainer.addEventListener('click', (e) => {
      // 1. Tag Clicking
      const tagEl = e.target.closest('.tag');
      if (tagEl) {
        e.preventDefault();
        e.stopPropagation();
        const tag = tagEl.dataset.tag;
        if (searchInput) {
          searchInput.value = tag;
          renderPostList(posts, activeSection);
          // Scroll smoothly to search box
          searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          searchInput.focus();
        }
        return;
      }

      // 2. Title Link Clicking
      if (e.target.closest('.post-title')) {
        return; // Let standard link navigation happen
      }

      // 3. Card Row Clicking
      const row = e.target.closest('.post-row');
      if (row) {
        const href = row.dataset.href;
        if (href) {
          window.location.href = href;
        }
      }
    });
  }

  // Handle URL query parameter if present (e.g. index.html?q=tagname)
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('q');
  if (initialQuery && searchInput) {
    searchInput.value = initialQuery;
  }

  renderPostList(posts, activeSection);
  
  // Kick off background indexing
  startBackgroundIndexing(posts);
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
