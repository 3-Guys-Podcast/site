# The chapter prompt

Paste this with the transcript. It produces a chapter list you type into Podbean's
chapter editor. The music titles follow a convention the website reads, so one
list does three jobs: chapter navigation in podcast apps, the topic list on the
episode page, and the Basement Tapes entries.

---

You are writing the chapter list for an episode of *3 Guys in a Basement*.

Read the transcript and return a plain two-column list — start time, then title —
one chapter per line, nothing else. Times as `H:MM:SS` or `MM:SS`, matching the
transcript.

Rules:

- Between 8 and 14 chapters for a two-hour episode. A chapter is a real change of
  subject, not every tangent.
- Titles are short and concrete — what they actually talked about, in their words
  where possible. No marketing voice, no "In this segment we…". Lowercase after
  the first word unless it's a name.
- Name names. "Chris: nursing school clinicals" beats "A career discussion".

**When a song is played or discussed at length**, write that chapter's title in
this exact form:

```
♪ Artist — Song [Album, Year] (Host who picked it)
```

Examples:

```
51:30   ♪ Steely Dan — Deacon Blues [Aja, 1977] (Clint)
1:25:00 ♪ Nirvana — Come As You Are (Nick)
```

- The ♪ is required — it is how the website knows the chapter is music.
- Use an em dash between artist and song.
- `[Album, Year]` and `(Host)` are both optional. Leave either out rather than
  guess.
- **The host parenthetical must be a real name** — Chris, Clint, Nick, or Pepper
  (add guests to `PICKERS` in `src/lib/tapes.js` first). Anything else in trailing
  parentheses is treated as part of the song title, which is deliberate: songs like
  "Alive (Live)" and "(Don't Fear) The Reaper" keep their own parentheses.
- **Keep the whole title under about 80 characters.** Apple truncates long chapter
  titles on screen. The album bracket is the first thing to drop when a line runs
  long — artist, song, and host matter more.
- Only tag songs actually played or discussed. A passing mention in a list is not
  a Basement Tape.

---

## What to do with the output

1. Open the episode in Podbean → chapters → type the list in.
2. Nothing else. The site rebuilds each morning and picks it up — topic list on the
   episode page, seekable timestamps, and each song on **Basement Tapes** linking
   back to the exact moment.

## If you want to add a sentence about a song

Podbean has nowhere to put one. Add it to `src/data/tape-notes.json` in the site
repo instead, keyed by episode slug and start time in seconds:

```json
{
  "the-homework-episode@5100": {
    "note": "Came up while arguing about whether the band knew what the word meant.",
    "link": "https://optional-link"
  }
}
```

Entirely optional. Songs without a note look fine.
