"use client";
import axios from 'axios';
import { year, getCurrentSeason, getNextSeason } from './useTime';

function ensureUrlEndsWithSlash(url: string): string {
    return url.endsWith('/') ? url : `${url}/`;
}

// Primary Consumet/Anilist backend (for metadata, search, trending)
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL
    ? ensureUrlEndsWithSlash(process.env.NEXT_PUBLIC_BACKEND_URL)
    : '';

// CF backend for streaming (anveshna-style). Falls back to local API routes.
const CF_BACKEND_URL = process.env.NEXT_PUBLIC_CF_BACKEND_URL
    ? ensureUrlEndsWithSlash(process.env.NEXT_PUBLIC_CF_BACKEND_URL)
    : '/api/anime/';

// Media proxy for HLS fetching (needed by UnifiedPlayer)
export const MEDIA_PROXY_URL = process.env.NEXT_PUBLIC_CF_PROXY_URL
    ? ensureUrlEndsWithSlash(process.env.NEXT_PUBLIC_CF_PROXY_URL)
    : '';

const SKIP_TIMES = process.env.NEXT_PUBLIC_SKIP_TIMES
    ? ensureUrlEndsWithSlash(process.env.NEXT_PUBLIC_SKIP_TIMES)
    : 'https://api.aniskip.com/';

let PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL;
if (PROXY_URL) {
    PROXY_URL = ensureUrlEndsWithSlash(PROXY_URL);
}

const API_KEY = process.env.NEXT_PUBLIC_API_KEY as string;

const axiosInstance = axios.create({
    baseURL: PROXY_URL || undefined,
    timeout: 10000,
    headers: {
        ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
    },
});

function handleError(error: any, context: string) {
    let errorMessage = 'An error occurred';
    if (error.response) {
        const status = error.response.status;
        if (status >= 500) errorMessage += ': Server error';
        else if (status >= 400) errorMessage += ': Client error';
        errorMessage += `: ${error.response.data?.message || 'Unknown error'}`;
    } else if (error.message) {
        errorMessage += `: ${error.message}`;
    }
    throw new Error(errorMessage);
}

function generateCacheKey(...args: string[]) {
    return args.join('-');
}

interface CacheItem {
    value: any;
    timestamp: number;
}

const SERVER_ID_TO_STREAM_SERVER: Record<number, string> = {
    1: 'hd-2',
    4: 'hd-1',
};

const LEGACY_SERVER_ALIAS_MAP: Record<string, string> = {
    streamsb: 'streamsb',
    streamtape: 'streamtape',
    vidcloud: 'hd-1',
    vidsrc: 'hd-1',
    vidstreaming: 'hd-2',
    megacloud: 'hd-2',
};

function normalizeServerName(serverName?: string) {
    if (!serverName) return 'hd-1';
    const normalized = serverName.toLowerCase();
    return LEGACY_SERVER_ALIAS_MAP[normalized] || normalized;
}

function mapEpisodeSourceServers(payload: any) {
    const data = payload?.data || payload;
    if (!data || typeof data !== 'object') return payload;

    const mapServers = (servers: any[] = []) =>
        servers.map((server) => {
            const mappedServerName =
                SERVER_ID_TO_STREAM_SERVER[server?.serverId] || server?.serverName;
            return { ...server, originalServerName: server?.serverName, serverName: mappedServerName };
        });

    const mappedData = {
        ...data,
        sub: mapServers(data?.sub || []),
        dub: mapServers(data?.dub || []),
        raw: mapServers(data?.raw || []),
    };
    return payload?.data ? { ...payload, data: mappedData } : mappedData;
}

function resolveStreamingServerFromSources(sourcesPayload: any, category: string, requestedServer: string) {
    const normalizedCategory = (category || 'sub').toLowerCase();
    const normalizedRequest = normalizeServerName(requestedServer);
    const sourceData = sourcesPayload?.data || sourcesPayload;
    const categoryServers = sourceData?.[normalizedCategory] || sourceData?.sub || sourceData?.dub || [];

    if (!Array.isArray(categoryServers) || categoryServers.length === 0) return normalizedRequest;

    const mappedServers = categoryServers
        .map((server: any) => SERVER_ID_TO_STREAM_SERVER[server?.serverId] || normalizeServerName(server?.serverName))
        .filter(Boolean);

    return mappedServers.includes(normalizedRequest) ? normalizedRequest : (mappedServers[0] || normalizedRequest);
}

function createOptimizedSessionStorageCache(maxSize: number, maxAge: number, cacheKey: string) {
    if (typeof window === 'undefined') {
        return { get: () => undefined, set: () => {} };
    }
    const cache = new Map<string, CacheItem>(
        JSON.parse(sessionStorage.getItem(cacheKey) || '[]'),
    );
    const keys = new Set<string>(cache.keys());

    function isItemExpired(item: CacheItem) {
        return Date.now() - item.timestamp > maxAge;
    }
    function updateSessionStorage() {
        sessionStorage.setItem(cacheKey, JSON.stringify(Array.from(cache.entries())));
    }

    return {
        get(key: string) {
            if (cache.has(key)) {
                const item = cache.get(key);
                if (!isItemExpired(item!)) {
                    keys.delete(key);
                    keys.add(key);
                    return item!.value;
                }
                cache.delete(key);
                keys.delete(key);
            }
            return undefined;
        },
        set(key: string, value: any) {
            if (cache.size >= maxSize) {
                const oldestKey = keys.values().next().value;
                cache.delete(oldestKey!);
                keys.delete(oldestKey!);
            }
            keys.add(key);
            cache.set(key, { value, timestamp: Date.now() });
            updateSessionStorage();
        },
    };
}

const CACHE_SIZE = 20;
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

function createCache(cacheKey: string) {
    return createOptimizedSessionStorageCache(CACHE_SIZE, CACHE_MAX_AGE, cacheKey);
}

interface FetchOptions {
    type?: string;
    season?: string;
    format?: string;
    sort?: string[];
    genres?: string[];
    id?: string;
    year?: string;
    status?: string;
}

const advancedSearchCache = createCache('Advanced Search');
const animeDataCache = createCache('Data');
const animeInfoCache = createCache('Info');
const animeEpisodesCache = createCache('Episodes');
const fetchAnimeEmbeddedEpisodesCache = createCache('Video Embedded Sources');

// Per-list-type caches — hoisted so they are reused across calls, not rebuilt each time
const listCaches: Record<string, ReturnType<typeof createCache>> = {
    TopRated: createCache('TopRated'),
    Trending: createCache('Trending'),
    Popular: createCache('Popular'),
    TopAiring: createCache('TopAiring'),
    Upcoming: createCache('Upcoming'),
};

async function fetchFromProxy(url: string, cache: any, cacheKey: string) {
    try {
        const cachedResponse = cache.get(cacheKey);
        if (cachedResponse) return cachedResponse;

        const requestConfig = PROXY_URL ? { params: { url } } : {};
        const response = await axiosInstance.get(PROXY_URL ? '' : url, requestConfig);

        if (response.status !== 200 || (response.data.statusCode && response.data.statusCode >= 400)) {
            const errorMessage = response.data.message || 'Unknown server error';
            throw new Error(`Server error: ${response.data.statusCode || response.status} ${errorMessage}`);
        }
        cache.set(cacheKey, response.data);
        return response.data;
    } catch (error) {
        handleError(error, 'data');
        throw error;
    }
}

function parseEpisodeId(input: string) {
    const parts = input.split('$');
    if (parts.length < 3 || !parts[0] || !parts[2]) return { episodeId: input, type: undefined };
    const [seriesId, , number, type] = parts;
    return { episodeId: `${seriesId}::ep=${number}`, type };
}

function normalizeAnimeInfoResponse(response: any) {
    const payload = response?.data || response;
    const normalizedEpisodes = payload?.episodesList || payload?.episodeList || payload?.episodes || [];
    const normalizedNextAiring = payload?.nextAiringEpisode
        ? { ...payload.nextAiringEpisode, airingTime: payload.nextAiringEpisode.airingTime || payload.nextAiringEpisode.airingAt || null }
        : null;

    return {
        ...payload,
        malId: payload?.malId || payload?.idMal,
        image: payload?.image || payload?.coverImage?.large || payload?.coverImage?.extraLarge || payload?.coverImage?.medium || null,
        cover: payload?.cover || payload?.bannerImage || payload?.coverImage?.extraLarge || payload?.coverImage?.large || null,
        episodes: normalizedEpisodes,
        episodeList: normalizedEpisodes,
        episodesList: normalizedEpisodes,
        nextAiringEpisode: normalizedNextAiring,
    };
}

function normalizeStreamingResponse(payload: any, fallbackServer: string, category: string) {
    const data = payload?.data || payload?.result || payload;
    const sources = Array.isArray(data?.sources) ? data.sources : [];
    const subtitles = Array.isArray(data?.subtitles) ? data.subtitles : [];
    const tracks = Array.isArray(data?.tracks) ? data.tracks : [];
    const mergedTracks = [...tracks, ...subtitles].filter(Boolean);

    const streamLink =
        data?.link?.file || data?.link || data?.source?.file || data?.source?.url ||
        sources?.[0]?.file || sources?.[0]?.url || null;

    const linkType =
        data?.link?.type || data?.source?.type || sources?.[0]?.type ||
        (sources?.[0]?.isM3U8 ? 'hls' : null) ||
        (typeof streamLink === 'string' && streamLink.includes('.m3u8') ? 'hls' : null);

    return {
        success: !!streamLink,
        data: {
            id: data?.id || null,
            type: data?.category || category,
            link: streamLink,
            linkType,
            headers: data?.headers || {},
            sources,
            subtitles,
            tracks: mergedTracks,
            intro: data?.intro || null,
            outro: data?.outro || null,
            server: data?.server || fallbackServer,
        },
    };
}

// ── Public API functions ─────────────────────────────────────────────────────

export async function fetchAdvancedSearch(
    searchQuery: string = '',
    page: number = 1,
    perPage: number = 20,
    options: FetchOptions = {},
) {
    if (!BASE_URL) return { results: [] };
    const queryParams = new URLSearchParams({
        ...(searchQuery && { query: searchQuery }),
        page: page.toString(),
        perPage: perPage.toString(),
        type: options.type ?? 'ANIME',
        ...(options.season && { season: options.season }),
        ...(options.format && { format: options.format }),
        ...(options.id && { id: options.id }),
        ...(options.year && { year: options.year }),
        ...(options.status && { status: options.status }),
        ...(options.sort && { sort: JSON.stringify(options.sort) }),
    });
    if (options.genres && options.genres.length > 0) {
        queryParams.set('genres', JSON.stringify(options.genres));
    }
    const url = `${BASE_URL}meta/anilist/advanced-search?${queryParams.toString()}`;
    const cacheKey = generateCacheKey('advancedSearch', queryParams.toString());
    return fetchFromProxy(url, advancedSearchCache, cacheKey);
}

export async function fetchAnimeData(animeId: string, provider: string = 'gogoanime') {
    if (!BASE_URL) return null;
    const params = new URLSearchParams({ provider });
    const url = `${BASE_URL}meta/anilist/data/${animeId}?${params.toString()}`;
    const cacheKey = generateCacheKey('animeData', animeId, provider);
    return fetchFromProxy(url, animeDataCache, cacheKey);
}

export async function fetchAnimeInfo(animeId: string, provider: string = 'zoro') {
    const url = `${CF_BACKEND_URL}info/${animeId}`;
    const cacheKey = generateCacheKey('animeInfo', animeId, provider, 'cf');
    const response = await fetchFromProxy(url, animeInfoCache, cacheKey);
    return normalizeAnimeInfoResponse(response);
}

async function fetchList(type: string, page: number = 1, perPage: number = 16, options: FetchOptions = {}) {
    if (!BASE_URL) return { results: [] };
    let cacheKey: string;
    let url: string;
    const params = new URLSearchParams({ page: page.toString(), perPage: perPage.toString() });

    if (['TopRated', 'Trending', 'Popular', 'TopAiring', 'Upcoming'].includes(type)) {
        cacheKey = generateCacheKey(`${type}Anime`, page.toString(), perPage.toString());
        url = `${BASE_URL}meta/anilist/${type.toLowerCase()}`;

        if (type === 'TopRated') {
            options = { type: 'ANIME', sort: ['["SCORE_DESC"]'] };
            params.set('type', options.type!);
            params.set('sort', String(options.sort));
            url = `${BASE_URL}meta/anilist/advanced-search`;
        } else if (type === 'Popular') {
            options = { type: 'ANIME', sort: ['["POPULARITY_DESC"]'] };
            params.set('type', options.type!);
            params.set('sort', String(options.sort));
            url = `${BASE_URL}meta/anilist/advanced-search`;
        } else if (type === 'Upcoming') {
            const season = getNextSeason();
            options = { type: 'ANIME', season, year: year.toString(), status: 'NOT_YET_RELEASED', sort: ['["POPULARITY_DESC"]'] };
            params.set('type', options.type!);
            params.set('status', options.status!);
            params.set('sort', String(options.sort));
            params.set('season', options.season!);
            params.set('year', options.year!);
            url = `${BASE_URL}meta/anilist/advanced-search`;
        } else if (type === 'TopAiring') {
            const season = getCurrentSeason();
            options = { type: 'ANIME', season, year: year.toString(), status: 'RELEASING', sort: ['["POPULARITY_DESC"]'] };
            params.set('type', options.type!);
            params.set('status', options.status!);
            params.set('sort', String(options.sort));
            params.set('season', options.season!);
            params.set('year', options.year!);
            url = `${BASE_URL}meta/anilist/advanced-search`;
        }
    } else {
        cacheKey = generateCacheKey(`${type}Anime`, page.toString(), perPage.toString());
        url = `${BASE_URL}meta/anilist/${type.toLowerCase()}`;
    }

    const specificCache = listCaches[type] ?? createCache(type);
    return fetchFromProxy(`${url}?${params.toString()}`, specificCache, cacheKey);
}

export const fetchTopAnime = (page: number, perPage: number) => fetchList('TopRated', page, perPage);
export const fetchTrendingAnime = (page: number, perPage: number) => fetchList('Trending', page, perPage);
export const fetchPopularAnime = (page: number, perPage: number) => fetchList('Popular', page, perPage);
export const fetchTopAiringAnime = (page: number, perPage: number) => fetchList('TopAiring', page, perPage);
export const fetchUpcomingSeasons = (page: number, perPage: number) => fetchList('Upcoming', page, perPage);

export async function fetchAnimeEpisodes(animeId: string, provider: string = 'gogoanime', dub: boolean = false) {
    const url = `${CF_BACKEND_URL}info/${animeId}`;
    const cacheKey = generateCacheKey('animeEpisodes', animeId, provider, dub ? 'dub' : 'sub', 'cf');
    const response = await fetchFromProxy(url, animeEpisodesCache, cacheKey);
    const normalized = normalizeAnimeInfoResponse(response);
    return normalized?.episodes || normalized?.episodeList || normalized?.episodesList || [];
}

export async function fetchAnimeEmbeddedEpisodes(episodeId: string, episodeNumberId?: string) {
    const params = new URLSearchParams();
    let normalizedEpisodeId = episodeId;

    if (episodeId.includes('?ep=')) {
        const [baseEpisodeId, embeddedEpId] = episodeId.split('?ep=');
        normalizedEpisodeId = baseEpisodeId;
        if (!episodeNumberId && embeddedEpId) params.set('ep', embeddedEpId);
    }
    if (episodeNumberId) params.set('ep', episodeNumberId);

    const suffix = params.toString() ? `?${params.toString()}` : '';
    const url = `${CF_BACKEND_URL}servers/${encodeURIComponent(normalizedEpisodeId)}${suffix}`;
    const cacheKey = generateCacheKey('animeEmbeddedServers', normalizedEpisodeId, episodeNumberId || '');
    const response = await fetchFromProxy(url, fetchAnimeEmbeddedEpisodesCache, cacheKey);
    return mapEpisodeSourceServers(response);
}

/**
 * Fetch streaming links — tries CF backend first, then falls back to local hianime API.
 * This is the main function used by UnifiedPlayer.
 */
export async function fetchAnimeStreamingLinks(
    episodeId: string,
    serverName: string = 'hd-1',
    type: string,
) {
    const parsedEpisodeId = parseEpisodeId(episodeId).episodeId;
    const candidateEpisodeIds = Array.from(new Set([episodeId, parsedEpisodeId]));
    const preferredServer = normalizeServerName(serverName);
    const category = (type || 'sub').toLowerCase();

    // Try CF/local backend first
    try {
        for (const candidateEpisodeId of candidateEpisodeIds) {
            // Get available servers
            let embeddedServers: any;
            try {
                embeddedServers = await fetchAnimeEmbeddedEpisodes(candidateEpisodeId);
            } catch {
                embeddedServers = null;
            }

            const resolvedServer = embeddedServers
                ? resolveStreamingServerFromSources(embeddedServers, category, preferredServer)
                : preferredServer;

            const url = `${CF_BACKEND_URL}sources?episodeId=${encodeURIComponent(candidateEpisodeId)}&server=${encodeURIComponent(resolvedServer)}&category=${encodeURIComponent(category)}`;

            const response = await axios.get(url, {
                headers: { Accept: '*/*' },
                timeout: 8000,
            });
            const normalized = normalizeStreamingResponse(response.data, resolvedServer, category);
            if (normalized.success) return normalized;
        }
    } catch (err) {
        // Fall through to local hianime API below
    }

    // Fallback: local Next.js API route backed by @dovakiin0/aniwatch hianime scraper
    try {
        const url = `/api/anime/sources?episodeId=${encodeURIComponent(episodeId)}&server=${encodeURIComponent(preferredServer)}&category=${encodeURIComponent(category)}`;
        const response = await axios.get(url, { timeout: 12000 });
        // If the route signals iframe-only (e.g. streamsb/streamtape), propagate that signal
        if (response.data?.iframe === true) {
            return { success: false, iframe: true, data: null };
        }
        const normalized = normalizeStreamingResponse(response.data, preferredServer, category);
        if (normalized.success) return normalized;
    } catch {
        // both failed
    }

    return { success: false, data: null };
}

interface FetchSkipTimesParams {
    malId: string;
    episodeNumber: string;
    episodeLength?: string;
}

export async function fetchSkipTimes({ malId, episodeNumber, episodeLength = '0' }: FetchSkipTimesParams) {
    const types = ['ed', 'mixed-ed', 'mixed-op', 'op', 'recap'];
    const url = new URL(`${SKIP_TIMES}v2/skip-times/${malId}/${episodeNumber}`);
    url.searchParams.append('episodeLength', episodeLength.toString());
    types.forEach((type) => url.searchParams.append('types[]', type));
    const cacheKey = generateCacheKey('skipTimes', malId, episodeNumber, episodeLength || '');
    return fetchFromProxy(url.toString(), createCache('SkipTimes'), cacheKey);
}

export async function fetchRecentEpisodes(page: number = 1, perPage: number = 18, provider: string = 'gogoanime') {
    if (!BASE_URL) return { results: [] };
    const params = new URLSearchParams({ page: page.toString(), perPage: perPage.toString(), provider });
    const url = `${BASE_URL}meta/anilist/recent-episodes?${params.toString()}`;
    const cacheKey = generateCacheKey('recentEpisodes', page.toString(), perPage.toString(), provider);
    return fetchFromProxy(url, createCache('RecentEpisodes'), cacheKey);
}
