<?php
// Enhanced Admin Control Panel for Daily Dashboard
require_once 'oauth-multi-config.php';

header('Content-Type: text/html; charset=utf-8');

// Handle AJAX requests
if (isset($_GET['action'])) {
    header('Content-Type: application/json');
    
    switch ($_GET['action']) {
        case 'status':
            echo json_encode(getSystemStatus());
            exit;
            
        case 'clear_tokens':
            echo json_encode(clearAllTokens());
            exit;
            
        case 'test_api':
            $endpoint = $_GET['endpoint'] ?? 'calendar';
            echo json_encode(testApiEndpoint($endpoint));
            exit;
            
        case 'get_logs':
            echo json_encode(getSystemLogs());
            exit;
            
        default:
            echo json_encode(['error' => 'Invalid action']);
            exit;
    }
}

function getSystemStatus() {
    $status = [
        'timestamp' => date('Y-m-d H:i:s'),
        'server_time' => date('c'),
        'accounts' => [],
        'apis' => [],
        'files' => [],
        'system' => []
    ];
    
    // Check connected accounts
    try {
        $storage = new MultiTokenStorage();
        $all_accounts = $storage->getAllConnectedAccounts();
        
        $status['accounts'] = [
            'total' => count($all_accounts),
            'valid' => 0,
            'expired' => 0,
            'expiring_soon' => 0,
            'list' => []
        ];
        
        foreach ($all_accounts as $account) {
            $time_left = $account['expires_at'] - time();
            $is_valid = $time_left > 0;
            $is_expiring = $time_left < 300 && $time_left > 0; // 5 minutes
            
            if ($is_valid && !$is_expiring) {
                $status['accounts']['valid']++;
            } elseif ($is_expiring) {
                $status['accounts']['expiring_soon']++;
            } else {
                $status['accounts']['expired']++;
            }
            
            $status['accounts']['list'][] = [
                'name' => $account['name'],
                'email' => $account['email'],
                'status' => $is_valid ? ($is_expiring ? 'expiring' : 'valid') : 'expired',
                'expires' => date('M d, H:i', $account['expires_at']),
                'time_left' => $is_valid ? round($time_left / 60) . 'm' : 'expired'
            ];
        }
    } catch (Exception $e) {
        $status['accounts']['error'] = $e->getMessage();
    }
    
    // Test API endpoints
    $base_url = 'http' . (isset($_SERVER['HTTPS']) ? 's' : '') . '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']);
    
    $apis = [
        'Calendar' => '/api.php?endpoint=calendar',
        'Weather' => '/api.php?endpoint=weather',
        'Tides' => '/api.php?endpoint=tides',
        'Sunrise' => '/api.php?endpoint=sunrise-sunset',
        'Auth' => '/auth.php?action=status'
    ];
    
    foreach ($apis as $name => $endpoint) {
        $url = $base_url . $endpoint;
        $start_time = microtime(true);
        
        $context = stream_context_create([
            'http' => [
                'timeout' => 10,
                'ignore_errors' => true,
                'header' => 'User-Agent: AdminPanel/1.0'
            ]
        ]);
        
        $response = @file_get_contents($url, false, $context);
        $duration = round((microtime(true) - $start_time) * 1000);
        
        if ($response) {
            $data = json_decode($response, true);
            $has_error = isset($data['error']);
            
            $status['apis'][$name] = [
                'status' => 'online',
                'response_time' => $duration . 'ms',
                'has_data' => !$has_error,
                'error' => $has_error ? $data['error'] : null,
                'data_size' => strlen($response)
            ];
        } else {
            $status['apis'][$name] = [
                'status' => 'offline',
                'response_time' => $duration . 'ms',
                'has_data' => false,
                'error' => 'No response'
            ];
        }
    }
    
    // Check file system
    $files = [
        'tokens/' => is_dir('tokens/') && is_writable('tokens/'),
        'oauth-multi-config.php' => file_exists('oauth-multi-config.php'),
        'api.php' => file_exists('api.php'),
        'app.js' => file_exists('app.js'),
        'index.php' => file_exists('index.php')
    ];
    
    foreach ($files as $file => $exists) {
        $status['files'][$file] = $exists ? 'ok' : 'missing';
    }
    
    // System information
    $status['system'] = [
        'php_version' => PHP_VERSION,
        'memory_usage' => round(memory_get_usage() / 1024 / 1024, 2) . ' MB',
        'memory_peak' => round(memory_get_peak_usage() / 1024 / 1024, 2) . ' MB',
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
        'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'Unknown'
    ];
    
    // Token file analysis
    if (is_dir('tokens/')) {
        $token_files = glob('tokens/*.json');
        $total_size = 0;
        foreach ($token_files as $file) {
            if (strpos($file, '.tmp') === false) {
                $total_size += filesize($file);
            }
        }
        
        $status['system']['token_files'] = count($token_files);
        $status['system']['token_storage'] = round($total_size / 1024, 2) . ' KB';
    }
    
    return $status;
}

function clearAllTokens() {
    try {
        $storage = new MultiTokenStorage();
        $storage->clearTokens('all');
        
        // Clear PHP sessions
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        session_unset();
        session_destroy();
        
        return [
            'success' => true,
            'message' => 'All tokens and sessions cleared successfully',
            'timestamp' => date('Y-m-d H:i:s')
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage(),
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
}

function testApiEndpoint($endpoint) {
    $base_url = 'http' . (isset($_SERVER['HTTPS']) ? 's' : '') . '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']);
    $url = $base_url . '/api.php?endpoint=' . urlencode($endpoint) . '&v=' . time();
    
    $start_time = microtime(true);
    
    $context = stream_context_create([
        'http' => [
            'timeout' => 30,
            'ignore_errors' => true,
            'header' => 'User-Agent: AdminPanel/1.0'
        ]
    ]);
    
    $response = @file_get_contents($url, false, $context);
    $duration = round((microtime(true) - $start_time) * 1000);
    
    if ($response === false) {
        return [
            'success' => false,
            'error' => 'Network error',
            'response_time' => $duration . 'ms',
            'url' => $url
        ];
    }
    
    $data = json_decode($response, true);
    
    return [
        'success' => $data !== null,
        'data' => $data,
        'response_time' => $duration . 'ms',
        'response_size' => strlen($response) . ' bytes',
        'url' => $url,
        'has_error' => isset($data['error'])
    ];
}

function getSystemLogs() {
    $logs = [];
    
    // PHP error log
    $error_log = ini_get('error_log');
    if ($error_log && file_exists($error_log) && is_readable($error_log)) {
        $lines = file($error_log);
        if ($lines) {
            $recent_lines = array_slice($lines, -50); // Last 50 lines
            $logs['php_errors'] = [
                'name' => 'PHP Error Log',
                'path' => $error_log,
                'lines' => count($lines),
                'content' => implode('', $recent_lines)
            ];
        }
    }
    
    // Check for local debug files
    $debug_files = ['debug.log', 'error.log', 'access.log'];
    foreach ($debug_files as $file) {
        if (file_exists($file) && is_readable($file)) {
            $content = file_get_contents($file);
            $logs[str_replace('.', '_', $file)] = [
                'name' => ucfirst(str_replace(['.log', '_'], [' Log', ' '], $file)),
                'path' => $file,
                'size' => filesize($file),
                'content' => substr($content, -2000) // Last 2KB
            ];
        }
    }
    
    return [
        'logs' => $logs,
        'timestamp' => date('Y-m-d H:i:s')
    ];
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>🔧 Dashboard Admin Panel</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            text-align: center;
        }

        .header h1 {
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 2.5em;
            font-weight: 700;
        }

        .header p {
            color: #7f8c8d;
            font-size: 1.1em;
        }

        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }

        .panel {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 25px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .panel-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
        }

        .panel-icon {
            font-size: 24px;
            margin-right: 10px;
        }

        .panel-title {
            font-size: 20px;
            font-weight: 600;
            color: #2c3e50;
            flex: 1;
        }

        .actions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }

        .btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s ease;
            text-decoration: none;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            min-height: 50px;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }

        .btn.success { background: #27ae60; }
        .btn.success:hover { background: #229954; }
        .btn.warning { background: #f39c12; color: #fff; }
        .btn.warning:hover { background: #e67e22; }
        .btn.danger { background: #e74c3c; }
        .btn.danger:hover { background: #c0392b; }
        .btn.info { background: #17a2b8; }
        .btn.info:hover { background: #138496; }

        .status-window {
            background: #2c3e50;
            color: #ecf0f1;
            border-radius: 10px;
            padding: 20px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 13px;
            line-height: 1.6;
            max-height: 400px;
            overflow-y: auto;
            margin-top: 15px;
        }

        .status-header {
            background: #34495e;
            margin: -20px -20px 20px -20px;
            padding: 15px 20px;
            border-radius: 10px 10px 0 0;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .status-section {
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 1px solid #34495e;
        }

        .status-section:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }

        .status-title {
            color: #3498db;
            font-weight: bold;
            margin-bottom: 10px;
            font-size: 15px;
        }

        .status-item {
            margin: 8px 0;
            padding: 5px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .status-good { color: #2ecc71; }
        .status-warning { color: #f39c12; }
        .status-error { color: #e74c3c; }
        .status-info { color: #95a5a6; }

        .status-badge {
            background: #34495e;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
        }

        .status-badge.online { background: #27ae60; color: white; }
        .status-badge.offline { background: #e74c3c; color: white; }
        .status-badge.warning { background: #f39c12; color: white; }

        .auto-refresh {
            margin: 15px 0;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .auto-refresh input {
            transform: scale(1.2);
        }

        .loading {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 8px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .message {
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            font-weight: 600;
            text-align: center;
        }

        .message.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .message.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }

        .stat-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            border-left: 4px solid #3498db;
        }

        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }

        .stat-label {
            font-size: 12px;
            color: #7f8c8d;
            text-transform: uppercase;
            font-weight: 600;
        }

        .api-test-results {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            font-family: monospace;
            font-size: 12px;
            max-height: 300px;
            overflow-y: auto;
            display: none;
        }

        .full-width {
            grid-column: 1 / -1;
        }

        @media (max-width: 768px) {
            .dashboard-grid {
                grid-template-columns: 1fr;
            }
            
            .actions-grid {
                grid-template-columns: 1fr;
            }
            
            .container {
                padding: 10px;
            }
            
            .header {
                padding: 20px;
            }
            
            .header h1 {
                font-size: 2em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 Dashboard Admin Panel</h1>
            <p>Comprehensive system monitoring and management</p>
        </div>

        <!-- Quick Actions -->
        <div class="panel full-width">
            <div class="panel-header">
                <span class="panel-icon">⚡</span>
                <h2 class="panel-title">Quick Actions</h2>
            </div>
            
            <div class="actions-grid">
                <button class="btn success" onclick="refreshStatus()">
                    <span id="refresh-loading" class="loading" style="display: none;"></span>
                    🔄 Refresh Status
                </button>
                
                <a href="add-account.html" class="btn" target="_blank">
                    ➕ Add Google Account
                </a>
                
                <button class="btn warning" onclick="clearTokens()">
                    <span id="clear-loading" class="loading" style="display: none;"></span>
                    🗑️ Clear All Tokens
                </button>            
                
                <a href="cache-buster.html" class="btn" target="_blank">
                    🧹 Cache Buster
                </a>
                
                <a href="clear-sessions.php" class="btn danger" target="_blank">
                    🔥 Clear Sessions
                </a>
                
                <a href="tide-test.html" class="btn info" target="_blank">
                    🌊 Test Tides
                </a>
                
                <a href="token-diagnostic.php" class="btn" target="_blank">
                    🔍 Token Diagnostic
                </a>
				
				<a href="calendar-debug-detailed.php" class="btn" target="_blank">
                    📅 Calendar Debug
                </a>
				
				<a href="api-test.html" class="btn" target="_blank">
                    🌊 API Test
                </a>
            </div>
        </div>

        <div class="dashboard-grid">
            <!-- System Overview -->
            <div class="panel">
                <div class="panel-header">
                    <span class="panel-icon">📊</span>
                    <h2 class="panel-title">System Overview</h2>
                </div>
                
                <div id="system-stats" class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number" id="total-accounts">-</div>
                        <div class="stat-label">Total Accounts</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="valid-accounts">-</div>
                        <div class="stat-label">Valid Accounts</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="online-apis">-</div>
                        <div class="stat-label">Online APIs</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="system-health">-</div>
                        <div class="stat-label">System Health</div>
                    </div>
                </div>
            </div>

            <!-- API Testing -->
            <div class="panel">
                <div class="panel-header">
                    <span class="panel-icon">🔌</span>
                    <h2 class="panel-title">API Testing</h2>
                </div>
                
                <div class="actions-grid">
                    <button class="btn" onclick="testAPI('calendar')">📅 Test Calendar</button>
                    <button class="btn" onclick="testAPI('weather')">🌤️ Test Weather</button>
                    <button class="btn" onclick="testAPI('tides')">🌊 Test Tides</button>
                    <button class="btn" onclick="testAPI('sunrise-sunset')">🌅 Test Sunrise</button>
                </div>
                
                <div id="api-test-results" class="api-test-results"></div>
            </div>
        </div>

        <!-- Auto Refresh Control -->
        <div class="panel full-width">
            <div class="auto-refresh">
                <input type="checkbox" id="auto-refresh" onchange="toggleAutoRefresh()">
                <label for="auto-refresh">Auto-refresh every 30 seconds</label>
                <button class="btn" onclick="refreshLogs()" style="margin-left: auto;">
                    📋 Refresh Logs
                </button>
            </div>

            <div id="message-container"></div>

            <!-- System Status Display -->
            <div class="status-window">
                <div class="status-header">
                    <span>📊 Live System Status</span>
                    <span id="last-update">Loading...</span>
                </div>
                
                <div id="status-content">
                    <div class="status-item status-info">Loading system status...</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let autoRefreshInterval = null;
        let lastStatusData = null;

        // Initialize on page load
        window.addEventListener('DOMContentLoaded', function() {
            refreshStatus();
        });

        function showLoading(buttonId, show) {
            const loading = document.getElementById(buttonId + '-loading');
            if (loading) {
                loading.style.display = show ? 'inline-block' : 'none';
            }
        }

        function showMessage(message, type = 'success') {
            const container = document.getElementById('message-container');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${type}`;
            messageDiv.textContent = message;
            
            container.appendChild(messageDiv);
            
            setTimeout(() => {
                if (container.contains(messageDiv)) {
                    container.removeChild(messageDiv);
                }
            }, 5000);
        }

        function refreshStatus() {
            showLoading('refresh', true);
            
            fetch('?action=status&v=' + Date.now())
                .then(response => response.json())
                .then(data => {
                    lastStatusData = data;
                    displayStatus(data);
                    updateStats(data);
                    document.getElementById('last-update').textContent = 'Updated: ' + new Date().toLocaleTimeString();
                })
                .catch(error => {
                    console.error('Status refresh failed:', error);
                    document.getElementById('status-content').innerHTML = 
                        '<div class="status-item status-error">❌ Failed to load status: ' + error.message + '</div>';
                })
                .finally(() => {
                    showLoading('refresh', false);
                });
        }

        function updateStats(data) {
            document.getElementById('total-accounts').textContent = data.accounts.total || 0;
            document.getElementById('valid-accounts').textContent = data.accounts.valid || 0;
            
            const onlineApis = Object.values(data.apis).filter(api => api.status === 'online').length;
            document.getElementById('online-apis').textContent = onlineApis + '/' + Object.keys(data.apis).length;
            
            const healthScore = Math.round(((data.accounts.valid || 0) + onlineApis) / (Math.max(data.accounts.total, 1) + Object.keys(data.apis).length) * 100);
            document.getElementById('system-health').textContent = healthScore + '%';
        }

        function displayStatus(data) {
            let html = '';

            // Accounts Section
            html += '<div class="status-section">';
            html += '<div class="status-title">👥 Connected Accounts</div>';
            
            if (data.accounts.error) {
                html += '<div class="status-item status-error">❌ Error: ' + data.accounts.error + '</div>';
            } else {
                html += '<div class="status-item status-info">';
                html += '<span>Total: ' + data.accounts.total + '</span>';
                html += '<span class="status-badge online">V:' + data.accounts.valid + '</span>';
                if (data.accounts.expiring_soon > 0) {
                    html += '<span class="status-badge warning">E:' + data.accounts.expiring_soon + '</span>';
                }
                if (data.accounts.expired > 0) {
                    html += '<span class="status-badge offline">X:' + data.accounts.expired + '</span>';
                }
                html += '</div>';
                
                if (data.accounts.list && data.accounts.list.length > 0) {
                    data.accounts.list.forEach(account => {
                        const statusClass = account.status === 'valid' ? 'status-good' : 
                                          account.status === 'expiring' ? 'status-warning' : 'status-error';
                        const statusIcon = account.status === 'valid' ? '✅' : 
                                         account.status === 'expiring' ? '⚠️' : '❌';
                        
                        html += `<div class="status-item ${statusClass}">`;
                        html += `<span>${statusIcon} ${account.name}</span>`;
                        html += `<span>${account.time_left}</span>`;
                        html += '</div>';
                    });
                } else {
                    html += '<div class="status-item status-warning">⚠️ No accounts connected</div>';
                }
            }
            html += '</div>';

            // APIs Section
            html += '<div class="status-section">';
            html += '<div class="status-title">🌐 API Status</div>';
            
            for (const [name, api] of Object.entries(data.apis)) {
                const statusClass = api.status === 'online' ? 'status-good' : 'status-error';
                const statusIcon = api.status === 'online' ? '✅' : '❌';
                const dataIcon = api.has_data ? '📊' : '📭';
                
                html += `<div class="status-item ${statusClass}">`;
                html += `<span>${statusIcon} ${name} ${dataIcon}</span>`;
                html += `<span>${api.response_time}</span>`;
                html += '</div>';
                
                if (api.error) {
                    html += `<div class="status-item status-error" style="font-size: 11px; margin-left: 20px;">`;
                    html += `Error: ${api.error}`;
                    html += '</div>';
                }
            }
            html += '</div>';

            // System Section
            html += '<div class="status-section">';
            html += '<div class="status-title">💻 System Information</div>';
            
            if (data.system) {
                html += `<div class="status-item status-info"><span>PHP Version</span><span>${data.system.php_version}</span></div>`;
                html += `<div class="status-item status-info"><span>Memory Usage</span><span>${data.system.memory_usage}</span></div>`;
                if (data.system.token_files !== undefined) {
                    html += `<div class="status-item status-info"><span>Token Files</span><span>${data.system.token_files}</span></div>`;
                }
                if (data.system.token_storage) {
                    html += `<div class="status-item status-info"><span>Token Storage</span><span>${data.system.token_storage}</span></div>`;
                }
            }
            
            html += `<div class="status-item status-info"><span>Server Time</span><span>${data.timestamp}</span></div>`;
            html += '</div>';

            // Files Section
            html += '<div class="status-section">';
            html += '<div class="status-title">📁 File System</div>';
            
            for (const [file, status] of Object.entries(data.files)) {
                const statusClass = status === 'ok' ? 'status-good' : 'status-error';
                const statusIcon = status === 'ok' ? '✅' : '❌';
                html += `<div class="status-item ${statusClass}"><span>${statusIcon} ${file}</span></div>`;
            }
            html += '</div>';

            document.getElementById('status-content').innerHTML = html;
        }

        function clearTokens() {
            if (!confirm('Are you sure you want to clear all tokens? This will disconnect all Google accounts.')) {
                return;
            }
            
            showLoading('clear', true);
            
            fetch('?action=clear_tokens&v=' + Date.now())
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showMessage('✅ All tokens cleared successfully');
                        setTimeout(refreshStatus, 1000);
                    } else {
                        showMessage('❌ Failed to clear tokens: ' + data.error, 'error');
                    }
                })
                .catch(error => {
                    showMessage('❌ Clear tokens error: ' + error.message, 'error');
                })
                .finally(() => {
                    showLoading('clear', false);
                });
        }

        function testAPI(endpoint) {
            const resultsDiv = document.getElementById('api-test-results');
            resultsDiv.style.display = 'block';
            resultsDiv.innerHTML = '<div class="loading"></div>Testing ' + endpoint + ' API...';
            
            fetch('?action=test_api&endpoint=' + endpoint + '&v=' + Date.now())
                .then(response => response.json())
                .then(data => {
                    let html = '<h4>🔍 ' + endpoint.charAt(0).toUpperCase() + endpoint.slice(1) + ' API Test Results</h4>';
                    html += '<p><strong>Response Time:</strong> ' + data.response_time + '</p>';
                    html += '<p><strong>Response Size:</strong> ' + data.response_size + '</p>';
                    
                    if (data.success) {
                        html += '<p style="color: #27ae60;"><strong>Status:</strong> ✅ Success</p>';
                        
                        if (data.has_error) {
                            html += '<p style="color: #f39c12;"><strong>API Error:</strong> ' + JSON.stringify(data.data.error) + '</p>';
                        }
                        
                        if (data.data) {
                            // Show specific data for each endpoint
                            if (endpoint === 'calendar' && data.data.calendars) {
                                html += '<p><strong>Calendars Found:</strong> ' + data.data.calendars.length + '</p>';
                                html += '<p><strong>Total Events:</strong> ' + (data.data.total_events || 0) + '</p>';
                            } else if (endpoint === 'weather' && data.data.temperature) {
                                html += '<p><strong>Temperature:</strong> ' + data.data.temperature + '°F</p>';
                                html += '<p><strong>Condition:</strong> ' + (data.data.description || 'N/A') + '</p>';
                            } else if (endpoint === 'tides' && data.data.tides) {
                                html += '<p><strong>Tide Events:</strong> ' + data.data.tides.length + '</p>';
                                html += '<p><strong>Station:</strong> ' + (data.data.station || 'N/A') + '</p>';
                            } else if (endpoint === 'sunrise-sunset') {
                                html += '<p><strong>Sunrise:</strong> ' + (data.data.sunrise || 'N/A') + '</p>';
                                html += '<p><strong>Sunset:</strong> ' + (data.data.sunset || 'N/A') + '</p>';
                            }
                        }
                        
                        html += '<details style="margin-top: 15px;">';
                        html += '<summary style="cursor: pointer;">Show Full Response</summary>';
                        html += '<pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 10px; font-size: 11px; max-height: 200px; overflow-y: auto;">';
                        html += JSON.stringify(data.data, null, 2);
                        html += '</pre>';
                        html += '</details>';
                        
                    } else {
                        html += '<p style="color: #e74c3c;"><strong>Status:</strong> ❌ Failed</p>';
                        html += '<p style="color: #e74c3c;"><strong>Error:</strong> ' + data.error + '</p>';
                    }
                    
                    html += '<p style="font-size: 11px; color: #6c757d; margin-top: 10px;"><strong>URL:</strong> ' + data.url + '</p>';
                    
                    resultsDiv.innerHTML = html;
                })
                .catch(error => {
                    resultsDiv.innerHTML = '<p style="color: #e74c3c;">❌ Test failed: ' + error.message + '</p>';
                });
        }

        function refreshLogs() {
            fetch('?action=get_logs&v=' + Date.now())
                .then(response => response.json())
                .then(data => {
                    if (data.logs && Object.keys(data.logs).length > 0) {
                        let html = '<div class="status-section"><div class="status-title">📋 Recent Log Entries</div>';
                        
                        for (const [key, log] of Object.entries(data.logs)) {
                            html += '<div class="status-item status-info">';
                            html += '<span>' + log.name + '</span>';
                            html += '<span>' + (log.lines ? log.lines + ' lines' : (log.size ? Math.round(log.size/1024) + ' KB' : '')) + '</span>';
                            html += '</div>';
                            
                            if (log.content && log.content.trim()) {
                                html += '<details style="margin: 10px 0;">';
                                html += '<summary style="cursor: pointer; padding: 5px; background: #34495e; border-radius: 4px;">Show Recent Entries</summary>';
                                html += '<pre style="background: #2c3e50; color: #ecf0f1; padding: 10px; border-radius: 4px; font-size: 11px; max-height: 150px; overflow-y: auto; margin: 5px 0;">';
                                html += log.content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                html += '</pre>';
                                html += '</details>';
                            }
                        }
                        
                        html += '</div>';
                        
                        // Append to status content
                        const statusContent = document.getElementById('status-content');
                        const existingLogs = statusContent.querySelector('.status-title:contains("📋")');
                        if (existingLogs) {
                            existingLogs.parentElement.remove();
                        }
                        statusContent.innerHTML += html;
                    } else {
                        showMessage('📋 No log files found or accessible', 'info');
                    }
                })
                .catch(error => {
                    showMessage('❌ Failed to load logs: ' + error.message, 'error');
                });
        }

        function toggleAutoRefresh() {
            const checkbox = document.getElementById('auto-refresh');
            
            if (checkbox.checked) {
                autoRefreshInterval = setInterval(() => {
                    refreshStatus();
                    refreshLogs();
                }, 30000);
                showMessage('🔄 Auto-refresh enabled (30 seconds)');
            } else {
                if (autoRefreshInterval) {
                    clearInterval(autoRefreshInterval);
                    autoRefreshInterval = null;
                }
                showMessage('⏸️ Auto-refresh disabled');
            }
        }

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
            }
        });

        // Add keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey || event.metaKey) {
                switch(event.key) {
                    case 'r':
                        event.preventDefault();
                        refreshStatus();
                        break;
                    case 'l':
                        event.preventDefault();
                        refreshLogs();
                        break;
                    case 't':
                        event.preventDefault();
                        document.getElementById('auto-refresh').click();
                        break;
                }
            }
        });

        // Show keyboard shortcuts help
        console.log(`
🔧 Admin Panel Keyboard Shortcuts:
- Ctrl/Cmd + R: Refresh Status
- Ctrl/Cmd + L: Refresh Logs  
- Ctrl/Cmd + T: Toggle Auto-refresh
        `);
    </script>
</body>
</html>