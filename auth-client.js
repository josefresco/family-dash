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
        const tokenData = {
            access_token: tokenResponse.access_token,
            expires_at: Date.now() + (tokenResponse.expires_in ? tokenResponse.expires_in * 1000 : 3600000), // 1 hour default
            saved_at: Date.now()
        };
        
        localStorage.setItem(this.storageKey, JSON.stringify(tokenData));
        console.log('Token data saved');
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
    
    // Simple calendar data fetch - returns no_accounts_connected for now
    async getCalendarData(date_param = 'today') {
        console.log('=== CALENDAR DATA REQUEST ===');
        console.log('getCalendarData called, date_param:', date_param);
        console.log('isSignedIn:', this.isSignedIn());
        console.log('accessToken exists:', !!this.accessToken);
        console.log('saved token data:', this.getSavedTokenData());
        
        if (!this.isSignedIn()) {
            console.log('Not signed in, returning no_accounts_connected');
            return {
                error: 'no_accounts_connected',
                message: 'No Google accounts connected'
            };
        }
        
        // For now, return a simple success response
        // In a full implementation, you'd use the access token to call Google Calendar API
        console.log('Signed in, returning mock calendar data');
        return {
            calendars: [],
            connected_users: [{ email: 'connected' }],
            total_accounts: 1,
            successful_accounts: 1,
            failed_accounts: 0,
            total_events: 0,
            date_requested: date_param,
            source: 'google_identity_services',
            message: 'Google Calendar integration coming soon'
        };
    }
}

// Global auth client
window.googleAuthClient = null;