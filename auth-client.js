// Google OAuth client for browser authentication
// Uses new Google Identity Services (replacing deprecated gapi.auth2)

class GoogleAuthClient {
    constructor(config) {
        this.config = config;
        this.isInitialized = false;
        this.storageKey = 'dashboard-google-tokens';
        this.tokenClient = null;
        this.accessToken = null;
        this.signInResolve = null;
        this.signInReject = null;
    }
    
    async init() {
        if (this.isInitialized) return true;
        
        const clientId = this.config.get('google_client_id');
        if (!clientId) {
            throw new Error('Google Client ID not configured');
        }
        
        try {
            // Wait for Google Identity Services to load
            await this.waitForGoogleIdentity();
            
            console.log('Initializing Google Identity Services with client ID:', clientId);
            
            // Initialize the token client
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/calendar.readonly profile email',
                callback: (response) => {
                    console.log('OAuth callback received:', response);
                    if (response.access_token) {
                        this.accessToken = response.access_token;
                        this.saveTokenData(response);
                        
                        if (this.signInResolve) {
                            this.signInResolve({
                                access_token: response.access_token,
                                connected_at: Date.now()
                            });
                            this.signInResolve = null;
                            this.signInReject = null;
                        }
                    } else if (response.error && this.signInReject) {
                        this.signInReject(new Error(response.error));
                        this.signInResolve = null;
                        this.signInReject = null;
                    }
                },
                error_callback: (error) => {
                    console.error('OAuth error:', error);
                    if (this.signInReject) {
                        this.signInReject(error);
                        this.signInResolve = null;
                        this.signInReject = null;
                    }
                }
            });
            
            // Load existing token if available
            this.loadSavedToken();
            
            this.isInitialized = true;
            console.log('Google auth initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Google Auth:', error);
            throw error;
        }
    }
    
    waitForGoogleIdentity() {
        return new Promise((resolve, reject) => {
            if (window.google?.accounts?.oauth2) {
                resolve();
                return;
            }
            
            // Poll for Google Identity Services to be available
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds timeout
            
            const checkForGoogle = () => {
                if (window.google?.accounts?.oauth2) {
                    resolve();
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkForGoogle, 100);
                } else {
                    reject(new Error('Google Identity Services failed to load'));
                }
            };
            
            checkForGoogle();
        });
    }
    
    async signIn() {
        if (!this.isInitialized) {
            await this.init();
        }
        
        return new Promise((resolve, reject) => {
            try {
                console.log('Starting Google sign-in...');
                
                // Store resolve/reject for the callback
                this.signInResolve = resolve;
                this.signInReject = reject;
                
                // Trigger the OAuth flow
                this.tokenClient.requestAccessToken();
                
                // Set a timeout in case the callback never fires
                setTimeout(() => {
                    if (this.signInReject) {
                        this.signInReject(new Error('Sign-in timeout'));
                        this.signInResolve = null;
                        this.signInReject = null;
                    }
                }, 30000); // 30 second timeout
                
            } catch (error) {
                console.error('Sign in failed:', error);
                reject(error);
            }
        });
    }
    
    isSignedIn() {
        return !!this.accessToken && !this.isTokenExpired();
    }
    
    isTokenExpired(tokenData = null) {
        // If tokenData is provided, use it directly (avoiding circular dependency)
        const data = tokenData || this.getSavedTokenData();
        if (!data || !data.expires_at) return true;
        return Date.now() > data.expires_at;
    }
    
    getSavedTokenData() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Failed to parse saved token data:', error);
        }
        return null;
    }
    
    saveTokenData(tokenResponse) {
        // Set token to expire in 30 days instead of 1 hour for permanent session
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000; // 30 days
        const tokenData = {
            access_token: tokenResponse.access_token,
            expires_at: Date.now() + thirtyDaysInMs, // 30 days from now
            saved_at: Date.now(),
            original_expires_in: tokenResponse.expires_in // Keep original for reference
        };
        
        localStorage.setItem(this.storageKey, JSON.stringify(tokenData));
        console.log('Token data saved with 30-day expiration:', tokenData);
    }
    
    loadSavedToken() {
        try {
            const tokenData = this.getSavedTokenData();
            if (tokenData && !this.isTokenExpired(tokenData)) {
                this.accessToken = tokenData.access_token;
                return tokenData;
            }
        } catch (error) {
            console.error('Failed to load saved token:', error);
        }
        return null;
    }
    
    signOut() {
        this.accessToken = null;
        localStorage.removeItem(this.storageKey);
        console.log('User signed out');
    }
    
    clearTokenData() {
        this.accessToken = null;
        localStorage.removeItem(this.storageKey);
        console.log('Token data cleared');
    }
    
    debugAuthState() {
        console.log('=== AUTH DEBUG INFO ===');
        console.log('isInitialized:', this.isInitialized);
        console.log('accessToken exists:', !!this.accessToken);
        const savedData = this.getSavedTokenData();
        console.log('saved token data:', savedData);
        if (savedData) {
            console.log('token expired:', this.isTokenExpired(savedData));
            console.log('expires at:', new Date(savedData.expires_at));
            console.log('current time:', new Date());
        }
        console.log('isSignedIn():', this.isSignedIn());
        console.log('========================');
    }
    
    // Fetch actual calendar data from Google Calendar API
    async getCalendarData(date_param = 'today') {
        console.log('=== CALENDAR DATA REQUEST ===');
        console.log('getCalendarData called, date_param:', date_param);
        console.log('isSignedIn:', this.isSignedIn());
        console.log('accessToken exists:', !!this.accessToken);
        console.log('saved token data:', this.getSavedTokenData());
        
        if (!this.isSignedIn()) {
            console.log('Not signed in, returning no_accounts_connected');
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
        
        try {
            console.log('Fetching calendar events from Google Calendar API...');
            
            // Calculate date range based on date_param
            const now = new Date();
            const targetDate = date_param === 'tomorrow' 
                ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
                : now;
            
            // Set time range for the target day
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            console.log('Fetching events for date range:', {
                start: startOfDay.toISOString(),
                end: endOfDay.toISOString()
            });
            
            // Fetch calendar list first
            const calendarListUrl = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
            const calendarListResponse = await fetch(calendarListUrl, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!calendarListResponse.ok) {
                throw new Error(`Calendar list API error: ${calendarListResponse.status} ${calendarListResponse.statusText}`);
            }
            
            const calendarList = await calendarListResponse.json();
            console.log('Calendar list response:', calendarList);
            
            const calendars = [];
            let totalEvents = 0;
            
            // Fetch events from each calendar
            for (const calendar of calendarList.items || []) {
                try {
                    console.log(`Fetching events from calendar: ${calendar.summary}`);
                    
                    const eventsUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events` +
                        `?timeMin=${startOfDay.toISOString()}` +
                        `&timeMax=${endOfDay.toISOString()}` +
                        `&singleEvents=true` +
                        `&orderBy=startTime` +
                        `&maxResults=50`;
                    
                    const eventsResponse = await fetch(eventsUrl, {
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`,
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (!eventsResponse.ok) {
                        console.warn(`Failed to fetch events from calendar ${calendar.summary}:`, eventsResponse.status);
                        continue;
                    }
                    
                    const eventsData = await eventsResponse.json();
                    console.log(`Events from ${calendar.summary}:`, eventsData);
                    
                    const events = (eventsData.items || []).map(event => ({
                        summary: event.summary || 'Untitled Event',
                        start: event.start?.dateTime || event.start?.date,
                        end: event.end?.dateTime || event.end?.date,
                        all_day: !event.start?.dateTime, // If no dateTime, it's an all-day event
                        location: event.location || '',
                        description: event.description || '',
                        calendar_name: calendar.summary
                    }));
                    
                    if (events.length > 0) {
                        calendars.push({
                            name: calendar.summary,
                            color: calendar.backgroundColor || '#3498db',
                            events: events,
                            event_count: events.length
                        });
                        
                        totalEvents += events.length;
                    }
                    
                } catch (calendarError) {
                    console.error(`Error fetching events from calendar ${calendar.summary}:`, calendarError);
                }
            }
            
            console.log('Final calendar data:', { calendars, totalEvents });
            
            return {
                calendars: calendars,
                connected_users: [{ email: 'user@gmail.com' }], // Could fetch user info if needed
                total_accounts: 1,
                successful_accounts: 1,
                failed_accounts: 0,
                total_events: totalEvents,
                date_requested: date_param,
                source: 'google_calendar_api',
                message: totalEvents > 0 ? `Found ${totalEvents} events` : 'No events found for this date'
            };
            
        } catch (error) {
            console.error('Error fetching calendar data:', error);
            
            // Check if it's an authentication error
            if (error.message.includes('401') || error.message.includes('403')) {
                // Token might be expired or invalid
                this.clearTokenData();
                return {
                    calendars: [],
                    connected_users: [],
                    total_accounts: 0,
                    successful_accounts: 0,
                    failed_accounts: 1,
                    total_events: 0,
                    date_requested: date_param,
                    source: 'authentication_error',
                    message: 'Authentication error - please reconnect your Google account'
                };
            }
            
            return {
                calendars: [],
                connected_users: [{ email: 'error' }],
                total_accounts: 1,
                successful_accounts: 0,
                failed_accounts: 1,
                total_events: 0,
                date_requested: date_param,
                source: 'api_error',
                message: `Calendar API error: ${error.message}`
            };
        }
    }
}

// Global auth client
window.googleAuthClient = null;