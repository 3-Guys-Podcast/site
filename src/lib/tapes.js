/* Basement Tapes — self-contained. Does not import or modify feed.js.
   Reads the podcast feed, finds chapter files, and returns any chapter tagged
   as music. No dependencies: the feed is parsed with narrow regexes rather than
   an XML library, so this drops into any Astro project as-is. */

const FEED_URL = 'https://feed.podbean.com/ThreeGuysBasement/feed.xml';

const NOTE = /^\s*[\u266A\u266B\u{1F3B5}\u{1F3B6}]\s*/u;

export function fmtTime(sec) {
  sec = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return (h ? h + ':' : '') + mm + ':' + String(s).padStart(2, '0');
}

export function slugify(s) {
  return String(s)
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function decode(s) {
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .trim();
}

function pick(block, tag) {
  const m = block.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>', 'i'));
  return m ? decode(m[1]) : '';
}

/* Podbean's chapter editor is a form: start time and title, nothing else. So
   everything the tapes page needs is encoded in the TITLE, which is the one field
   that always survives. The convention:

     ♪ Artist — Song
     ♪ Artist — Song (Clint)
     ♪ Artist — Song [Album, Year]
     ♪ Artist — Song [Album, Year] (Clint)

   Reads fine as a chapter title in Apple Podcasts, and parses here. Anything
   richer — a sentence about why it came up, a link — goes in tape-notes.json.

   PICKERS is the guard that makes real song titles safe. A trailing parenthetical
   is only treated as "who picked it" when its contents are names from this list;
   otherwise it stays part of the song. That keeps "Alive (Live)" and
   "(Don't Fear) The Reaper" intact. Add guests here when they pick something. */

export const PICKERS = ['Chris', 'Clint', 'Nick', 'Pepper'];

const PICKER_SET = new Set(PICKERS.map((n) => n.toLowerCase()));

// "Clint" / "Nick & Pepper" / "Chris, Clint" — every name must be known.
function asPickers(s) {
  const names = String(s).split(/\s*(?:,|&|\band\b)\s*/i).map((n) => n.trim()).filter(Boolean);
  if (!names.length) return '';
  return names.every((n) => PICKER_SET.has(n.toLowerCase())) ? names.join(' & ') : '';
}

function parseTape(c) {
  const rawTitle = String(c.title || '');
  if (!NOTE.test(rawTitle) && !c.artist) return null;

  let body = rawTitle.replace(NOTE, '').trim();
  let pickedBy = '';
  let release = '';

  // Only a TRAILING parenthetical, and only if it is a known picker. Anything
  // else — "(Live)", "(Remastered)", a parenthetical mid-title — is left alone.
  const by = body.match(/\s*\(([^()]{1,40})\)\s*$/);
  if (by) {
    const names = asPickers(by[1]);
    if (names) { pickedBy = names; body = body.slice(0, by.index).trim(); }
  }

  // Only a TRAILING bracket group is the release. A bracket mid-title stays put.
  const rel = body.match(/\s*\[([^\[\]]{1,80})\]\s*$/);
  if (rel) { release = rel[1].trim(); body = body.slice(0, rel.index).trim(); }

  // Artist and song split on the FIRST spaced em, en, or hyphen dash, so a dash
  // inside the song title does not move the split.
  const cut = body.match(/\s+[\u2014\u2013-]\s+/);
  const artistRaw = cut ? body.slice(0, cut.index) : body;
  const songRaw = cut ? body.slice(cut.index + cut[0].length) : '';

  return {
    artist: (c.artist ? String(c.artist) : artistRaw).trim(),
    song: String(c.song || c.track || songRaw).trim(),
    release: String(c.release || c.album || release),
    pickedBy: String(c.pickedBy || c.by || pickedBy),
    note: String(c.note || ''),
    link: String(c.url || ''),
    seconds: Math.round(Number(c.startTime) || 0),
  };
}

import notes from '../data/tape-notes.json';

let cache = null;

export async function getTapes() {
  if (cache) return cache;

  const res = await fetch(FEED_URL);
  if (!res.ok) throw new Error('Feed fetch failed: ' + res.status);
  const xml = await res.text();

  const items = (xml.match(/<item>[\s\S]*?<\/item>/g) || []).map((block) => {
    const chaptersUrl = (block.match(/<podcast:chapters[^>]*url="([^"]+)"/i) || [])[1] || '';
    const title = pick(block, 'itunes:title') || pick(block, 'title');
    const pubDate = pick(block, 'pubDate');
    const epTag = pick(block, 'itunes:episode');
    return {
      title,
      slug: slugify(title),
      date: new Date(pubDate),
      episodeTag: epTag ? Number(epTag) : null,
      chaptersUrl,
    };
  });

  items.sort((a, b) => b.date - a.date);

  const tags = items.map((i) => i.episodeTag).filter((n) => Number.isFinite(n));
  const tagsUnique = new Set(tags).size === tags.length && tags.length === items.length;

  const nested = await Promise.all(items.map(async (ep, i) => {
    const num = String(tagsUnique ? ep.episodeTag : items.length - i).padStart(2, '0');
    if (!ep.chaptersUrl) return [];
    let chapters = [];
    try {
      const r = await fetch(ep.chaptersUrl);
      if (!r.ok) return [];
      chapters = (await r.json()).chapters || [];
    } catch { return []; }
    return chapters
      .map(parseTape)
      .filter(Boolean)
      .map((t) => ({
        ...t,
        episode: ep.slug,
        episodeNum: num,
        episodeTitle: ep.title,
        sortDate: ep.date.getTime(),
      }));
  }));

  cache = nested
    .flat()
    .map((t) => ({ ...t, ...(notes[t.episode + '@' + t.seconds] || {}) }))
    .sort((a, b) => b.sortDate - a.sortDate || a.seconds - b.seconds);
  return cache;
}
