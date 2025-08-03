<?php
require_once 'oauth-multi-config.php';

// Handle file deletion if requested
if (isset($_GET['delete'])) {
    $file_to_delete = 'tokens/' . basename($_GET['delete']);
    if (file_exists($file_to_delete) && unlink($file_to_delete)) {
        $deletion_message = "✅ Deleted file: " . basename($file_to_delete);
    } else {
        $deletion_message = "❌ Failed to delete file: " . basename($file_to_delete);
    }
    // Redirect to clear URL parameters
    header("Location: " . strtok($_SERVER["REQUEST_URI"], '?'));
    exit;
}

header('Content-Type: text/html');
?>
<!DOCTYPE html>
<html>
<head>
    <title>🔍 Enhanced Token Diagnostic Tool</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .section { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .section.error { border-left: 4px solid #dc3545; background: #f8d7da; }
        .section.success { border-left: 4px solid #28a745; background: #d4edda; }
        .section.warning { border-left: 4px solid #ffc107; background: #fff3cd; }
        .section.info { border-left: 4px solid #007bff; }
        
        .token-file { 
            background: #f8f9fa; 
            padding: 15px; 
            margin: 10px 0; 
            border-radius: 8px; 
            border: 1px solid #e9ecef;
            position: relative;
        }
        .token-file.expired { border-left: 4px solid #dc3545; }
        .token-file.valid { border-left: 4px solid #28a745; }
        .token-file.expiring { border-left: 4px solid #ffc107; }
        
        .button { 
            background: #007bff; 
            color: white; 
            padding: 8px 16px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 5px; 
            display: inline-block; 
            font-size: 14px;
            border: none;
            cursor: pointer;
        }
        .button.danger { background: #dc3545; }
        .button.success { background: #28a745; }
        .button.warning { background: #ffc107; color: #212529; }
        .button.small { padding: 4px 8px; font-size: 12px; }
        
        pre { 
            background: #e9ecef; 
            padding: 10px; 
            overflow-x: auto; 
            font-size: 12px; 
            border-radius: 4px;
            margin: 10px 0;
        }
        
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; }
        .stat-card { background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e9ecef; }
        .stat-number { font-size: 24px; font-weight: bold; color: #007bff; }
        .stat-label { color: #6c757d; font-size: 14px; }
        
        .file-actions { position: absolute; top: 15px; right: 15px; }
        
        h1 { color: #2c3e50; text-align: center; margin-bottom: 30px; }
        h2 { color: #343a40; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; }
        h3 { color: #495057; margin-bottom: 15px; }
        
        .timestamp { font-size: 12px; color: #6c757d; }
        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            margin-left: 10px;
        }
        .status-valid { background: #d4edda; color: #155724; }
        .status-expired { background: #f8d7da; color: #721c24; }
        .status-expiring { background: #fff3cd; color: #856404; }
        
        .alert { padding: 15px; border-radius: 5px; margin: 10px 0; }
        .alert.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        
        details { margin: 10px 0; }
        summary { cursor: pointer; font-weight: bold; padding: 5px; background: #f8f9fa; border-radius: 4px; }
        details[open] summary { margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Enhanced Token Diagnostic Tool</h1>
        <p class="timestamp">Generated: <?php echo date('Y-m-d H:i:s T'); ?></p>
        
        <?php if (isset($deletion_message)): ?>
            <div class="alert <?php echo strpos($deletion_message, '✅') !== false ? 'success' : 'error'; ?>">
                <?php echo $deletion_message; ?>
            </div>
        <?php endif; ?>
        
        <?php
        try {
            $storage = new MultiTokenStorage();
            
            // Overview Statistics
            $tokens_dir = 'tokens/';
            $files = glob($tokens_dir . '*.json');
            $valid_accounts = 0;
            $expired_accounts = 0;
            $expiring_accounts = 0;
            $total_size = 0;
            
            foreach ($files as $file) {
                if (strpos($file, '.tmp') !== false) continue;
                
                $total_size += filesize($file);
                $content = file_get_contents($file);
                if ($content) {
                    $tokens = json_decode($content, true);
                    if ($tokens && isset($tokens['expires_at'])) {
                        $time_until_expiry = $tokens['expires_at'] - time();
                        if ($time_until_expiry <= 0) {
                            $expired_accounts++;
                        } elseif ($time_until_expiry < 300) {
                            $expiring_accounts++;
                        } else {
                            $valid_accounts++;
                        }
                    }
                }
            }
            
            function formatBytes($size, $precision = 2) {
                if ($size <= 0) return '0 B';
                $units = array('B', 'KB', 'MB', 'GB');
                $base = log($size, 1024);
                return round(pow(1024, $base - floor($base)), $precision) . ' ' . $units[floor($base)];
            }
            ?>
            
            <!-- Statistics Overview -->
            <div class="section">
                <h2>📊 Overview Statistics</h2>
                <div class="grid">
                    <div class="stat-card">
                        <div class="stat-number"><?php echo count($files); ?></div>
                        <div class="stat-label">Total Token Files</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" style="color: #28a745;"><?php echo $valid_accounts; ?></div>
                        <div class="stat-label">Valid Accounts</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" style="color: #ffc107;"><?php echo $expiring_accounts; ?></div>
                        <div class="stat-label">Expiring Soon</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" style="color: #dc3545;"><?php echo $expired_accounts; ?></div>
                        <div class="stat-label">Expired</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number"><?php echo formatBytes($total_size); ?></div>
                        <div class="stat-label">Total Storage</div>
                    </div>
                </div>
            </div>
            
            <!-- System Status -->
            <div class="section success">
                <h2>✅ System Status</h2>
                <div class="grid">
                    <div>
                        <strong>MultiTokenStorage:</strong> Loaded successfully<br>
                        <strong>Tokens Directory:</strong> <?php echo is_dir($tokens_dir) ? '✅ Exists' : '❌ Missing'; ?><br>
                        <strong>Directory Path:</strong> <?php echo realpath($tokens_dir) ?: 'Not found'; ?>
                    </div>
                    <div>
                        <strong>PHP Version:</strong> <?php echo PHP_VERSION; ?><br>
                        <strong>Server Time:</strong> <?php echo date('Y-m-d H:i:s T'); ?><br>
                        <strong>Web Server User:</strong> <?php echo get_current_user(); ?>
                    </div>
                </div>
                
                <?php if (is_dir($tokens_dir)): ?>
                    <p><strong>Directory Permissions:</strong> <?php echo substr(sprintf('%o', fileperms($tokens_dir)), -4); ?></p>
                <?php endif; ?>
            </div>
            
            <!-- Token Files Analysis -->
            <div class="section">
                <h2>🔑 Token Files Analysis</h2>
                
                <?php if (empty($files)): ?>
                    <p><em>No token files found. This is normal if no accounts are connected.</em></p>
                <?php else: ?>
                    
                    <?php foreach ($files as $file): ?>
                        <?php
                        if (strpos($file, '.tmp') !== false) continue;
                        
                        $filename = basename($file);
                        $content = file_get_contents($file);
                        $file_size = filesize($file);
                        $last_modified = filemtime($file);
                        
                        $status_class = 'token-file';
                        $status_badge = '';
                        $issues = [];
                        
                        if ($content === false) {
                            $issues[] = 'Cannot read file';
                            $status_class .= ' expired';
                            $status_badge = '<span class="status-badge status-expired">READ ERROR</span>';
                        } elseif (empty(trim($content))) {
                            $issues[] = 'File is empty';
                            $status_class .= ' expired';
                            $status_badge = '<span class="status-badge status-expired">EMPTY</span>';
                        } else {
                            $tokens = json_decode($content, true);
                            
                            if (!$tokens) {
                                $issues[] = 'Invalid JSON: ' . json_last_error_msg();
                                $status_class .= ' expired';
                                $status_badge = '<span class="status-badge status-expired">INVALID JSON</span>';
                            } else {
                                // Validate structure
                                $required_fields = ['access_token', 'expires_at', 'user_info'];
                                $missing_fields = [];
                                
                                foreach ($required_fields as $field) {
                                    if (!isset($tokens[$field])) {
                                        $missing_fields[] = $field;
                                    }
                                }
                                
                                if (!empty($missing_fields)) {
                                    $issues[] = 'Missing fields: ' . implode(', ', $missing_fields);
                                    $status_class .= ' expired';
                                    $status_badge = '<span class="status-badge status-expired">INCOMPLETE</span>';
                                } else {
                                    // Check expiration
                                    $expires_at = $tokens['expires_at'];
                                    $time_until_expiry = $expires_at - time();
                                    
                                    if ($time_until_expiry <= 0) {
                                        $minutes_ago = round(-$time_until_expiry / 60);
                                        $issues[] = "Expired {$minutes_ago} minutes ago";
                                        $status_class .= ' expired';
                                        $status_badge = '<span class="status-badge status-expired">EXPIRED</span>';
                                    } elseif ($time_until_expiry < 300) {
                                        $minutes_left = round($time_until_expiry / 60);
                                        $status_class .= ' expiring';
                                        $status_badge = '<span class="status-badge status-expiring">EXPIRING</span>';
                                    } else {
                                        $status_class .= ' valid';
                                        $status_badge = '<span class="status-badge status-valid">VALID</span>';
                                    }
                                }
                            }
                        }
                        ?>
                        
                        <div class="<?php echo $status_class; ?>">
                            <div class="file-actions">
                                <?php if (!empty($issues)): ?>
                                    <a href="?delete=<?php echo urlencode($filename); ?>" 
                                       class="button danger small" 
                                       onclick="return confirm('Are you sure you want to delete <?php echo htmlspecialchars($filename); ?>?')">
                                        🗑️ Delete
                                    </a>
                                <?php endif; ?>
                            </div>
                            
                            <h3>📄 <?php echo htmlspecialchars($filename); ?> <?php echo $status_badge; ?></h3>
                            
                            <div class="grid">
                                <div>
                                    <strong>File Size:</strong> <?php echo formatBytes($file_size); ?><br>
                                    <strong>Last Modified:</strong> <?php echo date('Y-m-d H:i:s', $last_modified); ?><br>
                                    <strong>Permissions:</strong> <?php echo substr(sprintf('%o', fileperms($file)), -4); ?>
                                </div>
                                
                                <?php if ($tokens && isset($tokens['user_info'])): ?>
                                <div>
                                    <strong>User:</strong> <?php echo htmlspecialchars($tokens['user_info']['name'] ?? 'Unknown'); ?><br>
                                    <strong>Email:</strong> <?php echo htmlspecialchars($tokens['user_info']['email'] ?? 'Unknown'); ?><br>
                                    <?php if (isset($tokens['expires_at'])): ?>
                                        <strong>Expires:</strong> <?php echo date('Y-m-d H:i:s', $tokens['expires_at']); ?>
                                    <?php endif; ?>
                                </div>
                                <?php endif; ?>
                            </div>
                            
                            <?php if (!empty($issues)): ?>
                                <div style="color: #dc3545; margin: 10px 0;">
                                    <strong>Issues:</strong>
                                    <ul style="margin: 5px 0; padding-left: 20px;">
                                        <?php foreach ($issues as $issue): ?>
                                            <li><?php echo htmlspecialchars($issue); ?></li>
                                        <?php endforeach; ?>
                                    </ul>
                                </div>
                            <?php endif; ?>
                            
                            <?php if ($tokens): ?>
                                <div>
                                    <?php if (isset($tokens['refresh_token']) && !empty($tokens['refresh_token'])): ?>
                                        <span style="color: #28a745;">✅ Refresh token available</span>
                                    <?php else: ?>
                                        <span style="color: #dc3545;">❌ No refresh token</span>
                                    <?php endif; ?>
                                    
                                    <?php if (isset($tokens['access_token'])): ?>
                                        <br><strong>Access Token:</strong> <?php echo substr($tokens['access_token'], 0, 20); ?>...
                                    <?php endif; ?>
                                </div>
                                
                                <details style="margin-top: 15px;">
                                    <summary>Show Complete Token Data (Sanitized)</summary>
                                    <?php
                                    $safe_tokens = $tokens;
                                    if (isset($safe_tokens['access_token'])) {
                                        $safe_tokens['access_token'] = substr($safe_tokens['access_token'], 0, 20) . '...';
                                    }
                                    if (isset($safe_tokens['refresh_token'])) {
                                        $safe_tokens['refresh_token'] = substr($safe_tokens['refresh_token'], 0, 20) . '...';
                                    }
                                    if (isset($safe_tokens['id_token'])) {
                                        $safe_tokens['id_token'] = substr($safe_tokens['id_token'], 0, 20) . '...';
                                    }
                                    ?>
                                    <pre><?php echo htmlspecialchars(json_encode($safe_tokens, JSON_PRETTY_PRINT)); ?></pre>
                                </details>
                            <?php else: ?>
                                <details style="margin-top: 15px;">
                                    <summary>Show Raw File Content</summary>
                                    <pre><?php echo htmlspecialchars(substr($content, 0, 1000)); ?><?php echo strlen($content) > 1000 ? "\n... (truncated)" : ""; ?></pre>
                                </details>
                            <?php endif; ?>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
            
            <!-- Connected Accounts Test -->
            <div class="section">
                <h2>👥 Connected Accounts Test</h2>
                
                <?php
                try {
                    $accounts = $storage->getAllConnectedAccounts();
                    echo "<p><strong>Found accounts:</strong> " . count($accounts) . "</p>";
                    
                    if (!empty($accounts)) {
                        foreach ($accounts as $account) {
                            $status_class = $account['is_valid'] ? 'success' : 'warning';
                            echo "<div class='token-file {$status_class}'>";
                            echo "<h4>" . htmlspecialchars($account['name']) . "</h4>";
                            echo "<strong>Email:</strong> " . htmlspecialchars($account['email']) . "<br>";
                            echo "<strong>Status:</strong> " . ($account['is_valid'] ? 'Valid' : 'Invalid/Expired') . "<br>";
                            echo "<strong>Connected:</strong> " . date('Y-m-d H:i:s', $account['connected_at']) . "<br>";
                            echo "<strong>Expires:</strong> " . date('Y-m-d H:i:s', $account['expires_at']) . "<br>";
                            echo "</div>";
                        }
                    }
                } catch (Exception $e) {
                    echo "<p style='color: red;'>❌ Error: " . htmlspecialchars($e->getMessage()) . "</p>";
                }
                ?>
            </div>
            
            <!-- Token Refresh Test -->
            <?php if (!empty($files)): ?>
            <div class="section">
                <h2>🔄 Token Refresh Test</h2>
                
                <?php foreach ($files as $file): ?>
                    <?php
                    if (strpos($file, '.tmp') !== false) continue;
                    
                    $user_id = basename($file, '.json');
                    echo "<div style='margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;'>";
                    echo "<strong>Testing user:</strong> " . htmlspecialchars($user_id) . "<br>";
                    
                    try {
                        $access_token = $storage->getValidAccessToken($user_id);
                        if ($access_token) {
                            echo "<span style='color: #28a745;'>✅ Got valid access token: " . substr($access_token, 0, 20) . "...</span>";
                        } else {
                            echo "<span style='color: #dc3545;'>❌ Could not get valid access token</span>";
                        }
                    } catch (Exception $e) {
                        echo "<span style='color: #dc3545;'>❌ Error: " . htmlspecialchars($e->getMessage()) . "</span>";
                    }
                    
                    echo "</div>";
                    ?>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
            
            <!-- API Endpoint Test -->
            <div class="section">
                <h2>📅 API Endpoint Test</h2>
                
                <?php
                $api_url = 'http' . (isset($_SERVER['HTTPS']) ? 's' : '') . '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . '/api.php?endpoint=calendar';
                
                echo "<p><strong>Testing URL:</strong> <a href='{$api_url}' target='_blank'>{$api_url}</a></p>";
                
                try {
                    $context = stream_context_create(['http' => ['timeout' => 30, 'ignore_errors' => true]]);
                    $api_response = file_get_contents($api_url, false, $context);
                    
                    if ($api_response) {
                        $data = json_decode($api_response, true);
                        if ($data) {
                            echo "<p style='color: #28a745;'>✅ API endpoint responded with valid JSON</p>";
                            
                            if (isset($data['error'])) {
                                echo "<p style='color: #ffc107;'>⚠️ API Error: " . htmlspecialchars($data['message']) . "</p>";
                            } else {
                                echo "<div class='grid'>";
                                echo "<div>📊 <strong>Calendars found:</strong> " . count($data['calendars'] ?? []) . "</div>";
                                echo "<div>📅 <strong>Total events:</strong> " . ($data['total_events'] ?? 0) . "</div>";
                                echo "<div>👥 <strong>Connected users:</strong> " . count($data['connected_users'] ?? []) . "</div>";
                                echo "<div>🔗 <strong>Total accounts:</strong> " . ($data['total_accounts'] ?? 0) . "</div>";
                                echo "</div>";
                            }
                            
                            echo "<details>";
                            echo "<summary>Show Full API Response</summary>";
                            echo "<pre>" . htmlspecialchars(json_encode($data, JSON_PRETTY_PRINT)) . "</pre>";
                            echo "</details>";
                        } else {
                            echo "<p style='color: #dc3545;'>❌ API returned invalid JSON</p>";
                            echo "<pre>" . htmlspecialchars(substr($api_response, 0, 500)) . "...</pre>";
                        }
                    } else {
                        echo "<p style='color: #dc3545;'>❌ API endpoint not accessible</p>";
                    }
                } catch (Exception $e) {
                    echo "<p style='color: #dc3545;'>❌ API Test Error: " . htmlspecialchars($e->getMessage()) . "</p>";
                }
                ?>
            </div>
            
        <?php
        } catch (Exception $e) {
            echo "<div class='section error'>";
            echo "<h2>❌ Critical Error</h2>";
            echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
            echo "</div>";
        }
        ?>
        
        <!-- Quick Actions -->
        <div class="section">
            <h2>🛠️ Quick Actions</h2>
            <div style="text-align: center;">
                <a href="auth.php?action=login" class="button success">➕ Add New Account</a>
                <a href="api.php?endpoint=calendar" class="button" target="_blank">🔗 Test Calendar API</a>
                <a href="index.php" class="button">🏠 Dashboard</a>
                <a href="clear-sessions.php" class="button danger">🗑️ Clear All Data</a>
                <a href="admin-control-panel.php" class="button warning" target="_blank">⚙️ Admin Panel</a>
            </div>
        </div>
        
        <!-- Troubleshooting Guide -->
        <div class="section warning">
            <h2>💡 Troubleshooting Guide</h2>
            <div class="grid">
                <div>
                    <h4>Common Issues:</h4>
                    <ul>
                        <li><strong>Missing user_info:</strong> Tokens saved incorrectly - reconnect account</li>
                        <li><strong>Invalid JSON:</strong> Corrupted files - delete and reconnect</li>
                        <li><strong>Expired tokens:</strong> Should auto-refresh if refresh_token exists</li>
                        <li><strong>No refresh token:</strong> Add '&prompt=consent' to force re-consent</li>
                    </ul>
                </div>
                <div>
                    <h4>File System Issues:</h4>
                    <ul>
                        <li><strong>Permission errors:</strong> Check web server write access to tokens/</li>
                        <li><strong>Empty files:</strong> Incomplete writes - check disk space</li>
                        <li><strong>Read errors:</strong> File corruption or permission issues</li>
                        <li><strong>Missing directory:</strong> Create tokens/ with proper permissions</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</body>
</html>