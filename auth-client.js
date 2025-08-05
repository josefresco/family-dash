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
        this.tokenCheckInterval = null;
    }
    
    async init() {
        if (this.isInitialized) return true;
        
        const clientId = this.config.get('google_client_id');
        if (!clientId) {
            throw new Error('Google Client ID not configured');
        }
        
        try {
            // Check if we're handling an OAuth redirect
            await this.handleOAuthRedirect();
            
            // Wait for Google Identity Services to load
            await this.waitForGoogleIdentity();
            
            console.log('Initializing Google Identity Services with client ID:', clientId);
            
            // Initialize the token client with offline access for refresh tokens
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/calendar.readonly profile email',
                // Request offline access to get refresh tokens
                include_granted_scopes: true,
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
            
            // Start background token monitoring
            this.startTokenMonitoring();
            
            this.isInitialized = true;
            console.log('Google auth initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Google Auth:', error);
            throw error;
        }
    }
    
    // Handle OAuth redirect - simplified approach
    async handleOAuthRedirect() {
        // Clean up any OAuth parameters from URL for cleaner interface
        const urlParams = new URLSearchParams(window.location.search);
        const hasOAuthParams = urlParams.has('code') || urlParams.has('error') || urlParams.has('state');
        
        if (hasOAuthParams) {
            console.log('Cleaning up OAuth parameters from URL');
            window.history.replaceState({}, document.title, window.location.pathname);
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
        
        // Try to use refresh token first if available
        const tokenData = this.getSavedTokenData();
        if (tokenData && tokenData.refresh_token && this.isTokenExpired(tokenData)) {
            console.log('Attempting token refresh before manual sign-in...');
            const refreshed = await this.refreshTokenIfNeeded();
            if (refreshed) {
                return {
                    access_token: this.accessToken,
                    connected_at: Date.now(),
                    refreshed: true
                };
            }
        }
        
        // Use Google Identity Services for initial authentication
        // Note: This approach has limitations but is more practical for client-side apps
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
    
    async isSignedIn() {
        if (!this.accessToken) return false;
        
        // If token is expired, try to refresh it automatically
        if (this.isTokenExpired()) {
            console.log('Access token expired, attempting automatic refresh...');
            const refreshed = await this.refreshTokenIfNeeded();
            return refreshed;
        }
        
        return true;
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
        // Use realistic Google token expiration (typically 1 hour)
        const expiresInMs = (tokenResponse.expires_in || 3600) * 1000; // Default to 1 hour
        const tokenData = {
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token, // Store refresh token if available
            expires_at: Date.now() + expiresInMs,
            saved_at: Date.now(),
            original_expires_in: tokenResponse.expires_in
        };
        
        localStorage.setItem(this.storageKey, JSON.stringify(tokenData));
        console.log('Token data saved:', { 
            hasAccessToken: !!tokenData.access_token,
            hasRefreshToken: !!tokenData.refresh_token,
            expiresAt: new Date(tokenData.expires_at)
        });
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
        this.stopTokenMonitoring();
        this.accessToken = null;
        localStorage.removeItem(this.storageKey);
        console.log('User signed out');
    }
    
    clearTokenData() {
        this.stopTokenMonitoring();
        this.accessToken = null;
        localStorage.removeItem(this.storageKey);
        console.log('Token data cleared');
    }
    
    // Check if token needs refreshing - simplified for client-side limitations
    async refreshTokenIfNeeded() {
        const tokenData = this.getSavedTokenData();
        if (!tokenData) {
            console.log('No token data available, manual authentication required');
            return false;
        }
        
        // For client-side apps, we implement proactive renewal instead of refresh tokens
        // Check if token is close to expiring (within 10 minutes)
        const tenMinutesInMs = 10 * 60 * 1000;
        const isExpiringSoon = tokenData.expires_at - Date.now() < tenMinutesInMs;
        
        if (isExpiringSoon && this.tokenClient) {
            try {
                console.log('Token expiring soon, attempting proactive renewal...');
                
                // Use the token client to get a fresh token silently
                return new Promise((resolve) => {
                    const originalCallback = this.tokenClient.callback;
                    
                    // Temporarily override callback for silent renewal
                    this.tokenClient.callback = (response) => {
                        if (response.access_token) {
                            this.accessToken = response.access_token;
                            this.saveTokenData(response);
                            console.log('Token renewed proactively');
                            resolve(true);
                        } else {
                            console.log('Proactive renewal failed');
                            resolve(false);
                        }
                        
                        // Restore original callback
                        this.tokenClient.callback = originalCallback;
                    };
                    
                    // Attempt silent token renewal
                    this.tokenClient.requestAccessToken({ prompt: '' });
                    
                    // Timeout after 5 seconds
                    setTimeout(() => {
                        this.tokenClient.callback = originalCallback;
                        resolve(false);
                    }, 5000);
                });
                
            } catch (error) {
                console.error('Proactive token renewal failed:', error);
                return false;
            }
        }
        
        return !this.isTokenExpired(tokenData);
    }
    
    // Start background token monitoring for proactive renewal
    startTokenMonitoring() {
        // Check token status every 5 minutes
        this.tokenCheckInterval = setInterval(async () => {
            if (this.accessToken) {
                const tokenData = this.getSavedTokenData();
                if (tokenData) {
                    const timeUntilExpiry = tokenData.expires_at - Date.now();
                    const fifteenMinutesInMs = 15 * 60 * 1000;
                    
                    // If token expires in less than 15 minutes, try to renew
                    if (timeUntilExpiry < fifteenMinutesInMs && timeUntilExpiry > 0) {
                        console.log('Background token check: attempting proactive renewal');
                        await this.refreshTokenIfNeeded();
                    }
                }
            }
        }, 5 * 60 * 1000); // Check every 5 minutes
        
        console.log('Background token monitoring started');
    }
    
    // Stop background token monitoring
    stopTokenMonitoring() {
        if (this.tokenCheckInterval) {
            clearInterval(this.tokenCheckInterval);
            this.tokenCheckInterval = null;
            console.log('Background token monitoring stopped');
        }
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
        console.log('accessToken exists:', !!this.accessToken);
        console.log('saved token data:', this.getSavedTokenData());
        
        const signedIn = await this.isSignedIn();
        console.log('isSignedIn:', signedIn);
        
        if (!signedIn) {
            console.log('Not signed in or token refresh failed, returning no_authentication');
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