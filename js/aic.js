// Search the Art Institute of Chicago's open API for public-domain images.
// Docs: https://api.artic.edu/docs/  (IIIF images are served with CORS headers)
const API = 'https://api.artic.edu/api/v1/artworks/search';

export async function searchAIC(q) {
  const params = new URLSearchParams({
    q,
    'query[term][is_public_domain]': 'true',
    fields: 'id,title,image_id,artist_title,date_display,date_start',
    limit: '18',
  });
  const res = await fetch(`${API}?${params}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`AIC ${res.status}`);
  const json = await res.json();
  const base = json.config?.iiif_url || 'https://www.artic.edu/iiif/2';
  return (json.data || [])
    .filter((d) => d.image_id)
    .map((d) => ({
      id: d.id,
      title: d.title,
      artist: d.artist_title || 'Unknown artist',
      dateDisplay: d.date_display || '',
      year: Number.isFinite(d.date_start) ? d.date_start : null,
      image: `${base}/${d.image_id}/full/843,/0/default.jpg`,
      thumb: `${base}/${d.image_id}/full/200,/0/default.jpg`,
    }));
}
