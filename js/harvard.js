// Search the Harvard Art Museums collection with the visitor's own API key.
// Docs: https://github.com/harvardartmuseums/api-docs
// The key is supplied by the person using the page, kept only in their
// browser, and sent only to api.harvardartmuseums.org. It is never part of
// this site's code.

const API = 'https://api.harvardartmuseums.org/object';
const STORE = 'pp-harvard-key';

export const KEY_REQUEST_URL = 'https://docs.google.com/forms/d/1Fe1H4nOhFkrLpaeBpLAnSrIMYvcAxnYWm0IU9a6IkFA/viewform';
export const API_DOCS_URL = 'https://github.com/harvardartmuseums/api-docs';

export function loadKey() {
  try {
    return localStorage.getItem(STORE) || sessionStorage.getItem(STORE) || null;
  } catch {
    return null;
  }
}

// remember = true keeps it on this device; otherwise only until the tab closes
export function saveKey(key, remember) {
  forgetKey();
  try {
    (remember ? localStorage : sessionStorage).setItem(STORE, key);
  } catch {
    /* storage unavailable: the key lives only in memory for this visit */
  }
}

export function forgetKey() {
  try {
    localStorage.removeItem(STORE);
    sessionStorage.removeItem(STORE);
  } catch {
    /* nothing stored */
  }
}

export function maskKey(key) {
  return key ? `…${key.slice(-4)}` : '';
}

export class HarvardKeyError extends Error {}

export async function searchHarvard(q, key, { paintingsOnly = true } = {}) {
  const params = new URLSearchParams({
    apikey: key,
    keyword: q,
    hasimage: '1',
    size: '18',
    fields: 'objectid,objectnumber,title,dated,datebegin,people,images,primaryimageurl,url,medium',
  });
  if (paintingsOnly) params.set('classification', 'Paintings');
  const res = await fetch(`${API}?${params}`, { credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (res.status === 401 || res.status === 403) throw new HarvardKeyError('key rejected');
  if (!res.ok) throw new Error(`Harvard API ${res.status}`);
  const json = await res.json();
  return (json.records || [])
    .map((r) => {
      const img = (r.images || []).find((i) => i && i.iiifbaseuri);
      const iiif = img?.iiifbaseuri?.replace(/^http:/, 'https:');
      const base = r.primaryimageurl?.replace(/^http:/, 'https:');
      if (!iiif && !base) return null; // rights-restricted images come without URLs
      const artist = (r.people || []).find((p) => p.role === 'Artist')?.name || r.people?.[0]?.name || 'Unknown artist';
      return {
        id: r.objectid,
        title: r.title || 'Untitled',
        artist,
        dateDisplay: r.dated || '',
        year: Number.isFinite(r.datebegin) && r.datebegin !== 0 ? r.datebegin : null,
        medium: r.medium || '',
        number: r.objectnumber || '',
        url: r.url || '',
        image: iiif ? `${iiif}/full/!900,900/0/default.jpg` : `${base}?width=900`,
        thumb: iiif ? `${iiif}/full/!240,240/0/default.jpg` : `${base}?width=240`,
      };
    })
    .filter(Boolean);
}
