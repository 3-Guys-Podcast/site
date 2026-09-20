# Handoff — 3guys.chat

Written for the Claude session working in the GitHub repo. The user (Chris) is one
of three hosts of *3 Guys in a Basement*. The site is **already live**. Everything
below is an addition to a running site, not a greenfield build.

---

## The stack, as it stands

- **Astro**, static output, hosted free on **GitHub Pages** at `3guys.chat`
  (org: `3-Guys-Podcast`, domain registered at Namecheap).
- **Episode data comes from the podcast feed at build time** —
  `https://feed.podbean.com/ThreeGuysBasement/feed.xml`. Nobody types an episode
  title, date, length, or audio URL into the repo. Ever.
- The deploy workflow rebuilds **daily on a cron**, so a new Podbean episode
  appears on the site without a push.
- Design system is **Nocturne** (dark), retuned to the show's cover art: basement
  navy ground `#14202e`, bulb-orange accent `#ef7a2c`, cream ink `#f3ede2`.
  Tokens live in `src/styles/nocturne.css` + `src/styles/brand.css`.
  **Take every color, space, and radius from `var(--*)`. Do not hand-write hexes.**

### Two Nocturne gotchas that have bitten twice

1. **The spacing scale skips 5, 7, and 9.** `--space-5` does not exist and silently
   collapses to zero padding. Valid steps: 2, 3, 4, 6, 8.
2. **`--color-neutral-500` on `--color-surface` is 3.9:1** — under the 4.5:1 floor
   for body text. Use `--color-neutral-400` (≈5.9:1) for anything at 11–13px.

### Mobile floor

Phone breakpoint is `@media (max-width: 680px)`. Every touch target gets a
`min-height` of at least 44px there; the design system's defaults are 29–36px and
must be bumped explicitly. This has been the single most common defect.

---

## The three downloads

Each is an independent drop-in. None overwrites a file the user has edited, with
one stated exception noted below. Each carries its own `PATCH-README.md` with exact
install steps — **read it before copying anything**.

### 1. `patch-basement-tapes/` — the Basement Tapes page

A page listing every record discussed on the show, each linking to the exact second
of the episode it came up.

**Files:** `src/lib/tapes.js`, `src/styles/tapes.css`,
`src/pages/basement-tapes.astro`. All new. Plus one nav line in `Base.astro`.

**The important design decision:** `tapes.js` parses the feed *itself* with regexes
and has **no npm dependencies and no import of `feed.js`**. That is deliberate — it
means whatever the user has done to the feed parser or stylesheet, this cannot
break it. Do not "clean it up" by making it import `feed.js`.

**Where the data comes from — read this carefully, it was revised once.**

Podbean's chapter editor is a **form**: start time and title, and that is all. It
generates the `podcast:chapters` JSON itself, so extra keys cannot be injected. An
earlier version of this patch assumed an uploadable JSON file with `artist` /
`pickedBy` / `note` fields. **That was wrong and has been reworked.**

Everything now rides in the **chapter title**, the one field that always survives:

```
♪ Artist — Song [Album, Year] (Host who picked it)
```

```
51:30   ♪ Steely Dan — Deacon Blues [Aja, 1977] (Clint)
1:25:00 ♪ Nirvana — Come As You Are (Nick)
```

The ♪ prefix marks the chapter as music. `[…]` and `(…)` are optional and stripped
before the artist/song split on an em dash. `parseTape()` in `tapes.js` does this;
it still honours real `artist`/`song`/`note` keys if a future host ever supports
them, so the code works either way.

**Free-form notes** have nowhere to live in Podbean, so they go in
`src/data/tape-notes.json` in the repo, keyed `"<episode-slug>@<seconds>"`. That
file is merged over the parsed values and **must exist** (`{}` is fine) — the page
imports it. It is the one place Chris types tapes data by hand, and it is optional.

`CHAPTERS-PROMPT.md` is the prompt Chris pastes with a transcript; it outputs the
list he types into Podbean.

Links are built as `/episodes/<slug>/?t=<seconds>`. If the player does not read
`?t=` yet, the two-line fix is in the patch README.

### 2. `patch-submit-thanks/` — submit confirmation without leaving the site

Currently the submit form posts to Formspree and dumps the visitor on a generic
Formspree page. This replaces that with an inline confirmation: the form posts in
the background and swaps itself for a thank-you, in place.

**Files:** `src/components/SubmitForm.astro`, `src/styles/submit.css`,
`src/pages/thanks.astro`. Then `submit.astro` imports the component in place of its
inline `<form>`.

**Three decisions worth preserving if you refactor:**
- **No navigation.** Audio keeps playing and the visitor keeps their place.
- **No auto-redirect on a timer.** It reads as broken and screen readers get the
  confirmation announced only to have it pulled away. The panel offers two next
  steps; people leave when they choose to.
- `thanks.astro` exists **only** as a no-JS fallback. Set it as the redirect URL in
  Formspree's settings. Almost nobody will see it.

A `_gotcha` honeypot is included; Formspree checks it automatically.

**Still needs from Chris:** the real Formspree endpoint. The constant is a
placeholder (`YOUR_FORM_ID`).

### 3. `patch-persistent-player/` — sitewide audio that survives navigation

A mini player pinned to the bottom of every page. Playback continues while people
browse — click a song on Basement Tapes, keep reading the episode page, keep
listening.

**Files:** `src/components/MiniPlayer.astro`, `src/styles/miniplayer.css`. Plus
`<ClientRouter />` in `Base.astro`'s head and `<MiniPlayer />` before `</body>`.

Built on **Astro's own view transitions** (`transition:persist`). No framework, no
SPA rewrite.

**⚠ This is the one patch that changes existing behavior.** The mini player becomes
the *only* `<audio>` element on the site. The episode page's play button and chapter
rows stop owning audio and become controls that call `window.TGB`. If Chris has
edited `Player.astro`, **those edits need porting by hand** — ask him before
overwriting. The patch README has the exact markup contract
(`data-episode`, `data-page-play`, `data-seek`).

Implementation notes that are easy to break:
- The script is **guarded by `if (!window.TGB)`** because `transition:persist` keeps
  the DOM but the script tag re-runs on every navigation.
- Page-level controls rebind on `astro:page-load`, with a `data-bound` flag to
  avoid double-binding.
- Media Session API is wired for lock-screen and headphone controls.
- Hard reloads still stop audio. Browsers allow no alternative. Position is saved
  in `localStorage` under `tgb:pos:<guid>` and offered back.

**Chris has not committed to this one yet.** He was told to install it only when he
has appetite for touching `Player.astro`. Confirm before proceeding.

---

## Open items

| Item | Status |
| --- | --- |
| Formspree endpoint | Placeholder — Chris needs to create the form |
| Cloudflare Analytics token | Commented out in `Base.astro`, awaiting token |
| Host photos | Currently crops from the cover illustration, in `public/img/host-*.jpg`. Swap for real photos, same filenames, 4:5 |
| Chapter files for episodes 1–3 | None. Chris chose to launch without; backfilling is just uploading JSON to Podbean |
| `itunes:author` inconsistency | Was "Three Guys Radio" on some episodes, show name on others. Chris is watching it going forward |
| Explicit flags | Advice given: mark every episode explicit, since the channel already is. Chris agreed |
| Transcripts | Collection exists and renders, unused. Drop `src/content/transcripts/<episode-slug>.md` with front matter `episode: <slug>` |

## Episode numbering — do not "fix" this

`feed.js` trusts `itunes:episode` tags **only when every episode has a unique one**,
and otherwise numbers by date. This is defensive: the feed had duplicate and missing
tags. Chris has corrected episode 1. Leave the guard in place.

---

## Working with Chris

He is technical, comfortable with git, and is the only one of the three hosts who
is. He asks good "is this best practice or just easier" questions and wants the
honest answer, including when the honest answer is that something is not worth the
effort. Do not oversell. If a change has a real cost, say what it is.
