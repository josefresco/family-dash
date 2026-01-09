/**
 * Simple memoization utility for caching expensive function results
 * Useful for pure functions that are called repeatedly with the same arguments
 */

/**
 * Memoize a function with a simple key-based cache
 * @param {Function} fn - Function to memoize
 * @param {Function} keyGenerator - Optional function to generate cache key from arguments
 * @returns {Function} Memoized function
 */
export function memoize(fn, keyGenerator = JSON.stringify) {
    const cache = new Map();

    return function(...args) {
        const key = keyGenerator(args);

        if (cache.has(key)) {
            return cache.get(key);
        }

        const result = fn.apply(this, args);
        cache.set(key, result);
        return result;
    };
}

/**
 * Memoize with Time-To-Live (TTL) for cache entries
 * Useful for API responses or data that should be refreshed periodically
 * @param {Function} fn - Function to memoize
 * @param {number} ttl - Time to live in milliseconds
 * @param {Function} keyGenerator - Optional function to generate cache key
 * @returns {Function} Memoized function with TTL
 */
export function memoizeWithTTL(fn, ttl = 60000, keyGenerator = JSON.stringify) {
    const cache = new Map();

    return function(...args) {
        const key = keyGenerator(args);
        const now = Date.now();

        if (cache.has(key)) {
            const { value, timestamp } = cache.get(key);
            if (now - timestamp < ttl) {
                return value;
            }
            // Expired, remove from cache
            cache.delete(key);
        }

        const result = fn.apply(this, args);
        cache.set(key, { value: result, timestamp: now });
        return result;
    };
}

/**
 * Create a simple LRU (Least Recently Used) cache
 * @param {number} maxSize - Maximum number of entries
 * @returns {Object} Cache object with get/set methods
 */
export function createLRUCache(maxSize = 100) {
    const cache = new Map();

    return {
        get(key) {
            if (!cache.has(key)) return undefined;
            // Move to end (most recently used)
            const value = cache.get(key);
            cache.delete(key);
            cache.set(key, value);
            return value;
        },
        set(key, value) {
            // If exists, delete to re-add at end
            if (cache.has(key)) {
                cache.delete(key);
            }
            // If at max size, remove oldest (first) entry
            else if (cache.size >= maxSize) {
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }
            cache.set(key, value);
        },
        has(key) {
            return cache.has(key);
        },
        clear() {
            cache.clear();
        },
        size() {
            return cache.size;
        }
    };
}

/**
 * Debounce a function to limit how often it can be called
 * Useful for expensive operations triggered by user input
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay = 300) {
    let timeoutId;

    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Throttle a function to limit execution frequency
 * Useful for scroll/resize handlers
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Minimum time between executions in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(fn, limit = 100) {
    let lastCall = 0;

    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= limit) {
            lastCall = now;
            return fn.apply(this, args);
        }
    };
}
