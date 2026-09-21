# 3guys.chat

The website for **3 Guys in a Basement**. Static site, built with Astro, hosted free on
GitHub Pages. Episode data comes from the Podbean RSS feed at build time — nobody types
an episode title twice.

---

## Before the first build: rename two files

This project was written in an editor that can't save square brackets in filenames.
Astro needs them. Rename these two, once:

```bash
git mv src/pages/episodes/-slug-.astro   'src/pages/episodes/[slug].astro'
git mv src/pages/blog/-slug-.astro       'src/pages/blog/[slug].astro'
```

Nothing else in the project references those names.

---

## Run it

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # writes dist/
```

The build fetches the live feed, so you need to be online.

---

## How content works

| What | Where it comes from | Who does it |
| --- | --- | --- |
| Episode title, date, length, audio, description | The Podbean RSS feed | Podbean, automatically |
| Topic list with timestamps | The `podcast:chapters` JSON attached to each episode | You, when you upload the chapter file to Podbean |
| Blog posts | Markdown in `src/content/blog/` | You, in the GitHub web editor |
| Transcripts | Markdown in `src/content/transcripts/` | Optional, later |
| Host bios and photos | `src/pages/about.astro`, `public/img/` | You |

### Publishing an episode

1. Publish on Podbean as usual.
2. Upload the chapter JSON for that episode.
3. Nothing else. The site rebuilds each morning and picks it up. To publish
   immediately, go to **Actions → Deploy to GitHub Pages → Run workflow**.

### Adding a blog post

Create `src/content/blog/my-post.md` (`summary`, `author`, `tags`, and `draft: true` are optional):

```markdown
---
title: A title
date: 2026-10-01
summary: One sentence for the card.
---

Write here.
```

Commit it. That's the whole process — you can do it at github.com without cloning.

### Adding a transcript

Create `src/content/transcripts/<episode-slug>.md` with front matter
`episode: <episode-slug>`. The slug is the last part of the episode URL. It appears
as a collapsed "Full transcript" section on that episode's page.

---

## First-time setup

### 1. Push to GitHub

```bash
cd site
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/3-Guys-Podcast/site.git
git push -u origin main
```

### 2. Turn on Pages

Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.

### 3. Point the domain (Namecheap)

Namecheap → Domain List → **Manage** on 3guys.chat → **Advanced DNS**. Delete the
default parking records, then add:

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| A | @ | 185.199.108.153 | Automatic |
| A | @ | 185.199.109.153 | Automatic |
| A | @ | 185.199.110.153 | Automatic |
| A | @ | 185.199.111.153 | Automatic |
| CNAME | www | 3-guys-podcast.github.io. | Automatic |

Back in **Settings → Pages**, put `3guys.chat` in Custom domain and tick
**Enforce HTTPS** once the certificate finishes (can take an hour).

The `public/CNAME` file already holds the domain, so it survives every deploy.

### 4. Wire up the submit form

Sign up at [formspree.io](https://formspree.io) (free tier: 50 submissions/month),
create a form, and paste its endpoint into the `FORMSPREE` constant at the top of
`src/pages/submit.astro`. Until then the form posts nowhere.

### 5. Analytics (optional)

Cloudflare Web Analytics is free, cookieless, and needs no banner. Add the site at
dash.cloudflare.com → Web Analytics, then paste the token into the commented
`<script>` in `src/layouts/Base.astro` and uncomment it.

---

## Notes and known edges

- **Episode numbering.** The feed's `itunes:episode` tags have had duplicates. The
  site trusts them only when all episodes carry a unique one; otherwise it numbers
  by date. Fix the tags in Podbean and it uses yours.
- **Episodes 1–3 have no chapter file**, so they show "no chapters yet" and get no
  topic list. Backfilling one is just uploading a JSON file to Podbean.
- **Host photos** are currently crops from the cover illustration. Swap the three
  files in `public/img/` for real photos when you have them — same names, same 4:5 shape.
- **Audio plays from Podbean's CDN**, so downloads still count in your Podbean stats.
- **Deep links**: `/episodes/<slug>/?t=2507` opens the episode at that second. The
  chapter buttons use the same mechanism.
- **Playback position** is remembered per episode in the browser's local storage, and
  offered back as a "Resume at…" bar. It does not survive navigating to another page
  mid-listen; that would require a client-side router.
