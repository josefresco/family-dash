#!/usr/bin/env node
/**
 * Bundle Analysis Script
 *
 * Analyzes JavaScript files to identify optimization opportunities
 *
 * Usage: node analyze-bundle.js
 */

const fs = require('fs');
const path = require('path');

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

console.log('📊 Family Dashboard Bundle Analysis\n');
console.log('='.repeat(70));

const analysis = {
    timestamp: new Date().toISOString(),
    files: {},
    summary: {
        totalSize: 0,
        totalLines: 0,
        totalConsoleStatements: 0,
        totalComments: 0,
        totalFunctions: 0,
        totalClasses: 0
    }
};

/**
 * Analyze a single file
 */
function analyzeFile(filename) {
    const filePath = path.join(__dirname, filename);

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const size = Buffer.byteLength(content, 'utf8');

        // Count console statements
        const consoleMatches = content.match(/console\.(log|debug|warn|error|info)/g) || [];
        const consoleLogDebug = content.match(/console\.(log|debug)/g) || [];

        // Count comments
        const singleLineComments = content.match(/\/\/.*/g) || [];
        const multiLineComments = content.match(/\/\*[\s\S]*?\*\//g) || [];
        const totalComments = singleLineComments.length + multiLineComments.length;

        // Count functions and classes
        const functions = content.match(/function\s+\w+\s*\(|=>\s*{|:\s*function\s*\(/g) || [];
        const classes = content.match(/class\s+\w+/g) || [];

        // Count string literals and template literals
        const stringLiterals = content.match(/'[^']*'|"[^"]*"/g) || [];
        const templateLiterals = content.match(/`[^`]*`/g) || [];

        // Estimate whitespace
        const whitespace = content.match(/\s+/g) || [];
        const whitespaceBytes = whitespace.join('').length;

        const fileAnalysis = {
            size,
            sizeKB: (size / 1024).toFixed(2),
            lines: lines.length,
            consoleStatements: consoleMatches.length,
            consoleLogDebug: consoleLogDebug.length,
            comments: totalComments,
            functions: functions.length,
            classes: classes.length,
            stringLiterals: stringLiterals.length,
            templateLiterals: templateLiterals.length,
            whitespaceBytes,
            whitespacePercent: ((whitespaceBytes / size) * 100).toFixed(2)
        };

        analysis.files[filename] = fileAnalysis;

        // Update summary
        analysis.summary.totalSize += size;
        analysis.summary.totalLines += lines.length;
        analysis.summary.totalConsoleStatements += consoleLogDebug.length;
        analysis.summary.totalComments += totalComments;
        analysis.summary.totalFunctions += functions.length;
        analysis.summary.totalClasses += classes.length;

        // Display file analysis
        console.log(`\n📄 ${filename}`);
        console.log(`   Size: ${fileAnalysis.sizeKB} KB (${size} bytes)`);
        console.log(`   Lines: ${lines.length}`);
        console.log(`   Console.log/debug: ${consoleLogDebug.length}`);
        console.log(`   Comments: ${totalComments}`);
        console.log(`   Functions: ${functions.length}`);
        console.log(`   Classes: ${classes.length}`);
        console.log(`   Template literals: ${templateLiterals.length}`);
        console.log(`   Whitespace: ${((whitespaceBytes / 1024).toFixed(2))} KB (${fileAnalysis.whitespacePercent}%)`);

    } catch (error) {
        console.error(`❌ Error analyzing ${filename}:`, error.message);
    }
}

/**
 * Generate summary report
 */
function generateSummary() {
    console.log('\n' + '='.repeat(70));
    console.log('\n📊 SUMMARY\n');
    console.log(`Total Size:              ${(analysis.summary.totalSize / 1024).toFixed(2)} KB`);
    console.log(`Total Lines:             ${analysis.summary.totalLines}`);
    console.log(`Total Console.log/debug: ${analysis.summary.totalConsoleStatements}`);
    console.log(`Total Comments:          ${analysis.summary.totalComments}`);
    console.log(`Total Functions:         ${analysis.summary.totalFunctions}`);
    console.log(`Total Classes:           ${analysis.summary.totalClasses}`);

    console.log('\n💡 OPTIMIZATION OPPORTUNITIES\n');

    // Estimate savings from removing console.log/debug
    const consoleBytes = analysis.summary.totalConsoleStatements * 50; // Rough estimate
    console.log(`Removing console.log/debug: ~${(consoleBytes / 1024).toFixed(2)} KB`);

    // Estimate savings from minification (whitespace + comments)
    const minificationSavings = analysis.summary.totalSize * 0.25; // Conservative 25%
    console.log(`Minification (estimated):   ~${(minificationSavings / 1024).toFixed(2)} KB (25%)`);

    // Total estimated savings
    const totalSavings = consoleBytes + minificationSavings;
    console.log(`Total potential savings:    ~${(totalSavings / 1024).toFixed(2)} KB`);
    console.log(`Optimized size estimate:    ~${((analysis.summary.totalSize - totalSavings) / 1024).toFixed(2)} KB`);

    console.log('\n📋 RECOMMENDATIONS\n');
    console.log('1. Run build script to remove console.log/debug statements');
    console.log('2. Use advanced build (npm run build:advanced) for aggressive minification');
    console.log('3. Consider lazy loading large modules (caldav-client.js, weather-narrative-engine.js)');
    console.log('4. Reduce weather comment arrays in weather-narrative-engine.js');

    // Save analysis to JSON
    const outputPath = path.join(__dirname, 'bundle-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2), 'utf8');
    console.log(`\n💾 Analysis saved to: bundle-analysis.json\n`);
}

// Run analysis
console.log('\nAnalyzing files...\n');
SOURCE_FILES.forEach(analyzeFile);
generateSummary();
