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

function parseTape(c) {
  const rawTitle = String(c.title || '');
  const flagged = NOTE.test(rawTitle);
  if (!c.artist && !flagged) return null;

  let artist = c.artist ? String(c.artist) : '';
  let song = c.song || c.track || '';
  if (!artist || !song) {
    const bare = rawTitle.replace(NOTE, '');
    const split = bare.split(/\s+[\u2014\u2013-]\s+/);
    if (!artist) artist = (split[0] || bare).trim();
    if (!song) song = split.slice(1).join(' \u2014 ').trim();
  }
  return {
    artist,
    song: String(song || ''),
    release: String(c.release || c.album || ''),
    pickedBy: String(c.pickedBy || c.by || ''),
    note: String(c.note || ''),
    link: String(c.url || ''),
    seconds: Math.round(Number(c.startTime) || 0),
  };
}

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

  cache = nested.flat().sort((a, b) => b.sortDate - a.sortDate || a.seconds - b.seconds);
  return cache;
}
