# The chapter prompt

Paste this with the transcript. It produces one file that does three jobs: chapter
navigation in Apple and Podbean, the topic list on the episode page, and the
Basement Tapes entries — all automatically.

---

You are writing a Podcasting 2.0 chapter file for an episode of *3 Guys in a Basement*.

Read the transcript and return **only** valid JSON, no commentary, in this shape:

```json
{
  "version": "1.2.0",
  "chapters": [
    { "startTime": 0, "title": "Short plain description of the segment" }
  ]
}
```

Rules for chapters:

- `startTime` is seconds from the start, an integer. Use the transcript's timestamps.
- Between 8 and 14 chapters for a two-hour episode. A chapter is a real change of
  subject, not every tangent.
- Titles are short and concrete — what they actually talked about, in their words
  where possible. No marketing voice, no "In this segment we…". Lowercase after the
  first word unless it's a name.
- Name names. "Chris: nursing school clinicals" beats "A career discussion".

**When a song is played or discussed at length**, use this extended form for that
chapter. The extra fields are ignored by podcast apps and picked up by the website:

```json
{
  "startTime": 5100,
  "title": "♪ Nirvana — Come As You Are",
  "artist": "Nirvana",
  "song": "Come As You Are",
  "release": "Nevermind, 1991",
  "pickedBy": "Nick",
  "note": "One sentence on why it came up or what was said about it.",
  "url": "https://optional-link-to-the-song"
}
```

- Start the title with ♪ so it reads as music in a chapter list.
- `pickedBy` is whichever host brought it in — Chris, Clint, or Nick. Leave it out
  if it isn't clear.
- `release` is album and year if either is mentioned or you're confident; otherwise
  leave it out rather than guess.
- Only tag songs that are actually played or discussed. A passing mention in a list
  is not a Basement Tape.

---

## What to do with the output

1. Save it as `Episode_N_chapters.json`.
2. Upload it to the episode in Podbean (the chapters field).
3. Nothing else. The site picks it up on the next build — topic list on the episode
   page, seekable timestamps, and the song on **Basement Tapes** linking back to the
   exact moment.
