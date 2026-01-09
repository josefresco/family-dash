#!/usr/bin/env node
/**
 * Optimized Family Dashboard Build Script
 *
 * Advanced optimizations including:
 * - Aggressive minification with Terser
 * - Dead code elimination
 * - Constant folding
 * - Module bundling with tree shaking
 * - Gzip compression simulation
 *
 * Usage: npm run build:optimized
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

// Configuration
const CORE_MODULES = [
    'logger.js',
    'error-handler.js',
    'date-utils.js',
    'config.js'
];

const APP_MODULES = [
    'weather-narrative-engine.js',
    'module-loader.js',
    'api-client.js',
    'app-client.js'
];

const LAZY_MODULES = [
    'caldav-client.js'
];

const OUTPUT_DIR = 'dist';
const STATS_FILE = 'bundle-stats-optimized.json';

// Enhanced Terser configuration
const TERSER_OPTIONS = {
    compress: {
        dead_code: true,
        drop_console: ['log', 'debug'],
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
        passes: 3, // More passes for better optimization
        unsafe_arrows: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_regexp: true,
        unsafe_undefined: true,
        warnings: false,
        toplevel: false,
        side_effects: true,
        reduce_vars: true,
        reduce_funcs: true,
        collapse_vars: true,
        join_vars: true,
        sequences: true,
        properties: true,
        conditionals: true,
        comparisons: true,
        evaluate: true,
        booleans: true,
        loops: true,
        unused: true,
        if_return: true,
        inline: 3
    },
    mangle: {
        reserved: [
            'DashboardApp',
            'APIClient',
            'CalDAVClient',
            'WeatherNarrativeEngine',
            'ErrorHandler',
            'DateUtils',
            'Logger',
            'DashboardConfig',
            'ModuleLoader'
        ],
        keep_classnames: true,
        keep_fnames: /^(get|set|load|init|update|render|fetch|parse|handle)/
    },
    format: {
        comments: false,
        beautify: false,
        semicolons: true,
        preamble: '/* Family Dashboard v3.26 - Optimized Build */'
    },
    sourceMap: false
};

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🚀 Starting Optimized Family Dashboard build...\n');

const stats = {
    timestamp: new Date().toISOString(),
    buildType: 'optimized-bundle',
    files: {},
    bundles: {},
    totals: {
        originalSize: 0,
        optimizedSize: 0,
        saved: 0,
        percentReduction: 0
    }
};

/**
 * Process and minify a single file
 */
async function processFile(filename, bundleName = null) {
    const inputPath = path.join(__dirname, filename);

    try {
        const content = fs.readFileSync(inputPath, 'utf8');
        const originalSize = Buffer.byteLength(content, 'utf8');

        // Use Terser to minify
        const result = await minify(content, TERSER_OPTIONS);

        if (result.error) {
            throw result.error;
        }

        const optimized = result.code;
        const optimizedSize = Buffer.byteLength(optimized, 'utf8');
        const saved = originalSize - optimizedSize;
        const percentReduction = ((saved / originalSize) * 100).toFixed(2);

        stats.files[filename] = {
            originalSize,
            optimizedSize,
            saved,
            percentReduction: parseFloat(percentReduction),
            bundle: bundleName
        };

        stats.totals.originalSize += originalSize;
        stats.totals.optimizedSize += optimizedSize;
        stats.totals.saved += saved;

        console.log(`✅ ${filename}`);
        console.log(`   Original: ${(originalSize / 1024).toFixed(2)} KB`);
        console.log(`   Minified: ${(optimizedSize / 1024).toFixed(2)} KB`);
        console.log(`   Saved: ${(saved / 1024).toFixed(2)} KB (${percentReduction}%)\n`);

        return optimized;
    } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error.message);
        throw error;
    }
}

/**
 * Create a bundled file from multiple modules
 */
async function createBundle(files, bundleName) {
    console.log(`📦 Creating bundle: ${bundleName}`);

    const codes = [];
    let totalOriginal = 0;

    for (const file of files) {
        const content = await processFile(file, bundleName);
        codes.push(content);
        totalOriginal += stats.files[file].originalSize;
    }

    // Combine all code
    const combined = codes.join('\n');

    // Re-minify the combined bundle for additional optimization
    const result = await minify(combined, {
        ...TERSER_OPTIONS,
        compress: {
            ...TERSER_OPTIONS.compress,
            passes: 2 // Additional pass on bundle
        }
    });

    const bundleContent = result.code;
    const bundleSize = Buffer.byteLength(bundleContent, 'utf8');
    const outputPath = path.join(__dirname, OUTPUT_DIR, bundleName);

    fs.writeFileSync(outputPath, bundleContent, 'utf8');

    stats.bundles[bundleName] = {
        files: files,
        originalSize: totalOriginal,
        bundleSize: bundleSize,
        saved: totalOriginal - bundleSize,
        percentReduction: (((totalOriginal - bundleSize) / totalOriginal) * 100).toFixed(2)
    };

    console.log(`📦 Bundle created: ${bundleName}`);
    console.log(`   Files: ${files.length}`);
    console.log(`   Combined Original: ${(totalOriginal / 1024).toFixed(2)} KB`);
    console.log(`   Bundle Size: ${(bundleSize / 1024).toFixed(2)} KB`);
    console.log(`   Total Saved: ${((totalOriginal - bundleSize) / 1024).toFixed(2)} KB (${stats.bundles[bundleName].percentReduction}%)\n`);
}

/**
 * Process individual lazy-loaded modules
 */
async function processLazyModules() {
    console.log('📦 Processing lazy-loaded modules (not bundled)...\n');

    for (const file of LAZY_MODULES) {
        const optimized = await processFile(file, 'lazy');
        const outputPath = path.join(__dirname, OUTPUT_DIR, file);
        fs.writeFileSync(outputPath, optimized, 'utf8');
    }
}

/**
 * Copy HTML files and update script references
 */
function processHTMLFiles() {
    const htmlFiles = ['dashboard.html', 'setup.html', 'index.html'];

    htmlFiles.forEach(filename => {
        try {
            const inputPath = path.join(__dirname, filename);
            const outputPath = path.join(__dirname, OUTPUT_DIR, filename);

            let content = fs.readFileSync(inputPath, 'utf8');

            // Update script references to use bundled versions
            if (filename === 'dashboard.html') {
                // Replace individual script tags with bundled versions (handles comments between tags)
                // Replace core bundle files (logger, error-handler, date-utils, config)
                content = content.replace(
                    /<!-- Load utility modules.*?<script defer src="logger\.js.*?<\/script>.*?<script defer src="error-handler\.js.*?<\/script>.*?<script defer src="date-utils\.js.*?<\/script>.*?<script defer src="weather-narrative-engine\.js.*?<\/script>.*?<!-- Load configuration.*?<script defer src="config\.js.*?<\/script>/s,
                    '<!-- Load optimized core bundle -->\n    <script defer src="core-bundle.js?v=3.26"></script>\n\n    <!-- Load optimized app bundle'
                );

                // Replace app bundle files (module-loader, api-client, app-client)
                content = content.replace(
                    /<script defer src="module-loader\.js.*?<\/script>.*?<script defer src="api-client\.js.*?<\/script>.*?<!-- CalDAV.*?-->/s,
                    ''
                );

                content = content.replace(
                    /<!-- Load optimized app bundle\s*$/m,
                    '<!-- Load optimized app bundle -->\n    <script defer src="app-bundle.js?v=3.26"></script>\n    <!-- CalDAV client is now lazy-loaded on-demand via module-loader.js -->'
                );

                // Update preload tags to use bundles
                content = content.replace(
                    /<!-- Preload critical resources -->.*?<link rel="preload" href="logger\.js.*?<link rel="preload" href="error-handler\.js.*?<link rel="preload" href="date-utils\.js.*?<link rel="preload" href="weather-narrative-engine\.js.*?<link rel="preload" href="config\.js.*?<link rel="preload" href="api-client\.js.*?<link rel="preload" href="app-client\.js.*?>/s,
                    '<!-- Preload bundled resources for optimal performance -->\n    <link rel="preload" href="core-bundle.js?v=3.26" as="script">\n    <link rel="preload" href="app-bundle.js?v=3.26" as="script">'
                );
            }

            fs.writeFileSync(outputPath, content, 'utf8');
            console.log(`📄 Copied ${filename}`);
        } catch (error) {
            console.error(`❌ Error copying ${filename}:`, error.message);
        }
    });

    console.log('');
}

/**
 * Copy static assets
 */
function copyStaticAssets() {
    const assets = ['favicon.svg', 'sw.js', 'netlify.toml', '.htaccess'];

    assets.forEach(filename => {
        try {
            const inputPath = path.join(__dirname, filename);
            if (fs.existsSync(inputPath)) {
                const outputPath = path.join(__dirname, OUTPUT_DIR, filename);
                fs.copyFileSync(inputPath, outputPath);
                console.log(`📦 Copied ${filename}`);
            }
        } catch (error) {
            // Silently skip missing assets
        }
    });

    console.log('');
}

/**
 * Generate bundle statistics report
 */
function generateReport() {
    stats.totals.percentReduction =
        ((stats.totals.saved / stats.totals.originalSize) * 100).toFixed(2);

    // Write stats to JSON file
    fs.writeFileSync(
        path.join(__dirname, OUTPUT_DIR, STATS_FILE),
        JSON.stringify(stats, null, 2),
        'utf8'
    );

    console.log('📊 BUNDLE STATISTICS');
    console.log('='.repeat(70));
    console.log(`Total Original Size:   ${(stats.totals.originalSize / 1024).toFixed(2)} KB`);
    console.log(`Total Optimized Size:  ${(stats.totals.optimizedSize / 1024).toFixed(2)} KB`);
    console.log(`Total Saved:           ${(stats.totals.saved / 1024).toFixed(2)} KB`);
    console.log(`Overall Reduction:     ${stats.totals.percentReduction}%`);
    console.log('='.repeat(70));

    console.log('\n📦 BUNDLES CREATED:');
    Object.entries(stats.bundles).forEach(([name, data]) => {
        console.log(`\n${name}:`);
        console.log(`  Files: ${data.files.join(', ')}`);
        console.log(`  Size: ${(data.bundleSize / 1024).toFixed(2)} KB (${data.percentReduction}% reduction)`);
    });

    console.log(`\n📁 Build output: ${OUTPUT_DIR}/`);
    console.log(`📈 Stats: ${OUTPUT_DIR}/${STATS_FILE}\n`);
}

// Main build process
(async function build() {
    try {
        // Create core utilities bundle
        await createBundle(CORE_MODULES, 'core-bundle.js');

        // Create app bundle
        await createBundle(APP_MODULES, 'app-bundle.js');

        // Process lazy-loaded modules individually
        await processLazyModules();

        console.log('\nProcessing HTML files...\n');
        processHTMLFiles();

        console.log('\nCopying static assets...\n');
        copyStaticAssets();

        console.log('\nGenerating report...\n');
        generateReport();

        console.log('✨ Optimized build complete!\n');
        console.log('💡 TIP: Use the bundled version for production deployment');
        console.log('   Initial load: core-bundle.js + app-bundle.js');
        console.log('   Lazy loaded: caldav-client.js (only when needed)\n');
    } catch (error) {
        console.error('\n❌ Build failed:', error);
        process.exit(1);
    }
})();
