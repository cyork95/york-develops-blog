# York Develops Blog — Project Documentation (`gemini.md`)

This document provides a high-level overview of the architecture, file structure, and development workflows for the **York Develops Blog**. Use this guide to understand how the static site functions and how to add new posts.

---

## 📂 Project Structure

```
YorkDevelopsBlog/
├── index.html        # Main landing page (lists all blog posts)
├── main.js           # Logic for the home page (listing, theme toggle, filtering)
├── post.html         # Detail view template for single blog posts
├── post.js           # Logic for parsing and rendering individual Markdown posts
├── styles.css        # Stylesheet containing design tokens, theme vars, and styling
├── favicon.svg       # Blog favicon
├── .nojekyll         # Disables Jekyll processing on GitHub Pages
└── posts/
    ├── registry.json # Catalog of all posts (drives the home page list)
    └── *.md          # Individual markdown files for each blog post
```

---

## ⚙️ Architecture & Data Flow

This blog is a lightweight, frontend-only static site. It uses client-side fetching to retrieve and render content dynamically:

1. **Home Page (`index.html` + `main.js`)**:
   - On load, `main.js` fetches `posts/registry.json`.
   - The registry is an array of objects containing metadata (title, slug, date, description, tags, section) for every post.
   - Users can filter posts by section (All, Programming, Creative Writing, Fun, Tea & Garden) via tabs.
   - Post items link to `post.html?slug=<post-slug>`.

2. **Single Post Page (`post.html` + `post.js`)**:
   - `post.js` reads the `slug` parameter from the URL query string.
   - It fetches the corresponding markdown file from `posts/<slug>.md`.
   - It extracts the YAML-like front-matter (fenced by `---` blocks) to set metadata (title, date, tags, description) dynamically in the document's `<head>` and header elements.
   - It uses `marked.js` (loaded via CDN in `post.html`) to compile the remaining markdown body into HTML and inserts it into the `<article>` element.

3. **Theme System**:
   - A dark/light mode theme toggle is implemented in both `main.js` and `post.js`.
   - The user's choice is saved in `localStorage` as `'theme'` and applied by toggling the `data-theme` attribute on the `<html>` element.

---

## ✍️ How to Publish a New Post

To add a new blog post to the site, follow these two steps:

### 1. Create the Markdown File
Create a new file in `posts/` named `<your-post-slug>.md` using lowercase letters and hyphens (e.g. `my-new-post.md`). Ensure it starts with front-matter fenced by `---`:

```markdown
---
title: My New Blog Post
date: 2026-06-15
description: A short summary of what this post is about.
tags: [cloud, javascript, tutorial]
---

Write your markdown content here...
```

### 2. Register the Post
Open [posts/registry.json](file:///c:/Users/coyof/Documents/Claude/Claude%20Code/YorkDevelopsBlog/posts/registry.json) and add an entry to the top of the array:

```json
  {
    "title": "My New Blog Post",
    "slug": "my-new-post",
    "date": "2026-06-15",
    "description": "A short summary of what this post is about.",
    "tags": ["cloud", "javascript", "tutorial"],
    "section": "programming"
  }
```

#### Valid Sections:
- `"programming"` (renders in the Programming tab)
- `"creative-writing"` (renders in the Creative Writing tab)
- `"fun"` (renders in the Fun tab)
- `"tea-garden"` (renders in the Tea & Garden tab)
