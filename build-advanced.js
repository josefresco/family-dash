#!/usr/bin/env node
/**
 * Advanced Family Dashboard Build Script
 *
 * Uses Terser for aggressive minification and optimization
 *
 * Usage: npm install && npm run build:advanced
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

// Configuration
const SOURCE_FILES = [
    'app-client.js',
    'api-client.js',
    'caldav-client.js',
    'weather-narrative-engine.js',
    'error-handler.js',
    'date-utils.js',
    'logger.js',
    'config.js'
];

const OUTPUT_DIR = 'dist';
const STATS_FILE = 'bundle-stats-advanced.json';

// Terser configuration
const TERSER_OPTIONS = {
    compress: {
        dead_code: true,
        drop_console: ['log', 'debug'], // Keep warn and error
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
        passes: 2,
        unsafe_arrows: true,
        unsafe_methods: true,
        warnings: false
    },
    mangle: {
        // Don't mangle class names or global functions
        reserved: [
            'DashboardApp',
            'APIClient',
            'CalDAVClient',
            'WeatherNarrativeEngine',
            'ErrorHandler',
            'DateUtils',
            'Logger',
            'DashboardConfig'
        ],
        keep_classnames: true,
        keep_fnames: /^(get|set|load|init|update|render|fetch|parse)/
    },
    format: {
        comments: false, // Remove all comments
        beautify: false
    },
    sourceMap: false
};

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🚀 Starting Advanced Family Dashboard build process...\n');

const stats = {
    timestamp: new Date().toISOString(),
    buildType: 'advanced-minified',
    files: {},
    totals: {
        originalSize: 0,
        optimizedSize: 0,
        saved: 0,
        percentReduction: 0
    }
};

/**
 * Process a single file with Terser
 */
async function processFile(filename) {
    const inputPath = path.join(__dirname, filename);
    const outputPath = path.join(__dirname, OUTPUT_DIR, filename);

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

        fs.writeFileSync(outputPath, optimized, 'utf8');

        const saved = originalSize - optimizedSize;
        const percentReduction = ((saved / originalSize) * 100).toFixed(2);

        stats.files[filename] = {
            originalSize,
            optimizedSize,
            saved,
            percentReduction: parseFloat(percentReduction)
        };

        stats.totals.originalSize += originalSize;
        stats.totals.optimizedSize += optimizedSize;
        stats.totals.saved += saved;

        console.log(`✅ ${filename}`);
        console.log(`   Original: ${(originalSize / 1024).toFixed(2)} KB`);
        console.log(`   Minified: ${(optimizedSize / 1024).toFixed(2)} KB`);
        console.log(`   Saved: ${(saved / 1024).toFixed(2)} KB (${percentReduction}%)\n`);

    } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error.message);
        throw error;
    }
}

/**
 * Copy HTML files
 */
function processHTMLFiles() {
    const htmlFiles = ['dashboard.html', 'setup.html', 'index.html'];

    htmlFiles.forEach(filename => {
        try {
            const inputPath = path.join(__dirname, filename);
            const outputPath = path.join(__dirname, OUTPUT_DIR, filename);

            let content = fs.readFileSync(inputPath, 'utf8');
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

    // Also write to console-friendly format
    const reportPath = path.join(__dirname, OUTPUT_DIR, 'BUILD_REPORT.txt');
    const report = `
Family Dashboard - Advanced Build Report
Generated: ${stats.timestamp}
========================================

FILE DETAILS:
${Object.entries(stats.files)
    .map(([file, data]) => `
${file}
  Original:  ${(data.originalSize / 1024).toFixed(2)} KB
  Minified:  ${(data.optimizedSize / 1024).toFixed(2)} KB
  Saved:     ${(data.saved / 1024).toFixed(2)} KB (${data.percentReduction}%)
`)
    .join('')}

TOTALS:
  Total Original Size:   ${(stats.totals.originalSize / 1024).toFixed(2)} KB
  Total Minified Size:   ${(stats.totals.optimizedSize / 1024).toFixed(2)} KB
  Total Saved:           ${(stats.totals.saved / 1024).toFixed(2)} KB
  Overall Reduction:     ${stats.totals.percentReduction}%

Build output: ${OUTPUT_DIR}/
`;

    fs.writeFileSync(reportPath, report.trim(), 'utf8');

    console.log('📊 BUNDLE STATISTICS');
    console.log('='.repeat(60));
    console.log(`Total Original Size:   ${(stats.totals.originalSize / 1024).toFixed(2)} KB`);
    console.log(`Total Minified Size:   ${(stats.totals.optimizedSize / 1024).toFixed(2)} KB`);
    console.log(`Total Saved:           ${(stats.totals.saved / 1024).toFixed(2)} KB`);
    console.log(`Overall Reduction:     ${stats.totals.percentReduction}%`);
    console.log('='.repeat(60));
    console.log(`\n📁 Build output: ${OUTPUT_DIR}/`);
    console.log(`📈 Stats: ${OUTPUT_DIR}/${STATS_FILE}`);
    console.log(`📋 Report: ${OUTPUT_DIR}/BUILD_REPORT.txt\n`);
}

// Main build process
(async function build() {
    try {
        console.log('Processing JavaScript files with Terser...\n');
        for (const file of SOURCE_FILES) {
            await processFile(file);
        }

        console.log('\nProcessing HTML files...\n');
        processHTMLFiles();

        console.log('\nCopying static assets...\n');
        copyStaticAssets();

        console.log('\nGenerating report...\n');
        generateReport();

        console.log('✨ Advanced build complete!\n');
    } catch (error) {
        console.error('\n❌ Build failed:', error);
        process.exit(1);
    }
})();
