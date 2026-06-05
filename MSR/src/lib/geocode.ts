const cache = new Map<string, { lat: number; lng: number } | null>();
let lastRequestTime = 0;

async function throttle() {
  const now = Date.now();
  const diff = now - lastRequestTime;
  if (diff < 1100) {
    await new Promise((r) => setTimeout(r, 1100 - diff));
  }
  lastRequestTime = Date.now();
}

export async function geocodeZip(
  zipCode: string
): Promise<{ lat: number; lng: number } | null> {
  const trimmed = zipCode.trim();
  if (cache.has(trimmed)) return cache.get(trimmed)!;

  try {
    await throttle();
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(trimmed)}&country=US&format=json&limit=1`,
      { headers: { "User-Agent": "NeighborhoodNook/1.0" } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      cache.set(trimmed, result);
      return result;
    }
    cache.set(trimmed, null);
    return null;
  } catch {
    cache.set(trimmed, null);
    return null;
  }
}

export async function geocodeZips(
  zipCodes: string[]
): Promise<Map<string, { lat: number; lng: number }>> {
  const unique = [...new Set(zipCodes.map((z) => z.trim()))];
  const results = new Map<string, { lat: number; lng: number }>();

  for (const zip of unique) {
    const coords = await geocodeZip(zip);
    if (coords) results.set(zip, coords);
  }

  return results;
}
