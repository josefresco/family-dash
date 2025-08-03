// Client-side API handler for GitHub Pages
// Replaces PHP api.php with direct API calls

class APIClient {
    constructor(config) {
        this.config = config;
        this.abortController = null;
    }
    
    // Cancel any ongoing requests
    cancelRequests() {
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        return this.abortController.signal;
    }
    
    async makeRequest(url, options = {}) {
        const signal = this.cancelRequests();
        
        try {
            const response = await fetch(url, {
                ...options,
                signal,
                headers: {
                    'Accept': 'application/json',
                    ...options.headers
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Request cancelled');
                return null;
            }
            throw error;
        }
    }
    
    // Weather API - Direct call to OpenWeatherMap
    async getWeatherData(date_param = 'today') {
        const apiKey = this.config.get('openweather_api_key');
        const lat = this.config.get('location.lat');
        const lon = this.config.get('location.lon');
        
        if (!apiKey) {
            throw new Error('OpenWeatherMap API key not configured');
        }
        
        try {
            // Use forecast API for better data
            const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
            const data = await this.makeRequest(url);
            
            return this.processWeatherForecast(data, date_param);
        } catch (error) {
            throw new Error(`Weather API failed: ${error.message}`);
        }
    }
    
    processWeatherForecast(data, date_param) {
        if (!data?.list?.length) {
            throw new Error('Invalid weather data received');
        }
        
        const now = new Date();
        const targetDate = date_param === 'tomorrow' 
            ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
            : now;
        
        const targetDateStr = targetDate.toISOString().split('T')[0];
        
        // Find forecasts for target date
        const forecasts = data.list.filter(item => {
            const itemDate = new Date(item.dt * 1000).toISOString().split('T')[0];
            return itemDate === targetDateStr;
        });
        
        if (!forecasts.length) {
            // Fallback to current weather if no forecasts available
            const current = data.list[0];
            return {
                temperature: Math.round(current.main.temp),
                description: current.weather[0].description,
                humidity: current.main.humidity,
                pressure: current.main.pressure,
                windSpeed: Math.round(current.wind.speed),
                visibility: Math.round((current.visibility || 10000) / 1609.34), // Convert m to miles
                icon: current.weather[0].icon,
                date_requested: date_param,
                source: 'live_openweather'
            };
        }
        
        // Process multiple forecasts for the day
        const avgTemp = Math.round(forecasts.reduce((sum, f) => sum + f.main.temp, 0) / forecasts.length);
        const firstForecast = forecasts[0];
        
        return {
            temperature: avgTemp,
            description: firstForecast.weather[0].description,
            humidity: firstForecast.main.humidity,
            pressure: firstForecast.main.pressure,
            windSpeed: Math.round(firstForecast.wind.speed),
            visibility: Math.round((firstForecast.visibility || 10000) / 1609.34),
            icon: firstForecast.weather[0].icon,
            date_requested: date_param,
            hourly_forecasts: forecasts.map(f => ({
                time: new Date(f.dt * 1000).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    hour12: true
                }),
                temperature: Math.round(f.main.temp),
                description: f.weather[0].description,
                icon: f.weather[0].icon
            })),
            source: 'live_openweather_forecast'
        };
    }
    
    // Tide API - Direct call to NOAA
    async getTideData(date_param = 'today') {
        const stations = [
            { id: '8447435', name: 'Chatham, MA' },
            { id: '8446613', name: 'Woods Hole, MA' },
            { id: '8447173', name: 'Cape Cod Canal, MA' }
        ];
        
        const now = new Date();
        const targetDate = date_param === 'tomorrow'
            ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
            : now;
        
        const dateStr = targetDate.toISOString().split('T')[0].replace(/-/g, '');
        
        // Try each station until one works
        for (const station of stations) {
            try {
                const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=${dateStr}&station=${station.id}&product=predictions&datum=mllw&units=english&time_zone=lst_ldt&format=json`;
                
                const data = await this.makeRequest(url);
                
                if (data?.predictions?.length) {
                    const tides = this.processTideData(data.predictions);
                    if (tides.length > 0) {
                        return {
                            tides,
                            date_requested: date_param,
                            source: 'live_noaa',
                            station: station.name,
                            station_id: station.id
                        };
                    }
                }
            } catch (error) {
                console.warn(`Station ${station.name} failed:`, error.message);
                continue;
            }
        }
        
        // Fallback to estimated tide data
        return this.getFallbackTideData(date_param);
    }
    
    processTideData(predictions) {
        const tides = [];
        
        for (let i = 0; i < predictions.length - 1; i++) {
            const current = parseFloat(predictions[i].v);
            const next = parseFloat(predictions[i + 1].v);
            const prev = i > 0 ? parseFloat(predictions[i - 1].v) : current;
            
            // Detect high tide (peak)
            if (current > prev && current > next) {
                const time = new Date(predictions[i].t);
                tides.push({
                    type: 'High',
                    time: time.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    }),
                    height: current.toFixed(1) + ' ft'
                });
            }
            
            // Detect low tide (trough)
            if (current < prev && current < next) {
                const time = new Date(predictions[i].t);
                tides.push({
                    type: 'Low',
                    time: time.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    }),
                    height: current.toFixed(1) + ' ft'
                });
            }
        }
        
        return tides;
    }
    
    getFallbackTideData(date_param) {
        // Simple fallback based on typical Cape Cod tide patterns
        const now = new Date();
        const baseOffset = date_param === 'tomorrow' ? 24 * 60 * 60 * 1000 : 0;
        
        // Approximate 12.5 hour tide cycle
        const tideOffset = (now.getHours() * 60 + now.getMinutes()) * 60 * 1000;
        const cycle = 12.5 * 60 * 60 * 1000; // 12.5 hours in ms
        
        const highTide1 = new Date(now.getTime() + baseOffset - (tideOffset % cycle) + cycle * 0.25);
        const lowTide1 = new Date(highTide1.getTime() + cycle * 0.5);
        const highTide2 = new Date(highTide1.getTime() + cycle);
        const lowTide2 = new Date(lowTide1.getTime() + cycle);
        
        return {
            tides: [
                {
                    type: 'High',
                    time: highTide1.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    }),
                    height: '8.5 ft'
                },
                {
                    type: 'Low',
                    time: lowTide1.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    }),
                    height: '1.2 ft'
                },
                {
                    type: 'High',
                    time: highTide2.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    }),
                    height: '8.3 ft'
                },
                {
                    type: 'Low',
                    time: lowTide2.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    }),
                    height: '1.4 ft'
                }
            ].filter(tide => {
                const tideTime = new Date();
                const [time, period] = tide.time.split(' ');
                const [hours, minutes] = time.split(':');
                tideTime.setHours(
                    period === 'PM' && hours !== '12' ? parseInt(hours) + 12 : 
                    period === 'AM' && hours === '12' ? 0 : parseInt(hours),
                    parseInt(minutes)
                );
                tideTime.setTime(tideTime.getTime() + baseOffset);
                
                // Only show tides for the target day
                return tideTime.toDateString() === (new Date(Date.now() + baseOffset)).toDateString();
            }),
            date_requested: date_param,
            source: 'fallback_estimate',
            station: 'Cape Cod (Estimated)',
            note: 'NOAA tide stations unavailable - showing estimated times'
        };
    }
    
    // Sunrise/Sunset API
    async getSunriseSunsetData(date_param = 'today') {
        const lat = this.config.get('location.lat');
        const lon = this.config.get('location.lon');
        
        const now = new Date();
        const targetDate = date_param === 'tomorrow'
            ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
            : now;
        
        const dateStr = targetDate.toISOString().split('T')[0];
        
        try {
            const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&date=${dateStr}&formatted=0`;
            const data = await this.makeRequest(url);
            
            if (data?.status === 'OK') {
                const timezone = this.config.get('settings.timezone');
                
                return {
                    sunrise: new Date(data.results.sunrise).toLocaleTimeString('en-US', {
                        timeZone: timezone,
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    }),
                    sunset: new Date(data.results.sunset).toLocaleTimeString('en-US', {
                        timeZone: timezone,
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    }),
                    date_requested: date_param,
                    source: 'live_sunrise_sunset_api'
                };
            }
            
            throw new Error('Invalid sunrise/sunset API response');
        } catch (error) {
            // Fallback to approximate times for Eastham, MA
            return {
                sunrise: date_param === 'tomorrow' ? '6:45 AM' : '6:44 AM',
                sunset: date_param === 'tomorrow' ? '7:15 PM' : '7:16 PM',
                date_requested: date_param,
                source: 'fallback_estimate',
                note: 'Sunrise/Sunset API unavailable - showing estimated times for Eastham, MA'
            };
        }
    }
    
    // Calendar API will be handled by Google OAuth in auth-client.js
    async getCalendarData(date_param = 'today') {
        // This will be implemented with Google Calendar API
        const authClient = window.googleAuthClient;
        if (!authClient?.isSignedIn()) {
            return {
                calendars: [],
                connected_users: [],
                total_accounts: 0,
                successful_accounts: 0,
                failed_accounts: 0,
                total_events: 0,
                date_requested: date_param,
                source: 'no_authentication',
                message: 'No Google accounts connected'
            };
        }
        
        return await authClient.getCalendarEvents(date_param);
    }
}

// Global API client
window.apiClient = null;