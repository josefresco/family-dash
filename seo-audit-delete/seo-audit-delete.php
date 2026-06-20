<?php
/**
 * Plugin Name: SEO Audit Delete
 * Description: Exposes a REST endpoint for the SEO Audit Viewer to delete posts using a shared secret token, bypassing Authorization header restrictions on Pressable hosting.
 * Version: 1.0.0
 * Author: Josiah Cole
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

add_action( 'rest_api_init', function () {
    register_rest_route( 'seo-audit/v1', '/delete', [
        'methods'             => 'POST',
        'callback'            => 'seo_audit_delete_posts',
        'permission_callback' => 'seo_audit_check_token',
    ] );
} );

function seo_audit_check_token( WP_REST_Request $request ) {
    $secret = defined( 'SEO_AUDIT_DELETE_TOKEN' ) ? SEO_AUDIT_DELETE_TOKEN : get_option( 'seo_audit_delete_token' );
    if ( empty( $secret ) ) {
        return new WP_Error( 'not_configured', 'SEO_AUDIT_DELETE_TOKEN is not set.', [ 'status' => 500 ] );
    }
    $token = $request->get_header( 'X-Audit-Token' );
    if ( ! hash_equals( $secret, (string) $token ) ) {
        return new WP_Error( 'forbidden', 'Invalid token.', [ 'status' => 403 ] );
    }
    return true;
}

function seo_audit_delete_posts( WP_REST_Request $request ) {
    $body  = $request->get_json_params();
    $ids   = isset( $body['ids'] ) ? array_map( 'intval', (array) $body['ids'] ) : [];
    $force = ! empty( $body['force'] );

    if ( empty( $ids ) ) {
        return new WP_Error( 'no_ids', 'No post IDs provided.', [ 'status' => 400 ] );
    }

    $results = [];
    foreach ( $ids as $id ) {
        if ( ! get_post( $id ) ) {
            $results[ $id ] = [ 'status' => 'not_found' ];
            continue;
        }
        $result = wp_delete_post( $id, $force );
        if ( $result ) {
            $results[ $id ] = [ 'status' => $force ? 'deleted' : 'trashed' ];
        } else {
            $results[ $id ] = [ 'status' => 'error' ];
        }
    }

    return rest_ensure_response( [ 'results' => $results ] );
}

// Admin settings page to view/regenerate the token
add_action( 'admin_menu', function () {
    add_options_page(
        'SEO Audit Delete',
        'SEO Audit Delete',
        'manage_options',
        'seo-audit-delete',
        'seo_audit_settings_page'
    );
} );

function seo_audit_settings_page() {
    if ( ! current_user_can( 'manage_options' ) ) return;

    if ( isset( $_POST['seo_audit_action'] ) && check_admin_referer( 'seo_audit_delete_nonce' ) ) {
        if ( $_POST['seo_audit_action'] === 'regenerate' ) {
            $token = bin2hex( random_bytes( 32 ) );
            update_option( 'seo_audit_delete_token', $token );
            echo '<div class="notice notice-success"><p>Token regenerated.</p></div>';
        }
    }

    $token = defined( 'SEO_AUDIT_DELETE_TOKEN' ) ? SEO_AUDIT_DELETE_TOKEN : get_option( 'seo_audit_delete_token' );
    if ( ! $token ) {
        $token = bin2hex( random_bytes( 32 ) );
        update_option( 'seo_audit_delete_token', $token );
    }

    $endpoint = rest_url( 'seo-audit/v1/delete' );
    ?>
    <div class="wrap">
        <h1>SEO Audit Delete</h1>
        <table class="form-table">
            <tr>
                <th>Endpoint</th>
                <td><code><?php echo esc_html( $endpoint ); ?></code></td>
            </tr>
            <tr>
                <th>Secret Token</th>
                <td>
                    <input type="text" value="<?php echo esc_attr( $token ); ?>" style="width:420px;font-family:monospace" readonly onclick="this.select()">
                    <?php if ( defined( 'SEO_AUDIT_DELETE_TOKEN' ) ) : ?>
                        <p class="description">Token is set via <code>SEO_AUDIT_DELETE_TOKEN</code> constant in wp-config.php.</p>
                    <?php endif; ?>
                </td>
            </tr>
        </table>
        <?php if ( ! defined( 'SEO_AUDIT_DELETE_TOKEN' ) ) : ?>
        <form method="post">
            <?php wp_nonce_field( 'seo_audit_delete_nonce' ); ?>
            <input type="hidden" name="seo_audit_action" value="regenerate">
            <?php submit_button( 'Regenerate Token', 'secondary' ); ?>
        </form>
        <?php endif; ?>
        <hr>
        <h2>Usage in SEO Audit Viewer</h2>
        <p>In the viewer's <em>Fetch Live</em> dialog, enter:</p>
        <ul>
            <li><strong>Endpoint:</strong> <code><?php echo esc_html( $endpoint ); ?></code></li>
            <li><strong>Token:</strong> the value above</li>
        </ul>
    </div>
    <?php
}
