<?php
/**
 * Plugin Name: SEO Audit
 * Description: SEO audit viewer with post deletion — served as a full-screen admin page.
 * Version: 2.0.0
 * Author: Josiah Cole
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// ─── Admin menu ───────────────────────────────────────────────────────────────

add_action( 'admin_menu', function () {
    add_menu_page(
        'SEO Audit',
        'SEO Audit',
        'delete_posts',
        'seo-audit',
        'seo_audit_page',
        'dashicons-chart-bar',
        30
    );
} );

function seo_audit_page() {
    if ( ! current_user_can( 'delete_posts' ) ) wp_die( 'Insufficient permissions.' );

    $nonce       = wp_create_nonce( 'wp_rest' );
    $delete_url  = rest_url( 'seo-audit/v1/delete' );
    $csv_url     = rest_url( 'seo-audit/v1/csv' );

    // Inject config then render the full viewer
    ?>
    <script>
    window.SEO_AUDIT = {
        deleteEndpoint: <?php echo wp_json_encode( $delete_url ); ?>,
        csvEndpoint:    <?php echo wp_json_encode( $csv_url ); ?>,
        nonce:          <?php echo wp_json_encode( $nonce ); ?>
    };
    </script>
    <?php seo_audit_render_viewer(); ?>
    <?php
}

// ─── REST API ─────────────────────────────────────────────────────────────────

add_action( 'rest_api_init', function () {
    register_rest_route( 'seo-audit/v1', '/delete', [
        'methods'             => 'POST',
        'callback'            => 'seo_audit_delete_posts',
        'permission_callback' => 'seo_audit_check_permission',
    ] );
    register_rest_route( 'seo-audit/v1', '/csv', [
        'methods'             => 'GET',
        'callback'            => 'seo_audit_serve_csv',
        'permission_callback' => 'seo_audit_check_permission',
    ] );
} );

function seo_audit_check_permission( WP_REST_Request $request ) {
    if ( ! current_user_can( 'delete_posts' ) ) {
        return new WP_Error( 'forbidden', 'Insufficient permissions.', [ 'status' => 403 ] );
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
        $ok = wp_delete_post( $id, $force );
        $results[ $id ] = [ 'status' => $ok ? ( $force ? 'deleted' : 'trashed' ) : 'error' ];
    }

    return rest_ensure_response( [ 'results' => $results ] );
}

function seo_audit_serve_csv( WP_REST_Request $request ) {
    $upload_dir = wp_upload_dir();
    $csv_path   = trailingslashit( $upload_dir['basedir'] ) . 'seo-audit.csv';

    if ( ! file_exists( $csv_path ) ) {
        return new WP_Error( 'not_found', 'seo-audit.csv not found in uploads directory.', [ 'status' => 404 ] );
    }

    $csv = file_get_contents( $csv_path );
    if ( $csv === false ) {
        return new WP_Error( 'read_error', 'Could not read seo-audit.csv.', [ 'status' => 500 ] );
    }

    return new WP_REST_Response( $csv, 200, [ 'Content-Type' => 'text/plain; charset=utf-8' ] );
}

// ─── Viewer HTML ──────────────────────────────────────────────────────────────

function seo_audit_render_viewer() {
?>
<style>
#seo-audit-wrap * { box-sizing: border-box; margin: 0; padding: 0; }
#seo-audit-wrap {
  --bg: #0f1117; --surface: #1a1d27; --surface2: #22263a; --border: #2e3350;
  --text: #e2e8f0; --muted: #8892a4;
  --high: #ef4444; --high-bg: #3b0f0f;
  --medium: #f59e0b; --medium-bg: #3b2a0a;
  --low: #22c55e; --low-bg: #0a2e18;
  --accent: #6366f1; --accent-hover: #4f52d0;
  --danger: #ef4444; --danger-hover: #dc2626; --danger-bg: #3b0f0f;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px; line-height: 1.5;
  background: var(--bg); color: var(--text);
  min-height: 100vh; margin: -10px -20px; padding: 0;
}

/* Buttons */
#seo-audit-wrap .btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 6px; font-size: 13px; font-weight: 500;
  cursor: pointer; border: none; transition: background 0.15s, opacity 0.15s;
}
#seo-audit-wrap .btn:disabled { opacity: 0.4; cursor: not-allowed; }
#seo-audit-wrap .btn-primary { background: var(--accent); color: #fff; }
#seo-audit-wrap .btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
#seo-audit-wrap .btn-danger { background: var(--danger); color: #fff; }
#seo-audit-wrap .btn-danger:hover:not(:disabled) { background: var(--danger-hover); }
#seo-audit-wrap .btn-outline { background: transparent; color: var(--muted); border: 1px solid var(--border); }
#seo-audit-wrap .btn-outline:hover { border-color: var(--accent); color: var(--text); }
#seo-audit-wrap .btn-ghost { background: transparent; color: var(--muted); border: 1px solid transparent; }
#seo-audit-wrap .btn-ghost:hover { color: var(--text); border-color: var(--border); }

/* Header */
#sa-header {
  background: var(--surface); border-bottom: 1px solid var(--border);
  padding: 16px 24px; display: flex; align-items: center;
  justify-content: space-between; flex-wrap: wrap; gap: 12px;
}
#sa-header h1 { font-size: 18px; font-weight: 700; color: var(--text); }
#sa-header h1 span { color: var(--muted); font-weight: 400; font-size: 14px; margin-left: 8px; }
.sa-load-area { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
#sa-file-input { display: none; }

/* Drop zone */
#sa-drop-zone {
  margin: 40px auto; max-width: 480px; border: 2px dashed var(--border);
  border-radius: 12px; padding: 60px 32px; text-align: center;
  cursor: pointer; transition: border-color 0.2s, background 0.2s;
}
#sa-drop-zone:hover, #sa-drop-zone.drag-over { border-color: var(--accent); background: var(--surface); }
#sa-drop-zone svg { color: var(--muted); margin-bottom: 16px; }
#sa-drop-zone p { color: var(--muted); margin-top: 8px; font-size: 13px; }
#sa-drop-zone strong { color: var(--text); display: block; font-size: 16px; margin-top: 4px; }

/* Stats bar */
#sa-stats {
  display: none; padding: 16px 24px; background: var(--surface);
  border-bottom: 1px solid var(--border); gap: 12px; flex-wrap: wrap; align-items: center;
}
.sa-stat {
  display: flex; align-items: center; gap: 10px;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 8px; padding: 10px 16px; min-width: 110px;
}
.sa-stat .lbl { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
.sa-stat .val { font-size: 22px; font-weight: 700; }
.sa-stat.high .val { color: var(--high); }
.sa-stat.medium .val { color: var(--medium); }
.sa-stat.low .val { color: var(--low); }
.sa-stat.matched .val { color: var(--accent); }
.sa-stat.zero .val { color: var(--high); }

/* Toolbar */
#sa-toolbar {
  display: none; padding: 12px 24px; border-bottom: 1px solid var(--border);
  gap: 10px; flex-wrap: wrap; align-items: center; background: var(--bg);
}
.sa-search-wrap { position: relative; flex: 1; min-width: 200px; max-width: 360px; }
.sa-search-wrap svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
#sa-search {
  width: 100%; padding: 7px 10px 7px 34px;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 6px; color: var(--text); font-size: 13px; outline: none;
}
#sa-search:focus { border-color: var(--accent); }
.sa-filter-group {
  display: flex; gap: 4px; background: var(--surface2);
  border: 1px solid var(--border); border-radius: 6px; padding: 3px;
}
.sa-fbtn {
  padding: 4px 12px; border-radius: 4px; border: none;
  background: transparent; color: var(--muted);
  font-size: 12px; font-weight: 600; cursor: pointer;
  transition: all 0.15s; text-transform: uppercase; letter-spacing: .05em;
}
.sa-fbtn.active { color: #fff; }
.sa-fbtn[data-risk="ALL"].active { background: var(--surface); color: var(--text); }
.sa-fbtn[data-risk="HIGH"].active { background: var(--high); }
.sa-fbtn[data-risk="MEDIUM"].active { background: var(--medium); color: #1a1200; }
.sa-fbtn[data-risk="LOW"].active { background: var(--low); color: #001a0a; }
.sa-select select {
  padding: 7px 10px; background: var(--surface2); border: 1px solid var(--border);
  border-radius: 6px; color: var(--text); font-size: 13px; outline: none; cursor: pointer;
}
.sa-select select:focus { border-color: var(--accent); }
#sa-result-count { color: var(--muted); font-size: 12px; margin-left: auto; white-space: nowrap; }

/* Table */
#sa-table-wrap { display: none; overflow-x: auto; padding: 0 24px 24px; }
#sa-table-wrap table { width: 100%; border-collapse: collapse; font-size: 13px; }
#sa-table-wrap thead th {
  background: var(--surface); color: var(--muted); font-weight: 600;
  font-size: 11px; text-transform: uppercase; letter-spacing: .06em;
  padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border);
  position: sticky; top: 0; cursor: pointer; user-select: none; white-space: nowrap;
}
#sa-table-wrap thead th.no-sort { cursor: default; }
#sa-table-wrap thead th:not(.no-sort):hover { color: var(--text); }
#sa-table-wrap thead th.sort-asc::after { content: ' ↑'; }
#sa-table-wrap thead th.sort-desc::after { content: ' ↓'; }
#sa-table-wrap tbody tr { border-bottom: 1px solid var(--border); transition: background 0.1s; }
#sa-table-wrap tbody tr:hover { background: var(--surface2); }
#sa-table-wrap tbody tr.risk-HIGH { border-left: 3px solid var(--high); }
#sa-table-wrap tbody tr.risk-MEDIUM { border-left: 3px solid var(--medium); }
#sa-table-wrap tbody tr.risk-LOW { border-left: 3px solid var(--low); }
#sa-table-wrap tbody tr.selected { background: #1e1b38; }
#sa-table-wrap tbody tr.deleted-row { opacity: 0.35; text-decoration: line-through; pointer-events: none; }
#sa-table-wrap td { padding: 10px 12px; vertical-align: top; max-width: 280px; }
.col-cb { width: 36px; padding: 10px 4px 10px 16px !important; }
#sa-table-wrap input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--accent); cursor: pointer; }
.td-title a { color: var(--text); text-decoration: none; font-weight: 500;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.td-title a:hover { color: var(--accent); text-decoration: underline; }
.td-id { color: var(--muted); font-size: 11px; }
.badge-risk { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
.badge-HIGH { background: var(--high-bg); color: var(--high); }
.badge-MEDIUM { background: var(--medium-bg); color: var(--medium); }
.badge-LOW { background: var(--low-bg); color: var(--low); }
.pv-value { font-weight: 600; font-variant-numeric: tabular-nums; }
.pv-zero { color: var(--high); } .pv-low { color: var(--medium); } .pv-ok { color: var(--low); }
.tag-notes { display: flex; flex-wrap: wrap; gap: 3px; }
.sa-tag { background: var(--surface2); border: 1px solid var(--border); border-radius: 3px; padding: 1px 5px; font-size: 10px; color: var(--muted); white-space: nowrap; }
.sa-tag.dead-page { border-color: var(--high); color: var(--high); }
.sa-tag.no-traffic { border-color: var(--medium); color: var(--medium); }
.td-cats { color: var(--muted); font-size: 11px; }
.td-date { color: var(--muted); font-size: 12px; white-space: nowrap; }
.num { text-align: right; font-variant-numeric: tabular-nums; }

/* Action bar */
#sa-action-bar {
  display: none; position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
  padding: 12px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  align-items: center; gap: 10px; z-index: 10000; white-space: nowrap; min-width: 420px;
}
#sa-action-bar .sel-count { font-size: 13px; font-weight: 600; color: var(--text); }
#sa-action-bar .sel-count span { color: var(--accent); }
#sa-action-bar .divider { width: 1px; height: 20px; background: var(--border); }

/* Modal */
#sa-modal-overlay {
  display: none; position: fixed; inset: 0;
  background: rgba(0,0,0,0.7); z-index: 20000;
  align-items: center; justify-content: center;
}
#sa-modal-overlay.open { display: flex; }
#sa-modal {
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
  padding: 24px; max-width: 520px; width: 90%; max-height: 80vh;
  display: flex; flex-direction: column; gap: 16px;
}
#sa-modal h2 { font-size: 16px; color: var(--text); }
#sa-modal h2.danger { color: var(--danger); }
#sa-modal p { color: var(--muted); font-size: 13px; }
#sa-modal ul {
  list-style: none; max-height: 220px; overflow-y: auto;
  border: 1px solid var(--border); border-radius: 6px; padding: 8px;
  display: flex; flex-direction: column; gap: 4px;
}
#sa-modal ul li { font-size: 12px; color: var(--text); padding: 4px 6px; border-radius: 4px; display: flex; gap: 8px; align-items: baseline; }
#sa-modal ul li:hover { background: var(--surface2); }
#sa-modal ul li .li-id { color: var(--muted); min-width: 36px; font-size: 11px; }
#sa-modal .modal-actions { display: flex; gap: 8px; justify-content: flex-end; }

/* Toast */
#sa-toast {
  display: none; position: fixed; bottom: 24px; right: 24px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
  padding: 12px 16px; font-size: 13px; z-index: 30000;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4); min-width: 220px;
}
#sa-toast .toast-title { font-weight: 600; margin-bottom: 4px; color: var(--text); }
#sa-toast .toast-msg { color: var(--muted); font-size: 12px; }
#sa-toast.success .toast-title { color: var(--low); }
#sa-toast.error .toast-title { color: var(--danger); }

/* Pagination */
#sa-pagination {
  display: none; padding: 16px 24px; align-items: center;
  justify-content: space-between; border-top: 1px solid var(--border);
  flex-wrap: wrap; gap: 10px; background: var(--bg); margin-bottom: 80px;
}
#sa-pagination .page-info { color: var(--muted); font-size: 12px; }
#sa-pagination .page-btns { display: flex; gap: 6px; }
#sa-pagination button {
  padding: 5px 12px; border-radius: 5px; border: 1px solid var(--border);
  background: var(--surface2); color: var(--text); cursor: pointer; font-size: 12px;
}
#sa-pagination button:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
#sa-pagination button:disabled { opacity: 0.35; cursor: default; }
#sa-pagination button.current { background: var(--accent); border-color: var(--accent); color: #fff; }

@media (max-width: 768px) {
  #sa-header { padding: 12px 16px; }
  #sa-table-wrap { padding: 0 12px 16px; }
  #sa-table-wrap td, #sa-table-wrap th { padding: 8px; }
  .col-cats, .col-id, .col-last-seen { display: none; }
  #sa-action-bar { min-width: calc(100vw - 32px); bottom: 12px; }
}
</style>

<div id="seo-audit-wrap">

<div id="sa-header">
  <h1>SEO Audit <span>josiahcole.com</span></h1>
  <div class="sa-load-area">
    <button class="btn btn-outline" onclick="document.getElementById('sa-file-input').click()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      Load CSV
    </button>
    <button class="btn btn-primary" id="sa-fetch-btn" onclick="saFetchFromServer()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      Load from Server
    </button>
    <input type="file" id="sa-file-input" accept=".csv" onchange="saHandleFile(this.files[0])">
  </div>
</div>

<div id="sa-stats"></div>
<div id="sa-toolbar"></div>
<div id="sa-table-wrap"></div>
<div id="sa-pagination"></div>

<div id="sa-drop-zone"
  ondragover="saDragOver(event)" ondragleave="saDragLeave()" ondrop="saDrop(event)"
  onclick="document.getElementById('sa-file-input').click()">
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
  <strong>Drop seo-audit.csv here</strong>
  <p>or click to browse · or click "Load from Server" to fetch automatically</p>
</div>

<!-- Action bar -->
<div id="sa-action-bar">
  <span class="sel-count"><span id="sa-sel-num">0</span> posts selected</span>
  <div class="divider"></div>
  <button class="btn btn-ghost" onclick="saClearSelection()">Clear</button>
  <button class="btn btn-outline" onclick="saCopyWpCli(false)" title="Copy WP-CLI command (trash)">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
    Copy CLI (Trash)
  </button>
  <button class="btn btn-outline" onclick="saCopyWpCli(true)" title="Copy WP-CLI command (delete)">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
    Copy CLI (Delete)
  </button>
  <button class="btn btn-danger" onclick="saConfirmDelete(false)">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
    Trash
  </button>
  <button class="btn btn-danger" onclick="saConfirmDelete(true)">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
    Delete Forever
  </button>
</div>

<!-- Confirm modal -->
<div id="sa-modal-overlay" onclick="if(event.target===this) saCloseModal()">
  <div id="sa-modal">
    <h2 id="sa-modal-title" class="danger"></h2>
    <p id="sa-modal-desc"></p>
    <ul id="sa-modal-list"></ul>
    <p id="sa-modal-warn" style="color:#ef4444;font-size:12px;"></p>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="saCloseModal()">Cancel</button>
      <button class="btn btn-danger" id="sa-modal-confirm" onclick="saExecuteDelete()">Confirm</button>
    </div>
  </div>
</div>

<!-- Toast -->
<div id="sa-toast">
  <div class="toast-title" id="sa-toast-title"></div>
  <div class="toast-msg" id="sa-toast-msg"></div>
</div>

</div><!-- #seo-audit-wrap -->

<script>
(function() {
const CFG = window.SEO_AUDIT || {};

// ─── State ────────────────────────────────────────────────────────────────────
let allRows = [], filtered = [];
let sortCol = null, sortDir = 1;
let riskFilter = 'ALL', searchQuery = '', page = 1;
const PER_PAGE = 50;
let selectedIds = new Set();
let pendingForce = false;

// ─── CSV helpers ──────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = splitLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = splitLine(line);
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = (vals[i] || '').trim());
    return obj;
  }).filter(r => r.ID);
}
function splitLine(line) {
  const res = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && !inQ) inQ = true;
    else if (c === '"' && inQ) { if (line[i+1] === '"') { cur += '"'; i++; } else inQ = false; }
    else if (c === ',' && !inQ) { res.push(cur); cur = ''; }
    else cur += c;
  }
  res.push(cur); return res;
}
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Load handlers ────────────────────────────────────────────────────────────
function saHandleFile(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = e => saInit(e.target.result);
  r.readAsText(file);
}
window.saHandleFile = saHandleFile;

async function saFetchFromServer() {
  if (!CFG.csvEndpoint) { alert('No CSV endpoint configured.'); return; }
  const btn = document.getElementById('sa-fetch-btn');
  btn.disabled = true; btn.textContent = 'Loading…';
  try {
    const res = await fetch(CFG.csvEndpoint, { credentials: 'include', headers: { 'X-WP-Nonce': CFG.nonce } });
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message || 'HTTP ' + res.status); }
    const text = await res.text();
    saInit(text);
  } catch(e) {
    alert('Could not load CSV: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Load from Server';
  }
}
window.saFetchFromServer = saFetchFromServer;

function saDragOver(e) { e.preventDefault(); document.getElementById('sa-drop-zone').classList.add('drag-over'); }
function saDragLeave() { document.getElementById('sa-drop-zone').classList.remove('drag-over'); }
function saDrop(e) {
  e.preventDefault(); document.getElementById('sa-drop-zone').classList.remove('drag-over');
  if (e.dataTransfer.files[0]) saHandleFile(e.dataTransfer.files[0]);
}
window.saDragOver = saDragOver; window.saDragLeave = saDragLeave; window.saDrop = saDrop;

// ─── Init ─────────────────────────────────────────────────────────────────────
function saInit(csv) {
  allRows = parseCSV(csv); selectedIds.clear();
  document.getElementById('sa-drop-zone').style.display = 'none';
  saRenderStats(); saBuildToolbar(); saApplyFilters();
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function saRenderStats() {
  const c = { HIGH: 0, MEDIUM: 0, LOW: 0 }; let matched = 0;
  allRows.forEach(r => { c[r.Risk] = (c[r.Risk]||0)+1; if (parseInt(r.Matomo_PV)>0) matched++; });
  const bar = document.getElementById('sa-stats');
  bar.style.display = 'flex';
  bar.innerHTML = `
    <div class="sa-stat"><div><div class="lbl">Total</div><div class="val">${allRows.length}</div></div></div>
    <div class="sa-stat high"><div><div class="lbl">HIGH</div><div class="val">${c.HIGH||0}</div></div></div>
    <div class="sa-stat medium"><div><div class="lbl">MEDIUM</div><div class="val">${c.MEDIUM||0}</div></div></div>
    <div class="sa-stat low"><div><div class="lbl">LOW</div><div class="val">${c.LOW||0}</div></div></div>
    <div class="sa-stat matched"><div><div class="lbl">With Traffic</div><div class="val">${matched}</div></div></div>
    <div class="sa-stat zero"><div><div class="lbl">Zero Traffic</div><div class="val">${allRows.length-matched}</div></div></div>
  `;
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────
function saBuildToolbar() {
  const tb = document.getElementById('sa-toolbar'); tb.style.display = 'flex';
  const catSet = new Set();
  allRows.forEach(r => r.Categories.split('|').forEach(c => { if(c) catSet.add(c.trim()); }));
  const cats = ['All Categories', ...Array.from(catSet).sort()];
  tb.innerHTML = `
    <div class="sa-search-wrap">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input id="sa-search" type="text" placeholder="Search title, notes, categories…" oninput="saOnSearch(this.value)">
    </div>
    <div class="sa-filter-group">
      <button class="sa-fbtn active" data-risk="ALL" onclick="saSetRisk('ALL')">All</button>
      <button class="sa-fbtn" data-risk="HIGH" onclick="saSetRisk('HIGH')">High</button>
      <button class="sa-fbtn" data-risk="MEDIUM" onclick="saSetRisk('MEDIUM')">Medium</button>
      <button class="sa-fbtn" data-risk="LOW" onclick="saSetRisk('LOW')">Low</button>
    </div>
    <div class="sa-select">
      <select id="sa-cat-filter" onchange="saApplyFilters()">
        ${cats.map(c => `<option>${escHtml(c)}</option>`).join('')}
      </select>
    </div>
    <div class="sa-select">
      <select id="sa-traffic-filter" onchange="saApplyFilters()">
        <option value="all">All Traffic</option>
        <option value="zero">Zero Traffic Only</option>
        <option value="some">Has Traffic</option>
      </select>
    </div>
    <span id="sa-result-count"></span>
  `;
}

function saOnSearch(v) { searchQuery = v.toLowerCase(); page = 1; saApplyFilters(); }
window.saOnSearch = saOnSearch;

function saSetRisk(r) {
  riskFilter = r; page = 1;
  document.querySelectorAll('.sa-fbtn').forEach(b => b.classList.toggle('active', b.dataset.risk === r));
  saApplyFilters();
}
window.saSetRisk = saSetRisk;

// ─── Filter + Sort ────────────────────────────────────────────────────────────
function saApplyFilters() {
  const cat = document.getElementById('sa-cat-filter')?.value || 'All Categories';
  const traf = document.getElementById('sa-traffic-filter')?.value || 'all';
  filtered = allRows.filter(r => {
    if (riskFilter !== 'ALL' && r.Risk !== riskFilter) return false;
    if (cat !== 'All Categories' && !r.Categories.split('|').map(c=>c.trim()).includes(cat)) return false;
    const pv = parseInt(r.Matomo_PV)||0;
    if (traf === 'zero' && pv > 0) return false;
    if (traf === 'some' && pv === 0) return false;
    if (searchQuery) {
      const hay = (r.Title+r.Notes+r.Categories+r.URL).toLowerCase();
      if (!hay.includes(searchQuery)) return false;
    }
    return true;
  });
  if (sortCol) saSort();
  const rc = document.getElementById('sa-result-count');
  if (rc) rc.textContent = `${filtered.length} of ${allRows.length} posts`;
  saRenderTable(); saRenderPagination();
}
window.saApplyFilters = saApplyFilters;

function saSort() {
  filtered.sort((a, b) => {
    let av = a[sortCol], bv = b[sortCol];
    if (['Age_Days','Word_Count','Matomo_PV','ID'].includes(sortCol)) { av = parseFloat(av)||0; bv = parseFloat(bv)||0; }
    return av < bv ? -sortDir : av > bv ? sortDir : 0;
  });
}

function saSetSort(col) {
  if (sortCol === col) sortDir *= -1; else { sortCol = col; sortDir = 1; }
  document.querySelectorAll('#sa-table-wrap thead th').forEach(th => {
    th.classList.remove('sort-asc','sort-desc');
    if (th.dataset.col === col) th.classList.add(sortDir===1?'sort-asc':'sort-desc');
  });
  saApplyFilters();
}
window.saSetSort = saSetSort;

// ─── Table ────────────────────────────────────────────────────────────────────
const COLS = [
  { key: '_cb', label: '', cls: 'col-cb no-sort' },
  { key: 'ID', label: 'ID', cls: 'col-id' },
  { key: 'Title', label: 'Title / URL' },
  { key: 'Published', label: 'Published', cls: 'col-date' },
  { key: 'Age_Days', label: 'Age', cls: 'num' },
  { key: 'Word_Count', label: 'Words', cls: 'num' },
  { key: 'Matomo_PV', label: 'PV', cls: 'num' },
  { key: 'Last_Seen', label: 'Last Seen', cls: 'col-last-seen' },
  { key: 'Categories', label: 'Categories', cls: 'col-cats' },
  { key: 'Risk', label: 'Risk' },
  { key: 'Notes', label: 'Notes' },
];

function saRenderTable() {
  const wrap = document.getElementById('sa-table-wrap'); wrap.style.display = 'block';
  const start = (page-1)*PER_PAGE;
  const pageRows = filtered.slice(start, start+PER_PAGE);
  const pageIds = pageRows.map(r => r.ID);
  const allPageSel = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  wrap.innerHTML = `<table><thead><tr>${COLS.map(c => {
    if (c.key === '_cb') return `<th class="col-cb no-sort" onclick="saToggleAll(event)"><input type="checkbox" id="sa-cb-all" ${allPageSel?'checked':''} onclick="saToggleAll(event)"></th>`;
    return `<th data-col="${c.key}" class="${c.cls||''}" onclick="saSetSort('${c.key}')">${c.label}</th>`;
  }).join('')}</tr></thead><tbody>${pageRows.map(saRenderRow).join('')}</tbody></table>`;
  if (sortCol) { const th = wrap.querySelector(`th[data-col="${sortCol}"]`); if(th) th.classList.add(sortDir===1?'sort-asc':'sort-desc'); }
}

function saRenderRow(r) {
  const pv = parseInt(r.Matomo_PV)||0;
  const pvC = pv===0?'pv-zero':pv<10?'pv-low':'pv-ok';
  const age = (( parseInt(r.Age_Days)||0)/365).toFixed(1);
  const notes = r.Notes ? r.Notes.split(';').map(n => {
    const t = n.trim(); if(!t) return '';
    const cls = t==='dead page'?'dead-page':t==='no traffic'?'no-traffic':'';
    return `<span class="sa-tag ${cls}">${escHtml(t)}</span>`;
  }).join('') : '';
  const pub = r.Published ? r.Published.split(' ')[0] : '';
  const lastSeen = r.Last_Seen ? r.Last_Seen.split(' ')[0] : '—';
  const cats = r.Categories ? r.Categories.split('|').filter(Boolean).join(', ') : '—';
  const checked = selectedIds.has(r.ID) ? 'checked' : '';
  const selCls = selectedIds.has(r.ID) ? 'selected' : '';
  return `<tr class="risk-${r.Risk} ${selCls}" data-id="${r.ID}">
    <td class="col-cb" onclick="saToggleRow('${r.ID}',event)"><input type="checkbox" ${checked} onclick="saToggleRow('${r.ID}',event)"></td>
    <td class="td-id col-id">${r.ID}</td>
    <td class="td-title"><a href="${escHtml(r.URL)}" target="_blank" rel="noopener">${escHtml(r.Title)}</a></td>
    <td class="td-date col-date">${pub}</td>
    <td class="num">${age}y</td>
    <td class="num">${Number(r.Word_Count).toLocaleString()}</td>
    <td class="num"><span class="pv-value ${pvC}">${pv.toLocaleString()}</span></td>
    <td class="td-date col-last-seen">${lastSeen}</td>
    <td class="td-cats col-cats">${escHtml(cats)}</td>
    <td><span class="badge-risk badge-${r.Risk}">${r.Risk}</span></td>
    <td><div class="tag-notes">${notes}</div></td>
  </tr>`;
}

// ─── Selection ────────────────────────────────────────────────────────────────
function saToggleRow(id, event) {
  event.stopPropagation();
  if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
  const tr = document.querySelector(`tr[data-id="${id}"]`);
  if (tr) { tr.classList.toggle('selected', selectedIds.has(id)); const cb = tr.querySelector('input'); if(cb) cb.checked = selectedIds.has(id); }
  saUpdateSelectAll(); saUpdateActionBar();
}
window.saToggleRow = saToggleRow;

function saToggleAll(event) {
  event.stopPropagation();
  const start = (page-1)*PER_PAGE;
  const pageIds = filtered.slice(start, start+PER_PAGE).map(r => r.ID);
  const allSel = pageIds.every(id => selectedIds.has(id));
  pageIds.forEach(id => { allSel ? selectedIds.delete(id) : selectedIds.add(id);
    const tr = document.querySelector(`tr[data-id="${id}"]`);
    if (tr) { tr.classList.toggle('selected', selectedIds.has(id)); const cb = tr.querySelector('input'); if(cb) cb.checked = selectedIds.has(id); }
  });
  saUpdateSelectAll(); saUpdateActionBar();
}
window.saToggleAll = saToggleAll;

function saUpdateSelectAll() {
  const start = (page-1)*PER_PAGE;
  const pageIds = filtered.slice(start, start+PER_PAGE).map(r => r.ID);
  const cb = document.getElementById('sa-cb-all');
  if (cb) cb.checked = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
}

function saUpdateActionBar() {
  const bar = document.getElementById('sa-action-bar');
  if (selectedIds.size === 0) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  document.getElementById('sa-sel-num').textContent = selectedIds.size;
}

function saClearSelection() {
  selectedIds.clear();
  document.querySelectorAll('#sa-table-wrap tbody tr.selected').forEach(tr => {
    tr.classList.remove('selected'); const cb = tr.querySelector('input'); if(cb) cb.checked = false;
  });
  const cb = document.getElementById('sa-cb-all'); if(cb) cb.checked = false;
  saUpdateActionBar();
}
window.saClearSelection = saClearSelection;

function saCopyWpCli(force) {
  if (selectedIds.size === 0) return;
  const cmd = `wp post delete ${Array.from(selectedIds).join(' ')}${force?' --force':''}`;
  navigator.clipboard.writeText(cmd)
    .then(() => saShowToast('success', 'Copied!', cmd))
    .catch(() => prompt('Copy this WP-CLI command:', cmd));
}
window.saCopyWpCli = saCopyWpCli;

// ─── Delete ───────────────────────────────────────────────────────────────────
function saConfirmDelete(force) {
  if (selectedIds.size === 0) return;
  pendingForce = force;
  const ids = Array.from(selectedIds);
  const rows = allRows.filter(r => ids.includes(r.ID));
  document.getElementById('sa-modal-title').textContent = force ? '⚠ Permanently Delete Posts' : 'Move Posts to Trash';
  document.getElementById('sa-modal-desc').textContent = force
    ? `Permanently delete ${rows.length} post${rows.length>1?'s':''}? This cannot be undone.`
    : `Move ${rows.length} post${rows.length>1?'s':''} to the WordPress Trash?`;
  document.getElementById('sa-modal-warn').textContent = force ? 'Make sure you have a backup before proceeding.' : '';
  document.getElementById('sa-modal-confirm').textContent = force ? 'Delete Permanently' : 'Move to Trash';
  document.getElementById('sa-modal-list').innerHTML = rows.map(r =>
    `<li><span class="li-id">#${r.ID}</span>${escHtml(r.Title)}</li>`).join('');
  document.getElementById('sa-modal-overlay').classList.add('open');
}
window.saConfirmDelete = saConfirmDelete;

function saCloseModal() { document.getElementById('sa-modal-overlay').classList.remove('open'); }
window.saCloseModal = saCloseModal;

async function saExecuteDelete() {
  saCloseModal();
  if (!CFG.deleteEndpoint) { alert('Delete endpoint not configured.'); return; }
  const ids = Array.from(selectedIds);
  const force = pendingForce;
  saShowToast('info', `Deleting ${ids.length} posts…`, 'Please wait');
  try {
    const res = await fetch(CFG.deleteEndpoint, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': CFG.nonce },
      body: JSON.stringify({ ids, force })
    });
    if (res.status === 403) { saShowToast('error', 'Permission denied', 'Your session may have expired — refresh the page.'); return; }
    if (!res.ok) { const b = await res.json().catch(()=>({})); saShowToast('error', 'Request failed', b.message || 'HTTP '+res.status); return; }
    const data = await res.json();
    let ok = 0, fail = 0, failMsgs = [];
    for (const [id, result] of Object.entries(data.results || {})) {
      if (result.status === 'deleted' || result.status === 'trashed') {
        ok++;
        const tr = document.querySelector(`tr[data-id="${id}"]`); if(tr) tr.classList.add('deleted-row');
        allRows = allRows.filter(r => String(r.ID) !== String(id));
        selectedIds.delete(id);
      } else { fail++; failMsgs.push(`#${id}: ${result.status}`); }
    }
    saUpdateActionBar(); saRenderStats();
    if (fail === 0) { saShowToast('success', `${ok} post${ok>1?'s':''} ${force?'deleted':'trashed'}`, 'Done'); setTimeout(() => { saApplyFilters(); saHideToast(); }, 1200); }
    else { saShowToast('error', `${ok} succeeded, ${fail} failed`, failMsgs.slice(0,3).join('\n')); saApplyFilters(); }
  } catch(e) { saShowToast('error', 'Network error', e.message); }
}
window.saExecuteDelete = saExecuteDelete;

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer = null;
function saShowToast(type, title, msg) {
  const t = document.getElementById('sa-toast'); t.className = type;
  document.getElementById('sa-toast-title').textContent = title;
  document.getElementById('sa-toast-msg').textContent = msg;
  t.style.display = 'block'; clearTimeout(toastTimer);
  if (type !== 'info') toastTimer = setTimeout(saHideToast, 4000);
}
function saHideToast() { document.getElementById('sa-toast').style.display = 'none'; }

// ─── Pagination ───────────────────────────────────────────────────────────────
function saRenderPagination() {
  const total = Math.ceil(filtered.length / PER_PAGE);
  const pg = document.getElementById('sa-pagination');
  if (total <= 1) { pg.style.display = 'none'; return; }
  pg.style.display = 'flex';
  const start = (page-1)*PER_PAGE+1, end = Math.min(page*PER_PAGE, filtered.length);
  let btns = '';
  for (let i=1; i<=total; i++) {
    if (total>10 && Math.abs(i-page)>2 && i!==1 && i!==total) { if(i===2||i===total-1) btns+=`<button disabled>…</button>`; continue; }
    btns += `<button onclick="saGoPage(${i})" class="${i===page?'current':''}">${i}</button>`;
  }
  pg.innerHTML = `<span class="page-info">Showing ${start}–${end} of ${filtered.length}</span>
    <div class="page-btns">
      <button onclick="saGoPage(${page-1})" ${page<=1?'disabled':''}>← Prev</button>
      ${btns}
      <button onclick="saGoPage(${page+1})" ${page>=total?'disabled':''}>Next →</button>
    </div>`;
}

function saGoPage(n) {
  const total = Math.ceil(filtered.length / PER_PAGE);
  page = Math.max(1, Math.min(n, total));
  saRenderTable(); saRenderPagination();
  document.getElementById('sa-table-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
window.saGoPage = saGoPage;

// Auto-load on page open
document.addEventListener('DOMContentLoaded', () => { if (CFG.csvEndpoint) saFetchFromServer(); });
})();
</script>
<?php
}
