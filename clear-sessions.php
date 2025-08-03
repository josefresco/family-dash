<?php
session_start();

// Clear all session data
session_unset();
session_destroy();

// Also clear all tokens and accounts
require_once 'oauth-multi-config.php';
$storage = new MultiTokenStorage();
$storage->clearTokens('all');

// Clear any cookies related to sessions
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time() - 3600, '/');
}

header('Content-Type: text/html');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Sessions Cleared</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .success { color: #27ae60; background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { background: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 10px; }
    </style>
</head>
<body>
    <h1>🧹 Sessions & Data Cleared</h1>
    
    <div class="success">
        <h3>✅ Successfully Cleared:</h3>
        <ul style="text-align: left; display: inline-block;">
            <li>PHP Sessions</li>
            <li>All OAuth tokens</li>
            <li>Connected Google accounts</li>
            <li>Session cookies</li>
        </ul>
    </div>
    
    <p>
        <a href="index.php" class="button">🏠 Back to Dashboard</a>
        <a href="debug-calendar.php" class="button">🔧 Debug Page</a>
    </p>
    
    <script>
        // Also clear browser storage
        if (typeof(Storage) !== "undefined") {
            localStorage.clear();
            sessionStorage.clear();
            console.log("Browser storage cleared");
        }
        
        // Clear any cached data
        if ('caches' in window) {
            caches.keys().then(function(names) {
                for (let name of names) {
                    caches.delete(name);
                }
            });
        }
    </script>
</body>
</html>