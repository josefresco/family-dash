<?php
require_once 'oauth-multi-config.php';

header('Content-Type: text/html');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Calendar Events Debug</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .debug { background: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #007bff; }
        .error { border-left-color: #dc3545; background: #f8d7da; }
        .success { border-left-color: #28a745; background: #d4edda; }
        .warning { border-left-color: #ffc107; background: #fff3cd; }
        pre { background: #e9ecef; padding: 10px; overflow-x: auto; font-size: 12px; }
        .account { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <h1>📅 Calendar Events Debug</h1>
    
    <?php
    try {
        $storage = new MultiTokenStorage();
        $all_accounts = $storage->getAllConnectedAccounts();
        
        echo "<div class='debug success'>";
        echo "<h3>Connected Accounts: " . count($all_accounts) . "</h3>";
        
        if (empty($all_accounts)) {
            echo "<p>❌ No accounts connected. <a href='auth.php?action=login'>Connect an account</a></p>";
            echo "</div>";
            exit;
        }
        
        foreach ($all_accounts as $account) {
            echo "<div class='account'>";
            echo "<h4>👤 {$account['name']} ({$account['email']})</h4>";
            
            $user_id = $account['user_id'];
            $access_token = $storage->getValidAccessToken($user_id);
            
            if (!$access_token) {
                echo "<p style='color: red;'>❌ No valid access token</p>";
                echo "</div>";
                continue;
            }
            
            echo "<p style='color: green;'>✅ Valid access token found</p>";
            
            // Test calendar list access
            $oauth = new GoogleOAuth2Multi();
            try {
                $calendar_list = $oauth->getCalendarList($access_token);
                echo "<p style='color: green;'>✅ Calendar list accessible</p>";
                echo "<p><strong>Calendars found:</strong> " . count($calendar_list['items'] ?? []) . "</p>";
                
                if (isset($calendar_list['items'])) {
                    foreach ($calendar_list['items'] as $calendar) {
                        echo "<div style='margin-left: 20px; padding: 10px; background: #f1f3f4; border-radius: 5px; margin: 5px 0;'>";
                        echo "<strong>{$calendar['summary']}</strong><br>";
                        echo "ID: {$calendar['id']}<br>";
                        echo "Access: " . ($calendar['accessRole'] ?? 'unknown') . "<br>";
                        echo "Hidden: " . (isset($calendar['hidden']) && $calendar['hidden'] ? 'Yes' : 'No') . "<br>";
                        
                        // Try to get events for this calendar
                        try {
                            $events_data = $oauth->getCalendarEvents($access_token, $calendar['id']);
                            $event_count = count($events_data['items'] ?? []);
                            echo "Events today: {$event_count}<br>";
                            
                            if ($event_count > 0) {
                                echo "<details style='margin-top: 10px;'>";
                                echo "<summary>Show Events ({$event_count})</summary>";
                                foreach ($events_data['items'] as $event) {
                                    $start = $event['start']['dateTime'] ?? $event['start']['date'] ?? 'No time';
                                    $summary = $event['summary'] ?? 'Untitled';
                                    echo "<div style='margin: 5px 0; padding: 5px; background: white; border-radius: 3px;'>";
                                    echo "<strong>{$summary}</strong><br>";
                                    echo "Start: {$start}<br>";
                                    if (isset($event['location'])) echo "Location: {$event['location']}<br>";
                                    echo "</div>";
                                }
                                echo "</details>";
                            }
                        } catch (Exception $e) {
                            echo "<span style='color: red;'>❌ Error fetching events: " . $e->getMessage() . "</span><br>";
                        }
                        
                        echo "</div>";
                    }
                } else {
                    echo "<p style='color: orange;'>⚠️ No calendar items in response</p>";
                }
                
            } catch (Exception $e) {
                echo "<p style='color: red;'>❌ Error accessing calendars: " . $e->getMessage() . "</p>";
            }
            
            echo "</div>";
        }
        echo "</div>";
        
        // Test the actual API endpoint
        echo "<div class='debug'>";
        echo "<h3>API Endpoint Test</h3>";
        
        $api_url = 'http' . (isset($_SERVER['HTTPS']) ? 's' : '') . '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . '/api.php?endpoint=calendar';
        $context = stream_context_create(['http' => ['timeout' => 30, 'ignore_errors' => true]]);
        $api_response = @file_get_contents($api_url, false, $context);
        
        if ($api_response) {
            echo "<p style='color: green;'>✅ API endpoint responded</p>";
            echo "<pre>" . htmlspecialchars($api_response) . "</pre>";
        } else {
            echo "<p style='color: red;'>❌ API endpoint failed</p>";
        }
        echo "</div>";
        
    } catch (Exception $e) {
        echo "<div class='debug error'>";
        echo "<h3>Error</h3>";
        echo "<p>" . $e->getMessage() . "</p>";
        echo "</div>";
    }
    ?>
    
    <div class="debug">
        <h3>Quick Actions</h3>
        <p>
            <a href="auth.php?action=login" style="background: #28a745; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">➕ Add Account</a>
            <a href="index.php" style="background: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-left: 10px;">🏠 Dashboard</a>
            <a href="clear-accounts.php" style="background: #dc3545; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-left: 10px;">🗑️ Clear All</a>
        </p>
    </div>
    
    <div class="debug warning">
        <h3>Troubleshooting Tips</h3>
        <ul>
            <li><strong>No events showing?</strong> Try adding a test event to your Google Calendar for today</li>
            <li><strong>Permission errors?</strong> The OAuth scope might not include calendar access</li>
            <li><strong>Hidden calendars?</strong> Some calendars might be marked as hidden</li>
            <li><strong>All-day events?</strong> The system currently skips all-day events</li>
        </ul>
    </div>
    
</body>
</html>