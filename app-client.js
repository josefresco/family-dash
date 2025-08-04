// Enhanced Dashboard Application with Modern JavaScript (ES2015+) and Weather-Responsive UI
// Version 3.1 - GitHub Pages Edition
// ENHANCED: Weather Forecasting with Hourly Breakdown and Narratives

class DashboardApp {
    constructor() {
        // Prevent multiple dashboard instances
        if (window.dashboardInstance) {
            console.warn('Dashboard already initialized, skipping duplicate initialization');
            return window.dashboardInstance;
        }
        
        // Use the global configuration instead of hardcoded values
        this.appConfig = window.dashboardConfig;
        this.apiClient = null; // Will be set during init()
        this.authClient = null; // Will be set during init()
        
        this.config = {
            refreshInterval: this.appConfig.get('settings.refresh_interval') || 1800000, // 30 minutes
            location: {
                city: this.appConfig.get('location.city') || 'New York',
                state: this.appConfig.get('location.state') || 'NY',
                lat: this.appConfig.get('location.lat') || 40.7128,
                lon: this.appConfig.get('location.lon') || -74.0060,
                timezone: this.appConfig.get('settings.timezone') || 'America/New_York'
            },
            // Time threshold for showing tomorrow's data (5:00 PM = 17:00)
            tomorrowThresholdHour: this.appConfig.get('settings.tomorrow_threshold_hour') || 17
        };
        
        this.lastUpdate = null;
        this.refreshTimer = null;
        this.timeCheckTimer = null;
        this.retryAttempts = 0;
        this.maxRetries = 3;
        this.isAuthenticated = false;
        this.tideData = [];
        this.tideStation = null;
        this.sunData = null;
        this.displayMode = 'today'; // 'today' or 'tomorrow'
        this.abortController = null; // For cancelling requests
    }

    async init() {
        try {
            console.log('=== DASHBOARD INITIALIZATION ===');
            
            // Get API clients from global scope (set by dashboard.html)
            this.apiClient = window.apiClient;
            this.authClient = window.googleAuthClient;
            
            console.log('API Client:', this.apiClient);
            console.log('Auth Client:', this.authClient);
            
            if (!this.apiClient) {
                throw new Error('API Client not available. Check dashboard.html initialization.');
            }
            
            // Determine display mode based on current time
            this.updateDisplayMode();
            
            // Initialize Google Auth
            await this.initializeGoogleAuth();
            
            await this.loadAllData();
            this.setupAutoRefresh();
            this.setupEventListeners();
            this.showLastUpdateTime();
            
            // Mark as successfully initialized
            window.dashboardInstance = this;
            
            // Clear any previous error messages from old cached versions
            console.clear();
            console.log('✅ Dashboard loaded successfully!');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to load dashboard data: ' + error.message);
        }
    }
    
    async initializeGoogleAuth() {
        try {
            await this.authClient.init();
            console.log('Google Auth initialized successfully');
        } catch (error) {
            console.warn('Google Auth initialization failed:', error);
            // Continue without Google Auth - calendar will show setup message
        }
    }
    
    async connectGoogleAccount() {
        try {
            const userData = await this.authClient.signIn();
            console.log('Google account connected:', userData);
            
            // Reload calendar data
            this.loadCalendarEvents();
            
            // Show success message
            this.showStatus('Google account connected successfully!', 'success');
        } catch (error) {
            console.error('Failed to connect Google account:', error);
            this.showStatus('Failed to connect Google account. Please try again.', 'error');
        }
    }

    // FIXED: Proper timezone handling for Eastern Time
    updateDisplayMode() {
        try {
            // Get current time in Eastern Time (Eastham, MA timezone)
            const now = new Date();
            const easternTime = new Date(now.toLocaleString("en-US", {timeZone: this.config.location.timezone}));
            const currentHour = easternTime.getHours();
            
            this.displayMode = currentHour >= this.config.tomorrowThresholdHour ? 'tomorrow' : 'today';
            
            // Get readable time for logging
            const easternTimeString = now.toLocaleString("en-US", {
                timeZone: this.config.location.timezone,
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZoneName: 'short'
            });
            
            console.log(`Display mode: ${this.displayMode} (Eastern time: ${easternTimeString}, hour: ${currentHour})`);
        } catch (error) {
            console.error('Error getting Eastern time, falling back to local time:', error);
            // Fallback to original logic if timezone handling fails
            const now = new Date();
            const currentHour = now.getHours();
            this.displayMode = currentHour >= this.config.tomorrowThresholdHour ? 'tomorrow' : 'today';
            console.log(`Display mode: ${this.displayMode} (local time fallback: ${now.toLocaleTimeString()}, hour: ${currentHour})`);
        }
    }

    getDisplayDateString() {
        const now = new Date();
        const targetDate = this.displayMode === 'tomorrow' 
            ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
            : now;
        
        // Format date in Eastern Time
        const dayName = targetDate.toLocaleDateString('en-US', { 
            weekday: 'long',
            timeZone: this.config.location.timezone
        });
        const monthDay = targetDate.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric',
            timeZone: this.config.location.timezone
        });
        
        return this.displayMode === 'tomorrow' 
            ? `Tomorrow's Schedule - ${dayName}, ${monthDay}`
            : `Today's Schedule - ${dayName}, ${monthDay}`;
    }

    updatePanelTitle() {
        const panelTitle = document.querySelector('.calendar-panel .panel-title');
        if (panelTitle) {
            panelTitle.textContent = this.getDisplayDateString();
            panelTitle.style.fontSize = '20px';
        }
    }

    handleOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const authStatus = urlParams.get('auth');
        const userName = urlParams.get('user');
        
        if (authStatus) {
            const messages = {
                success: userName ? `✅ ${userName} connected successfully!` : '✅ Google Calendar connected successfully!',
                error: `❌ Authentication error: ${urlParams.get('message') || 'Authentication failed'}`,
                denied: '❌ Calendar access was denied',
                invalid: '❌ Invalid authentication request'
            };
            
            const message = messages[authStatus];
            if (message) {
                this.showNotification(message, authStatus === 'success' ? 'success' : 'error');
            }
            
            // Clean up URL using modern API
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    async loadAllData() {
        console.log('=== LOADING ALL DATA ===');
        console.log('this.apiClient available:', !!this.apiClient);
        console.log('window.apiClient available:', !!window.apiClient);
        
        if (!this.apiClient) {
            console.error('API Client not available in loadAllData. Re-checking...');
            this.apiClient = window.apiClient;
            if (!this.apiClient) {
                throw new Error('API Client still not available after re-check');
            }
        }
        
        // Update display mode before loading data
        this.updateDisplayMode();
        this.updatePanelTitle();
        
        // Cancel any existing requests
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        const promises = [
            this.loadCalendarEvents(),
            this.loadWeatherData(),
            this.loadTideData(),
            this.loadSunriseSunsetData()
        ];

        try {
            await Promise.allSettled(promises);
            this.lastUpdate = new Date();
            this.retryAttempts = 0;
        } catch (error) {
            console.error('Error loading data:', error);
            if (this.retryAttempts < this.maxRetries) {
                this.retryAttempts++;
                setTimeout(() => this.loadAllData(), 5000 * Math.pow(2, this.retryAttempts));
            }
        }
    }

    async makeApiRequest(endpoint) {
        const dateParam = this.displayMode === 'tomorrow' ? 'tomorrow' : 'today';
        
        console.log(`Making ${endpoint} API request with dateParam: ${dateParam}`);
        console.log('this.apiClient:', this.apiClient);
        console.log('window.apiClient:', window.apiClient);
        
        if (!this.apiClient) {
            throw new Error(`API Client not available for ${endpoint} request. Check initialization.`);
        }
        
        try {
            let data;
            
            switch (endpoint) {
                case 'calendar':
                    data = await this.apiClient.getCalendarData(dateParam);
                    break;
                case 'weather':
                    data = await this.apiClient.getWeatherData(dateParam);
                    break;
                case 'tides':
                    data = await this.apiClient.getTideData(dateParam);
                    break;
                case 'sunrise-sunset':
                    data = await this.apiClient.getSunriseSunsetData(dateParam);
                    break;
                default:
                    throw new Error(`Unknown endpoint: ${endpoint}`);
            }
            
            return data;
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    async loadCalendarEvents() {
        const calendarContent = document.getElementById('calendar-content');
        
        try {
            const timeContext = this.displayMode === 'tomorrow' ? 'tomorrow\'s' : 'today\'s';
            calendarContent.innerHTML = this.getLoadingHTML(`Loading ${timeContext} calendar events...`);
            
            const data = await this.makeApiRequest('calendar');
            if (!data) return; // Request was cancelled
            
            console.log('Calendar API response:', data);
            
            if (data.error === 'no_accounts_connected') {
                console.log('No accounts connected, showing connect button');
                this.renderAddAccountPrompt();
                return;
            }
            
            if (data.error) {
                throw new Error(data.message || data.error);
            }
            
            console.log('Rendering calendar data...');
            this.renderMultiAccountCalendar(data);
        } catch (error) {
            console.error('Failed to load calendar events:', error);
            calendarContent.innerHTML = this.getErrorHTML('Failed to load calendar events: ' + error.message);
        }
    }

    renderAddAccountPrompt() {
        const calendarContent = document.getElementById('calendar-content');
        
        calendarContent.innerHTML = `
            <div style="text-align: center; padding: 30px; background: white; border-radius: 15px; margin: 15px 0;">
                <div style="font-size: 48px; margin-bottom: 15px;">📅</div>
                <h3 style="color: #2c3e50; font-size: 22px; margin-bottom: 12px; font-weight: 700;">Connect Your Google Calendars</h3>
                <p style="color: #7f8c8d; font-size: 16px; margin-bottom: 20px; line-height: 1.3;">
                    Add multiple Google accounts to see all your calendar events in one place.
                </p>
                
                <button onclick="window.dashboard.connectGoogleAccount()" class="auth-button">
                    ➕ Connect Google Account
                </button>
                
                <div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: left;">
                    <strong style="font-size: 16px; color: #2c3e50;">You can add:</strong>
                    <ul style="margin: 8px 0; padding-left: 20px; color: #6c757d; font-size: 14px; line-height: 1.4;">
                        <li>Work Google account</li>
                        <li>Personal Gmail account</li>
                        <li>Family shared accounts</li>
                        <li>Organization accounts</li>
                    </ul>
                    <small style="color: #6c757d; font-size: 12px;">All events will be displayed together with account labels.</small>
                </div>
            </div>
        `;
    }

    renderMultiAccountCalendar(data) {
        const calendarContent = document.getElementById('calendar-content');
        let html = '';

        if (!data.calendars?.length) {
            const noEventsMessage = this.displayMode === 'tomorrow' 
                ? 'No events scheduled for tomorrow' 
                : 'No events scheduled for today';
            html += `
                <div class="no-events">
                    ${noEventsMessage}
                    <br><small style="font-size: 14px;">Add more accounts or check your calendar settings</small>
                </div>
            `;
        } else {
            // Collect all events from all calendars using modern array methods
            const allEvents = data.calendars
                .filter(calendar => calendar.events?.length > 0)
                .flatMap(calendar => 
                    calendar.events.map(event => ({
                        ...event,
                        calendarColor: calendar.color || '#3498db'
                    }))
                );
            
            // Sort events by time using modern comparison
            allEvents.sort((a, b) => {
                if (a.all_day && !b.all_day) return -1;
                if (!a.all_day && b.all_day) return 1;
                if (a.all_day && b.all_day) return 0;
                return new Date(a.start) - new Date(b.start);
            });
            
            // Render events using template literals and modern methods
            html += allEvents.map(event => {
                let startTime;
                try {
                    if (event.all_day) {
                        startTime = 'All Day';
                    } else {
                        startTime = new Date(event.start).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: this.config.location.timezone
                        });
                    }
                } catch (e) {
                    startTime = 'Time TBD';
                }

                return `
                    <div class="event-compact" style="border-left-color: ${event.calendarColor};">
                        <div class="event-time-compact">${startTime}</div>
                        <div class="event-title-compact">${event.summary || 'Untitled Event'}</div>
                    </div>
                `;
            }).join('');

            // Show compact summary
            const timeContext = this.displayMode === 'tomorrow' ? 'tomorrow' : 'today';
            html += `
                <div class="summary-compact">
                    ${allEvents.length} events for ${timeContext}
                </div>
            `;
        }

        calendarContent.innerHTML = html;
    }

    async loadWeatherData() {
        const weatherDiv = document.getElementById('current-weather');
        
        try {
            console.log('=== DASHBOARD WEATHER LOADING ===');
            console.log('Display mode:', this.displayMode);
            console.log('API Client:', this.apiClient);
            console.log('Config object:', this.appConfig);
            console.log('Weather API key configured:', !!this.appConfig.get('openweather_api_key'));
            console.log('Location:', {
                lat: this.appConfig.get('location.lat'),
                lon: this.appConfig.get('location.lon'),
                city: this.appConfig.get('location.city')
            });
            
            const timeContext = this.displayMode === 'tomorrow' ? 'tomorrow\'s' : 'today\'s';
            weatherDiv.innerHTML = this.getLoadingHTML(`Loading ${timeContext} weather forecast...`);
            
            console.log('Making API request for weather...');
            const data = await this.makeApiRequest('weather');
            console.log('Weather API response:', data);
            
            if (!data) {
                console.log('Request was cancelled');
                return; // Request was cancelled
            }
            
            console.log('Rendering weather data...');
            this.renderWeatherData(data);
            console.log('Weather data rendered successfully');
        } catch (error) {
            console.error('Failed to load weather data:', error);
            console.error('Error stack:', error.stack);
            weatherDiv.innerHTML = this.getErrorHTML('Failed to load weather data: ' + error.message);
        }
    }

    // ENHANCED: New weather rendering with forecasts
    renderWeatherData(data) {
        const currentWeatherDiv = document.getElementById('current-weather');
        
        if (!data.daily_summary) {
            // Fallback to current weather display if old API format
            this.renderLegacyWeatherData(data);
            return;
        }
        
        const timeContext = this.displayMode === 'tomorrow' ? 'Tomorrow' : 'Today';
        const summary = data.daily_summary;
        
        // Get weather-responsive color scheme based on dominant condition
        const weatherScheme = this.getWeatherColorScheme({
            description: summary.description,
            icon: summary.icon,
            temperature: summary.high_temp
        });
        const colors = weatherScheme.colors;
        
        currentWeatherDiv.innerHTML = `
            <!-- Weather Context Header -->
            <div class="weather-context-header" style="
                background: ${colors.background}; 
                border: 2px solid ${colors.border}; 
                border-radius: 12px; 
                padding: 10px; 
                margin-bottom: 12px; 
                text-align: center; 
                color: ${colors.text}; 
                font-size: 16px; 
                font-weight: 700;
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            ">
                <strong>📅 ${timeContext}'s Weather Forecast</strong>
                <div style="font-size: 11px; margin-top: 3px; opacity: 0.9;">
                    ${summary.description} • ${summary.low_temp}°F - ${summary.high_temp}°F
                </div>
            </div>
            
            <!-- Weather Narrative -->
            <div class="weather-narrative" style="
                background: ${colors.cardBg};
                border: 1px solid ${colors.border};
                border-radius: 10px;
                padding: 10px;
                margin-bottom: 10px;
                font-size: 40px;
                line-height: 1.3;
                color: ${colors.text};
                text-align: center;
                font-weight: 500;
            ">
                ${data.narrative}
            </div>
            
            <!-- Temperature Range Display -->
            <div class="temp-range" style="
                background: ${colors.cardBg};
                border: 1px solid ${colors.border};
                border-radius: 10px;
                padding: 8px;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div style="text-align: center; flex: 1;">
                    <div style="font-size: 8px; color: ${colors.text}; opacity: 0.8; margin-bottom: 2px;">LOW</div>
                    <div style="font-size: 20px; font-weight: 700; color: ${colors.primary};">${summary.low_temp}°F</div>
                </div>
                <div style="text-align: center; flex: 1;">
                    <div class="weather-icon" style="
                        font-size: 28px;
                        background: ${colors.primary};
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto;
                        border: 2px solid ${colors.accent};
                    ">${this.getWeatherIcon(summary.icon)}</div>
                </div>
                <div style="text-align: center; flex: 1;">
                    <div style="font-size: 8px; color: ${colors.text}; opacity: 0.8; margin-bottom: 2px;">HIGH</div>
                    <div style="font-size: 20px; font-weight: 700; color: ${colors.primary};">${summary.high_temp}°F</div>
                </div>
            </div>
            
            <!-- Hourly Forecast -->
            ${this.renderHourlyForecast(data.hourly_forecast, colors)}
            
            <!-- Additional Details -->
            <div class="weather-details" style="
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 6px;
                margin-top: 8px;
            ">
                <div style="
                    background: ${colors.cardBg};
                    border: 1px solid ${colors.border};
                    border-radius: 6px;
                    padding: 6px;
                    text-align: center;
                ">
                    <div style="font-size: 8px; color: ${colors.text}; opacity: 0.8; margin-bottom: 2px;">HUMIDITY</div>
                    <div style="font-size: 12px; font-weight: 600; color: ${colors.primary};">
                        ${data.details.humidity_range.min}-${data.details.humidity_range.max}%
                    </div>
                </div>
                <div style="
                    background: ${colors.cardBg};
                    border: 1px solid ${colors.border};
                    border-radius: 6px;
                    padding: 6px;
                    text-align: center;
                ">
                    <div style="font-size: 8px; color: ${colors.text}; opacity: 0.8; margin-bottom: 2px;">WIND</div>
                    <div style="font-size: 11px; font-weight: 600; color: ${colors.primary};">
                        ${data.details.wind_summary}
                    </div>
                </div>
            </div>
            
            <!-- Precipitation Alert (if any) -->
            ${data.precipitation.expected ? this.renderPrecipitationAlert(data.precipitation, colors) : ''}
        `;
        
        // Update favicon based on weather
        this.updateFavicon(this.getWeatherIcon(summary.icon));
    }

    renderHourlyForecast(hourlyData, colors) {
        if (!hourlyData || hourlyData.length === 0) {
            return '';
        }
        
        // Limit to 4 key hours to fit in the space
        const keyHours = this.selectKeyHours(hourlyData);
        
        const hourlyHtml = keyHours.map(hour => `
            <div style="
                text-align: center;
                padding: 4px;
                background: ${colors.cardBg};
                border: 1px solid ${colors.border};
                border-radius: 6px;
                min-width: 0;
            ">
                <div style="font-size: 8px; color: ${colors.text}; opacity: 0.8; margin-bottom: 1px;">
                    ${hour.time}
                </div>
                <div style="font-size: 14px; margin: 1px 0;">
                    ${this.getWeatherIcon(hour.icon)}
                </div>
                <div style="font-size: 10px; font-weight: 600; color: ${colors.primary};">
                    ${hour.temperature}°F
                </div>
                ${hour.precipitation > 0 ? 
                    `<div style="font-size: 7px; color: ${colors.accent};">💧${Math.round(hour.precipitation * 10) / 10}"</div>` : 
                    ''
                }
            </div>
        `).join('');
        
        return `
            <div class="hourly-forecast" style="
                display: grid;
                grid-template-columns: repeat(${keyHours.length}, 1fr);
                gap: 4px;
                margin: 8px 0;
            ">
                ${hourlyHtml}
            </div>
        `;
    }

    selectKeyHours(hourlyData) {
        // Select up to 4 representative hours throughout the day
        if (hourlyData.length <= 4) {
            return hourlyData;
        }
        
        const keyHours = [];
        const totalHours = hourlyData.length;
        
        // Always include first hour (morning)
        keyHours.push(hourlyData[0]);
        
        // Add midday if available
        const middayIndex = Math.floor(totalHours / 2);
        if (middayIndex > 0 && middayIndex !== totalHours - 1) {
            keyHours.push(hourlyData[middayIndex]);
        }
        
        // Add late afternoon/evening
        const eveningIndex = Math.floor(totalHours * 0.75);
        if (eveningIndex > middayIndex && eveningIndex !== totalHours - 1) {
            keyHours.push(hourlyData[eveningIndex]);
        }
        
        // Always include last hour (evening)
        if (totalHours > 1) {
            keyHours.push(hourlyData[totalHours - 1]);
        }
        
        return keyHours;
    }

    renderPrecipitationAlert(precipitation, colors) {
        if (!precipitation.expected || precipitation.hours.length === 0) {
            return '';
        }
        
        const precipType = precipitation.hours[0].type;
        const precipIcon = precipType === 'rain' ? '🌧️' : '❄️';
        const totalHours = precipitation.total_hours;
        
        let alertText = '';
        if (totalHours === 1) {
            alertText = `${precipIcon} ${precipType} expected around ${precipitation.hours[0].time}`;
        } else {
            const times = precipitation.hours.map(h => h.time).slice(0, 2); // Show first 2 times
            if (precipitation.hours.length > 2) {
                alertText = `${precipIcon} ${precipType} expected ${times.join(', ')} and ${precipitation.hours.length - 2} more periods`;
            } else {
                alertText = `${precipIcon} ${precipType} expected ${times.join(' and ')}`;
            }
        }
        
        return `
            <div class="precipitation-alert" style="
                background: linear-gradient(135deg, rgba(52, 152, 219, 0.1) 0%, rgba(41, 128, 185, 0.2) 100%);
                border: 2px solid #3498db;
                border-radius: 8px;
                padding: 6px;
                margin-top: 8px;
                text-align: center;
                font-size: 10px;
                font-weight: 600;
                color: #2c3e50;
                animation: precipitation-pulse 3s ease-in-out infinite;
            ">
                ${alertText}
            </div>
            <style>
                @keyframes precipitation-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.8; }
                }
            </style>
        `;
    }

    // Enhanced legacy fallback for current weather format
    renderLegacyWeatherData(data) {
        const currentWeatherDiv = document.getElementById('current-weather');
        
        const weatherIcon = this.getWeatherIcon(data.icon || '01d');
        const timeContext = this.displayMode === 'tomorrow' ? 'tomorrow' : 'today';
        const timeContextTitle = timeContext.charAt(0).toUpperCase() + timeContext.slice(1);
        
        // Get weather-responsive color scheme
        const weatherScheme = this.getWeatherColorScheme(data);
        const colors = weatherScheme.colors;
        
        currentWeatherDiv.innerHTML = `
            <div class="weather-context-header" style="
                background: ${colors.background}; 
                border: 2px solid ${colors.border}; 
                border-radius: 12px; 
                padding: 10px; 
                margin-bottom: 12px; 
                text-align: center; 
                color: ${colors.text}; 
                font-size: 30px; 
                font-weight: 700;
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            ">
                <strong>🌤️ Weather for ${timeContextTitle}</strong>
                <div style="font-size: 11px; margin-top: 3px; opacity: 0.8;">
                    CURRENT CONDITIONS
                </div>
            </div>
            
            <div class="current-weather" style="
                background: ${colors.cardBg};
                border: 1px solid ${colors.border};
                border-radius: 10px;
                padding: 12px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            ">
                <div class="weather-main">
                    <div class="weather-icon" style="
                        background: ${colors.primary};
                        border-radius: 50%;
                        width: 45px;
                        height: 45px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-right: 12px;
                        box-shadow: 0 3px 6px rgba(0,0,0,0.2);
                        border: 2px solid ${colors.accent};
                    ">${weatherIcon}</div>
                    <div class="temperature" style="color: ${colors.primary}; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                        ${data.temperature || 'N/A'}°F
                    </div>
                </div>
                <div class="weather-details">
                    <div class="weather-description" style="color: ${colors.text}; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">
                        ${data.description || 'N/A'}
                    </div>
                </div>
            </div>
            
            <div class="weather-stats" style="margin-top: 12px;">
                <div class="weather-stat" style="
                    background: ${colors.cardBg};
                    border: 1px solid ${colors.border};
                    border-radius: 8px;
                    padding: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                ">
                    <div class="weather-stat-label" style="color: ${colors.text};">Humidity</div>
                    <div class="weather-stat-value" style="color: ${colors.primary};">
                        ${data.humidity || 'N/A'}%
                    </div>
                </div>
                <div class="weather-stat" style="
                    background: ${colors.cardBg};
                    border: 1px solid ${colors.border};
                    border-radius: 8px;
                    padding: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                ">
                    <div class="weather-stat-label" style="color: ${colors.text};">Wind</div>
                    <div class="weather-stat-value" style="color: ${colors.primary};">
                        ${data.windSpeed || 'N/A'} mph
                    </div>
                </div>
            </div>
        `;
        
        // Update favicon
        this.updateFavicon(weatherIcon);
    }

    async loadTideData() {
        try {
            const data = await this.makeApiRequest('tides');
            if (!data) return; // Request was cancelled
            
            this.tideData = data.tides || [];
            this.tideStation = data.station || 'Unknown Station';
            
            this.renderSunTideData();
        } catch (error) {
            console.error('Failed to load tide data:', error);
            this.tideData = [];
            this.tideStation = 'No data available';
            this.renderSunTideData();
        }
    }

    async loadSunriseSunsetData() {
        try {
            const data = await this.makeApiRequest('sunrise-sunset');
            if (!data) return; // Request was cancelled
            
            this.sunData = data;
            this.renderSunTideData();
        } catch (error) {
            console.error('Failed to load sunrise/sunset data:', error);
            this.sunData = { sunrise: 'N/A', sunset: 'N/A' };
            this.renderSunTideData();
        }
    }

    getWeatherColorScheme(weatherData) {
        const description = (weatherData.description || '').toLowerCase();
        const icon = weatherData.icon || '01d';
        const temp = parseInt(weatherData.temperature) || 70;
        
        // Define vibrant color schemes based on weather conditions
        const colorSchemes = {
            // Clear/Sunny conditions
            clear_day: {
                primary: '#FFD700',      // Bright gold
                secondary: '#FFA500',    // Orange
                accent: '#FF6B35',       // Coral
                background: 'linear-gradient(135deg, #FFE066 0%, #FF9A56 100%)',
                text: '#8B4513',         // Saddle brown
                cardBg: 'rgba(255, 248, 220, 0.95)', // Cornsilk
                border: '#DAA520'        // Goldenrod
            },
            clear_night: {
                primary: '#4169E1',      // Royal blue
                secondary: '#6495ED',    // Cornflower blue
                accent: '#87CEEB',       // Sky blue
                background: 'linear-gradient(135deg, #2C3E50 0%, #4A6741 100%)',
                text: '#F0F8FF',         // Alice blue
                cardBg: 'rgba(25, 25, 112, 0.95)', // Midnight blue
                border: '#4682B4'        // Steel blue
            },
            // Cloudy conditions
            cloudy: {
                primary: '#778899',      // Light slate gray
                secondary: '#696969',    // Dim gray
                accent: '#A9A9A9',       // Dark gray
                background: 'linear-gradient(135deg, #B0C4DE 0%, #708090 100%)',
                text: '#2F4F4F',         // Dark slate gray
                cardBg: 'rgba(248, 248, 255, 0.95)', // Ghost white
                border: '#708090'        // Slate gray
            },
            partly_cloudy: {
                primary: '#87CEEB',      // Sky blue
                secondary: '#98D8E8',    // Light blue
                accent: '#F0E68C',       // Khaki (sun peek)
                background: 'linear-gradient(135deg, #87CEEB 0%, #F0E68C 100%)',
                text: '#2F4F4F',         // Dark slate gray
                cardBg: 'rgba(240, 248, 255, 0.95)', // Alice blue
                border: '#4682B4'        // Steel blue
            },
            // Rainy conditions
            rainy: {
                primary: '#4682B4',      // Steel blue
                secondary: '#5F9EA0',    // Cadet blue
                accent: '#008B8B',       // Dark cyan
                background: 'linear-gradient(135deg, #4682B4 0%, #2F4F4F 100%)',
                text: '#F0F8FF',         // Alice blue
                cardBg: 'rgba(72, 130, 180, 0.95)', // Steel blue
                border: '#1E90FF'        // Dodger blue
            },
            drizzle: {
                primary: '#87CEEB',      // Sky blue
                secondary: '#B0E0E6',    // Powder blue
                accent: '#ADD8E6',       // Light blue
                background: 'linear-gradient(135deg, #B0E0E6 0%, #87CEEB 100%)',
                text: '#2F4F4F',         // Dark slate gray
                cardBg: 'rgba(176, 224, 230, 0.95)', // Powder blue
                border: '#87CEEB'        // Sky blue
            },
            // Stormy conditions
            thunderstorm: {
                primary: '#4B0082',      // Indigo
                secondary: '#8A2BE2',    // Blue violet
                accent: '#FFD700',       // Gold (lightning)
                background: 'linear-gradient(135deg, #2F4F4F 0%, #4B0082 100%)',
                text: '#F0F8FF',         // Alice blue
                cardBg: 'rgba(75, 0, 130, 0.95)', // Indigo
                border: '#FFD700'        // Gold
            },
            // Snow conditions
            snow: {
                primary: '#F0F8FF',      // Alice blue
                secondary: '#E6E6FA',    // Lavender
                accent: '#B0E0E6',       // Powder blue
                background: 'linear-gradient(135deg, #F0F8FF 0%, #E6E6FA 100%)',
                text: '#2F4F4F',         // Dark slate gray
                cardBg: 'rgba(240, 248, 255, 0.98)', // Alice blue
                border: '#87CEEB'        // Sky blue
            },
            // Fog/Mist conditions
            fog: {
                primary: '#D3D3D3',      // Light gray
                secondary: '#C0C0C0',    // Silver
                accent: '#A9A9A9',       // Dark gray
                background: 'linear-gradient(135deg, #F5F5F5 0%, #DCDCDC 100%)',
                text: '#2F4F4F',         // Dark slate gray
                cardBg: 'rgba(245, 245, 245, 0.95)', // White smoke
                border: '#C0C0C0'        // Silver
            },
            // Hot weather
            hot: {
                primary: '#FF4500',      // Orange red
                secondary: '#FF6347',    // Tomato
                accent: '#FFD700',       // Gold
                background: 'linear-gradient(135deg, #FF6347 0%, #FF4500 100%)',
                text: '#8B0000',         // Dark red
                cardBg: 'rgba(255, 228, 196, 0.95)', // Bisque
                border: '#FF4500'        // Orange red
            },
            // Cold weather
            cold: {
                primary: '#00CED1',      // Dark turquoise
                secondary: '#20B2AA',    // Light sea green
                accent: '#E0FFFF',       // Light cyan
                background: 'linear-gradient(135deg, #00CED1 0%, #4682B4 100%)',
                text: '#F0F8FF',         // Alice blue
                cardBg: 'rgba(0, 206, 209, 0.95)', // Dark turquoise
                border: '#00BFFF'        // Deep sky blue
            }
        };
        
        // Determine weather condition
        let condition = 'clear_day'; // default
        
        // Check for specific weather conditions
        if (description.includes('thunder') || description.includes('storm')) {
            condition = 'thunderstorm';
        } else if (description.includes('snow') || description.includes('blizzard')) {
            condition = 'snow';
        } else if (description.includes('rain') || description.includes('shower')) {
            condition = 'rainy';
        } else if (description.includes('drizzle') || description.includes('mist')) {
            condition = 'drizzle';
        } else if (description.includes('fog') || description.includes('haze')) {
            condition = 'fog';
        } else if (description.includes('cloud')) {
            if (description.includes('few') || description.includes('scattered') || description.includes('partly')) {
                condition = 'partly_cloudy';
            } else {
                condition = 'cloudy';
            }
        } else if (description.includes('clear') || description.includes('sunny')) {
            condition = icon.includes('n') ? 'clear_night' : 'clear_day';
        }
        
        // Temperature-based overrides
        if (temp >= 85) {
            condition = 'hot';
        } else if (temp <= 32) {
            condition = 'cold';
        }
        
        // Icon-based fallbacks
        if (!colorSchemes[condition]) {
            const iconCode = icon.substring(0, 2);
            switch (iconCode) {
                case '01': condition = icon.includes('n') ? 'clear_night' : 'clear_day'; break;
                case '02': condition = 'partly_cloudy'; break;
                case '03':
                case '04': condition = 'cloudy'; break;
                case '09': condition = 'drizzle'; break;
                case '10': condition = 'rainy'; break;
                case '11': condition = 'thunderstorm'; break;
                case '13': condition = 'snow'; break;
                case '50': condition = 'fog'; break;
                default: condition = 'clear_day';
            }
        }
        
        return {
            condition,
            colors: colorSchemes[condition]
        };
    }

    updateFavicon(weatherIcon) {
        try {
            // Create a canvas to draw the weather icon
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const ctx = canvas.getContext('2d');
            
            // Set background
            ctx.fillStyle = '#667eea';
            ctx.fillRect(0, 0, 32, 32);
            
            // Add weather icon
            ctx.font = '20px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(weatherIcon, 16, 16);
            
            // Convert to data URL and update favicon
            const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
            link.type = 'image/png';
            link.rel = 'shortcut icon';
            link.href = canvas.toDataURL();
            document.head.appendChild(link);
        } catch (error) {
            console.log('Could not update favicon:', error.message);
        }
    }

    renderSunTideData() {
        const sunTideDiv = document.getElementById('sun-tide-info');
        
        // Use modern array methods for tide rendering
        const tideHtml = this.tideData?.length > 0
            ? this.tideData.map(tide => `
                <div class="tide-time">
                    <strong>${tide.type}</strong>
                    <div style="font-size: 12px; color: #0277bd; font-weight: 600; margin: 2px 0;">${tide.time}</div>
                    <div style="font-size: 8px; color: #0288d1;">${tide.height}</div>
                </div>
            `).join('')
            : '<div class="tide-time"><strong>No tide data available</strong></div>';

        const stationInfo = this.tideStation 
            ? `<small style="color: #6c757d; font-style: italic; margin-top: 6px; display: block; font-size: 8px; text-align: center;">${this.tideStation}</small>` 
            : '';
        
        const timeContext = this.displayMode === 'tomorrow' ? 'Tomorrow' : 'Today';
        const sunrise = this.sunData?.sunrise || 'N/A';
        const sunset = this.sunData?.sunset || 'N/A';

        sunTideDiv.innerHTML = `
            <div class="sun-tide-grid">
                <div class="info-card">
                    <div class="info-card-title">Sunrise</div>
                    <div class="info-card-value">🌅 ${sunrise}</div>
                </div>
                <div class="info-card">
                    <div class="info-card-title">Sunset</div>
                    <div class="info-card-value">🌇 ${sunset}</div>
                </div>
            </div>
            <div style="margin-top: 12px;">
                <div class="tides-title">${timeContext}'s Tides</div>
                <div class="tide-times">
                    ${tideHtml}
                </div>
                ${stationInfo}
            </div>
        `;
    }

    getWeatherIcon(iconCode) {
        const iconMap = new Map([
            ['01d', '☀️'], ['01n', '🌙'],
            ['02d', '⛅'], ['02n', '☁️'],
            ['03d', '☁️'], ['03n', '☁️'],
            ['04d', '☁️'], ['04n', '☁️'],
            ['09d', '🌧️'], ['09n', '🌧️'],
            ['10d', '🌦️'], ['10n', '🌧️'],
            ['11d', '⛈️'], ['11n', '⛈️'],
            ['13d', '❄️'], ['13n', '❄️'],
            ['50d', '🌫️'], ['50n', '🌫️']
        ]);
        return iconMap.get(iconCode) || '☁️';
    }

    getLoadingHTML(message) {
        return `
            <div class="loading">
                <div class="spinner"></div>
                ${message}
            </div>
        `;
    }

    getErrorHTML(message) {
        return `
            <div class="error">
                ⚠️ ${message}
                <br><small style="font-size: 16px;">Click refresh to try again</small>
            </div>
        `;
    }

    showError(message) {
        console.error(message);
    }

    showNotification(message, type = 'info') {
        // Create notification element with modern CSS
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1000',
            maxWidth: '350px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'all 0.3s ease',
            fontSize: '16px'
        });
        
        // Set background color based on type using modern approach
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            info: '#3498db',
            warning: '#f39c12'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        notification.innerHTML = message;
        document.body.appendChild(notification);
        
        // Remove notification after 5 seconds with animation
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    setupAutoRefresh() {
        // Clear existing timers
        [this.refreshTimer, this.timeCheckTimer].forEach(timer => {
            if (timer) clearInterval(timer);
        });
        
        this.refreshTimer = setInterval(() => {
            this.loadAllData();
        }, this.config.refreshInterval);
        
        // Check for time changes every minute using modern approach
        this.timeCheckTimer = setInterval(() => {
            const oldMode = this.displayMode;
            this.updateDisplayMode();
            
            if (oldMode !== this.displayMode) {
                console.log(`Display mode changed from ${oldMode} to ${this.displayMode}`);
                this.showNotification(`📅 Switched to ${this.displayMode}'s schedule`, 'info');
                this.loadAllData();
            }
        }, 60000);
    }

    setupEventListeners() {
        // Handle visibility changes with modern API
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                const oldMode = this.displayMode;
                this.updateDisplayMode();
                
                if (oldMode !== this.displayMode) {
                    console.log(`Display mode changed on visibility change: ${oldMode} -> ${this.displayMode}`);
                    this.showNotification(`📅 Switched to ${this.displayMode}'s schedule`, 'info');
                }
                
                this.loadAllData();
            }
        });

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            [this.refreshTimer, this.timeCheckTimer].forEach(timer => {
                if (timer) clearInterval(timer);
            });
            
            // Cancel any pending requests
            if (this.abortController) {
                this.abortController.abort();
            }
        });

        // Modern keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey || event.metaKey) {
                switch(event.key) {
                    case 'r':
                        event.preventDefault();
                        this.refresh();
                        break;
                    case 'l':
                        event.preventDefault();
                        window.location.href = 'admin-control-panel.php';
                        break;
                }
            }
        });
    }

    refresh() {
        const refreshBtn = document.querySelector('.refresh-btn');
        
        if (refreshBtn) {
            // Use modern CSS animations
            refreshBtn.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                refreshBtn.style.transform = '';
            }, 600);
        }

        // Check for display mode changes on manual refresh
        const oldMode = this.displayMode;
        this.updateDisplayMode();
        
        if (oldMode !== this.displayMode) {
            this.showNotification(`📅 Switched to ${this.displayMode}'s schedule`, 'info');
        }

        this.loadAllData();
    }

    showLastUpdateTime() {
        if (this.lastUpdate) {
            const timeString = this.lastUpdate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: this.config.location.timezone
            });
            
            const displayContext = this.displayMode === 'tomorrow' ? ' (showing tomorrow)' : ' (showing today)';
            console.log(`Last updated: ${timeString}${displayContext}`);
        }
    }

    // Debug method to check timezone handling
    debugTimezone() {
        const now = new Date();
        console.log('=== TIMEZONE DEBUG ===');
        console.log('Local time (browser):', now.toLocaleString());
        console.log('Local hour (browser):', now.getHours());
        console.log('UTC time:', now.toUTCString());
        console.log('UTC hour:', now.getUTCHours());
        
        try {
            const easternTime = new Date(now.toLocaleString("en-US", {timeZone: this.config.location.timezone}));
            console.log('Eastern time (converted):', easternTime.toLocaleString());
            console.log('Eastern hour (converted):', easternTime.getHours());
            
            const easternTimeString = now.toLocaleString("en-US", {
                timeZone: this.config.location.timezone,
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZoneName: 'short'
            });
            console.log('Eastern time (formatted):', easternTimeString);
            
            const shouldBeTomorrow = easternTime.getHours() >= this.config.tomorrowThresholdHour;
            console.log(`Should show tomorrow? ${shouldBeTomorrow} (hour: ${easternTime.getHours()}, threshold: ${this.config.tomorrowThresholdHour})`);
        } catch (error) {
            console.error('Timezone conversion error:', error);
        }
        console.log('======================');
    }
}

// Initialize the app using modern async/await patterns
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const app = new DashboardApp();
        window.dashboardApp = app;
        
        // Add debug method to global scope for testing
        window.debugTimezone = () => app.debugTimezone();
        
        await app.init();
        
        // Debug timezone on load
        console.log('Dashboard initialized. Type debugTimezone() in console to check timezone handling.');
    } catch (error) {
        console.error('Critical error during app initialization:', error);
        
        // Show error in both panels using modern selectors
        const panels = ['#calendar-content', '#current-weather'];
        const errorHtml = `
            <div style="background: #ffebee; color: #c62828; padding: 20px; border-radius: 8px; margin: 20px 0; font-size: 20px; font-weight: 600;">
                <h4>Critical Error</h4>
                <p>${error.message}</p>
            </div>
        `;
        
        panels.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) element.innerHTML = errorHtml;
        });
    }
});

// Service Worker Registration with modern error handling
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('SW registered: ', registration);
        } catch (registrationError) {
            console.log('SW registration failed: ', registrationError);
        }
    });
}