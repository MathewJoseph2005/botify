/**
 * Request Cache Utility for Frontend
 * Implements request deduplication and response caching for GET requests
 * Significantly reduces redundant API calls and improves UI responsiveness
 */

const requestCache = new Map();
const pendingRequests = new Map();

/**
 * Generate cache key from request parameters
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {Object} params - Query parameters
 * @returns {string} Cache key
 */
function getCacheKey(method, url, params) {
  return `${method}:${url}:${JSON.stringify(params || {})}`;
}

/**
 * Execute a request with caching and deduplication
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {Object} params - Query parameters or body
 * @param {Function} fetchFn - Function that performs the actual request
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 * @returns {Promise} Cached or fresh response
 */
export async function cachedRequest(method, url, params, fetchFn, ttl = 5 * 60 * 1000) {
  // Only cache GET requests
  if (method !== 'GET') {
    return fetchFn();
  }

  const key = getCacheKey(method, url, params);

  // Return cached response if still valid
  const cached = requestCache.get(key);
  if (cached && Date.now() < cached.expiry) {
    console.log('[Cache HIT]', key);
    return cached.data;
  }

  // Return pending request if already in flight (request deduplication)
  if (pendingRequests.has(key)) {
    console.log('[Pending]', key);
    return pendingRequests.get(key);
  }

  // Make new request
  const promise = fetchFn();
  pendingRequests.set(key, promise);

  try {
    const data = await promise;
    // Cache the successful response
    requestCache.set(key, {
      data,
      expiry: Date.now() + ttl,
    });
    console.log('[Cache SET]', key, `TTL: ${ttl}ms`);
    return data;
  } finally {
    pendingRequests.delete(key);
  }
}

/**
 * Invalidate specific cache entry
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {Object} params - Query parameters
 */
export function invalidateCache(method, url, params) {
  const key = getCacheKey(method, url, params);
  const deleted = requestCache.delete(key);
  if (deleted) console.log('[Cache INVALIDATED]', key);
  return deleted;
}

/**
 * Invalidate all cache entries matching a URL pattern
 * @param {string|RegExp} urlPattern - URL or regex pattern
 */
export function invalidateCacheByUrl(urlPattern) {
  const pattern = typeof urlPattern === 'string' 
    ? new RegExp(urlPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    : urlPattern;

  let count = 0;
  for (const [key] of requestCache) {
    if (pattern.test(key)) {
      requestCache.delete(key);
      count++;
    }
  }
  if (count > 0) console.log(`[Cache INVALIDATED] ${count} entries matching ${pattern}`);
  return count;
}

/**
 * Clear all cached data
 */
export function clearCache() {
  const size = requestCache.size;
  requestCache.clear();
  pendingRequests.clear();
  console.log(`[Cache CLEARED] ${size} entries`);
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
export function getCacheStats() {
  return {
    cachedEntries: requestCache.size,
    pendingRequests: pendingRequests.size,
    memoryUsage: JSON.stringify(Array.from(requestCache.keys())).length,
  };
}

/**
 * Create a cached API wrapper
 * @param {Object} api - Axios or fetch-like API client
 * @returns {Object} Wrapped API with caching
 */
export function createCachedApiWrapper(api) {
  return {
    get: (url, config = {}) => {
      const ttl = config.cacheTtl || 5 * 60 * 1000;
      return cachedRequest('GET', url, config.params || {}, () =>
        api.get(url, config),
        ttl
      );
    },
    post: (url, data, config) => api.post(url, data, config),
    put: (url, data, config) => api.put(url, data, config),
    patch: (url, data, config) => api.patch(url, data, config),
    delete: (url, config) => api.delete(url, config),
  };
}

export default {
  cachedRequest,
  invalidateCache,
  invalidateCacheByUrl,
  clearCache,
  getCacheStats,
  getCacheKey,
  createCachedApiWrapper,
};
