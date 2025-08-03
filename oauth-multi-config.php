<?php
/**
 * Multi-Account OAuth2 Configuration for Google Calendar
 * Uses centralized configuration from config.php
 */

// Load configuration
if (!file_exists('config.php')) {
    throw new Exception('Configuration file missing. Please copy config.example.php to config.php and configure your credentials.');
}

$app_config = require 'config.php';

class GoogleOAuth2Multi {
    private $client_id;
    private $client_secret;
    private $redirect_uri;
    private $scope;
    
    public function __construct() {
        global $app_config;
        
        // Validate configuration
        if (!isset($app_config['google_oauth'])) {
            throw new Exception('Google OAuth configuration missing from config.php');
        }
        
        $oauth_config = $app_config['google_oauth'];
        
        // Check if credentials are configured
        if (empty($oauth_config['client_id']) || $oauth_config['client_id'] === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
            throw new Exception('Google OAuth Client ID not configured. Please update config.php with your Google Cloud Console credentials.');
        }
        
        if (empty($oauth_config['client_secret']) || $oauth_config['client_secret'] === 'YOUR_GOOGLE_CLIENT_SECRET_HERE') {
            throw new Exception('Google OAuth Client Secret not configured. Please update config.php with your Google Cloud Console credentials.');
        }
        
        $this->client_id = $oauth_config['client_id'];
        $this->client_secret = $oauth_config['client_secret'];
        $this->redirect_uri = $oauth_config['redirect_uri'];
        $this->scope = 'https://www.googleapis.com/auth/calendar.readonly openid email profile';
    }
    
    public function getAuthUrl($account_hint = null) {
        $params = [
            'client_id' => $this->client_id,
            'redirect_uri' => $this->redirect_uri,
            'scope' => $this->scope,
            'response_type' => 'code',
            'access_type' => 'offline',
            'prompt' => 'consent',
            'include_granted_scopes' => 'true'
        ];
        
        // Add account hint to suggest which Google account to use
        if ($account_hint) {
            $params['login_hint'] = $account_hint;
        }
        
        return 'https://accounts.google.com/o/oauth2/auth?' . http_build_query($params);
    }
    
    public function exchangeCodeForTokens($code) {
        $token_url = 'https://oauth2.googleapis.com/token';
        
        $post_data = [
            'client_id' => $this->client_id,
            'client_secret' => $this->client_secret,
            'redirect_uri' => $this->redirect_uri,
            'grant_type' => 'authorization_code',
            'code' => $code
        ];
        
        $context = stream_context_create([
            'http' => [
                'header' => "Content-type: application/x-www-form-urlencoded\r\n",
                'method' => 'POST',
                'content' => http_build_query($post_data),
                'timeout' => 30
            ]
        ]);
        
        $response = file_get_contents($token_url, false, $context);
        $tokens = json_decode($response, true);
        
        if (!$tokens || isset($tokens['error'])) {
            throw new Exception('Failed to exchange code for tokens: ' . ($tokens['error_description'] ?? 'Unknown error'));
        }
        
        return $tokens;
    }
    
    public function refreshAccessToken($refresh_token) {
        $token_url = 'https://oauth2.googleapis.com/token';
        
        $post_data = [
            'client_id' => $this->client_id,
            'client_secret' => $this->client_secret,
            'refresh_token' => $refresh_token,
            'grant_type' => 'refresh_token'
        ];
        
        $context = stream_context_create([
            'http' => [
                'header' => "Content-type: application/x-www-form-urlencoded\r\n",
                'method' => 'POST',
                'content' => http_build_query($post_data),
                'timeout' => 30
            ]
        ]);
        
        $response = file_get_contents($token_url, false, $context);
        $tokens = json_decode($response, true);
        
        if (!$tokens || isset($tokens['error'])) {
            throw new Exception('Failed to refresh access token: ' . ($tokens['error_description'] ?? 'Unknown error'));
        }
        
        return $tokens;
    }
    
    public function getUserInfo($access_token) {
        $user_info_url = 'https://www.googleapis.com/oauth2/v2/userinfo?access_token=' . $access_token;
        
        $context = stream_context_create([
            'http' => [
                'timeout' => 30,
                'ignore_errors' => true
            ]
        ]);
        
        $response = file_get_contents($user_info_url, false, $context);
        $user_info = json_decode($response, true);
        
        if (!$user_info || isset($user_info['error'])) {
            throw new Exception('Failed to get user info: ' . ($user_info['error']['message'] ?? 'Unknown error'));
        }
        
        return $user_info;
    }
}

/**
 * Multi-Token Storage Class
 * Handles storing and retrieving tokens for multiple Google accounts
 */
class MultiTokenStorage {
    private $tokens_dir = 'tokens';
    
    public function __construct() {
        // Create tokens directory if it doesn't exist
        if (!is_dir($this->tokens_dir)) {
            mkdir($this->tokens_dir, 0755, true);
        }
    }
    
    public function saveTokens($user_id, $tokens, $user_info = null) {
        $token_file = $this->tokens_dir . '/' . $user_id . '.json';
        
        $data = [
            'access_token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'] ?? null,
            'expires_in' => $tokens['expires_in'],
            'token_type' => $tokens['token_type'] ?? 'Bearer',
            'scope' => $tokens['scope'] ?? '',
            'created_at' => time(),
            'expires_at' => time() + ($tokens['expires_in'] ?? 3600)
        ];
        
        if ($user_info) {
            $data['user_info'] = $user_info;
        }
        
        $result = file_put_contents($token_file, json_encode($data, JSON_PRETTY_PRINT));
        
        if ($result === false) {
            throw new Exception('Failed to save token file: ' . $token_file);
        }
        
        return true;
    }
    
    public function getTokens($user_id) {
        $token_file = $this->tokens_dir . '/' . $user_id . '.json';
        
        if (!file_exists($token_file)) {
            return null;
        }
        
        $data = json_decode(file_get_contents($token_file), true);
        return $data;
    }
    
    public function getAllTokens() {
        $tokens = [];
        $files = glob($this->tokens_dir . '/*.json');
        
        foreach ($files as $file) {
            $user_id = basename($file, '.json');
            $token_data = $this->getTokens($user_id);
            if ($token_data) {
                $tokens[$user_id] = $token_data;
            }
        }
        
        return $tokens;
    }
    
    public function removeTokens($user_id) {
        $token_file = $this->tokens_dir . '/' . $user_id . '.json';
        
        if (file_exists($token_file)) {
            return unlink($token_file);
        }
        
        return true;
    }
    
    public function getValidAccessToken($user_id) {
        $tokens = $this->getTokens($user_id);
        
        if (!$tokens) {
            throw new Exception('No tokens found for user: ' . $user_id);
        }
        
        // Check if token is expired
        if (time() >= $tokens['expires_at']) {
            if (!isset($tokens['refresh_token'])) {
                throw new Exception('Token expired and no refresh token available for: ' . $user_id);
            }
            
            // Refresh the token
            $oauth = new GoogleOAuth2Multi();
            $new_tokens = $oauth->refreshAccessToken($tokens['refresh_token']);
            
            // Update stored tokens
            $new_tokens['refresh_token'] = $tokens['refresh_token']; // Keep existing refresh token
            $this->saveTokens($user_id, $new_tokens, $tokens['user_info'] ?? null);
            
            return $new_tokens['access_token'];
        }
        
        return $tokens['access_token'];
    }
}