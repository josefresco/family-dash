<?php
/**
 * Configuration File for Daily Dashboard
 * 
 * Copy this file to config.php and update with your API credentials
 */

return [
    // OpenWeatherMap API Configuration
    // Get your API key from: https://openweathermap.org/api
    'openweather_api_key' => 'YOUR_OPENWEATHER_API_KEY_HERE',
    
    // Google OAuth2 Configuration
    // Get credentials from: https://console.cloud.google.com/
    'google_oauth' => [
        'client_id' => 'YOUR_GOOGLE_CLIENT_ID_HERE',
        'client_secret' => 'YOUR_GOOGLE_CLIENT_SECRET_HERE',
        'redirect_uri' => 'https://yourdomain.com/path/oauth-multi-callback.php'
    ],
    
    // Location Configuration
    // Update coordinates for your location
    'location' => [
        'lat' => 41.8354,    // Latitude
        'lon' => -69.9789,   // Longitude
        'city' => 'Eastham', // City name
        'state' => 'MA'      // State abbreviation
    ],
    
    // Application Settings
    'settings' => [
        'timezone' => 'America/New_York',
        'tomorrow_threshold_hour' => 17, // 5 PM - when to switch to tomorrow's data
        'refresh_interval' => 1800000,   // 30 minutes in milliseconds
    ]
];