import { config } from '../config';
import { logger } from '../utils/logger.util';

export type TempleAIDraft = {
  name?: string;
  city?: 'Vijayawada' | 'Nandiyala' | 'Vetlapalem' | '';
  fullAddress?: string;
  landmark?: string;
  description?: string;
  shortDescription?: string;
  latitude?: string;
  longitude?: string;
  deityName?: string;
  darshanTimings?: Array<{
    day: string;
    morningOpen: string;
    morningClose: string;
    eveningOpen: string;
    eveningClose: string;
  }>;
  templeType?: string;
  builtYear?: string;
  founder?: string;
  mythologicalSignificance?: string;
  historicalSignificance?: string;
  architectureStyle?: string;
  uniqueFeatures?: string;
  sacredNearby?: string;
  associatedLegends?: string;
  morningAarti?: string;
  afternoonAarti?: string;
  eveningAarti?: string;
  specialSevas?: string;
  festivalSpecificTimings?: string;
  generalEntryFee?: string;
  specialDarshanFee?: string;
  vipDarshanFee?: string;
  parkingAvailable?: boolean;
  wheelchairAccessible?: boolean;
  cloakroomAvailable?: boolean;
  restroomsAvailable?: boolean;
  drinkingWaterAvailable?: boolean;
  prasadamCounterAvailable?: boolean;
  photographyAllowed?: boolean;
  mobileRestrictions?: string;
  dressCodeMen?: string;
  dressCodeWomen?: string;
  securityNotes?: string;
  majorFestivals?: string;
  festivalDates?: string;
  annualBrahmotsavam?: string;
  rathotsavamDetails?: string;
  crowdExpectationLevel?: string;
  specialPoojas?: string;
  specialDecorationDays?: string;
  bestMonths?: string;
  bestTimeOfDay?: string;
  peakCrowdDays?: string;
  avoidDays?: string;
  weatherConditions?: string;
  nearbyTemples?: string;
  nearbyBeachesOrHills?: string;
  nearbyRestaurants?: string;
  nearbyHotels?: string;
  distanceRailwayStation?: string;
  distanceBusStand?: string;
  distanceAirport?: string;
  virtualTourUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  searchKeywords?: string;
  canonicalUrl?: string;
  openGraphImage?: string;
  structuredDataJsonLd?: string;
  devoteeTips?: string;
  thingsToCarry?: string;
  thingsNotAllowed?: string;
  idealVisitDuration?: string;
  suggestedItinerary?: string;
  localFoodRecommendations?: string;
  faqs?: string;
  emergencyContact?: string;
  templeOfficePhone?: string;
  lostAndFoundDesk?: string;
  medicalFacilityNearby?: string;
  policeStationNearby?: string;
};

type AutofillInput = {
  templeName: string;
  city?: string;
  additionalContext?: string;
  forceComplete?: boolean;
};

type DarshanTimingDraft = {
  day: string;
  morningOpen: string;
  morningClose: string;
  eveningOpen: string;
  eveningClose: string;
};

type NominatimTopMatch = {
  displayName: string;
  lat: string;
  lon: string;
};

type WikipediaContext = {
  text: string;
  sourceUrl: string;
  extract?: string;
  wikibaseItem?: string;
};

type WikidataFacts = {
  builtYear?: string;
  founder?: string;
};

type PrefillReport = {
  totalFields: number;
  filledFields: number;
  missingFields: string[];
  pass2Attempted: boolean;
  pass2FilledFields: number;
};

const STRING_PREFILL_FIELDS: Array<keyof TempleAIDraft> = [
  'name',
  'city',
  'fullAddress',
  'landmark',
  'description',
  'shortDescription',
  'latitude',
  'longitude',
  'deityName',
  'templeType',
  'builtYear',
  'founder',
  'mythologicalSignificance',
  'historicalSignificance',
  'architectureStyle',
  'uniqueFeatures',
  'sacredNearby',
  'associatedLegends',
  'morningAarti',
  'afternoonAarti',
  'eveningAarti',
  'specialSevas',
  'festivalSpecificTimings',
  'generalEntryFee',
  'specialDarshanFee',
  'vipDarshanFee',
  'mobileRestrictions',
  'dressCodeMen',
  'dressCodeWomen',
  'securityNotes',
  'majorFestivals',
  'festivalDates',
  'annualBrahmotsavam',
  'rathotsavamDetails',
  'crowdExpectationLevel',
  'specialPoojas',
  'specialDecorationDays',
  'bestMonths',
  'bestTimeOfDay',
  'peakCrowdDays',
  'avoidDays',
  'weatherConditions',
  'nearbyTemples',
  'nearbyBeachesOrHills',
  'nearbyRestaurants',
  'nearbyHotels',
  'distanceRailwayStation',
  'distanceBusStand',
  'distanceAirport',
  'virtualTourUrl',
  'metaTitle',
  'metaDescription',
  'searchKeywords',
  'canonicalUrl',
  'openGraphImage',
  'structuredDataJsonLd',
  'devoteeTips',
  'thingsToCarry',
  'thingsNotAllowed',
  'idealVisitDuration',
  'suggestedItinerary',
  'localFoodRecommendations',
  'faqs',
  'emergencyContact',
  'templeOfficePhone',
  'lostAndFoundDesk',
  'medicalFacilityNearby',
  'policeStationNearby',
];

const BOOLEAN_PREFILL_FIELDS: Array<keyof TempleAIDraft> = [
  'parkingAvailable',
  'wheelchairAccessible',
  'cloakroomAvailable',
  'restroomsAvailable',
  'drinkingWaterAvailable',
  'prasadamCounterAvailable',
  'photographyAllowed',
];

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

const safeParseJson = <T>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
};

const normalizeCity = (value?: string): 'Vijayawada' | 'Nandiyala' | 'Vetlapalem' | '' => {
  if (!value) return '';
  const normalized = value.toLowerCase();
  if (normalized.includes('vijayawada')) return 'Vijayawada';
  if (normalized.includes('nandiyala') || normalized.includes('nandyal')) return 'Nandiyala';
  if (normalized.includes('vetlapalem')) return 'Vetlapalem';
  return '';
};

const fetchNominatimContext = async (templeName: string, city?: string) => {
  const query = `${templeName} ${city || ''} temple`.trim();
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&addressdetails=1&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HostHavenTempleBot/1.0 (+https://hosthaven.com)',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      logger.warn({ status: response.status, url }, 'Nominatim fetch skipped');
      return { text: '', sourceUrl: '', topMatch: null as NominatimTopMatch | null };
    }

    const data = (await response.json()) as Array<Record<string, unknown>>;
    if (!Array.isArray(data) || data.length === 0) {
      return { text: '', sourceUrl: url, topMatch: null as NominatimTopMatch | null };
    }

    const first = data[0];
    const topMatch: NominatimTopMatch = {
      displayName: String(first?.display_name || ''),
      lat: String(first?.lat || ''),
      lon: String(first?.lon || ''),
    };

    const summary = data
      .slice(0, 3)
      .map((item, index) => {
        const displayName = String(item.display_name || '');
        const lat = String(item.lat || '');
        const lon = String(item.lon || '');
        const type = String(item.type || '');
        return `${index + 1}. ${displayName} | lat=${lat}, lon=${lon}, type=${type}`;
      })
      .join('\n');

    return {
      text: `Source: OpenStreetMap Nominatim\n${summary}`,
      sourceUrl: url,
      topMatch,
    };
  } catch (error) {
    logger.warn({ error }, 'Nominatim fetch failed');
    return { text: '', sourceUrl: url, topMatch: null as NominatimTopMatch | null };
  }
};

const fetchWikipediaSummary = async (title: string): Promise<WikipediaContext> => {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return { text: '', sourceUrl: url };
    }

    const data = (await response.json()) as Record<string, unknown>;
    const extract = String(data.extract || '').trim();
    if (!extract) {
      return { text: '', sourceUrl: url };
    }

    return {
      text: `Source: Wikipedia (${title})\n${extract}`,
      sourceUrl: url,
      extract,
      wikibaseItem: isNonEmptyString(data.wikibase_item) ? data.wikibase_item : undefined,
    };
  } catch (error) {
    logger.warn({ error, title }, 'Wikipedia summary fetch failed');
    return { text: '', sourceUrl: url };
  }
};

const fetchWikipediaBestTitle = async (query: string): Promise<string> => {
  const trimmed = query.trim();
  if (!trimmed) return '';

  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&utf8=1&srlimit=1&srsearch=${encodeURIComponent(trimmed)}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return '';
    }

    const data = (await response.json()) as Record<string, any>;
    const title = data?.query?.search?.[0]?.title;
    return typeof title === 'string' ? title : '';
  } catch (error) {
    logger.warn({ error, query }, 'Wikipedia search title lookup failed');
    return '';
  }
};

const getWikidataClaimValue = (entity: Record<string, any>, property: string) => {
  const claim = entity?.claims?.[property]?.[0];
  const dataValue = claim?.mainsnak?.datavalue?.value;
  return dataValue;
};

const resolveWikidataEntityLabels = async (entityIds: string[]) => {
  if (entityIds.length === 0) return new Map<string, string>();
  const uniqueIds = Array.from(new Set(entityIds));
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels&languages=en&ids=${encodeURIComponent(uniqueIds.join('|'))}`;

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return new Map<string, string>();

    const payload = (await response.json()) as Record<string, any>;
    const entities = payload.entities || {};
    const labels = new Map<string, string>();

    for (const id of uniqueIds) {
      const label = entities?.[id]?.labels?.en?.value;
      if (isNonEmptyString(label)) labels.set(id, label.trim());
    }

    return labels;
  } catch (error) {
    logger.warn({ error }, 'Wikidata label resolution failed');
    return new Map<string, string>();
  }
};

const fetchWikidataFacts = async (wikibaseItem?: string): Promise<WikidataFacts> => {
  if (!wikibaseItem) return {};
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(wikibaseItem)}.json`;

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return {};

    const payload = (await response.json()) as Record<string, any>;
    const entity = payload?.entities?.[wikibaseItem] as Record<string, any> | undefined;
    if (!entity) return {};

    const inceptionValue = getWikidataClaimValue(entity, 'P571');
    const founderValue = getWikidataClaimValue(entity, 'P112');

    let builtYear: string | undefined;
    if (inceptionValue?.time && typeof inceptionValue.time === 'string') {
      const yearMatch = inceptionValue.time.match(/([+-]\d{4})/);
      if (yearMatch?.[1]) {
        const raw = yearMatch[1].replace('+', '');
        builtYear = raw;
      }
    }

    let founder: string | undefined;
    if (founderValue?.id && typeof founderValue.id === 'string') {
      const labels = await resolveWikidataEntityLabels([founderValue.id]);
      founder = labels.get(founderValue.id);
    }

    return {
      builtYear,
      founder,
    };
  } catch (error) {
    logger.warn({ error, wikibaseItem }, 'Wikidata facts fetch failed');
    return {};
  }
};

const collectAutoWebContext = async (templeName: string, city?: string) => {
  const sources: string[] = [];
  const chunks: string[] = [];

  const nominatim = await fetchNominatimContext(templeName, city);
  if (nominatim.sourceUrl) {
    sources.push(nominatim.sourceUrl);
  }
  if (nominatim.text) {
    chunks.push(nominatim.text);
  }

  return {
    context: chunks.join('\n\n').slice(0, 35000),
    sources,
    topMatch: nominatim.topMatch,
    wikiExtract: '',
    wikidataFacts: {},
  };
};

const normalizeDarshanTimings = (value: unknown): DarshanTimingDraft[] => {
  if (!Array.isArray(value)) return [];

  const normalized = value
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        day: String(row.day || '').trim(),
        morningOpen: String(row.morningOpen || '').trim(),
        morningClose: String(row.morningClose || '').trim(),
        eveningOpen: String(row.eveningOpen || '').trim(),
        eveningClose: String(row.eveningClose || '').trim(),
      };
    })
    .filter(
      (row) =>
        row.day.length > 0 &&
        row.morningOpen.length > 0 &&
        row.morningClose.length > 0 &&
        row.eveningOpen.length > 0 &&
        row.eveningClose.length > 0,
    );

  return normalized;
};

const normalizeSpaces = (value: string) => {
  return value.replace(/\s+/g, ' ').trim();
};

const countWords = (value: string) => {
  return normalizeSpaces(value)
    .split(/\s+/)
    .filter(Boolean).length;
};

const buildShortDescriptionFromSource = (value: string) => {
  const cleaned = normalizeSpaces(value);
  if (!cleaned) return '';

  if (cleaned.length <= 160 && cleaned.length >= 40) {
    return cleaned;
  }

  const sentenceMatch = cleaned.match(/^(.{40,160}?)([.!?]|$)/);
  if (sentenceMatch?.[1]) {
    const text = normalizeSpaces(sentenceMatch[1]);
    if (text.length >= 40 && text.length <= 160) return text;
  }

  if (cleaned.length > 160) {
    const sliced = cleaned.slice(0, 157);
    const lastSpace = sliced.lastIndexOf(' ');
    const compact = normalizeSpaces(lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced);
    return `${compact}...`;
  }

  return cleaned;
};

const buildLongDescriptionFromSources = (parts: string[]) => {
  const joined = parts
    .map((part) => normalizeSpaces(part))
    .filter((part) => part.length > 0)
    .join('\n\n');

  return joined;
};

const runGeminiJson = async (
  prompt: string,
  uniqueModels: string[],
  apiKey: string,
): Promise<{ draft: TempleAIDraft; confidenceNote: string }> => {
  let payload: any = null;
  let lastErrorText = '';

  for (const model of uniqueModels) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      },
    );

    if (response.ok) {
      payload = (await response.json()) as any;
      logger.info({ model }, 'Gemini model selected for temple autofill');
      break;
    }

    const errorText = await response.text();
    lastErrorText = errorText;
    logger.warn({ model, status: response.status, errorText }, 'Gemini model attempt failed');

    if (response.status !== 404) {
      break;
    }
  }

  if (!payload) {
    logger.error({ lastErrorText }, 'All Gemini model attempts failed');
    throw new Error('Gemini request failed. Check API key, model access, quota, and network.');
  }

  const text =
    payload?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text)
      .filter(Boolean)
      .join('\n') || '';

  const parsed = safeParseJson<{ draft?: TempleAIDraft; confidenceNote?: string }>(text);
  if (!parsed?.draft) {
    logger.error({ text }, 'Gemini response parsing failed');
    throw new Error('Could not parse Gemini response into temple draft.');
  }

  return {
    draft: parsed.draft,
    confidenceNote: parsed.confidenceNote || '',
  };
};

const runOpenRouterJson = async (
  prompt: string,
  model: string,
  apiKey: string,
): Promise<{ draft: TempleAIDraft; confidenceNote: string }> => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      reasoning: { enabled: true },
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.warn({ model, status: response.status, errorText }, 'OpenRouter model attempt failed');
    throw new Error('OpenRouter request failed. Check API key, model access, quota, and network.');
  }

  const payload = (await response.json()) as any;
  const rawContent = payload?.choices?.[0]?.message?.content;
  const text = typeof rawContent === 'string' ? rawContent : '';
  const parsed = safeParseJson<{ draft?: TempleAIDraft; confidenceNote?: string }>(text);

  if (!parsed?.draft) {
    logger.error({ text }, 'OpenRouter response parsing failed');
    throw new Error('Could not parse OpenRouter response into temple draft.');
  }

  logger.info({ model }, 'OpenRouter model selected for temple autofill');

  return {
    draft: parsed.draft,
    confidenceNote: parsed.confidenceNote || '',
  };
};

const runLLMJson = async (
  prompt: string,
  openRouterModel: string,
  openRouterApiKey: string,
): Promise<{ draft: TempleAIDraft; confidenceNote: string }> => {
  if (openRouterApiKey) {
    return runOpenRouterJson(prompt, openRouterModel, openRouterApiKey);
  }

  throw new Error('OpenRouter is not configured. Set OPENROUTER_API_KEY.');
};

const getMissingFields = (draft: TempleAIDraft) => {
  const stringFields: Array<keyof TempleAIDraft> = [
    'name',
    'city',
    'fullAddress',
    'landmark',
    'latitude',
    'longitude',
    'shortDescription',
    'description',
    'deityName',
    'templeType',
    'builtYear',
    'founder',
    'mythologicalSignificance',
    'historicalSignificance',
    'architectureStyle',
    'uniqueFeatures',
    'sacredNearby',
    'associatedLegends',
    'morningAarti',
    'afternoonAarti',
    'eveningAarti',
    'specialSevas',
    'festivalSpecificTimings',
    'generalEntryFee',
    'specialDarshanFee',
    'vipDarshanFee',
    'mobileRestrictions',
    'securityNotes',
    'dressCodeMen',
    'dressCodeWomen',
    'majorFestivals',
    'festivalDates',
    'annualBrahmotsavam',
    'rathotsavamDetails',
    'crowdExpectationLevel',
    'specialPoojas',
    'specialDecorationDays',
    'bestMonths',
    'bestTimeOfDay',
    'peakCrowdDays',
    'avoidDays',
    'weatherConditions',
    'nearbyTemples',
    'nearbyBeachesOrHills',
    'nearbyRestaurants',
    'nearbyHotels',
    'distanceRailwayStation',
    'distanceBusStand',
    'distanceAirport',
    'metaTitle',
    'metaDescription',
    'searchKeywords',
    'canonicalUrl',
    'openGraphImage',
    'structuredDataJsonLd',
    'devoteeTips',
    'thingsToCarry',
    'thingsNotAllowed',
    'idealVisitDuration',
    'suggestedItinerary',
    'localFoodRecommendations',
    'faqs',
    'emergencyContact',
    'templeOfficePhone',
    'lostAndFoundDesk',
    'medicalFacilityNearby',
    'policeStationNearby',
  ];

  const boolFields: Array<keyof TempleAIDraft> = [
    'parkingAvailable',
    'wheelchairAccessible',
    'cloakroomAvailable',
    'restroomsAvailable',
    'drinkingWaterAvailable',
    'prasadamCounterAvailable',
    'photographyAllowed',
  ];

  const missing: string[] = [];

  for (const field of stringFields) {
    const value = draft[field];
    if (!isNonEmptyString(value)) {
      missing.push(field);
    }
  }

  for (const field of boolFields) {
    const value = draft[field];
    if (typeof value !== 'boolean') {
      missing.push(field);
    }
  }

  if (!Array.isArray(draft.darshanTimings) || draft.darshanTimings.length === 0) {
    missing.push('darshanTimings');
  }

  return missing;
};

const buildPrefillReport = (
  draft: TempleAIDraft,
  pass2Attempted: boolean,
  pass2FilledFields: number,
): PrefillReport => {
  const missingFields = getMissingFields(draft);
  const totalFields = STRING_PREFILL_FIELDS.length + BOOLEAN_PREFILL_FIELDS.length + 1;
  const filledFields = totalFields - missingFields.length;

  return {
    totalFields,
    filledFields,
    missingFields,
    pass2Attempted,
    pass2FilledFields,
  };
};

const completeDarshanTimings = (existing: DarshanTimingDraft[]) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const byDay = new Map(existing.map((item) => [item.day.toLowerCase(), item]));

  return days.map((day) => {
    const row = byDay.get(day.toLowerCase());
    return {
      day,
      morningOpen: row?.morningOpen || '05:00',
      morningClose: row?.morningClose || '12:00',
      eveningOpen: row?.eveningOpen || '16:00',
      eveningClose: row?.eveningClose || '21:00',
    };
  });
};

const fallbackStringByField = (
  field: string,
  templeName: string,
  city: string,
) => {
  const cityLabel = city || 'Unknown city';
  const templeNameLower = templeName.toLowerCase();
  const inferredDeityName =
    templeNameLower.includes('durga')
      ? 'Kanaka Durga'
      : templeNameLower.includes('shiva')
        ? 'Lord Shiva'
        : templeNameLower.includes('venkateswara') || templeNameLower.includes('balaji')
          ? 'Lord Venkateswara'
          : templeNameLower.includes('hanuman')
            ? 'Lord Hanuman'
            : templeNameLower.includes('ganesh') || templeNameLower.includes('vinayaka')
              ? 'Lord Ganesha'
              : templeNameLower.includes('rama')
                ? 'Lord Rama'
                : templeNameLower.includes('krishna')
                  ? 'Lord Krishna'
                  : templeNameLower.includes('lakshmi')
                    ? 'Goddess Lakshmi'
                    : 'Lord Shiva';
  const generic = `Auto-generated details for ${templeName}. Please verify.`;
  const cityDefaults: Record<string, { lat: string; lon: string; address: string; landmark: string }> = {
    Vijayawada: {
      lat: '16.506174',
      lon: '80.648015',
      address: `Temple area, ${cityLabel}, Andhra Pradesh, India`,
      landmark: `${cityLabel} central temple zone`,
    },
    Nandiyala: {
      lat: '15.477637',
      lon: '78.483610',
      address: `Temple area, ${cityLabel}, Andhra Pradesh, India`,
      landmark: `${cityLabel} main temple zone`,
    },
    Vetlapalem: {
      lat: '15.782401',
      lon: '80.355347',
      address: `Temple area, ${cityLabel}, Andhra Pradesh, India`,
      landmark: `${cityLabel} temple junction`,
    },
  };

  const cityInfo = cityDefaults[city] || {
    lat: '16.500000',
    lon: '80.600000',
    address: `Temple area, ${cityLabel}, Andhra Pradesh, India`,
    landmark: `${cityLabel} temple landmark`,
  };

  const map: Record<string, string> = {
    fullAddress: cityInfo.address,
    landmark: cityInfo.landmark,
    latitude: cityInfo.lat,
    longitude: cityInfo.lon,
    shortDescription: `${templeName} temple information in ${cityLabel}. Please verify details.`,
    description: `${templeName} is a temple listed for ${cityLabel}. Detailed information was auto-generated and should be verified with official sources.`,
    deityName: inferredDeityName,
    templeType: 'Hindu Temple',
    builtYear: 'Not publicly confirmed',
    founder: 'Not publicly confirmed',
    mythologicalSignificance: generic,
    historicalSignificance: generic,
    architectureStyle: 'Traditional temple architecture',
    uniqueFeatures: generic,
    sacredNearby: `Sacred sites near ${cityLabel}`,
    associatedLegends: generic,
    morningAarti: '06:00',
    afternoonAarti: '12:00',
    eveningAarti: '19:00',
    specialSevas: 'Sevas available at temple counter',
    festivalSpecificTimings: 'Varies by festival; verify locally',
    generalEntryFee: 'As per temple rules',
    specialDarshanFee: 'As per temple rules',
    vipDarshanFee: 'As per temple rules',
    mobileRestrictions: 'May be restricted in sanctum areas',
    securityNotes: 'Follow temple security instructions',
    dressCodeMen: 'Traditional modest attire',
    dressCodeWomen: 'Traditional modest attire',
    majorFestivals: 'Major Hindu festivals observed',
    festivalDates: 'As per lunar calendar',
    annualBrahmotsavam: 'Conducted annually (verify dates)',
    rathotsavamDetails: 'Festival chariot procession (verify schedule)',
    crowdExpectationLevel: 'Moderate to high on weekends/festivals',
    specialPoojas: 'Special poojas available on select days',
    specialDecorationDays: 'Festival and auspicious days',
    bestMonths: 'October to March',
    bestTimeOfDay: 'Morning and evening',
    peakCrowdDays: 'Weekends and festival days',
    avoidDays: 'Public holidays if avoiding crowds',
    weatherConditions: `Seasonal weather in ${cityLabel}`,
    nearbyTemples: `Popular temples near ${cityLabel}`,
    nearbyBeachesOrHills: `Nearby scenic locations around ${cityLabel}`,
    nearbyRestaurants: `Local restaurants near ${templeName}`,
    nearbyHotels: `HostHaven stays near ${cityLabel}`,
    distanceRailwayStation: 'Distance varies by route',
    distanceBusStand: 'Distance varies by route',
    distanceAirport: 'Distance varies by route',
    metaTitle: `${templeName} | Temple Guide`,
    metaDescription: `Discover timings, rituals, and travel info for ${templeName} in ${cityLabel}.`,
    searchKeywords: `${templeName}, ${cityLabel} temple, darshan timings`,
    canonicalUrl: `https://hosthaven.com/temples/${templeName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')}`,
    openGraphImage: 'https://hosthaven.com/default-og-temple.jpg',
    structuredDataJsonLd: '{"@context":"https://schema.org","@type":"Place"}',
    devoteeTips: 'Arrive early and follow temple guidelines',
    thingsToCarry: 'ID proof, water bottle, offerings (if permitted)',
    thingsNotAllowed: 'Restricted items and non-traditional dress',
    idealVisitDuration: '2-3 hours',
    suggestedItinerary: 'Morning darshan, local visit, evening aarti',
    localFoodRecommendations: 'Vegetarian local cuisine nearby',
    faqs: 'Please verify FAQs with temple office',
    emergencyContact: '112',
    templeOfficePhone: 'Not publicly listed',
    lostAndFoundDesk: 'Available at temple office',
    medicalFacilityNearby: `Nearest clinic in ${cityLabel}`,
    policeStationNearby: `Nearest police station in ${cityLabel}`,
  };

  return map[field] || generic;
};

const forceCompleteDraft = (draft: TempleAIDraft, templeName: string, city: string) => {
  const missingBefore = getMissingFields(draft);
  for (const field of missingBefore) {
    if (field === 'darshanTimings') {
      const current = Array.isArray(draft.darshanTimings) ? draft.darshanTimings : [];
      draft.darshanTimings = completeDarshanTimings(current);
      continue;
    }

    if (BOOLEAN_PREFILL_FIELDS.includes(field as keyof TempleAIDraft)) {
      (draft as any)[field] = false;
      continue;
    }

    (draft as any)[field] = fallbackStringByField(field, templeName, city);
  }

  if (!isNonEmptyString(draft.name)) {
    draft.name = templeName;
  }

  if (!isNonEmptyString(draft.city)) {
    draft.city = (city as TempleAIDraft['city']) || '';
  }

  return draft;
};

const getTemplateFallbackFields = (draft: TempleAIDraft, templeName: string, city: string) => {
  const fallbackFields: string[] = [];

  for (const field of STRING_PREFILL_FIELDS) {
    const current = (draft as any)[field];
    if (!isNonEmptyString(current)) continue;

    const fallback = fallbackStringByField(String(field), templeName, city);
    if (current.trim() === fallback.trim()) {
      fallbackFields.push(String(field));
    }
  }

  for (const field of BOOLEAN_PREFILL_FIELDS) {
    const current = (draft as any)[field];
    if (typeof current === 'boolean') {
      fallbackFields.push(String(field));
    }
  }

  return Array.from(new Set(fallbackFields));
};

const isTemplateLikeValue = (value: string, templeName: string) => {
  const normalized = value.trim().toLowerCase();
  const templeToken = templeName.trim().toLowerCase();
  return (
    normalized.includes('auto-generated details') ||
    normalized.includes('please verify') ||
    normalized === 'as per temple rules' ||
    normalized === 'distance varies by route' ||
    normalized.includes('major hindu festivals observed') ||
    (templeToken.length > 0 && normalized.includes(`auto-generated details for ${templeToken}`))
  );
};

const toSentences = (text: string) =>
  text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

const enrichFromSourceContext = (
  draft: TempleAIDraft,
  contextText: string,
  templeName: string,
  city: string,
) => {
  const source = contextText.replace(/\s+/g, ' ').trim();
  const sourceLower = source.toLowerCase();
  const sentences = toSentences(source);
  const cityLabel = city || 'the city';

  const mythSentence =
    sentences.find((line) => /(myth|legend|purana|swayambhu|devi|goddess|manifested)/i.test(line)) ||
    '';
  const historySentence =
    sentences.find((line) => /(history|historic|century|dynasty|kingdom|inscription|renovat)/i.test(line)) ||
    sentences.find((line) => /(famous|prominent|important temple)/i.test(line)) ||
    '';
  const uniqueSentence =
    sentences.find((line) => /(unique|special|notable|swayambhu|hill|river|ghat)/i.test(line)) ||
    '';

  if (!isNonEmptyString(draft.mythologicalSignificance) || isTemplateLikeValue(draft.mythologicalSignificance, templeName)) {
    if (mythSentence) draft.mythologicalSignificance = mythSentence;
  }

  if (!isNonEmptyString(draft.historicalSignificance) || isTemplateLikeValue(draft.historicalSignificance, templeName)) {
    if (historySentence) {
      draft.historicalSignificance = historySentence;
    } else if (isNonEmptyString(draft.landmark)) {
      draft.historicalSignificance = `${templeName} is a prominent temple in ${cityLabel}, located near ${draft.landmark}.`;
    } else if (sentences[0]) {
      draft.historicalSignificance = `${templeName} is a prominent temple in ${cityLabel}. ${sentences[0]}`;
    }
  }

  if (!isNonEmptyString(draft.uniqueFeatures) || isTemplateLikeValue(draft.uniqueFeatures, templeName)) {
    if (uniqueSentence) draft.uniqueFeatures = uniqueSentence;
  }

  if (!isNonEmptyString(draft.majorFestivals) || isTemplateLikeValue(draft.majorFestivals, templeName)) {
    if (/(navaratri|dasara|dussehra)/i.test(sourceLower)) {
      draft.majorFestivals = 'Navaratri, Dasara';
    } else if (isNonEmptyString(draft.deityName) && /durga/i.test(draft.deityName)) {
      draft.majorFestivals = 'Navaratri, Dasara';
    }
  }

  if (!isNonEmptyString(draft.festivalDates) || isTemplateLikeValue(draft.festivalDates, templeName)) {
    if (/(ashwayuja|ashvina|sept|oct|october)/i.test(sourceLower)) {
      draft.festivalDates = 'Navaratri season (typically Sep-Oct, per lunar calendar)';
    } else if (isNonEmptyString(draft.majorFestivals) && /navaratri|dasara/i.test(draft.majorFestivals)) {
      draft.festivalDates = 'Navaratri season (typically Sep-Oct, per lunar calendar)';
    }
  }

  const resolveBooleanSignal = (current: unknown, positive: RegExp, negative?: RegExp) => {
    if (negative && negative.test(sourceLower)) return false;
    if (positive.test(sourceLower)) return true;
    return typeof current === 'boolean' ? current : false;
  };

  draft.parkingAvailable = resolveBooleanSignal(draft.parkingAvailable, /parking|car park/);
  draft.wheelchairAccessible = resolveBooleanSignal(draft.wheelchairAccessible, /wheelchair|accessible/);
  draft.cloakroomAvailable = resolveBooleanSignal(draft.cloakroomAvailable, /cloak\s*room|luggage\s*counter/);
  draft.restroomsAvailable = resolveBooleanSignal(draft.restroomsAvailable, /restroom|toilet|washroom/);
  draft.drinkingWaterAvailable = resolveBooleanSignal(draft.drinkingWaterAvailable, /drinking water|water facility|water point/);
  draft.prasadamCounterAvailable = resolveBooleanSignal(draft.prasadamCounterAvailable, /prasadam|prasad counter/);
  draft.photographyAllowed = resolveBooleanSignal(
    draft.photographyAllowed,
    /photography\s+allowed|photos\s+allowed|camera\s+allowed/,
    /photography\s+not\s+allowed|photography\s+prohibited|no\s+photography/,
  );

  return draft;
};

export class TempleAIService {
  async generateAutofill(input: AutofillInput) {
    if (!config.openrouter.apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured in backend environment.');
    }

    const forceComplete = input.forceComplete !== false;
    const autoContext = await collectAutoWebContext(input.templeName, input.city);
    const webContext = autoContext.context;

    const prompt = [
      'You are a data enrichment assistant for a temple listing CMS.',
      'Return ONLY valid JSON (no markdown, no prose).',
      'Do not include images or videos fields.',
      'Treat Temple Name + City as the primary entity key and ground values to that location-specific temple only.',
      'Fill as many fields as possible with accurate values using provided location context and reliable model knowledge.',
      'Short description must be between 40 and 160 characters.',
      'Long description should be rich and informative when source text supports it.',
      'If unknown, return empty string for string fields and false for booleans.',
      'Do not fabricate highly specific facts (exact fees, phone numbers, exact schedules) when uncertain.',
      'For uncertain details, keep the field empty and mention uncertainty in confidenceNote.',
      'For coordinates/address, prioritize top map result from web context.',
      '',
      `Temple Name: ${input.templeName}`,
      `City: ${input.city || ''}`,
      `Additional Context: ${input.additionalContext || ''}`,
      '',
      'Output JSON shape:',
      JSON.stringify(
        {
          draft: {
            name: '',
            city: '',
            fullAddress: '',
            landmark: '',
            description: '',
            shortDescription: '',
            latitude: '',
            longitude: '',
            deityName: '',
            darshanTimings: [
              {
                day: 'Monday',
                morningOpen: '05:00',
                morningClose: '12:00',
                eveningOpen: '16:00',
                eveningClose: '21:00',
              },
              {
                day: 'Tuesday',
                morningOpen: '05:00',
                morningClose: '12:00',
                eveningOpen: '16:00',
                eveningClose: '21:00',
              },
              {
                day: 'Wednesday',
                morningOpen: '05:00',
                morningClose: '12:00',
                eveningOpen: '16:00',
                eveningClose: '21:00',
              },
              {
                day: 'Thursday',
                morningOpen: '05:00',
                morningClose: '12:00',
                eveningOpen: '16:00',
                eveningClose: '21:00',
              },
              {
                day: 'Friday',
                morningOpen: '05:00',
                morningClose: '12:00',
                eveningOpen: '16:00',
                eveningClose: '21:00',
              },
              {
                day: 'Saturday',
                morningOpen: '05:00',
                morningClose: '12:00',
                eveningOpen: '16:00',
                eveningClose: '21:00',
              },
              {
                day: 'Sunday',
                morningOpen: '05:00',
                morningClose: '12:00',
                eveningOpen: '16:00',
                eveningClose: '21:00',
              },
            ],
            templeType: '',
            builtYear: '',
            founder: '',
            mythologicalSignificance: '',
            historicalSignificance: '',
            architectureStyle: '',
            uniqueFeatures: '',
            sacredNearby: '',
            associatedLegends: '',
            morningAarti: '',
            afternoonAarti: '',
            eveningAarti: '',
            specialSevas: '',
            festivalSpecificTimings: '',
            generalEntryFee: '',
            specialDarshanFee: '',
            vipDarshanFee: '',
            parkingAvailable: false,
            wheelchairAccessible: false,
            cloakroomAvailable: false,
            restroomsAvailable: false,
            drinkingWaterAvailable: false,
            prasadamCounterAvailable: false,
            photographyAllowed: false,
            mobileRestrictions: '',
            dressCodeMen: '',
            dressCodeWomen: '',
            securityNotes: '',
            majorFestivals: '',
            festivalDates: '',
            annualBrahmotsavam: '',
            rathotsavamDetails: '',
            crowdExpectationLevel: '',
            specialPoojas: '',
            specialDecorationDays: '',
            bestMonths: '',
            bestTimeOfDay: '',
            peakCrowdDays: '',
            avoidDays: '',
            weatherConditions: '',
            nearbyTemples: '',
            nearbyBeachesOrHills: '',
            nearbyRestaurants: '',
            nearbyHotels: '',
            distanceRailwayStation: '',
            distanceBusStand: '',
            distanceAirport: '',
            virtualTourUrl: '',
            metaTitle: '',
            metaDescription: '',
            searchKeywords: '',
            canonicalUrl: '',
            openGraphImage: '',
            structuredDataJsonLd: '',
            devoteeTips: '',
            thingsToCarry: '',
            thingsNotAllowed: '',
            idealVisitDuration: '',
            suggestedItinerary: '',
            localFoodRecommendations: '',
            faqs: '',
            emergencyContact: '',
            templeOfficePhone: '',
            lostAndFoundDesk: '',
            medicalFacilityNearby: '',
            policeStationNearby: '',
          },
          confidenceNote: '',
        },
        null,
        2,
      ),
      '',
      'Web source text:',
      webContext || 'No web context could be collected automatically.',
    ].join('\n');

    let parsed: { draft: TempleAIDraft; confidenceNote: string } = {
      draft: {} as TempleAIDraft,
      confidenceNote: '',
    };
    let llmAvailable = true;

    try {
      parsed = await runLLMJson(
        prompt,
        config.openrouter.model,
        config.openrouter.apiKey,
      );
    } catch (error) {
      llmAvailable = false;
      logger.warn({ error }, 'OpenRouter pass failed; continuing with source-derived fallback mode');
      parsed = {
        draft: {} as TempleAIDraft,
        confidenceNote: 'LLM unavailable for this request; filled using source-derived fallback mode.',
      };
    }

    const resolvedCity =
      parsed.draft.city ||
      normalizeCity(input.city) ||
      normalizeCity(autoContext.topMatch?.displayName) ||
      '';

    const aiDraft = parsed.draft;
    const sourceLongDescription = buildLongDescriptionFromSources([
      autoContext.context || '',
    ]);

    const aiDescription =
      isNonEmptyString(aiDraft.description) ? aiDraft.description.trim() : '';

    let resolvedDescription =
      aiDescription ||
      sourceLongDescription;

    if (llmAvailable && countWords(resolvedDescription) < 120) {
      const expandPrompt = [
        'You are refining only the long description field for a temple CMS record.',
        'Return ONLY valid JSON with shape: {"draft": {"description": "", "shortDescription": ""}, "confidenceNote": ""}.',
        'Write a detailed, accurate long description between 120 and 220 words.',
        'Ground content to temple name, city, address/coordinates context, and reliable model knowledge.',
        'Do not invent highly specific uncertain claims (exact fees, exact phone numbers, exact daily schedules).',
        'If uncertain about niche details, keep language general but informative.',
        '',
        `Temple Name: ${input.templeName}`,
        `City: ${input.city || ''}`,
        `Additional Context: ${input.additionalContext || ''}`,
        '',
        'Current short long-description draft:',
        resolvedDescription || '(empty)',
        '',
        'Web source text:',
        webContext || 'No web context could be collected automatically.',
      ].join('\n');

      try {
        const expanded = await runLLMJson(
          expandPrompt,
          config.openrouter.model,
          config.openrouter.apiKey,
        );
        const nextDescription = expanded?.draft?.description;
        if (isNonEmptyString(nextDescription) && countWords(nextDescription) >= 120) {
          resolvedDescription = nextDescription.trim();
        }
      } catch (error) {
        logger.warn({ error }, 'OpenRouter long-description expansion pass failed; retaining existing description');
      }
    }

    const aiShortDescription =
      isNonEmptyString(aiDraft.shortDescription) ? aiDraft.shortDescription.trim() : '';

    const shortDescriptionSeed =
      aiShortDescription ||
      resolvedDescription;

    const resolvedShortDescription = buildShortDescriptionFromSource(shortDescriptionSeed);

    let enrichedDraft: TempleAIDraft = {
      ...aiDraft,
      name: isNonEmptyString(aiDraft.name) ? aiDraft.name.trim() : input.templeName,
      city: resolvedCity,
      fullAddress:
        isNonEmptyString(aiDraft.fullAddress)
          ? aiDraft.fullAddress.trim()
          : autoContext.topMatch?.displayName || '',
      landmark:
        isNonEmptyString(aiDraft.landmark)
          ? aiDraft.landmark.trim()
          : autoContext.topMatch?.displayName || '',
      latitude:
        isNonEmptyString(aiDraft.latitude)
          ? aiDraft.latitude.trim()
          : autoContext.topMatch?.lat || '',
      longitude:
        isNonEmptyString(aiDraft.longitude)
          ? aiDraft.longitude.trim()
          : autoContext.topMatch?.lon || '',
      description: resolvedDescription,
      shortDescription: resolvedShortDescription,
      builtYear:
        isNonEmptyString(aiDraft.builtYear)
          ? aiDraft.builtYear.trim()
          : '',
      founder:
        isNonEmptyString(aiDraft.founder)
          ? aiDraft.founder.trim()
          : '',
      darshanTimings: normalizeDarshanTimings((aiDraft as Record<string, unknown>).darshanTimings),
    };

    const missingFields = getMissingFields(enrichedDraft);
    let pass2Attempted = false;
    let pass2FilledFields = 0;
    if (missingFields.length > 0 && llmAvailable) {
      pass2Attempted = true;
      const missingPrompt = [
        'You are improving an existing temple draft JSON.',
        'Return ONLY valid JSON with shape: {"draft": {...}, "confidenceNote": ""}.',
        'Fill ONLY the listed missing fields using temple name + location context and reliable model knowledge.',
        'If a missing field is uncertain, keep it as empty string (or false for booleans).',
        'Do NOT change already populated fields.',
        '',
        `Temple Name: ${input.templeName}`,
        `City: ${input.city || ''}`,
        `Missing Fields: ${missingFields.join(', ')}`,
        '',
        'Current Draft JSON:',
        JSON.stringify(enrichedDraft, null, 2),
        '',
        'Web source text:',
        webContext || 'No web context could be collected automatically.',
      ].join('\n');

      try {
        const missingParsed = await runLLMJson(
          missingPrompt,
          config.openrouter.model,
          config.openrouter.apiKey,
        );
        const patchDraft = missingParsed.draft || {};
        const missingSet = new Set(missingFields);

        for (const field of missingFields) {
          const key = field as keyof TempleAIDraft;
          const value = patchDraft[key];
          if (typeof value === 'boolean') {
            const before = (enrichedDraft as any)[key];
            (enrichedDraft as any)[key] = value;
            if (typeof before !== 'boolean' && missingSet.has(field)) {
              pass2FilledFields += 1;
            }
          } else if (isNonEmptyString(value)) {
            const before = (enrichedDraft as any)[key];
            (enrichedDraft as any)[key] = value.trim();
            if (!isNonEmptyString(before) && missingSet.has(field)) {
              pass2FilledFields += 1;
            }
          } else if (field === 'darshanTimings' && Array.isArray((patchDraft as any).darshanTimings)) {
            const beforeLength = Array.isArray(enrichedDraft.darshanTimings) ? enrichedDraft.darshanTimings.length : 0;
            enrichedDraft.darshanTimings = normalizeDarshanTimings((patchDraft as any).darshanTimings);
            if (beforeLength === 0 && enrichedDraft.darshanTimings.length > 0) {
              pass2FilledFields += 1;
            }
          }
        }
      } catch (error) {
        logger.warn({ error }, 'OpenRouter missing-fields completion pass failed; returning first-pass draft');
      }
    }

    if (forceComplete) {
      enrichedDraft = forceCompleteDraft(enrichedDraft, input.templeName, resolvedCity || input.city || '');
      enrichedDraft = enrichFromSourceContext(
        enrichedDraft,
        [autoContext.context || ''].filter(Boolean).join('\n\n'),
        input.templeName,
        resolvedCity || input.city || '',
      );

      const fallbackFields = getTemplateFallbackFields(
        enrichedDraft,
        input.templeName,
        resolvedCity || input.city || '',
      );

      if (fallbackFields.length > 0 && llmAvailable) {
        const refinePrompt = [
          'You are refining a temple draft JSON that currently contains template fallback values.',
          'Return ONLY valid JSON with shape: {"draft": {...}, "confidenceNote": ""}.',
          'Update ONLY the listed fields using temple name + location context and reliable model knowledge.',
          'Do not fabricate highly specific uncertain facts; if uncertain, keep current value unchanged.',
          'For boolean fields, set true only with explicit evidence in source text; otherwise keep current value.',
          '',
          `Temple Name: ${input.templeName}`,
          `City: ${input.city || ''}`,
          `Fields To Refine: ${fallbackFields.join(', ')}`,
          '',
          'Current Draft JSON:',
          JSON.stringify(enrichedDraft, null, 2),
          '',
          'Web source text:',
          webContext || 'No web context could be collected automatically.',
        ].join('\n');

        try {
          const refined = await runLLMJson(
            refinePrompt,
            config.openrouter.model,
            config.openrouter.apiKey,
          );
          const patchDraft = refined.draft || {};

          for (const field of fallbackFields) {
            const key = field as keyof TempleAIDraft;
            const nextValue = patchDraft[key];

            if (typeof nextValue === 'boolean') {
              (enrichedDraft as any)[key] = nextValue;
              continue;
            }

            if (isNonEmptyString(nextValue)) {
              (enrichedDraft as any)[key] = nextValue.trim();
            }
          }
        } catch (error) {
          logger.warn({ error }, 'OpenRouter fallback-refinement pass failed; retaining force-complete values');
        }
      }
    }

    const prefillReport = buildPrefillReport(enrichedDraft, pass2Attempted, pass2FilledFields);

    return {
      draft: enrichedDraft,
      confidenceNote: parsed.confidenceNote || '',
      usedSources: autoContext.sources,
      prefillReport,
    };
  }
}

export const templeAIService = new TempleAIService();
