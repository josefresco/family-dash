#!/usr/bin/env node
/**
 * Family Dashboard Build Script
 *
 * Optimizes JavaScript files by:
 * - Removing console.log/debug statements
 * - Minifying code
 * - Reducing bundle size
 *
 * Usage: node build.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SOURCE_FILES = [
    'app-client.js',
    'api-client.js',
    'caldav-client.js',
    'weather-narrative-engine.js',
    'error-handler.js',
    'date-utils.js',
    'logger.js',
    'config.js',
    'module-loader.js'
];

const OUTPUT_DIR = 'dist';
const STATS_FILE = 'bundle-stats.json';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🚀 Starting Family Dashboard build process...\n');

const stats = {
    timestamp: new Date().toISOString(),
    files: {},
    totals: {
        originalSize: 0,
        optimizedSize: 0,
        saved: 0,
        percentReduction: 0
    }
};

/**
 * Remove console statements from code
 */
function removeConsoleStatements(content) {
    // Remove console.log and console.debug (keep console.warn and console.error)
    let optimized = content.replace(/\s*console\.(log|debug)\([^)]*\);?\n?/g, '');

    // Remove multi-line console statements
    optimized = optimized.replace(/\s*console\.(log|debug)\([^;]*?\);/gs, '');

    return optimized;
}

/**
 * Minify HTML template literals
 */
function minifyTemplates(content) {
    // Find template literals and remove extra whitespace
    return content.replace(/`([^`]*)`/g, (match, template) => {
        // Don't minify if it contains newlines that might be significant
        if (template.includes('\\n')) return match;

        // Remove extra whitespace between tags
        const minified = template
            .replace(/>\s+</g, '><')
            .replace(/\s{2,}/g, ' ')
            .trim();

        return '`' + minified + '`';
    });
}

/**
 * Remove excessive blank lines
 */
function removeExcessiveBlankLines(content) {
    return content.replace(/\n{3,}/g, '\n\n');
}

/**
 * Basic code optimizations (lightweight minification)
 */
function optimizeCode(content, filename) {
    let optimized = content;

    // Remove console statements
    optimized = removeConsoleStatements(optimized);

    // Minify template literals
    optimized = minifyTemplates(optimized);

    // Remove excessive blank lines
    optimized = removeExcessiveBlankLines(optimized);

    // Remove trailing whitespace
    optimized = optimized.replace(/[ \t]+$/gm, '');

    return optimized;
}

/**
 * Process a single file
 */
function processFile(filename) {
    const inputPath = path.join(__dirname, filename);
    const outputPath = path.join(__dirname, OUTPUT_DIR, filename);

    try {
        const content = fs.readFileSync(inputPath, 'utf8');
        const originalSize = Buffer.byteLength(content, 'utf8');

        const optimized = optimizeCode(content, filename);
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
        console.log(`   Optimized: ${(optimizedSize / 1024).toFixed(2)} KB`);
        console.log(`   Saved: ${(saved / 1024).toFixed(2)} KB (${percentReduction}%)\n`);

    } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error.message);
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

            // Update script src to point to dist folder (if serving from dist)
            // For now, just copy as-is since we'll serve from dist/

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
            console.error(`⚠️  Could not copy ${filename}:`, error.message);
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
    console.log('='.repeat(50));
    console.log(`Total Original Size: ${(stats.totals.originalSize / 1024).toFixed(2)} KB`);
    console.log(`Total Optimized Size: ${(stats.totals.optimizedSize / 1024).toFixed(2)} KB`);
    console.log(`Total Saved: ${(stats.totals.saved / 1024).toFixed(2)} KB`);
    console.log(`Overall Reduction: ${stats.totals.percentReduction}%`);
    console.log('='.repeat(50));
    console.log(`\n📁 Build output: ${OUTPUT_DIR}/`);
    console.log(`📈 Stats saved to: ${OUTPUT_DIR}/${STATS_FILE}\n`);
}

// Main build process
console.log('Processing JavaScript files...\n');
SOURCE_FILES.forEach(processFile);

console.log('\nProcessing HTML files...\n');
processHTMLFiles();

console.log('\nCopying static assets...\n');
copyStaticAssets();

console.log('\nGenerating report...\n');
generateReport();

console.log('✨ Build complete!\n');
