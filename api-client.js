// Client-side API handler for GitHub Pages
// Replaces PHP api.php with direct API calls

class APIClient {
    constructor(config) {
        this.config = config;
        this.abortController = null;
        // Cache for geocoding results (location rarely changes)
        this.geocodeCache = new Map();
    }
    
    // Cancel any ongoing requests
    cancelRequests() {
        if (this.abortController) {
            console.log('Aborting previous requests');
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        console.log('Created new AbortController');
        return this.abortController.signal;
    }
    
    async makeRequest(url, options = {}) {
        // Use the signal provided in options, or create a new one for this request
        const signal = options.signal || new AbortController().signal;
        
        try {
            console.log('API Request:', url.replace(/appid=[^&]*/, 'appid=[API_KEY]'));
            const response = await fetch(url, {
                ...options,
                signal,
                headers: {
                    'Accept': 'application/json',
                    ...options.headers
                }
            });
            
            console.log('API Response:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                url: response.url.replace(/appid=[^&]*/, 'appid=[API_KEY]')
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response Body:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('API Response Data:', data);
            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Request cancelled');
                return null;
            }
            console.error('API Request failed:', error);
            throw error;
        }
    }
    
    // Weather API - Direct call to OpenWeatherMap
    // Geocode city, state to coordinates using OpenWeatherMap Geocoding API (with caching)
    async geocodeLocation(city, state) {
        const apiKey = this.config.get('openweather_api_key');
        if (!apiKey) {
            throw new Error('OpenWeatherMap API key required for geocoding');
        }

        // Check cache first (optimization: avoid repeated API calls for same location)
        const cacheKey = `${city},${state}`;
        if (this.geocodeCache.has(cacheKey)) {
            console.log('Using cached geocoding result for:', { city, state });
            return this.geocodeCache.get(cacheKey);
        }

        try {
            // Use OpenWeatherMap's Geocoding API (more reliable than external services)
            const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)},${encodeURIComponent(state)},US&limit=1&appid=${apiKey}`;
            console.log('Geocoding location:', { city, state });

            const response = await this.makeRequest(geocodeUrl, {});

            if (!response || response.length === 0) {
                throw new Error(`Location not found: ${city}, ${state}`);
            }

            const location = response[0];
            const coords = {
                lat: location.lat,
                lon: location.lon,
                name: location.name,
                state: location.state,
                country: location.country
            };

            // Cache the result
            this.geocodeCache.set(cacheKey, coords);
            console.log('Geocoded and cached coordinates:', coords);
            return coords;

        } catch (error) {
            console.error('Geocoding error:', error);
            throw new Error(`Failed to geocode ${city}, ${state}: ${error.message}`);
        }
    }

    async getWeatherData(date_param = 'today') {
        const apiKey = this.config.get('openweather_api_key');
        if (!apiKey) {
            throw new Error('OpenWeatherMap API key not configured');
        }
        
        // Get location from city/state, then geocode to coordinates
        const city = this.config.get('location.city');
        const state = this.config.get('location.state');
        
        if (!city || !state) {
            throw new Error('Location city and state not configured');
        }
        
        try {
            console.log('Weather API request params:', { date_param, city, state, hasApiKey: !!apiKey });
            
            // Geocode city/state to coordinates
            const coords = await this.geocodeLocation(city, state);
            const { lat, lon } = coords;
            
            if (date_param === 'today') {
                // Use current weather API for today
                const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
                console.log('Requesting current weather...');
                const currentData = await this.makeRequest(currentUrl, {});
                
                if (!currentData) {
                    console.error('Current weather request returned null - likely cancelled or failed');
                    throw new Error('Weather API request was cancelled or failed');
                }
                
                // Also get forecast for hourly data
                const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
                console.log('Requesting forecast data...');
                const forecastData = await this.makeRequest(forecastUrl, {});
                
                if (!forecastData) {
                    console.warn('Forecast request returned null, continuing with current data only');
                }
                
                return this.processCurrentWeatherWithForecast(currentData, forecastData, date_param);
            } else {
                // Use forecast API for tomorrow
                const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
                console.log('Requesting forecast for tomorrow...');
                const data = await this.makeRequest(url, {});
                
                if (!data) {
                    throw new Error('Weather forecast request was cancelled or failed');
                }
                
                return this.processWeatherForecast(data, date_param);
            }
        } catch (error) {
            console.error('Weather API error:', error);
            throw new Error(`Weather API failed: ${error.message}`);
        }
    }
    
    processCurrentWeatherWithForecast(currentData, forecastData, date_param) {
        console.log('Processing current weather data:', currentData);
        console.log('Processing forecast data:', forecastData);
        
        if (!currentData?.main || !currentData?.weather?.length) {
            console.error('Invalid weather data structure:', {
                hasMain: !!currentData?.main,
                hasWeather: !!currentData?.weather,
                weatherLength: currentData?.weather?.length,
                currentData
            });
            throw new Error('Invalid current weather data received');
        }
        
        // Process hourly forecasts for today
        const hourlyForecasts = [];
        if (forecastData?.list?.length) {
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];
            
            const todayForecasts = forecastData.list.filter(item => {
                const itemDate = new Date(item.dt * 1000).toISOString().split('T')[0];
                return itemDate === todayStr;
            }).slice(0, 4); // Next 4 forecasts
            
            hourlyForecasts.push(...todayForecasts.map(f => ({
                time: new Date(f.dt * 1000).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    hour12: true
                }),
                temperature: Math.round(f.main.temp),
                description: f.weather[0].description,
                icon: f.weather[0].icon
            })));
        }
        
        // Calculate daily summary from current data and forecasts
        const dailySummary = this.createDailySummary(currentData, forecastData, hourlyForecasts);

        return {
            temperature: Math.round(currentData.main.temp),
            description: currentData.weather[0].description,
            humidity: currentData.main.humidity,
            pressure: currentData.main.pressure,
            windSpeed: Math.round(currentData.wind?.speed || 0),
            visibility: Math.round((currentData.visibility || 10000) / 1609.34), // Convert m to miles
            icon: currentData.weather[0].icon,
            date_requested: date_param,
            hourly_forecasts: hourlyForecasts,
            daily_summary: dailySummary,
            source: 'live_openweather_current'
        };
    }
    
    createDailySummary(currentData, forecastData, hourlyForecasts) {
        // Use current temp as baseline
        const currentTemp = Math.round(currentData.main.temp);
        
        // Calculate high/low from hourly forecasts if available
        let highTemp = currentTemp;
        let lowTemp = currentTemp;
        
        if (hourlyForecasts && hourlyForecasts.length > 0) {
            const temps = hourlyForecasts.map(h => h.temperature);
            highTemp = Math.max(currentTemp, ...temps);
            lowTemp = Math.min(currentTemp, ...temps);
        } else if (forecastData?.list?.length > 0) {
            // Use first few forecast entries as fallback
            const todayForecasts = forecastData.list.slice(0, 8); // Next 24 hours
            const temps = todayForecasts.map(f => Math.round(f.main.temp));
            highTemp = Math.max(currentTemp, ...temps);
            lowTemp = Math.min(currentTemp, ...temps);
        }
        
        return {
            current_temp: currentTemp,
            high_temp: highTemp,
            low_temp: lowTemp,
            description: currentData.weather[0].description,
            icon: currentData.weather[0].icon,
            summary: this.generateWeatherSummary(currentData, highTemp, lowTemp)
        };
    }
    
    generateWeatherSummary(currentData, highTemp, lowTemp) {
        // Use WeatherNarrativeEngine for consistent weather summaries
        return window.weatherNarrativeEngine.generateWeatherSummary(currentData, highTemp, lowTemp);
    }
    
    createForecastDailySummary(forecasts, firstForecast) {
        // Calculate high/low from all forecasts
        const temps = forecasts.map(f => Math.round(f.main.temp));
        const highTemp = Math.max(...temps);
        const lowTemp = Math.min(...temps);
        const avgTemp = Math.round(temps.reduce((sum, t) => sum + t, 0) / temps.length);
        
        return {
            current_temp: avgTemp,
            high_temp: highTemp,
            low_temp: lowTemp,
            description: firstForecast.weather[0].description,
            icon: firstForecast.weather[0].icon,
            summary: this.generateForecastSummary(forecasts, highTemp, lowTemp, firstForecast)
        };
    }
    
    generateForecastSummary(forecasts, highTemp, lowTemp, firstForecast) {
        // Use WeatherNarrativeEngine for consistent forecast summaries
        return window.weatherNarrativeEngine.generateForecastSummary(forecasts, highTemp, lowTemp, firstForecast);
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
        
        // Create hourly forecasts array
        const hourlyForecasts = forecasts.map(f => ({
            time: new Date(f.dt * 1000).toLocaleTimeString('en-US', {
                hour: 'numeric',
                hour12: true
            }),
            temperature: Math.round(f.main.temp),
            description: f.weather[0].description,
            icon: f.weather[0].icon
        }));
        
        // Create daily summary for forecast data
        const dailySummary = this.createForecastDailySummary(forecasts, firstForecast);

        return {
            temperature: avgTemp,
            description: firstForecast.weather[0].description,
            humidity: firstForecast.main.humidity,
            pressure: firstForecast.main.pressure,
            windSpeed: Math.round(firstForecast.wind.speed),
            visibility: Math.round((firstForecast.visibility || 10000) / 1609.34),
            icon: firstForecast.weather[0].icon,
            date_requested: date_param,
            hourly_forecasts: hourlyForecasts,
            daily_summary: dailySummary,
            source: 'live_openweather_forecast'
        };
    }
    
    // Tide API - Direct call to NOAA
    async getTideData(date_param = 'today') {
        // Get user's location to determine appropriate tide stations
        const userCity = this.config.get('location.city') || 'New York';
        const userState = this.config.get('location.state') || 'NY';
        
        let stations;
        
        // Determine stations based on location (using city/state instead of coordinates)
        if (userCity.toLowerCase().includes('eastham') || userState === 'MA') {
            // Cape Cod / Massachusetts stations
            stations = [
                { id: '8447930', name: 'Woods Hole, MA' },
                { id: '8449130', name: 'Nantucket Island, MA' },
                { id: '8447386', name: 'Chatham, MA' }
            ];
        } else {
            // New York area stations (default)
            stations = [
                { id: '8518750', name: 'The Battery, New York' },
                { id: '8516945', name: 'Kings Point, NY' },
                { id: '8519483', name: 'Bergen Point West Reach, NY' }
            ];
        }
        
        // NOAA API only supports 'today' for current day, use different approach for tomorrow
        let noaaDateParam;
        if (date_param === 'today') {
            noaaDateParam = 'today';
        } else {
            // For tomorrow, we'll get today's data and use fallback
            console.log('NOAA API does not support future dates, using fallback for tomorrow');
            return this.getFallbackTideData(date_param);
        }
        
        // Try each station until one works
        for (const station of stations) {
            try {
                const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=${noaaDateParam}&station=${station.id}&product=predictions&datum=mllw&units=english&time_zone=lst_ldt&format=json`;
                
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
        // Get user location for appropriate fallback station name
        const userCity = this.config.get('location.city') || 'New York';
        const userState = this.config.get('location.state') || 'NY';
        
        const isCapeCod = userCity.toLowerCase().includes('eastham') || userState === 'MA';
        const stationName = isCapeCod ? 'Cape Cod Bay (Estimated)' : 'New York Harbor (Estimated)';
        
        // Simple fallback based on typical tide patterns
        const now = new Date();
        const baseOffset = date_param === 'tomorrow' ? 24 * 60 * 60 * 1000 : 0;
        
        // Approximate 12.5 hour tide cycle
        const tideOffset = (now.getHours() * 60 + now.getMinutes()) * 60 * 1000;
        const cycle = 12.5 * 60 * 60 * 1000; // 12.5 hours in ms
        
        const highTide1 = new Date(now.getTime() + baseOffset - (tideOffset % cycle) + cycle * 0.25);
        const lowTide1 = new Date(highTide1.getTime() + cycle * 0.5);
        const highTide2 = new Date(highTide1.getTime() + cycle);
        const lowTide2 = new Date(lowTide1.getTime() + cycle);
        
        // Adjust tide heights based on location
        const tideHeights = isCapeCod 
            ? { high1: '9.8 ft', low1: '0.2 ft', high2: '9.6 ft', low2: '0.4 ft' }
            : { high1: '6.2 ft', low1: '0.8 ft', high2: '6.1 ft', low2: '0.9 ft' };
        
        return {
            tides: [
                {
                    type: 'High',
                    time: highTide1.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    }),
                    height: tideHeights.high1
                },
                {
                    type: 'Low',
                    time: lowTide1.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    }),
                    height: tideHeights.low1
                },
                {
                    type: 'High',
                    time: highTide2.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    }),
                    height: tideHeights.high2
                },
                {
                    type: 'Low',
                    time: lowTide2.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    }),
                    height: tideHeights.low2
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
            station: stationName,
            note: 'NOAA tide stations unavailable - showing estimated times'
        };
    }
    
    // Sunrise/Sunset API
    async getSunriseSunsetData(date_param = 'today') {
        // Get location from city/state, then geocode to coordinates
        const city = this.config.get('location.city');
        const state = this.config.get('location.state');
        
        if (!city || !state) {
            throw new Error('Location city and state not configured');
        }
        
        const now = new Date();
        const targetDate = date_param === 'tomorrow'
            ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
            : now;
        
        const dateStr = targetDate.toISOString().split('T')[0];
        
        try {
            // Geocode city/state to coordinates
            const coords = await this.geocodeLocation(city, state);
            const { lat, lon } = coords;
            
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
            // Fallback to approximate times for New York, NY
            return {
                sunrise: date_param === 'tomorrow' ? '6:30 AM' : '6:29 AM',
                sunset: date_param === 'tomorrow' ? '7:40 PM' : '7:41 PM',
                date_requested: date_param,
                source: 'fallback_estimate',
                note: 'Sunrise/Sunset API unavailable - showing estimated times for New York, NY'
            };
        }
    }
    
    // Calendar API handled by CalDAV client
    async getCalendarData(date_param = 'today') {
        // Use CalDAV client for calendar data
        const caldavClient = window.caldavClient;
        if (!caldavClient) {
            return {
                calendars: [],
                connected_users: [],
                total_accounts: 0,
                successful_accounts: 0,
                failed_accounts: 0,
                total_events: 0,
                date_requested: date_param,
                source: 'no_caldav_client',
                message: 'CalDAV client not available'
            };
        }

        return await caldavClient.getCalendarEvents(date_param);
    }
}

// Global API client
window.apiClient = null;