<?php
// Load configuration
if (!file_exists('config.php')) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Configuration file missing',
        'message' => 'Please copy config.example.php to config.php and configure your API keys',
        'instructions' => 'See README.md for setup instructions'
    ]);
    exit;
}

$config = require 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Get the requested endpoint and date parameter
$endpoint = $_GET['endpoint'] ?? '';
$date_param = $_GET['date'] ?? 'today'; // 'today' or 'tomorrow'

switch ($endpoint) {
    case 'weather':
        getWeatherData($config, $date_param);
        break;
    case 'tides':
        getTideData($config, $date_param);
        break;
    case 'sunrise-sunset':
        getSunriseSunsetData($config, $date_param);
        break;
    case 'calendar':
        getCalendarDataImproved($config, $date_param);
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid endpoint']);
        break;
}

// Enhanced Weather API Function with Hourly Forecasts and Summaries
function getWeatherData($config, $date_param = 'today') {
    $lat = $config['location']['lat'];
    $lon = $config['location']['lon'];
    $apiKey = $config['openweather_api_key'];
    
    // Check if API key is configured
    if ($apiKey === 'YOUR_OPENWEATHER_API_KEY_HERE' || empty($apiKey)) {
        http_response_code(500);
        echo json_encode([
            'error' => 'OpenWeather API key not configured',
            'message' => 'Please update the openweather_api_key in config.php',
            'instructions' => 'Get a free API key from openweathermap.org and copy config.example.php to config.php'
        ]);
        return;
    }
    
    try {
        // Always use the forecast API for better daily planning
        $forecast_url = "https://api.openweathermap.org/data/2.5/forecast?lat={$lat}&lon={$lon}&appid={$apiKey}&units=imperial";
        
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => [
                    'User-Agent: DailyDashboard/2.0 (Weather Forecast)',
                    'Accept: application/json'
                ],
                'timeout' => 30,
                'ignore_errors' => true
            ]
        ]);
        
        $response = file_get_contents($forecast_url, false, $context);
        $data = json_decode($response, true);
        
        if (!$data || isset($data['cod']) && $data['cod'] != 200) {
            throw new Exception('Invalid weather forecast data: ' . ($data['message'] ?? 'Unknown error'));
        }
        
        // Process forecast data for the requested day
        $weatherData = processWeatherForecast($data, $date_param);
        echo json_encode($weatherData);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Failed to fetch weather forecast',
            'message' => $e->getMessage(),
            'date_requested' => $date_param,
            'url_tested' => 'OpenWeather Forecast API'
        ]);
    }
}

function processWeatherForecast($data, $date_param) {
    // Set timezone for Eastham, MA
    $timezone = new DateTimeZone('America/New_York');
    
    // Determine target date
    if ($date_param === 'tomorrow') {
        $target_date = new DateTime('tomorrow', $timezone);
    } else {
        $target_date = new DateTime('today', $timezone);
    }
    
    $target_date_str = $target_date->format('Y-m-d');
    
    // Filter forecasts for the target date
    $day_forecasts = [];
    $all_temps = [];
    $all_conditions = [];
    $precipitation_hours = [];
    
    foreach ($data['list'] as $forecast) {
        $forecast_time = new DateTime('@' . $forecast['dt']);
        $forecast_time->setTimezone($timezone);
        
        // Check if this forecast is for our target date
        if ($forecast_time->format('Y-m-d') === $target_date_str) {
            $hour = (int)$forecast_time->format('H');
            
            $day_forecasts[] = [
                'time' => $forecast_time->format('g A'), // 6 AM, 12 PM, etc.
                'hour' => $hour,
                'timestamp' => $forecast['dt'],
                'temperature' => round($forecast['main']['temp']),
                'feels_like' => round($forecast['main']['feels_like']),
                'humidity' => $forecast['main']['humidity'],
                'description' => $forecast['weather'][0]['description'],
                'icon' => $forecast['weather'][0]['icon'],
                'main_condition' => $forecast['weather'][0]['main'], // Rain, Snow, Clear, etc.
                'wind_speed' => round($forecast['wind']['speed'] ?? 0),
                'precipitation' => $forecast['rain']['3h'] ?? $forecast['snow']['3h'] ?? 0,
                'clouds' => $forecast['clouds']['all'] ?? 0
            ];
            
            $all_temps[] = $forecast['main']['temp'];
            $all_conditions[] = $forecast['weather'][0]['main'];
            
            if (($forecast['rain']['3h'] ?? 0) > 0 || ($forecast['snow']['3h'] ?? 0) > 0) {
                $precipitation_hours[] = [
                    'time' => $forecast_time->format('g A'),
                    'type' => isset($forecast['rain']) ? 'rain' : 'snow',
                    'amount' => $forecast['rain']['3h'] ?? $forecast['snow']['3h'] ?? 0
                ];
            }
        }
    }
    
    if (empty($day_forecasts)) {
        throw new Exception('No forecast data available for the requested date');
    }
    
    // Calculate daily summary
    $high_temp = round(max($all_temps));
    $low_temp = round(min($all_temps));
    $avg_temp = round(array_sum($all_temps) / count($all_temps));
    
    // Determine dominant weather condition
    $condition_counts = array_count_values($all_conditions);
    arsort($condition_counts);
    $dominant_condition = array_key_first($condition_counts);
    
    // Create hourly breakdown (every 3 hours during daylight)
    $hourly_breakdown = array_filter($day_forecasts, function($forecast) {
        return $forecast['hour'] >= 6 && $forecast['hour'] <= 21; // 6 AM to 9 PM
    });
    
    // Sort by hour
    usort($hourly_breakdown, function($a, $b) {
        return $a['hour'] - $b['hour'];
    });
    
    // Generate weather narrative
    $narrative = generateWeatherNarrative($day_forecasts, $high_temp, $low_temp, $dominant_condition, $precipitation_hours, $date_param);
    
    // Create response
    return [
        'date_requested' => $date_param,
        'forecast_date' => $target_date_str,
        'source' => 'live_openweather_forecast',
        'timestamp' => date('c'),
        
        // Daily Summary
        'daily_summary' => [
            'high_temp' => $high_temp,
            'low_temp' => $low_temp,
            'avg_temp' => $avg_temp,
            'dominant_condition' => $dominant_condition,
            'description' => ucfirst($day_forecasts[0]['description']), // Use first forecast's description
            'icon' => $day_forecasts[0]['icon']
        ],
        
        // Hourly Breakdown
        'hourly_forecast' => $hourly_breakdown,
        
        // Weather Narrative
        'narrative' => $narrative,
        
        // Precipitation Info
        'precipitation' => [
            'expected' => !empty($precipitation_hours),
            'hours' => $precipitation_hours,
            'total_hours' => count($precipitation_hours)
        ],
        
        // Additional Details
        'details' => [
            'total_forecasts' => count($day_forecasts),
            'wind_summary' => calculateWindSummary($day_forecasts),
            'humidity_range' => [
                'min' => min(array_column($day_forecasts, 'humidity')),
                'max' => max(array_column($day_forecasts, 'humidity'))
            ]
        ]
    ];
}

function generateWeatherNarrative($forecasts, $high, $low, $condition, $precipitation, $date_param) {
    $day_name = $date_param === 'tomorrow' ? 'Tomorrow' : 'Today';
    
    // Temperature narrative
    $temp_narrative = '';
    if ($high - $low > 15) {
        $temp_narrative = "temperatures ranging from {$low}°F to {$high}°F";
    } else {
        $temp_narrative = "temperatures around {$high}°F";
    }
    
    // Condition narrative based on dominant weather
    $condition_phrases = [
        'Clear' => 'clear skies',
        'Clouds' => 'cloudy conditions',
        'Rain' => 'rainy weather',
        'Snow' => 'snowy conditions',
        'Thunderstorm' => 'thunderstorms',
        'Drizzle' => 'light drizzle',
        'Mist' => 'misty conditions',
        'Fog' => 'foggy conditions'
    ];
    
    $condition_text = $condition_phrases[$condition] ?? strtolower($condition);
    
    // Build the narrative
    $narrative = "{$day_name} expect {$condition_text} with {$temp_narrative}.";
    
    // Add precipitation details
    if (!empty($precipitation)) {
        $precip_count = count($precipitation);
        if ($precip_count === 1) {
            $narrative .= " " . ucfirst($precipitation[0]['type']) . " is expected around {$precipitation[0]['time']}.";
        } else {
            $precip_type = $precipitation[0]['type'];
            $narrative .= " {$precip_type} is expected during multiple periods throughout the day.";
        }
    }
    
    // Add morning/afternoon/evening specifics
    $morning_forecast = array_filter($forecasts, function($f) { return $f['hour'] >= 6 && $f['hour'] < 12; });
    $afternoon_forecast = array_filter($forecasts, function($f) { return $f['hour'] >= 12 && $f['hour'] < 18; });
    $evening_forecast = array_filter($forecasts, function($f) { return $f['hour'] >= 18 && $f['hour'] <= 21; });
    
    $periods = [];
    
    if (!empty($morning_forecast)) {
        $morning_temp = round(array_sum(array_column($morning_forecast, 'temperature')) / count($morning_forecast));
        $periods[] = "morning temperatures around {$morning_temp}°F";
    }
    
    if (!empty($afternoon_forecast)) {
        $afternoon_temp = round(array_sum(array_column($afternoon_forecast, 'temperature')) / count($afternoon_forecast));
        if (abs($afternoon_temp - ($morning_temp ?? $afternoon_temp)) > 5) {
            $periods[] = "warming to {$afternoon_temp}°F in the afternoon";
        }
    }
    
    if (!empty($evening_forecast)) {
        $evening_temp = round(array_sum(array_column($evening_forecast, 'temperature')) / count($evening_forecast));
        if (abs($evening_temp - ($afternoon_temp ?? $evening_temp)) > 5) {
            $periods[] = "cooling to {$evening_temp}°F by evening";
        }
    }
    
    if (!empty($periods)) {
        $narrative .= " Look for " . implode(', ', $periods) . ".";
    }
    
    return $narrative;
}

function calculateWindSummary($forecasts) {
    $wind_speeds = array_column($forecasts, 'wind_speed');
    $avg_wind = round(array_sum($wind_speeds) / count($wind_speeds));
    $max_wind = max($wind_speeds);
    
    if ($max_wind > 20) {
        return "Windy, gusts up to {$max_wind} mph";
    } elseif ($avg_wind > 10) {
        return "Breezy, averaging {$avg_wind} mph";
    } else {
        return "Light winds, {$avg_wind} mph";
    }
}

function getCalendarDataImproved($config, $date_param = 'today') {
    try {
        $storage = new MultiTokenStorage();
        $all_accounts = $storage->getAllConnectedAccounts();
        
        if (empty($all_accounts)) {
            echo json_encode([
                'error' => 'no_accounts_connected',
                'message' => 'No Google accounts connected',
                'connected_accounts' => []
            ]);
            return;
        }
        
        $oauth = new GoogleOAuth2Multi();
        $all_calendars = [];
        $total_events = 0;
        $connected_users = [];
        $successful_accounts = 0;
        $failed_accounts = 0;
        
        // Fetch calendar data for ALL connected accounts
        foreach ($all_accounts as $account) {
            $user_id = $account['user_id'];
            
            try {
                $access_token = $storage->getValidAccessToken($user_id);
                
                if (!$access_token) {
                    error_log("Skipping account {$user_id} - no valid token");
                    $failed_accounts++;
                    continue;
                }
                
                // Get user info from stored tokens (more reliable)
                $tokens = $storage->getTokens($user_id);
                $user_info = $tokens['user_info'] ?? [
                    'name' => $user_id, 
                    'email' => $user_id,
                    'picture' => null
                ];
                $connected_users[] = $user_info;
                
                // Get calendar list for this user
                $calendar_list = $oauth->getCalendarList($access_token);
                
                if (!isset($calendar_list['items']) || !is_array($calendar_list['items'])) {
                    error_log("No calendar items found for user: {$user_id}");
                    $failed_accounts++;
                    continue;
                }
                
                $user_has_events = false;
                
                foreach ($calendar_list['items'] as $calendar) {
                    // Skip hidden calendars
                    if (isset($calendar['hidden']) && $calendar['hidden']) {
                        continue;
                    }
                    
                    // Skip calendars we can't access
                    if (isset($calendar['accessRole']) && !in_array($calendar['accessRole'], ['owner', 'reader', 'writer'])) {
                        continue;
                    }
                    
                    try {
                        // Get events for this calendar with date parameter
                        $events_data = $oauth->getCalendarEvents($access_token, $calendar['id'], $date_param);
                        
                        $events = [];
                        if (isset($events_data['items']) && is_array($events_data['items'])) {
                            // Set up timezone for proper date filtering
                            $timezone = new DateTimeZone('America/New_York');
                            
                            // Determine target date for filtering
                            if ($date_param === 'tomorrow') {
                                $target_date = new DateTime('tomorrow', $timezone);
                            } else {
                                $target_date = new DateTime('today', $timezone);
                            }
                            $target_date_str = $target_date->format('Y-m-d');
                            
                            foreach ($events_data['items'] as $event) {
                                // Get event start time
                                $start_time = $event['start']['dateTime'] ?? $event['start']['date'] ?? null;
                                
                                if (!$start_time) {
                                    continue; // Skip events without start time
                                }
                                
                                // Check if this event actually belongs to our target date
                                $event_belongs_to_target_date = false;
                                
                                if (isset($event['start']['date'])) {
                                    // All-day event - compare date directly
                                    $event_date = $event['start']['date']; // Format: YYYY-MM-DD
                                    $event_belongs_to_target_date = ($event_date === $target_date_str);
                                } else if (isset($event['start']['dateTime'])) {
                                    // Timed event - convert to local timezone and check date
                                    try {
                                        $event_start = new DateTime($event['start']['dateTime']);
                                        $event_start->setTimezone($timezone);
                                        $event_date_str = $event_start->format('Y-m-d');
                                        $event_belongs_to_target_date = ($event_date_str === $target_date_str);
                                    } catch (Exception $e) {
                                        error_log("Error parsing event datetime: " . $e->getMessage());
                                        continue;
                                    }
                                }
                                
                                // Only include events that actually belong to our target date
                                if ($event_belongs_to_target_date) {
                                    $events[] = [
                                        'id' => $event['id'],
                                        'summary' => $event['summary'] ?? 'Untitled Event',
                                        'start' => $start_time,
                                        'end' => $event['end']['dateTime'] ?? $event['end']['date'] ?? null,
                                        'location' => $event['location'] ?? null,
                                        'description' => $event['description'] ?? null,
                                        'calendar_id' => $calendar['id'],
                                        'user_account' => $user_info['name'] ?? $user_info['email'],
                                        'all_day' => !isset($event['start']['dateTime'])
                                    ];
                                }
                            }
                        }
                        
                        // Only include calendars with events
                        if (!empty($events)) {
                            $calendar_name = $calendar['summary'];
                            // Add user identifier to calendar name if multiple users
                            if (count($all_accounts) > 1) {
                                $user_name = $user_info['name'] ?? explode('@', $user_info['email'])[0];
                                $calendar_name = $calendar['summary'] . " ({$user_name})";
                            }
                            
                            $all_calendars[] = [
                                'id' => $calendar['id'],
                                'name' => $calendar_name,
                                'events' => $events,
                                'color' => $calendar['backgroundColor'] ?? '#4285f4',
                                'user_account' => $user_info['name'] ?? $user_info['email'],
                                'user_email' => $user_info['email']
                            ];
                            
                            $total_events += count($events);
                            $user_has_events = true;
                        }
                        
                    } catch (Exception $e) {
                        error_log("Failed to fetch events for calendar {$calendar['id']} for user {$user_id}: " . $e->getMessage());
                        continue;
                    }
                }
                
                if ($user_has_events) {
                    $successful_accounts++;
                } else {
                    $failed_accounts++;
                }
                
            } catch (Exception $e) {
                error_log("Failed to process account {$user_id}: " . $e->getMessage());
                $failed_accounts++;
                continue;
            }
        }
        
        // Sort calendars by next event time
        usort($all_calendars, function($a, $b) {
            if (empty($a['events']) && empty($b['events'])) return 0;
            if (empty($a['events'])) return 1;
            if (empty($b['events'])) return -1;
            
            $time_a = strtotime($a['events'][0]['start']);
            $time_b = strtotime($b['events'][0]['start']);
            return $time_a - $time_b;
        });
        
        // Build response with detailed status
        $response = [
            'calendars' => $all_calendars,
            'connected_users' => $connected_users,
            'total_accounts' => count($all_accounts),
            'successful_accounts' => $successful_accounts,
            'failed_accounts' => $failed_accounts,
            'total_events' => $total_events,
            'date_requested' => $date_param,
            'source' => 'live_google_calendar_multi',
            'timestamp' => date('c')
        ];
        
        // Add warnings if some accounts failed
        if ($failed_accounts > 0) {
            $response['warnings'] = [
                "Some accounts ({$failed_accounts}) could not be accessed. Check tokens and permissions."
            ];
        }
        
        echo json_encode($response);
        
    } catch (Exception $e) {
        error_log("Calendar API Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'error' => 'calendar_fetch_failed',
            'message' => 'Failed to fetch calendar data: ' . $e->getMessage(),
            'timestamp' => date('c')
        ]);
    }
}

function getTideData($config, $date_param = 'today') {
    // Determine the date to request
    $date_for_api = ($date_param === 'tomorrow') ? date('Ymd', strtotime('+1 day')) : date('Ymd');
    
    // Try multiple stations in order of preference (all Cape Cod area)
    $stations = [
        '8447435' => 'Chatham, MA',           // Closest to Eastham
        '8446613' => 'Woods Hole, MA',       // Southwest Cape
        '8447173' => 'Cape Cod Canal, MA'    // Canal area (Sagamore)
    ];
    
    $tides = [];
    $last_error = '';
    
    foreach ($stations as $station_id => $station_name) {
        try {
            // Updated URL format with required application parameter
            $url = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?" . http_build_query([
                'date' => $date_for_api,
                'station' => $station_id,
                'product' => 'predictions',
                'datum' => 'MLLW',
                'units' => 'english',
                'time_zone' => 'lst_ldt',
                'format' => 'json',
                'interval' => 'hilo',
                'application' => 'DailyDashboard_v2.0'  // Required parameter
            ]);
            
            // Enhanced HTTP context with proper headers
            $context = stream_context_create([
                'http' => [
                    'method' => 'GET',
                    'header' => [
                        'User-Agent: DailyDashboard/2.0 (https://josefresco.com/ccc/; contact@colewebdev.com)',
                        'Accept: application/json',
                        'Cache-Control: no-cache'
                    ],
                    'timeout' => 30,
                    'ignore_errors' => true
                ]
            ]);
            
            $response = file_get_contents($url, false, $context);
            
            // Check for HTTP errors
            if ($response === false) {
                $last_error = "Network error for {$station_name}";
                continue;
            }
            
            $data = json_decode($response, true);
            
            if (!$data) {
                $last_error = "Invalid JSON from {$station_name}";
                continue;
            }
            
            // Check for API error responses
            if (isset($data['error'])) {
                $last_error = "API Error from {$station_name}: " . $data['error']['message'];
                continue;
            }
            
            if (isset($data['predictions']) && is_array($data['predictions']) && !empty($data['predictions'])) {
                // Format the high/low tide data
                foreach ($data['predictions'] as $prediction) {
                    $time = date('g:i A', strtotime($prediction['t']));
                    $height = round(floatval($prediction['v']), 1);
                    $type = $prediction['type']; // 'H' for high, 'L' for low
                    
                    $tides[] = [
                        'type' => ($type === 'H') ? 'High' : 'Low',
                        'time' => $time,
                        'height' => $height . ' ft'
                    ];
                }
                
                echo json_encode([
                    'tides' => $tides,
                    'date_requested' => $date_param,
                    'source' => 'live_noaa',
                    'station' => $station_name,
                    'station_id' => $station_id
                ]);
                return;
            }
            
        } catch (Exception $e) {
            $last_error = "Exception from {$station_name} for {$date_param}: " . $e->getMessage();
            continue;
        }
    }
    
    // All stations failed - provide fallback data
    $fallback_tides = getFallbackTideData($date_param);
    
    echo json_encode([
        'tides' => $fallback_tides,
        'date_requested' => $date_param,
        'source' => 'fallback_estimate',
        'station' => 'Cape Cod (Estimated)',
        'station_id' => 'fallback',
        'note' => 'NOAA tide stations unavailable - showing estimated times'
    ]);
}

function getFallbackTideData($date_param) {
    $base_date = ($date_param === 'tomorrow') ? strtotime('+1 day') : time();
    $day_of_year = date('z', $base_date);
    
    $lunar_offset = ($day_of_year * 0.9) % 24;
    
    $high1_time = (6 + $lunar_offset) % 24;
    $low1_time = ($high1_time + 6) % 24;
    $high2_time = ($high1_time + 12) % 24;
    $low2_time = ($high1_time + 18) % 24;
    
    $times = [
        ['time' => $high1_time, 'type' => 'High', 'height' => '8.5 ft'],
        ['time' => $low1_time, 'type' => 'Low', 'height' => '1.2 ft'],
        ['time' => $high2_time, 'type' => 'High', 'height' => '8.8 ft'],
        ['time' => $low2_time, 'type' => 'Low', 'height' => '0.9 ft']
    ];
    
    usort($times, function($a, $b) {
        return $a['time'] - $b['time'];
    });
    
    $formatted_tides = [];
    foreach ($times as $tide) {
        $hour = floor($tide['time']);
        $minute = ($tide['time'] - $hour) * 60;
        $formatted_time = date('g:i A', mktime($hour, $minute, 0));
        
        $formatted_tides[] = [
            'type' => $tide['type'],
            'time' => $formatted_time,
            'height' => $tide['height']
        ];
    }
    
    return $formatted_tides;
}

function getSunriseSunsetData($config, $date_param = 'today') {
    $lat = $config['location']['lat'];
    $lon = $config['location']['lon'];
    
    $date_for_api = ($date_param === 'tomorrow') ? date('Y-m-d', strtotime('+1 day')) : date('Y-m-d');
    
    $apis = [
        [
            'url' => "https://api.sunrisesunset.io/json?lat={$lat}&lng={$lon}&date={$date_for_api}",
            'name' => 'sunrisesunset.io'
        ],
        [
            'url' => "https://api.sunrise-sunset.org/json?lat={$lat}&lng={$lon}&date={$date_for_api}&formatted=0",
            'name' => 'sunrise-sunset.org'
        ]
    ];
    
    $errors = [];
    
    foreach ($apis as $api) {
        try {
            $response = makeHttpRequest($api['url']);
            $data = json_decode($response, true);
            
            if (!$data || !isset($data['results']) || $data['status'] !== 'OK') {
                $errors[] = $api['name'] . ': Invalid response';
                continue;
            }
            
            if ($api['name'] === 'sunrisesunset.io') {
                $sunData = [
                    'sunrise' => formatTime($data['results']['sunrise']),
                    'sunset' => formatTime($data['results']['sunset']),
                    'dayLength' => $data['results']['day_length'] ?? 'N/A',
                    'date_requested' => $date_param,
                    'date_used' => $date_for_api,
                    'source' => 'live_' . $api['name']
                ];
            } else {
                $timezone = new DateTimeZone('America/New_York');
                
                $sunrise = new DateTime($data['results']['sunrise']);
                $sunrise->setTimezone($timezone);
                
                $sunset = new DateTime($data['results']['sunset']);
                $sunset->setTimezone($timezone);
                
                $sunData = [
                    'sunrise' => $sunrise->format('g:i A'),
                    'sunset' => $sunset->format('g:i A'),
                    'dayLength' => $data['results']['day_length'] ?? 'N/A',
                    'date_requested' => $date_param,
                    'date_used' => $date_for_api,
                    'source' => 'live_' . $api['name']
                ];
            }
            
            echo json_encode($sunData);
            return;
            
        } catch (Exception $e) {
            $errors[] = $api['name'] . ': ' . $e->getMessage();
        }
    }
    
    // All APIs failed, calculate approximate times
    $fallbackData = calculateSunTimes($lat, $lon, $date_for_api);
    $fallbackData['date_requested'] = $date_param;
    $fallbackData['date_used'] = $date_for_api;
    echo json_encode($fallbackData);
}

function makeHttpRequest($url, $options = []) {
    $default_options = [
        'timeout' => 15,
        'user_agent' => 'Dashboard PWA/1.0',
        'ignore_errors' => true
    ];
    
    $context = stream_context_create([
        'http' => array_merge($default_options, $options)
    ]);
    
    $response = file_get_contents($url, false, $context);
    
    if ($response === FALSE) {
        $error = error_get_last();
        throw new Exception('HTTP request failed: ' . ($error['message'] ?? 'Unknown error'));
    }
    
    return $response;
}

function formatTime($timeString) {
    try {
        if (strpos($timeString, 'T') !== false) {
            $dt = new DateTime($timeString);
            $dt->setTimezone(new DateTimeZone('America/New_York'));
            return $dt->format('g:i A');
        } else {
            return $timeString;
        }
    } catch (Exception $e) {
        return $timeString;
    }
}

function calculateSunTimes($lat, $lon, $date) {
    $dayOfYear = date('z', strtotime($date)) + 1;
    $declination = 23.45 * sin(deg2rad(360 * (284 + $dayOfYear) / 365));
    $hourAngle = rad2deg(acos(-tan(deg2rad($lat)) * tan(deg2rad($declination))));
    $solarNoon = 12 - ($lon / 15);
    $sunriseTime = $solarNoon - ($hourAngle / 15);
    $sunsetTime = $solarNoon + ($hourAngle / 15);
    
    $sunrise = sprintf('%d:%02d AM', floor($sunriseTime), ($sunriseTime - floor($sunriseTime)) * 60);
    $sunset = sprintf('%d:%02d PM', floor($sunsetTime) - 12, ($sunsetTime - floor($sunsetTime)) * 60);
    
    if (floor($sunriseTime) < 5) $sunrise = '6:24 AM';
    if (floor($sunsetTime) > 20) $sunset = '7:45 PM';
    
    return [
        'sunrise' => $sunrise,
        'sunset' => $sunset,
        'dayLength' => 'Calculated',
        'source' => 'fallback_calculation'
    ];
}

function handleError($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    echo json_encode([
        'error' => 'server_error',
        'message' => 'Internal server error occurred'
    ]);
    error_log("Error: {$errstr} in {$errfile} on line {$errline}");
    exit;
}

set_error_handler('handleError');
?>
    