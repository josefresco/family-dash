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
        
        // If token is expired, try to refresh it automatically (only if page is visible)
        if (this.isTokenExpired()) {
            if (document.hidden) {
                console.log('Access token expired but page is hidden - will attempt renewal when page becomes visible');
                return false;
            }
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
        // Check if token is close to expiring (within 5 minutes, reduced from 10)
        const fiveMinutesInMs = 5 * 60 * 1000;
        const isExpiringSoon = tokenData.expires_at - Date.now() < fiveMinutesInMs;
        
        if (isExpiringSoon && this.tokenClient) {
            // Only attempt popup-based renewal if page is visible to avoid popup blockers
            if (document.hidden) {
                console.log('Token expiring soon but page is hidden - skipping popup renewal');
                return false;
            }
            
            try {
                console.log('Token expiring soon, attempting proactive renewal...');
                
                // Use the token client to get a fresh token silently
                return new Promise((resolve) => {
                    const originalCallback = this.tokenClient.callback;
                    const originalErrorCallback = this.tokenClient.error_callback;
                    
                    // Temporarily override callback for silent renewal
                    this.tokenClient.callback = (response) => {
                        if (response.access_token) {
                            this.accessToken = response.access_token;
                            this.saveTokenData(response);
                            console.log('Token renewed proactively');
                            resolve(true);
                        } else {
                            console.log('Proactive renewal failed - no access token in response');
                            resolve(false);
                        }
                        
                        // Restore original callbacks
                        this.tokenClient.callback = originalCallback;
                        this.tokenClient.error_callback = originalErrorCallback;
                    };
                    
                    // Override error callback to handle popup failures gracefully
                    this.tokenClient.error_callback = (error) => {
                        console.log('Token renewal failed (likely popup blocked):', error);
                        resolve(false);
                        
                        // Restore original callbacks
                        this.tokenClient.callback = originalCallback;
                        this.tokenClient.error_callback = originalErrorCallback;
                    };
                    
                    // Attempt silent token renewal
                    this.tokenClient.requestAccessToken({ prompt: '' });
                    
                    // Timeout after 3 seconds (reduced from 5) to fail faster
                    setTimeout(() => {
                        console.log('Token renewal timeout - likely popup blocked');
                        this.tokenClient.callback = originalCallback;
                        this.tokenClient.error_callback = originalErrorCallback;
                        resolve(false);
                    }, 3000);
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
        // Check token status every 30 minutes (reduced from 5 minutes)
        this.tokenCheckInterval = setInterval(async () => {
            if (this.accessToken) {
                const tokenData = this.getSavedTokenData();
                if (tokenData) {
                    const timeUntilExpiry = tokenData.expires_at - Date.now();
                    const fiveMinutesInMs = 5 * 60 * 1000; // Reduced from 15 minutes
                    
                    // Only attempt renewal if page is visible and token expires in less than 5 minutes
                    if (timeUntilExpiry < fiveMinutesInMs && timeUntilExpiry > 0 && !document.hidden) {
                        console.log('Background token check: attempting proactive renewal (page visible)');
                        const renewed = await this.refreshTokenIfNeeded();
                        if (!renewed) {
                            console.log('Background renewal failed - will require user interaction for next renewal');
                        }
                    } else if (timeUntilExpiry < fiveMinutesInMs && timeUntilExpiry > 0) {
                        console.log('Token expiring soon but page is hidden - renewal will be attempted when user returns');
                    }
                }
            }
        }, 30 * 60 * 1000); // Check every 30 minutes (reduced from 5 minutes)
        
        console.log('Background token monitoring started (30 min intervals)');
    }
    
    // Stop background token monitoring
    stopTokenMonitoring() {
        if (this.tokenCheckInterval) {
            clearInterval(this.tokenCheckInterval);
            this.tokenCheckInterval = null;
            console.log('Background token monitoring stopped');
        }
    }
    
    // Handle page visibility changes for better token renewal
    async handlePageVisible() {
        if (!this.accessToken) return false;
        
        const tokenData = this.getSavedTokenData();
        if (!tokenData) return false;
        
        // If token is expired or expiring soon, attempt renewal now that page is visible
        const fiveMinutesInMs = 5 * 60 * 1000;
        const timeUntilExpiry = tokenData.expires_at - Date.now();
        
        if (timeUntilExpiry <= 0 || timeUntilExpiry < fiveMinutesInMs) {
            console.log('Page became visible - attempting token renewal for expired/expiring token');
            const renewed = await this.refreshTokenIfNeeded();
            if (renewed) {
                console.log('Token successfully renewed after page became visible');
            } else {
                console.log('Token renewal failed after page became visible - user may need to manually re-authenticate');
            }
            return renewed;
        }
        
        return true;
    }
    
    // Check if session has been inactive for a long time and handle gracefully
    isSessionStale() {
        const tokenData = this.getSavedTokenData();
        if (!tokenData || !tokenData.saved_at) return false;
        
        // Consider session stale if it's been more than 2 hours since last token save
        const twoHoursInMs = 2 * 60 * 60 * 1000;
        const timeSinceLastSave = Date.now() - tokenData.saved_at;
        
        return timeSinceLastSave > twoHoursInMs && this.isTokenExpired(tokenData);
    }
    
    // Get user-friendly auth status for UI display
    getAuthStatus() {
        if (!this.accessToken) {
            return { status: 'not_signed_in', message: 'Please sign in to Google to access calendar data' };
        }
        
        const tokenData = this.getSavedTokenData();
        if (!tokenData) {
            return { status: 'no_token_data', message: 'Authentication data missing - please sign in again' };
        }
        
        if (this.isSessionStale()) {
            return { 
                status: 'session_stale', 
                message: 'Your Google session has expired due to inactivity. Please sign in again to continue.' 
            };
        }
        
        if (this.isTokenExpired(tokenData)) {
            return { 
                status: 'token_expired', 
                message: 'Your Google authentication has expired. Click to refresh your connection.' 
            };
        }
        
        const timeUntilExpiry = tokenData.expires_at - Date.now();
        const fiveMinutesInMs = 5 * 60 * 1000;
        
        if (timeUntilExpiry < fiveMinutesInMs) {
            return { 
                status: 'token_expiring', 
                message: 'Your Google authentication is expiring soon and will be refreshed automatically.' 
            };
        }
        
        return { status: 'authenticated', message: 'Connected to Google Calendar' };
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
        
        // Check auth status gracefully before attempting any renewals
        const authStatus = this.getAuthStatus();
        console.log('Auth status:', authStatus);
        
        // For stale sessions, don't attempt renewal - require manual sign-in
        if (authStatus.status === 'session_stale') {
            console.log('Session is stale - requiring manual re-authentication');
            return {
                calendars: [],
                connected_users: [],
                total_accounts: 0,
                successful_accounts: 0,
                failed_accounts: 1,
                total_events: 0,
                date_requested: date_param,
                source: 'session_stale',
                message: authStatus.message
            };
        }
        
        // For other non-authenticated states, check if we can sign in
        const signedIn = await this.isSignedIn();
        console.log('isSignedIn:', signedIn);
        
        if (!signedIn) {
            console.log('Not signed in or token refresh failed, returning authentication error');
            const currentStatus = this.getAuthStatus();
            return {
                calendars: [],
                connected_users: [],
                total_accounts: 0,
                successful_accounts: 0,
                failed_accounts: 1,
                total_events: 0,
                date_requested: date_param,
                source: 'authentication_required',
                message: currentStatus.message
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