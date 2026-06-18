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

/* ─── Front-matter Parser ────────────────────────────────────── */

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const meta = {};
  match[1].split('\n').forEach((line) => {
    const colon = line.indexOf(':');
    if (colon === -1) return;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();

    if (value.startsWith('[') && value.endsWith(']')) {
      meta[key] = value.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
    } else {
      meta[key] = value.replace(/^["']|["']$/g, '');
    }
  });

  return { meta, body: match[2] };
}

/* ─── Date Formatter ─────────────────────────────────────────── */

function formatDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/* ─── Render Error ───────────────────────────────────────────── */

function renderError(message) {
  document.getElementById('post-content').innerHTML = `
    <p style="color:var(--text-muted);padding:2rem 0">${message}</p>
    <a href="index.html" class="back-link" style="margin-top:1rem">← Back to all posts</a>`;
  document.title = 'Post Not Found — York Develops';
}

/* ─── Main ───────────────────────────────────────────────────── */

const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

if (!slug) {
  window.location.replace('index.html');
} else {
  fetch(`posts/${slug}.md`)
    .then((res) => {
      if (!res.ok) throw new Error(res.status);
      return res.text();
    })
    .then((raw) => {
      const { meta, body } = parseFrontMatter(raw);

      const title = meta.title || slug;
      const date  = meta.date  || '';
      const tags  = meta.tags  || [];

      document.title = `${title} — York Develops`;

      const headerEl = document.getElementById('post-header');
      const titleEl  = document.getElementById('post-title');
      const dateEl   = document.getElementById('post-date');
      const tagsEl   = document.getElementById('post-tags');

      titleEl.textContent = title;
      dateEl.textContent  = date ? formatDate(date) : '';
      dateEl.setAttribute('datetime', date);

      tagsEl.innerHTML = tags.map((t) => `<span class="tag">${t}</span>`).join('');
      headerEl.style.display = '';

      const contentEl = document.getElementById('post-content');
      contentEl.innerHTML = marked.parse(body);

      // Render LaTeX math with KaTeX after marked.js has built the DOM
      if (typeof renderMathInElement === 'function') {
        renderMathInElement(contentEl, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$',  right: '$',  display: false },
            { left: '\\[', right: '\\]', display: true },
            { left: '\\(', right: '\\)', display: false },
          ],
          throwOnError: false,
        });
      }

      document.querySelector('meta[name="description"]')
        ?.setAttribute('content', meta.description || title);

    })
    .catch((err) => {
      if (err.message === '404') {
        renderError('Post not found. It may have moved or the link might be wrong.');
      } else {
        renderError('Could not load this post. Make sure you are running from a local server.');
      }
      console.error(err);
    });
}
