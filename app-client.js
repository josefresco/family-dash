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
            
            // Check and auto-detect location if needed
            await this.checkAndDetectLocation();
            
            // Determine display mode based on current time
            this.updateDisplayMode();
            
            // Initialize CalDAV client
            await this.initializeCalDAV();
            
            await this.loadAllData();
            this.setupAutoRefresh();
            this.setupEventListeners();
            this.showLastUpdateTime();
            
            // Mark as successfully initialized
            window.dashboardInstance = this;
            
            console.log('✅ Dashboard loaded successfully!');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to load dashboard data: ' + error.message);
        }
    }
    
    async checkAndDetectLocation() {
        const currentLat = this.appConfig.get('location.lat');
        const currentLon = this.appConfig.get('location.lon');
        
        // Check if location is not set or is still default NYC coordinates
        const isDefaultLocation = (currentLat === 40.7128 && currentLon === -74.0060) || 
                                  !currentLat || !currentLon;
        
        if (isDefaultLocation) {
            console.log('Location not set or using default NYC coordinates, attempting auto-detection...');
            try {
                await this.autoDetectLocation();
            } catch (error) {
                console.warn('Auto location detection failed:', error.message);
                // Continue with default location
            }
        } else {
            console.log('Location already configured:', {
                lat: currentLat,
                lon: currentLon,
                city: this.appConfig.get('location.city'),
                state: this.appConfig.get('location.state')
            });
        }
    }
    
    async autoDetectLocation() {
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported by this browser');
        }
        
        console.log('Requesting location permission...');
        
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            });
        });
        
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        console.log('Location detected:', { lat, lon });
        
        // Use reverse geocoding to get city/state
        const locationData = await this.reverseGeocode(lat, lon);
        
        // Update configuration
        this.appConfig.set('location.lat', lat);
        this.appConfig.set('location.lon', lon);
        this.appConfig.set('location.city', locationData.city);
        this.appConfig.set('location.state', locationData.state);
        
        // Update local config object
        this.config.location.lat = lat;
        this.config.location.lon = lon;
        this.config.location.city = locationData.city;
        this.config.location.state = locationData.state;
        
        console.log(`✅ Location auto-detected and saved: ${locationData.city}, ${locationData.state}`);
        
        // Show notification to user
        this.showNotification(`📍 Location auto-detected: ${locationData.city}, ${locationData.state}`, 'success');
    }
    
    async reverseGeocode(lat, lon) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Reverse geocoding failed');
            }
            
            const data = await response.json();
            console.log('Reverse geocoding result:', data);
            
            const address = data.address || {};
            
            // Extract city and state from various possible fields
            const city = address.city || address.town || address.village || address.hamlet || 
                       address.suburb || address.neighbourhood || 'Current Location';
                       
            const state = address.state || address.region || address.province || 
                        address.county || 'Auto-Detected';
            
            return {
                city: city,
                state: this.getStateAbbreviation(state)
            };
        } catch (error) {
            console.warn('Reverse geocoding failed, using fallback:', error);
            // Fallback to basic location name
            return {
                city: 'Current Location',
                state: 'Auto-Detected'
            };
        }
    }
    
    getStateAbbreviation(stateName) {
        const stateMap = {
            'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
            'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
            'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
            'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
            'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
            'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
            'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
            'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
            'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
            'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
        };
        
        return stateMap[stateName] || stateName;
    }

    async initializeCalDAV() {
        try {
            // Initialize CalDAV client
            window.caldavClient = new CalDAVClient(this.appConfig);
            console.log('✅ CalDAV client initialized');
            
            // Check if CalDAV is configured
            if (window.caldavClient.isConfigured) {
                console.log('📅 Using CalDAV client with Netlify functions');
                const testResult = await window.caldavClient.testConnection();
                if (testResult.success) {
                    console.log('✅ CalDAV connection verified:', testResult.message);
                    this.activeCalendarClient = window.caldavClient;
                    this.calendarType = 'caldav';
                } else {
                    console.warn('⚠️ CalDAV connection issue:', testResult.error);
                }
            } else {
                console.log('📅 CalDAV not configured - calendar will show setup option');
                this.activeCalendarClient = null;
                this.calendarType = null;
            }
        } catch (error) {
            console.error('Calendar initialization failed:', error);
            // Continue without calendar - will show setup message
        }
    }
    
    async connectCalendarAccount() {
        try {
            // Open CalDAV configuration modal or redirect to setup
            this.showCalDAVSetupModal();
        } catch (error) {
            console.error('Failed to open calendar setup:', error);
            this.showNotification('Failed to open calendar setup. Please try again.', 'error');
        }
    }
    
    showCalDAVSetupModal() {
        // For now, redirect to setup page - we'll implement modal later
        const message = `To set up your calendar:
        
1. Go to setup.html
2. Configure CalDAV connection
3. Return to dashboard

CalDAV works with:
• Google Calendar (with app password)
• Apple iCloud Calendar
• Microsoft Outlook
• Any CalDAV server

This eliminates token refresh issues and works perfectly for always-on dashboards!`;
        
        if (confirm(message + '\n\nGo to setup page now?')) {
            window.location.href = 'setup.html';
        }
    }

    // FIXED: Proper timezone handling for Eastern Time
    updateDisplayMode() {
        try {
            // Get current time in Eastern Time (Eastham, MA timezone)
            const now = new Date();
            // Get the current hour in Eastern timezone directly
            const currentHour = parseInt(now.toLocaleString("en-US", {
                timeZone: this.config.location.timezone,
                hour: 'numeric',
                hour12: false
            }), 10);
            
            console.log('🕐 Debug current time calculation:', {
                utc_time: now.toISOString(),
                utc_date: now.toDateString(),
                current_hour_eastern: currentHour,
                threshold: this.config.tomorrowThresholdHour,
                timezone: this.config.location.timezone
            });
            
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
        
        const scheduleLabel = this.displayMode === 'tomorrow' ? "Tomorrow's Schedule" : "Today's Schedule";
        const dateInfo = `${dayName}, ${monthDay}`;
        
        return `${scheduleLabel}<br><small style="font-size: 14px; font-weight: 400; opacity: 0.8;">${dateInfo}</small>`;
    }

    updatePanelTitle() {
        const panelTitle = document.querySelector('.calendar-panel .panel-title');
        if (panelTitle) {
            panelTitle.innerHTML = this.getDisplayDateString();
            panelTitle.style.fontSize = '16px';
            panelTitle.style.lineHeight = '1.2';
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
                    if (this.activeCalendarClient) {
                        data = await this.activeCalendarClient.getCalendarEvents(dateParam);
                    } else {
                        // Return empty calendar data if no client is configured
                        data = {
                            calendars: [],
                            connected_users: [],
                            total_accounts: 0,
                            successful_accounts: 0,
                            failed_accounts: 0,
                            total_events: 0,
                            date_requested: dateParam,
                            source: 'no_calendar_configured',
                            message: 'No calendar configured. Please set up your calendar connection.'
                        };
                    }
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

    async makeApiRequestWithDate(endpoint, dateParam) {
        console.log(`Making ${endpoint} API request with explicit dateParam: ${dateParam}`);
        
        if (!this.apiClient) {
            throw new Error(`API Client not available for ${endpoint} request. Check initialization.`);
        }
        
        try {
            let data;
            
            switch (endpoint) {
                case 'calendar':
                    if (this.activeCalendarClient) {
                        data = await this.activeCalendarClient.getCalendarEvents(dateParam);
                    } else {
                        // Return empty calendar data if no client is configured
                        data = {
                            calendars: [],
                            connected_users: [],
                            total_accounts: 0,
                            successful_accounts: 0,
                            failed_accounts: 0,
                            total_events: 0,
                            date_requested: dateParam,
                            source: 'no_calendar_configured',
                            message: 'No calendar configured. Please set up your calendar connection.'
                        };
                    }
                    break;
                default:
                    throw new Error(`Unknown endpoint: ${endpoint}`);
            }
            
            return data;
        } catch (error) {
            console.error(`API request failed for ${endpoint} with date ${dateParam}:`, error);
            throw error;
        }
    }

    async loadCalendarEvents() {
        const calendarContent = document.getElementById('calendar-content');
        
        try {
            const timeContext = this.displayMode === 'tomorrow' ? 'tomorrow\'s' : 'today\'s';
            console.log(`🔍 Loading calendar events for: ${timeContext} (displayMode: ${this.displayMode})`);
            
            // Debug the date we're requesting (use UTC for consistency)
            const now = new Date();
            const targetDate = this.displayMode === 'tomorrow' 
                ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
                : now;
            
            console.log('📅 Debug date calculation:', {
                utc_now: now.toISOString(),
                display_mode: this.displayMode,
                target_date_utc: targetDate.toISOString(),
                target_date_eastern: targetDate.toLocaleString("en-US", {timeZone: this.config.location.timezone}),
                current_eastern: now.toLocaleString("en-US", {timeZone: this.config.location.timezone})
            });
            
            calendarContent.innerHTML = this.getLoadingHTML(`Loading ${timeContext} calendar events...`);
            
            const data = await this.makeApiRequest('calendar');
            if (!data) return; // Request was cancelled
            
            console.log('Calendar API response:', data);
            
            if (data.error === 'no_accounts_connected' || 
                data.source === 'no_authentication' || 
                data.source === 'authentication_error' ||
                (data.connected_users && data.connected_users.length === 0)) {
                console.log('No accounts connected or authentication expired, showing connect button');
                this.renderAddAccountPrompt();
                return;
            }
            
            if (data.error) {
                throw new Error(data.message || data.error);
            }
            
            // If showing tomorrow and no events found, also try today as fallback
            if (this.displayMode === 'tomorrow' && (!data.calendars || data.calendars.length === 0 || data.total_events === 0)) {
                console.log('No tomorrow events found, trying today as fallback...');
                calendarContent.innerHTML = this.getLoadingHTML(`No events tomorrow, checking today's calendar...`);
                
                try {
                    // Temporarily request today's events
                    const todayData = await this.makeApiRequestWithDate('calendar', 'today');
                    console.log('Today fallback calendar response:', todayData);
                    
                    if (todayData && todayData.calendars && todayData.calendars.length > 0 && todayData.total_events > 0) {
                        // Filter out past events from today when using as fallback
                        const now = new Date();
                        const filteredCalendars = todayData.calendars.map(calendar => {
                            if (!calendar.events || calendar.events.length === 0) return calendar;
                            
                            const futureEvents = calendar.events.filter(event => {
                                // Keep all-day events
                                if (event.all_day) return true;
                                
                                try {
                                    const eventStart = new Date(event.start);
                                    return eventStart > now; // Only keep future events
                                } catch (error) {
                                    console.warn('Error parsing event time:', error);
                                    return true; // Keep event if we can't parse the time
                                }
                            });
                            
                            return {
                                ...calendar,
                                events: futureEvents,
                                event_count: futureEvents.length
                            };
                        }).filter(calendar => calendar.events && calendar.events.length > 0);
                        
                        // Only show fallback if we have remaining events
                        if (filteredCalendars.length > 0) {
                            const totalRemainingEvents = filteredCalendars.reduce((sum, cal) => sum + cal.event_count, 0);
                            
                            // Show today's remaining events with a note
                            const modifiedData = {
                                ...todayData,
                                calendars: filteredCalendars,
                                total_events: totalRemainingEvents,
                                message: `No events tomorrow - showing ${totalRemainingEvents} remaining event${totalRemainingEvents === 1 ? '' : 's'} from today`
                            };
                            console.log(`Rendering ${totalRemainingEvents} remaining today's events as fallback`);
                            this.renderMultiAccountCalendar(modifiedData);
                            return;
                        }
                    }
                } catch (fallbackError) {
                    console.warn('Fallback to today failed:', fallbackError);
                }
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
                        const eventDate = new Date(event.start);
                        console.log(`🕐 Debug event time conversion for "${event.summary}":`, {
                            raw_start: event.start,
                            raw_end: event.end,
                            parsed_start_date: eventDate,
                            timezone: this.config.location.timezone,
                            event_date_string: eventDate.toLocaleDateString('en-US', { 
                                timeZone: this.config.location.timezone,
                                weekday: 'long',
                                month: 'short',
                                day: 'numeric'
                            }),
                            current_display_mode: this.displayMode
                        });
                        
                        startTime = new Date(event.start).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: this.config.location.timezone
                        });
                        
                        console.log(`🕐 Converted time for "${event.summary}": ${startTime}`);
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
            this.weatherData = data; // Store weather data for later use
            this.renderWeatherData(data);
            console.log('Weather data rendered successfully');
        } catch (error) {
            console.error('Failed to load weather data:', error);
            console.error('Error stack:', error.stack);
            weatherDiv.innerHTML = this.getErrorHTML('Failed to load weather data: ' + error.message);
        }
    }

    // OVERHAULED: Simplified, room-readable weather display
    renderWeatherData(data) {
        const currentWeatherDiv = document.getElementById('current-weather');
        
        if (!data.daily_summary) {
            this.renderLegacyWeatherData(data);
            return;
        }
        
        const timeContext = this.displayMode === 'tomorrow' ? 'Tomorrow' : 'Today';
        const isToday = this.displayMode === 'today';
        
        // Get improved high-contrast colors
        const colors = this.getImprovedWeatherColors(data);
        const mainIcon = this.getWeatherIcon(data.daily_summary.icon);
        
        if (isToday) {
            // TODAY: Current conditions + Later today forecast
            currentWeatherDiv.innerHTML = this.renderTodayWeather(data, colors, mainIcon);
        } else {
            // TOMORROW: Narrative-focused overview
            currentWeatherDiv.innerHTML = this.renderTomorrowWeather(data, colors, mainIcon);
        }
        
        // Update favicon
        this.updateFavicon(mainIcon);
    }
    
    renderTodayWeather(data, colors, mainIcon) {
        const currentTemp = data.temperature || data.daily_summary.current_temp || data.daily_summary.high_temp;
        const condition = data.description || data.daily_summary.description;
        
        // Create today's narrative using available data
        const todayNarrative = this.createTodayNarrative(data);
        
        return `
            <!-- Today's Main Display - Full Height -->
            <div style="
                background: ${colors.primary};
                color: ${colors.primaryText};
                border-radius: 15px;
                padding: 15px;
                text-align: center;
                box-shadow: 0 4px 16px rgba(0,0,0,0.1);
                height: 100%;
                display: flex;
                flex-direction: column;
                position: relative;
            ">
                <div style="
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    font-size: 14px;
                    font-weight: 500;
                    background: rgba(0,0,0,0.2);
                    padding: 4px 8px;
                    border-radius: 8px;
                ">
                    🌇 ${this.sunData?.sunset || 'N/A'}
                </div>
                <div style="font-size: 18px; font-weight: 700; margin-bottom: 5px;">
                    🏠 RIGHT NOW
                </div>
                <div style="font-size: 60px; margin: 8px 0;">${mainIcon}</div>
                <div style="font-size: 48px; font-weight: 300; margin: 5px 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                    ${currentTemp}°F
                </div>
                <div style="font-size: 20px; font-weight: 500; text-transform: capitalize; opacity: 0.95; margin-bottom: 8px;">
                    ${condition}
                </div>
                
                <!-- Later Today Forecast - Compact -->
                <div style="
                    background: ${colors.secondary};
                    color: ${colors.secondaryText};
                    border-radius: 10px;
                    padding: 8px;
                    margin-bottom: 10px;
                    font-size: 14px;
                    line-height: 1.2;
                ">
                    📈 Later: High <strong>${data.daily_summary.high_temp}°F</strong> • Low <strong>${data.daily_summary.low_temp}°F</strong>
                    ${data.precipitation && data.precipitation.expected ? 
                        `<br>🌧️ ${data.precipitation.total_hours}h of ${data.precipitation.hours[0]?.type || 'precipitation'} expected` : ''
                    }
                </div>
                
                <!-- Today's Weather Summary - Expandable -->
                <div style="
                    background: #ffffff;
                    color: #4a148c;
                    border-radius: 15px;
                    padding: 20px;
                    font-size: clamp(24px, 6vw, 42px);
                    line-height: 1.3;
                    font-weight: 700;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                    border: 3px solid #4a148c;
                    flex: 1;
                    overflow-y: auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                ">
                    ${todayNarrative}
                </div>
            </div>
        `;
    }
    
    renderTomorrowWeather(data, colors, mainIcon) {
        // Create a compelling narrative for tomorrow
        const narrative = this.createWeatherNarrative(data);
        
        return `
            <!-- Tomorrow's Main Display -->
            <div style="
                background: ${colors.primary};
                color: ${colors.primaryText};
                border-radius: 15px;
                padding: 18px;
                text-align: center;
                box-shadow: 0 4px 16px rgba(0,0,0,0.1);
                height: 100%;
                display: flex;
                flex-direction: column;
                position: relative;
            ">
                <div style="
                    position: absolute;
                    top: 18px;
                    right: 18px;
                    font-size: 14px;
                    font-weight: 500;
                    background: rgba(0,0,0,0.2);
                    padding: 4px 8px;
                    border-radius: 8px;
                ">
                    🌇 ${this.sunData?.sunset || 'N/A'}
                </div>
                <div style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">
                    🌅 TOMORROW
                </div>
                <div style="font-size: 70px; margin: 10px 0;">${mainIcon}</div>
                <div style="
                    font-size: 36px; 
                    font-weight: 300; 
                    margin: 8px 0; 
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                ">
                    ${data.daily_summary.low_temp}° - ${data.daily_summary.high_temp}°F
                </div>
                <div style="
                    font-size: 18px; 
                    font-weight: 500; 
                    text-transform: capitalize; 
                    opacity: 0.95;
                    margin-bottom: 10px;
                ">
                    ${data.daily_summary.description}
                </div>
                <div style="
                    background: #ffffff;
                    color: #4a148c;
                    border-radius: 15px;
                    padding: 25px;
                    font-size: clamp(26px, 7vw, 40px);
                    line-height: 1.3;
                    font-weight: 700;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                    border: 3px solid #4a148c;
                    flex: 1;
                    overflow-y: auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                ">
                    ${narrative}
                </div>
            </div>
        `;
    }
    
    createTodayNarrative(data) {
        // Use API-generated summary if available
        if (data.daily_summary?.summary) {
            const apiSummary = data.daily_summary.summary;
            
            // Get weather-specific encouragement
            const encouragement = this.getWeatherEncouragement(data.daily_summary, data.precipitation);
            
            return apiSummary + " " + encouragement;
        }
        
        // Fallback to custom narrative if no API summary
        const temp = data.temperature || data.daily_summary?.current_temp || data.daily_summary?.high_temp || 70;
        const condition = (data.description || data.daily_summary?.description || 'partly cloudy').toLowerCase();
        const humidity = data.humidity || 50;
        const windSpeed = data.windSpeed || 0;
        
        let narrative = '';
        
        // Current condition assessment
        if (temp >= 80) {
            narrative = "🔥 It's hot out there! ";
        } else if (temp >= 70) {
            narrative = "☀️ Beautiful weather right now! ";
        } else if (temp >= 60) {
            narrative = "🌤️ Pleasant conditions today! ";
        } else if (temp >= 40) {
            narrative = "🧥 A bit cool - jacket weather! ";
        } else {
            narrative = "❄️ Bundle up - it's chilly! ";
        }
        
        // Add condition-specific details
        if (condition.includes('rain') || condition.includes('shower')) {
            narrative += "Rain in the area. ";
        } else if (condition.includes('snow')) {
            narrative += "Snow is falling! ";
        } else if (condition.includes('clear') || condition.includes('sunny')) {
            narrative += "Clear and bright! ";
        } else if (condition.includes('cloud')) {
            narrative += "Overcast skies. ";
        }
        
        // Add comfort details
        if (humidity > 70) {
            narrative += "Feeling humid. ";
        } else if (humidity < 30) {
            narrative += "Nice and dry. ";
        }
        
        if (windSpeed > 15) {
            narrative += "Quite breezy today. ";
        } else if (windSpeed > 8) {
            narrative += "Light breeze. ";
        }
        
        // Get weather-specific encouragement for fallback narrative
        const fallbackSummary = {
            high_temp: temp,
            description: condition
        };
        const fallbackPrecipitation = condition.includes('rain') || condition.includes('snow') ? { expected: true } : null;
        const encouragement = this.getWeatherEncouragement(fallbackSummary, fallbackPrecipitation);
        narrative += encouragement;
        
        return narrative;
    }

    createWeatherNarrative(data) {
        const summary = data.daily_summary;
        
        // Use API-generated summary if available
        if (summary?.summary) {
            const apiSummary = summary.summary;
            
            // Get weather-specific encouragement
            const encouragement = this.getWeatherEncouragement(summary, data.precipitation);
            
            return apiSummary + " " + encouragement;
        }
        
        // Fallback to custom narrative if no API summary
        const temp = summary.high_temp;
        const condition = summary.description.toLowerCase();
        const precipitation = data.precipitation;
        
        let narrative = '';
        
        // Temperature-based opening
        if (temp >= 80) {
            narrative = "🔥 It's going to be a hot one! ";
        } else if (temp >= 70) {
            narrative = "☀️ Perfect weather ahead! ";
        } else if (temp >= 60) {
            narrative = "🌤️ Pleasant temperatures expected! ";
        } else if (temp >= 40) {
            narrative = "🧥 Pack a jacket - it'll be cool! ";
        } else {
            narrative = "❄️ Bundle up - it's going to be chilly! ";
        }
        
        // Add condition-specific details
        if (condition.includes('rain') || condition.includes('shower')) {
            narrative += "Keep an umbrella handy. ";
        } else if (condition.includes('snow')) {
            narrative += "Snow is in the forecast! ";
        } else if (condition.includes('clear') || condition.includes('sunny')) {
            narrative += "Clear skies all day! ";
        } else if (condition.includes('cloud')) {
            narrative += "Cloudy but dry conditions. ";
        }
        
        // Add precipitation details if present
        if (precipitation && precipitation.expected) {
            const precipType = precipitation.hours[0]?.type || 'precipitation';
            const hours = precipitation.total_hours;
            narrative += `Expect ${hours}h of ${precipType}. `;
        }
        
        // Get weather-specific encouragement
        const encouragement = this.getWeatherEncouragement(summary, precipitation);
        narrative += encouragement;
        
        return narrative;
    }
    
    getWeatherEncouragement(summary, precipitation) {
        const temp = summary.high_temp;
        const condition = summary.description.toLowerCase();
        
        // Weather-specific commentary arrays
        const sunnyOutdoorComments = [
            "Perfect excuse to touch grass! 🌱",
            "Time to make your vitamin D proud! ☀️",
            "Great day to be outside! 🌳",
            "Weather: 10/10, would recommend! 👌",
            "Mother Nature is showing off today! 💅",
            "Weather app says you're legally required to go outside! 📱",
            "Even your houseplants are jealous! 🪴",
            "This is your sign to cancel indoor plans! 🚪",
            "Weather so nice, it should be illegal! 🚨",
            "Your weather app is basically flexing right now! 💪",
            "Nature's apology for yesterday! 🙏",
            "Weather report: Chef's kiss approved! 👨‍🍳💋",
            "Forecast brought to you by good vibes only! ✨",
            "Weather: Netflix has left the chat! 📺❌",
            "Perfect day to pretend you're outdoorsy! 🏃‍♀️",
            "Even the weather app is smiling today! 😊",
            "Perfect for outdoor plans! 🚀",
            "Make it a great day! 🌟"
        ];

        const cloudyOutdoorComments = [
            "Cloudy but comfortable for activities! ☁️",
            "Perfect overcast for hiking! 🥾",
            "Great weather for a walk! 🚶‍♀️",
            "No harsh sun - ideal for outdoor time! 🌫️",
            "Soft lighting courtesy of Mother Nature! 📷",
            "Perfect photography weather! 📸",
            "Great day for exploring! 🗺️",
            "Natural sun protection included! 🕶️",
            "Comfortable temps for being active! 💪",
            "Still a beautiful day to be out! 🌤️"
        ];

        const rainyIndoorComments = [
            "Perfect day to practice your couch potato skills! 🛋️",
            "Weather report: Netflix stock is up! 📈",
            "Time to channel your inner hermit! 🏠",
            "Weather brought to you by blanket season! 🛋️",
            "Perfect excuse to order takeout! 🥡",
            "Today's forecast: maximum coziness required! ☕",
            "Nature's way of saying 'read a book'! 📚",
            "Perfect day to win at being indoors! 🏆",
            "Weather: sponsored by hot chocolate! ☕",
            "Today's vibe: professional indoor enthusiast! 🏠",
            "Weather report: pajamas are business casual today! 👔➡️👕",
            "Perfect conditions for advanced sofa surfing! 🏄‍♀️",
            "Stay cozy! 🏠",
            "Mother Nature called in sick today! 🤒",
            "Weather app apologizes for the inconvenience! 📱😅",
            "Mother Nature hit the snooze button! 😴"
        ];

        const coldIndoorComments = [
            "Bundle up or stay cozy inside! 🧥",
            "Perfect excuse for hot drinks and blankets! ☕",
            "Indoor activities are calling your name! 🏠",
            "Great day for warming up indoors! 🔥",
            "Weather brought to you by sweater season! 🧶",
            "Time to embrace the hygge lifestyle! 🕯️",
            "Perfect day for soup and comfort food! 🍲",
            "Indoor adventures await! 🎲",
            "Cozy vibes only today! ✨",
            "Mother Nature wants you to stay warm! ❄️"
        ];
        
        // Determine weather category and return appropriate comment
        if (condition.includes('rain') || condition.includes('shower') || condition.includes('storm') || 
            (precipitation && precipitation.expected)) {
            return rainyIndoorComments[Math.floor(Math.random() * rainyIndoorComments.length)];
        } else if (condition.includes('snow') || temp < 40) {
            return coldIndoorComments[Math.floor(Math.random() * coldIndoorComments.length)];
        } else if (condition.includes('clear') || condition.includes('sunny') || 
                   (temp >= 70 && !condition.includes('cloud'))) {
            return sunnyOutdoorComments[Math.floor(Math.random() * sunnyOutdoorComments.length)];
        } else if (condition.includes('cloud') || condition.includes('overcast') || 
                   (temp >= 55 && temp < 70)) {
            return cloudyOutdoorComments[Math.floor(Math.random() * cloudyOutdoorComments.length)];
        } else if (temp >= 60) {
            // Default to sunny outdoor comments for pleasant weather
            return sunnyOutdoorComments[Math.floor(Math.random() * sunnyOutdoorComments.length)];
        } else {
            // Default to indoor comments for less ideal weather
            return rainyIndoorComments[Math.floor(Math.random() * rainyIndoorComments.length)];
        }
    }
    
    getImprovedWeatherColors(data) {
        const condition = data.daily_summary.description.toLowerCase();
        const temp = data.daily_summary.high_temp;
        const icon = data.daily_summary.icon;
        
        // High-contrast color schemes optimized for room readability
        if (condition.includes('rain') || condition.includes('shower') || condition.includes('storm')) {
            return {
                primary: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                primaryText: '#ffffff',
                secondary: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                secondaryText: '#003d5c',
                accent: '#00d4ff'
            };
        } else if (condition.includes('snow')) {
            return {
                primary: 'linear-gradient(135deg, #e6f3ff 0%, #b3daff 100%)',
                primaryText: '#1a365d',
                secondary: 'linear-gradient(135deg, #ffffff 0%, #f0f8ff 100%)',
                secondaryText: '#2d3748',
                accent: '#3182ce'
            };
        } else if (condition.includes('clear') || condition.includes('sunny')) {
            return {
                primary: 'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)',
                primaryText: '#ffffff',
                secondary: 'linear-gradient(135deg, #fff7ad 0%, #ffa502 100%)',
                secondaryText: '#744210',
                accent: '#f39801'
            };
        } else if (temp >= 80) {
            return {
                primary: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                primaryText: '#ffffff',
                secondary: 'linear-gradient(135deg, #feca57 0%, #ff9ff3 100%)',
                secondaryText: '#8b4513',
                accent: '#ff4757'
            };
        } else if (temp <= 40) {
            return {
                primary: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
                primaryText: '#ffffff',
                secondary: 'linear-gradient(135deg, #a8e6cf 0%, #dcedc8 100%)',
                secondaryText: '#2d3436',
                accent: '#00b894'
            };
        } else {
            // Default pleasant weather
            return {
                primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                primaryText: '#ffffff',
                secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                secondaryText: '#2d3436',
                accent: '#6c5ce7'
            };
        }
    }

    // Removed old complex hourly forecast and precipitation rendering
    // New design focuses on daily overview with clear narrative

    // Simplified legacy fallback matching new design
    renderLegacyWeatherData(data) {
        const currentWeatherDiv = document.getElementById('current-weather');
        
        const weatherIcon = this.getWeatherIcon(data.icon || '01d');
        const timeContext = this.displayMode === 'tomorrow' ? 'tomorrow' : 'today';
        const isToday = this.displayMode === 'today';
        
        // Create simplified data structure for legacy compatibility
        const legacyData = {
            daily_summary: {
                high_temp: data.temperature || 70,
                low_temp: Math.round((data.temperature || 70) - 10),
                description: data.description || 'clear sky',
                icon: data.icon || '01d'
            },
            temperature: data.temperature,
            description: data.description,
            precipitation: { expected: false }
        };
        
        // Use the same color system as the new design
        const colors = this.getImprovedWeatherColors(legacyData);
        
        if (isToday) {
            currentWeatherDiv.innerHTML = `
                <div style="
                    background: ${colors.primary};
                    color: ${colors.primaryText};
                    border-radius: 15px;
                    padding: 15px;
                    text-align: center;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
                ">
                    <div style="font-size: 18px; font-weight: 700; margin-bottom: 5px;">
                        🏠 RIGHT NOW
                    </div>
                    <div style="font-size: 60px; margin: 8px 0;">${weatherIcon}</div>
                    <div style="font-size: 48px; font-weight: 300; margin: 5px 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                        ${data.temperature || 'N/A'}°F
                    </div>
                    <div style="font-size: 20px; font-weight: 500; text-transform: capitalize; opacity: 0.95;">
                        ${data.description || 'Current conditions'}
                    </div>
                </div>
                
                <div style="
                    background: ${colors.secondary};
                    color: ${colors.secondaryText};
                    border-radius: 10px;
                    padding: 12px;
                    margin-top: 8px;
                    text-align: center;
                ">
                    <div style="font-size: 14px; font-weight: 600;">
                        Humidity: ${data.humidity || 'N/A'}% • Wind: ${data.windSpeed || 'N/A'} mph
                    </div>
                </div>
            `;
        } else {
            currentWeatherDiv.innerHTML = `
                <div style="
                    background: ${colors.primary};
                    color: ${colors.primaryText};
                    border-radius: 15px;
                    padding: 18px;
                    text-align: center;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
                ">
                    <div style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">
                        🌅 TOMORROW
                    </div>
                    <div style="font-size: 70px; margin: 10px 0;">${weatherIcon}</div>
                    <div style="font-size: 36px; font-weight: 300; margin: 8px 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                        ${data.temperature || 'N/A'}°F
                    </div>
                    <div style="font-size: 18px; font-weight: 500; text-transform: capitalize; opacity: 0.95; margin-bottom: 10px;">
                        ${data.description || 'Tomorrow\'s forecast'}
                    </div>
                    <div style="
                        background: #ffffff;
                        color: #4a148c;
                        border-radius: 15px;
                        padding: 25px;
                        font-size: clamp(18px, 5vw, 28px);
                        line-height: 1.4;
                        font-weight: 700;
                        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                        border: 3px solid #4a148c;
                        max-height: 180px;
                        overflow-y: auto;
                    ">
                        Check back later for a detailed forecast! 🌟
                    </div>
                </div>
            `;
        }
        
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
            
            // Re-render weather data to update sunset time display
            if (this.weatherData) {
                this.renderWeatherData(this.weatherData);
            }
        } catch (error) {
            console.error('Failed to load sunrise/sunset data:', error);
            this.sunData = { sunrise: 'N/A', sunset: 'N/A' };
            this.renderSunTideData();
            
            // Re-render weather data even with fallback data
            if (this.weatherData) {
                this.renderWeatherData(this.weatherData);
            }
        }
    }

    // Removed old complex color scheme function - replaced with getImprovedWeatherColors()

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
        
        // Create compact tide data for single line display
        const tideHtml = this.tideData?.length > 0
            ? this.tideData.map(tide => `
                <div class="info-card">
                    <div class="info-card-title">${tide.type} Tide</div>
                    <div class="info-card-value">🌊 ${tide.time}</div>
                </div>
            `).join('')
            : `<div class="info-card">
                <div class="info-card-title">Tides</div>
                <div class="info-card-value">🌊 No data</div>
               </div>`;

        const stationInfo = this.tideStation 
            ? `<small style="color: #6c757d; font-style: italic; margin-top: 6px; display: block; font-size: 8px; text-align: center;">${this.tideStation}</small>` 
            : '';
        
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
                ${tideHtml}
            </div>
            ${stationInfo}
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
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden) {
                const oldMode = this.displayMode;
                this.updateDisplayMode();
                
                if (oldMode !== this.displayMode) {
                    console.log(`Display mode changed on visibility change: ${oldMode} -> ${this.displayMode}`);
                    this.showNotification(`📅 Switched to ${this.displayMode}'s schedule`, 'info');
                }
                
                // Handle token renewal gracefully before loading data
                if (window.googleAuthClient && window.googleAuthClient.handlePageVisible) {
                    console.log('Page became visible - checking token status...');
                    await window.googleAuthClient.handlePageVisible();
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

// Dashboard initialization is now handled in dashboard.html to ensure proper timing
// This avoids race conditions with API client initialization

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