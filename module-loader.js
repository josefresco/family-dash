// Module Loader - Lazy loading utility for optional modules
// Reduces initial bundle size by loading modules on-demand

class ModuleLoader {
    constructor() {
        this.loadedModules = new Set();
        this.loadingPromises = new Map();
    }

    /**
     * Dynamically load a script
     * @param {string} src - Script source URL
     * @param {string} moduleName - Module identifier
     * @returns {Promise} Promise that resolves when script is loaded
     */
    async loadScript(src, moduleName) {
        // Return existing promise if already loading
        if (this.loadingPromises.has(moduleName)) {
            return this.loadingPromises.get(moduleName);
        }

        // Return immediately if already loaded
        if (this.loadedModules.has(moduleName)) {
            return Promise.resolve();
        }

        const loadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;

            script.onload = () => {
                this.loadedModules.add(moduleName);
                this.loadingPromises.delete(moduleName);
                resolve();
            };

            script.onerror = () => {
                this.loadingPromises.delete(moduleName);
                reject(new Error(`Failed to load module: ${moduleName}`));
            };

            document.head.appendChild(script);
        });

        this.loadingPromises.set(moduleName, loadPromise);
        return loadPromise;
    }

    /**
     * Load CalDAV client on-demand
     * @returns {Promise} Promise that resolves when CalDAV is ready
     */
    async loadCalDAV() {
        if (window.CalDAVClient) {
            return Promise.resolve();
        }
        return this.loadScript('caldav-client.js?v=3.26', 'caldav');
    }

    /**
     * Check if a module is loaded
     * @param {string} moduleName - Module identifier
     * @returns {boolean} True if module is loaded
     */
    isLoaded(moduleName) {
        return this.loadedModules.has(moduleName);
    }
}

// Export global instance
window.moduleLoader = new ModuleLoader();
