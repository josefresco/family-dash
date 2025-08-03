// Google OAuth client for browser authentication
// Replaces PHP OAuth system

class GoogleAuthClient {
    constructor(config) {
        this.config = config;
        this.gapi = null;
        this.auth2 = null;
        this.isInitialized = false;
        this.storageKey = 'dashboard-google-tokens';
    }
    
    async init() {
        if (this.isInitialized) return true;
        
        const clientId = this.config.get('google_client_id');
        if (!clientId) {
            throw new Error('Google Client ID not configured');
        }
        
        try {
            // Load Google API
            await this.loadGoogleAPI();
            
            // Initialize gapi
            await new Promise((resolve, reject) => {
                gapi.load('auth2', {
                    callback: resolve,
                    onerror: reject
                });
            });
            
            // Initialize auth2
            this.auth2 = await gapi.auth2.init({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/calendar.readonly profile email'
            });
            
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize Google Auth:', error);
            throw error;
        }
    }
    
    loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            if (window.gapi) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    async signIn() {
        if (!this.isInitialized) {
            await this.init();
        }
        
        try {
            const authInstance = this.auth2.getAuthInstance();
            const user = await authInstance.signIn();
            
            const profile = user.getBasicProfile();
            const authResponse = user.getAuthResponse();
            
            // Store user info and tokens
            const userData = {
                id: profile.getId(),
                email: profile.getEmail(),
                name: profile.getName(),
                picture: profile.getImageUrl(),
                access_token: authResponse.access_token,
                expires_at: Date.now() + (authResponse.expires_in * 1000),
                connected_at: Date.now()
            };
            
            this.saveUserData(userData);
            return userData;
        } catch (error) {
            console.error('Sign in failed:', error);
            throw error;
        }
    }
    
    async signOut() {
        if (!this.isInitialized) return;
        
        try {
            await this.auth2.getAuthInstance().signOut();
            this.clearUserData();
        } catch (error) {
            console.error('Sign out failed:', error);
        }
    }
    
    isSignedIn() {
        if (!this.isInitialized) return false;
        
        const userData = this.getUserData();
        if (!userData) return false;
        
        // Check if token is expired
        return userData.expires_at > Date.now();
    }
    
    getUserData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error('Failed to get user data:', error);
            return null;
        }
    }
    
    saveUserData(userData) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(userData));
        } catch (error) {
            console.error('Failed to save user data:', error);
        }
    }
    
    clearUserData() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.error('Failed to clear user data:', error);
        }
    }
    
    async getCalendarEvents(date_param = 'today') {
        if (!this.isSignedIn()) {
            return {
                calendars: [],
                connected_users: [],
                total_accounts: 0,
                successful_accounts: 0,
                failed_accounts: 0,
                total_events: 0,
                date_requested: date_param,
                source: 'no_authentication',
                error: 'no_accounts_connected',
                message: 'No Google accounts connected'
            };
        }
        
        try {
            // Load Calendar API
            await new Promise((resolve, reject) => {
                gapi.load('client', {
                    callback: resolve,
                    onerror: reject
                });
            });
            
            await gapi.client.init({
                apiKey: '', // Not needed for authenticated requests
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
            });
            
            const userData = this.getUserData();
            const now = new Date();
            const targetDate = date_param === 'tomorrow'
                ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
                : now;
            
            // Set time boundaries for the day
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            // Get calendar list
            const calendarListResponse = await gapi.client.calendar.calendarList.list();
            const calendars = calendarListResponse.result.items || [];
            
            const calendarData = [];
            let totalEvents = 0;
            
            for (const calendar of calendars) {
                try {
                    const eventsResponse = await gapi.client.calendar.events.list({
                        calendarId: calendar.id,
                        timeMin: startOfDay.toISOString(),
                        timeMax: endOfDay.toISOString(),
                        showDeleted: false,
                        singleEvents: true,
                        orderBy: 'startTime'
                    });
                    
                    const events = (eventsResponse.result.items || []).map(event => ({
                        id: event.id,
                        summary: event.summary || 'Untitled Event',
                        start: event.start.dateTime || event.start.date,
                        end: event.end.dateTime || event.end.date,
                        location: event.location || '',
                        description: event.description || '',
                        calendar_id: calendar.id,
                        user_account: userData.name,
                        all_day: !event.start.dateTime
                    }));
                    
                    if (events.length > 0) {
                        calendarData.push({
                            id: calendar.id,
                            name: `${calendar.summary} (${userData.name})`,
                            color: calendar.backgroundColor || '#3498db',
                            user_account: userData.name,
                            user_email: userData.email,
                            events: events
                        });
                        
                        totalEvents += events.length;
                    }
                } catch (error) {
                    console.error(`Failed to fetch events for calendar ${calendar.summary}:`, error);
                }
            }
            
            return {
                calendars: calendarData,
                connected_users: [{
                    name: userData.name,
                    email: userData.email,
                    picture: userData.picture
                }],
                total_accounts: 1,
                successful_accounts: 1,
                failed_accounts: 0,
                total_events: totalEvents,
                date_requested: date_param,
                source: 'live_google_calendar',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to fetch calendar events:', error);
            return {
                calendars: [],
                connected_users: [],
                total_accounts: 1,
                successful_accounts: 0,
                failed_accounts: 1,
                total_events: 0,
                date_requested: date_param,
                source: 'google_calendar_error',
                error: error.message
            };
        }
    }
}

// Global auth client
window.googleAuthClient = null;