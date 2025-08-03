<?php
// Start session and configure error handling
session_start();
error_reporting(E_ALL);
ini_set('display_errors', 0); // Set to 1 for debugging, 0 for production
ini_set('default_charset', 'utf-8');

require_once 'oauth-multi-config.php';

// Set JSON headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'status':
            checkAuthStatus();
            break;
        case 'login':
            initiateLogin();
            break;
        case 'logout':
            logout();
            break;
        case 'accounts':
            listConnectedAccounts();
            break;
        case 'disconnect':
            disconnectAccount();
            break;
        default:
            http_response_code(400);
            echo json_encode([
                'error' => 'Invalid action',
                'valid_actions' => ['status', 'login', 'logout', 'accounts', 'disconnect']
            ]);
            break;
    }
} catch (Exception $e) {
    error_log('Auth error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Authentication error',
        'message' => $e->getMessage(),
        'timestamp' => date('c')
    ]);
}

function checkAuthStatus() {
    try {
        $storage = new MultiTokenStorage();
        $all_accounts = $storage->getAllConnectedAccounts();
        
        if (!empty($all_accounts)) {
            // Return authenticated if we have any accounts
            echo json_encode([
                'authenticated' => true,
                'connected_accounts' => $all_accounts,
                'total_accounts' => count($all_accounts),
                'status' => 'success'
            ]);
        } else {
            echo json_encode([
                'authenticated' => false,
                'connected_accounts' => [],
                'total_accounts' => 0,
                'status' => 'no_accounts'
            ]);
        }
    } catch (Exception $e) {
        error_log('checkAuthStatus error: ' . $e->getMessage());
        echo json_encode([
            'authenticated' => false,
            'error' => 'Failed to check authentication status',
            'message' => $e->getMessage()
        ]);
    }
}

function initiateLogin() {
    try {
        $oauth = new GoogleOAuth2Multi();
        $login_hint = $_GET['login_hint'] ?? null; // Optional email hint
        
        $auth_url = $oauth->getAuthUrl($login_hint);
        
        if (!$auth_url) {
            throw new Exception('Failed to generate authentication URL');
        }
        
        echo json_encode([
            'auth_url' => $auth_url,
            'status' => 'redirect_ready'
        ]);
    } catch (Exception $e) {
        error_log('initiateLogin error: ' . $e->getMessage());
        throw new Exception('Failed to initiate login: ' . $e->getMessage());
    }
}

function logout() {
    try {
        $storage = new MultiTokenStorage();
        $storage->clearTokens('all');
        
        // Clear any session data
        session_destroy();
        session_start(); // Restart for future use
        
        echo json_encode([
            'success' => true,
            'message' => 'All accounts logged out successfully',
            'status' => 'logged_out'
        ]);
    } catch (Exception $e) {
        error_log('logout error: ' . $e->getMessage());
        throw new Exception('Failed to logout: ' . $e->getMessage());
    }
}

function listConnectedAccounts() {
    try {
        $storage = new MultiTokenStorage();
        $accounts = $storage->getAllConnectedAccounts();
        
        echo json_encode([
            'accounts' => $accounts,
            'total_accounts' => count($accounts),
            'status' => 'success'
        ]);
    } catch (Exception $e) {
        error_log('listConnectedAccounts error: ' . $e->getMessage());
        throw new Exception('Failed to list accounts: ' . $e->getMessage());
    }
}

function disconnectAccount() {
    $user_id = $_GET['user_id'] ?? null;
    
    if (!$user_id) {
        throw new Exception('user_id parameter is required');
    }
    
    try {
        $storage = new MultiTokenStorage();
        
        // Check if account exists before trying to disconnect
        $accounts = $storage->getAllConnectedAccounts();
        $account_exists = false;
        foreach ($accounts as $account) {
            if ($account['user_id'] === $user_id) {
                $account_exists = true;
                break;
            }
        }
        
        if (!$account_exists) {
            throw new Exception('Account not found: ' . $user_id);
        }
        
        $storage->clearTokens($user_id);
        $remaining_accounts = $storage->getAllConnectedAccounts();
        
        echo json_encode([
            'success' => true,
            'message' => 'Account disconnected successfully',
            'disconnected_account' => $user_id,
            'remaining_accounts' => $remaining_accounts,
            'total_remaining' => count($remaining_accounts),
            'status' => 'account_disconnected'
        ]);
    } catch (Exception $e) {
        error_log('disconnectAccount error: ' . $e->getMessage());
        throw new Exception('Failed to disconnect account: ' . $e->getMessage());
    }
}

// Error handler for unexpected errors
function handleFatalError() {
    $error = error_get_last();
    if ($error && $error['type'] === E_ERROR) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Fatal server error',
            'message' => 'An unexpected error occurred',
            'timestamp' => date('c')
        ]);
    }
}

register_shutdown_function('handleFatalError');
?>