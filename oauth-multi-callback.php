<?php
require_once 'oauth-multi-config.php';

// Handle OAuth2 callback for multiple accounts
if (isset($_GET['code'])) {
    try {
        $oauth = new GoogleOAuth2Multi();
        $storage = new MultiTokenStorage();
        
        // Exchange authorization code for tokens
        $tokens = $oauth->exchangeCodeForTokens($_GET['code']);
        
        // Get user information to identify the account
        $user_info = $oauth->getUserInfo($tokens['access_token']);
        $user_id = $user_info['email']; // Use email as unique identifier
        
        // Save tokens with user info
        $storage->saveTokens($user_id, $tokens, $user_info);
        
        // Redirect back to main app with success
        header('Location: index.php?auth=success&user=' . urlencode($user_info['name']));
        exit;
        
    } catch (Exception $e) {
        // Redirect back with error
        header('Location: index.php?auth=error&message=' . urlencode($e->getMessage()));
        exit;
    }
} elseif (isset($_GET['error'])) {
    // User denied access
    header('Location: index.php?auth=denied');
    exit;
} else {
    // Invalid callback
    header('Location: index.php?auth=invalid');
    exit;
}
?>