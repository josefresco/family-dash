// Configuration for GitHub Pages version
// This replaces the PHP config system
class AppConfig {
    constructor() {
        this.storageKey = 'dashboard-config';
        this.defaultConfig = {
            // API Keys (will be set by user)
            openweather_api_key: '',
            google_client_id: '',
            
            // Location settings
            location: {
                lat: 40.7128,
                lon: -74.0060,
                city: 'New York',
                state: 'NY'
            },
            
            // App settings
            settings: {
                timezone: 'America/New_York',
                tomorrow_threshold_hour: 17,
                refresh_interval: 1800000 // 30 minutes
            }
        };
        
        this.config = this.loadConfig();
    }
    
    loadConfig() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                return { ...this.defaultConfig, ...parsed };
            }
        } catch (error) {
            console.warn('Failed to load config from localStorage:', error);
        }
        return { ...this.defaultConfig };
    }
    
    saveConfig() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.config));
            return true;
        } catch (error) {
            console.error('Failed to save config to localStorage:', error);
            return false;
        }
    }
    
    get(key) {
        return key.split('.').reduce((obj, k) => obj?.[k], this.config);
    }
    
    set(key, value) {
        const keys = key.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, k) => obj[k] = obj[k] || {}, this.config);
        target[lastKey] = value;
        this.saveConfig();
    }
    
    isConfigured() {
        return !!(this.config.openweather_api_key && this.config.google_client_id);
    }
    
    getConfigPrompt() {
        if (!this.isConfigured()) {
            return {
                needsConfig: true,
                missing: [
                    !this.config.openweather_api_key && 'OpenWeatherMap API key',
                    !this.config.google_client_id && 'Google Client ID'
                ].filter(Boolean)
            };
        }
        return { needsConfig: false };
    }
}

// Global config instance
window.dashboardConfig = new AppConfig();