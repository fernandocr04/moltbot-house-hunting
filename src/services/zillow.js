/**
 * Zillow property data fetcher and parser.
 * Extracts property data from Zillow's embedded __NEXT_DATA__ JSON blob.
 */

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Cache-Control': 'no-cache',
  'Upgrade-Insecure-Requests': '1',
};

/**
 * Fetch and parse a Zillow property listing URL.
 * Returns a normalized property object.
 */
export async function fetchZillowProperty(url) {
  const normalizedUrl = normalizeZillowUrl(url);
  if (!normalizedUrl) throw new Error('Not a valid Zillow listing URL');

  const response = await fetch(normalizedUrl, { headers: FETCH_HEADERS });
  if (!response.ok) {
    throw new Error(`Failed to fetch property (HTTP ${response.status})`);
  }

  const html = await response.text();
  const rawData = extractNextData(html);
  if (!rawData) throw new Error('Could not extract property data from page');

  return parsePropertyData(rawData, normalizedUrl);
}

function normalizeZillowUrl(url) {
  try {
    const parsed = new URL(url.trim());
    if (!parsed.hostname.includes('zillow.com')) return null;
    // Ensure https
    parsed.protocol = 'https:';
    return parsed.toString();
  } catch {
    return null;
  }
}

function extractNextData(html) {
  // Zillow embeds all property data in <script id="__NEXT_DATA__"> as JSON
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function parsePropertyData(nextData, sourceUrl) {
  // Try multiple paths where Zillow stores property data across page versions
  const property = findPropertyObject(nextData);
  if (!property) throw new Error('Property data not found in page response');

  const address = extractAddress(property);
  const photos = extractPhotos(property);
  const facts = extractFacts(property);

  return {
    id: String(property.zpid || Date.now()),
    url: sourceUrl,
    fetchedAt: new Date().toISOString(),

    // Core identity
    address: address.full,
    addressParts: address.parts,
    coordinates: {
      lat: address.lat,
      lng: address.lng,
    },

    // Price
    price: property.price ?? property.listPrice ?? null,
    priceFormatted: formatPrice(property.price ?? property.listPrice),

    // Stats
    bedrooms: property.bedrooms ?? null,
    bathrooms: property.bathrooms ?? property.bathroomsFull ?? null,
    sqft: property.livingArea ?? property.livingAreaValue ?? null,
    lotSize: property.lotSize ?? property.lotAreaValue ?? null,
    lotSizeUnit: property.lotAreaUnits ?? 'sqft',
    yearBuilt: property.yearBuilt ?? null,
    homeType: formatHomeType(property.homeType),

    // Financial
    monthlyHoa: property.monthlyHoaFee ?? null,
    annualTaxes: extractAnnualTaxes(property),

    // Content
    description: property.description ?? '',
    photos,

    // Structured facts (for feature filter matching)
    facts,

    // Schools
    schools: extractSchools(property),

    // Rating state (set by user)
    rating: null, // 'skip' | 'maybe' | 'like'
    ratedAt: null,
    notes: '',
  };
}

function findPropertyObject(nextData) {
  try {
    const pageProps = nextData?.props?.pageProps ?? {};

    // Path 1: gdpClientCache (most common in listing pages)
    if (pageProps?.componentProps?.gdpClientCache) {
      const cache =
        typeof pageProps.componentProps.gdpClientCache === 'string'
          ? JSON.parse(pageProps.componentProps.gdpClientCache)
          : pageProps.componentProps.gdpClientCache;
      const firstKey = Object.keys(cache)[0];
      const entry = cache[firstKey];
      if (entry?.property) return entry.property;
    }

    // Path 2: initialReduxState
    const reduxState = pageProps?.initialReduxState ?? pageProps?.initialData?.reduxState;
    if (reduxState?.gdp?.fullPage?.gdpClientCache) {
      const cache = reduxState.gdp.fullPage.gdpClientCache;
      const firstKey = Object.keys(cache)[0];
      if (cache[firstKey]?.property) return cache[firstKey].property;
    }

    // Path 3: direct property on pageProps
    if (pageProps?.property) return pageProps.property;

    // Path 4: listingDataModel
    if (pageProps?.componentProps?.listingDataModel) {
      return pageProps.componentProps.listingDataModel;
    }
  } catch {
    return null;
  }
  return null;
}

function extractAddress(property) {
  const a = property.address ?? {};
  const street = a.streetAddress ?? '';
  const city = a.city ?? '';
  const state = a.state ?? '';
  const zip = a.zipcode ?? '';
  const full = [street, city && state ? `${city}, ${state}` : city || state, zip]
    .filter(Boolean)
    .join(' ');

  return {
    full: full || 'Address unavailable',
    parts: { street, city, state, zip },
    lat: a.latitude ?? property.latitude ?? null,
    lng: a.longitude ?? property.longitude ?? null,
  };
}

function extractPhotos(property) {
  const photos = property.photos ?? property.originalPhotos ?? [];
  return photos
    .map((p) => {
      // Zillow photo objects have mixedSources.jpeg array sorted by width
      const sources = p?.mixedSources?.jpeg ?? p?.mixedSources?.webp ?? [];
      const best = sources.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
      return best?.url ?? p?.url ?? null;
    })
    .filter(Boolean)
    .slice(0, 20); // cap at 20 photos
}

function extractFacts(property) {
  const allFacts = [];

  // atAGlanceFacts — the summary bullet points Zillow shows at top
  const atAGlance = property.resoFacts?.atAGlanceFacts ?? [];
  atAGlance.forEach((f) => {
    if (f?.factLabel && f?.factValue) {
      allFacts.push({ label: f.factLabel, value: String(f.factValue) });
    }
  });

  // Flatten other resoFacts arrays (appliances, parking, interior features, etc.)
  const resoFacts = property.resoFacts ?? {};
  const listFields = [
    'appliances',
    'parkingFeatures',
    'interiorFeatures',
    'exteriorFeatures',
    'patioAndPorchFeatures',
    'lotFeatures',
    'communityFeatures',
    'architecturalStyle',
    'flooring',
    'cooling',
    'heating',
    'laundryFeatures',
    'poolFeatures',
    'spaFeatures',
    'fireplaceFeatures',
    'view',
    'waterBodyName',
  ];

  listFields.forEach((field) => {
    const val = resoFacts[field];
    if (!val) return;
    const values = Array.isArray(val) ? val : [val];
    if (values.length) {
      allFacts.push({
        label: camelToLabel(field),
        value: values.join(', '),
      });
    }
  });

  return allFacts;
}

function extractSchools(property) {
  return (property.schools ?? []).map((s) => ({
    name: s.name ?? '',
    level: s.level ?? '',
    rating: s.rating ?? null,
    distance: s.distance ?? null,
  }));
}

function extractAnnualTaxes(property) {
  if (property.annualHomeownersInsurance != null) return null; // not taxes
  const taxHistory = property.taxHistory ?? [];
  if (taxHistory.length) return taxHistory[0]?.taxPaid ?? null;
  return property.propertyTaxRate ?? null;
}

function formatPrice(price) {
  if (price == null) return 'Price unavailable';
  return '$' + Number(price).toLocaleString('en-US');
}

function formatHomeType(type) {
  if (!type) return '';
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function camelToLabel(str) {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
