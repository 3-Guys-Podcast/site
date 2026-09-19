import { XMLParser } from 'fast-xml-parser';

export const FEED_URL = 'https://feed.podbean.com/ThreeGuysBasement/feed.xml';

export function slugify(s) {
  return String(s)
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/['\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.round(Number(sec) || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return (h ? h + ':' : '') + mm + ':' + String(s).padStart(2, '0');
}

export function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// itunes:duration may be seconds ("7380") or "HH:MM:SS".
function toSeconds(v) {
  if (v == null) return 0;
  const str = String(v).trim();
  if (!str.includes(':')) return Number(str) || 0;
  return str.split(':').reverse()
    .reduce((acc, part, i) => acc + (Number(part) || 0) * Math.pow(60, i), 0);
}

function text(v) {
  if (v == null) return '';
  if (typeof v === 'object') return String(v['#text'] ?? '');
  return String(v);
}

async function loadChapters(url) {
  if (!url) return [];
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.chapters || [])
      .filter((c) => c && c.title)
      .map((c) => ({
        start: Math.round(Number(c.startTime) || 0),
        label: fmtTime(c.startTime),
        title: String(c.title),
      }))
      .sort((a, b) => a.start - b.start);
  } catch {
    return [];
  }
}

let cache = null;

export async function getShow() {
  if (cache) return cache;

  const res = await fetch(FEED_URL);
  if (!res.ok) throw new Error('Feed fetch failed: ' + res.status);
  const xml = await res.text();

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    cdataPropName: '__cdata',
    trimValues: true,
  });
  const doc = parser.parse(xml);
  const channel = doc.rss.channel;
  const rawItems = Array.isArray(channel.item) ? channel.item : [channel.item];

  const items = rawItems.map((it) => {
    const desc = it.description?.__cdata ?? it.description ?? '';
    const summary = it['itunes:summary']?.__cdata ?? it['itunes:summary'] ?? '';
    const body = it['content:encoded']?.__cdata ?? it['content:encoded'] ?? desc;
    return {
      guid: text(it.guid),
      title: text(it['itunes:title'] || it.title),
      pubDate: text(it.pubDate),
      date: new Date(text(it.pubDate)),
      audio: it.enclosure?.['@_url'] || '',
      seconds: toSeconds(it['itunes:duration']),
      episodeTag: it['itunes:episode'] != null ? Number(it['itunes:episode']) : null,
      season: it['itunes:season'] != null ? Number(it['itunes:season']) : null,
      chaptersUrl: it['podcast:chapters']?.['@_url'] || '',
      image: it['itunes:image']?.['@_href'] || channel['itunes:image']?.['@_href'] || '',
      podbeanUrl: text(it.link),
      html: String(body),
      summary: String(summary).replace(/<[^>]+>/g, '').trim(),
    };
  });

  items.sort((a, b) => b.date - a.date);

  // The feed's itunes:episode tags have been unreliable, so derive a display
  // number from chronological order and only trust the tag when it is unique.
  const tags = items.map((i) => i.episodeTag).filter((n) => Number.isFinite(n));
  const tagsUnique = new Set(tags).size === tags.length && tags.length === items.length;
  const total = items.length;

  const episodes = await Promise.all(items.map(async (it, i) => {
    const number = tagsUnique ? it.episodeTag : total - i;
    const chapters = await loadChapters(it.chaptersUrl);
    return {
      ...it,
      number,
      num: String(number).padStart(2, '0'),
      slug: slugify(it.title),
      duration: fmtTime(it.seconds),
      dateLabel: fmtDate(it.date),
      chapters,
      hasChapters: chapters.length > 0,
      chapterNote: chapters.length ? chapters.length + ' topics' : 'no chapters yet',
    };
  }));

  cache = {
    title: text(channel.title),
    description: String(channel.description?.__cdata ?? channel.description ?? '')
      .replace(/<[^>]+>/g, '').trim(),
    cover: channel['itunes:image']?.['@_href'] || '',
    link: text(channel.link),
    episodes,
  };
  return cache;
}
