# Build Guide - Quick Reference

## Quick Start

```bash
# Install dependencies
npm install

# Analyze current bundle
npm run analyze

# Build optimized version
npm run build:advanced

# View results
cat dist/BUILD_REPORT.txt
```

## Build Outputs

### Development (use source files)
- Location: Root directory (`*.js`)
- Size: 160 KB total
- Use for: Local development, debugging
- Console logs: Present
- Minified: No

### Production (use dist files)
- Location: `dist/` directory
- Size: 68 KB total (-57%)
- Use for: Deployment, GitHub Pages
- Console logs: Removed (except warn/error)
- Minified: Yes

## File Sizes Comparison

```
BEFORE → AFTER
─────────────────────────────
app-client.js          67 KB → 33 KB
api-client.js          25 KB → 10 KB
caldav-client.js       20 KB →  7 KB
weather-narrative.js   17 KB →  9 KB
error-handler.js       11 KB →  4 KB
date-utils.js          10 KB →  3 KB
logger.js               7 KB →  2 KB
config.js               2 KB →  1 KB
─────────────────────────────
TOTAL                 160 KB → 68 KB
```

## Deployment Options

### Option 1: GitHub Pages from dist/

```bash
# Build
npm run build:advanced

# Copy dist contents to gh-pages branch
git checkout gh-pages
cp -r dist/* .
git add .
git commit -m "Deploy optimized build"
git push origin gh-pages
```

### Option 2: Netlify

```toml
# netlify.toml
[build]
  command = "npm run build:advanced"
  publish = "dist"
```

### Option 3: Manual Deploy

1. Build: `npm run build:advanced`
2. Upload `dist/` folder contents to web server
3. Ensure gzip/brotli compression enabled

## Build Scripts Explained

### `npm run analyze`
- Scans source files
- Counts console logs, comments, functions
- Estimates optimization potential
- Output: `bundle-analysis.json`

### `npm run build`
- Basic optimization
- Removes console.log/debug
- Minifies template literals
- ~14% size reduction
- Output: `dist/` with `bundle-stats.json`

### `npm run build:advanced`
- Aggressive minification with Terser
- Dead code elimination
- Variable name mangling
- ~57% size reduction
- Output: `dist/` with `bundle-stats-advanced.json` and `BUILD_REPORT.txt`

### `npm run serve`
- Local web server
- Serves `dist/` folder
- Default: http://localhost:3000

### `npm run stats`
- Displays build statistics
- Shows file-by-file savings
- Requires prior build

## What Gets Optimized

✅ **Removed:**
- console.log statements
- console.debug statements
- All comments
- Extra whitespace
- Dead code
- Debugger statements

✅ **Preserved:**
- console.warn statements
- console.error statements
- Class names
- Function names (get*, set*, load*, etc.)
- String content
- Functionality

## Verification

### Check minified file works:
```bash
# Build
npm run build:advanced

# Check syntax
node -c dist/app-client.js

# Verify size
ls -lh dist/*.js
```

### Test in browser:
1. Build: `npm run build:advanced`
2. Serve: `npm run serve`
3. Open: http://localhost:3000/dashboard.html
4. Check console for errors
5. Verify all features work

## Troubleshooting

### Build fails with "terser not found"
```bash
npm install
```

### "Permission denied" when running build
```bash
chmod +x build.js build-advanced.js analyze-bundle.js
```

### Files missing from dist/
- Check that source files exist in root
- Ensure no syntax errors in source files
- Run with verbose: `node build-advanced.js`

### Minified code doesn't work
- Check browser console for errors
- Verify class names in `reserved` array (build-advanced.js)
- Test with basic build first: `npm run build`

## Performance Tips

### Enable Server Compression
Reduce transfer size by 60-70%:

**Nginx:**
```nginx
gzip on;
gzip_types text/javascript application/javascript;
```

**Apache (.htaccess):**
```apache
AddOutputFilterByType DEFLATE text/javascript application/javascript
```

### Browser Caching
Add cache headers for static assets:

```
Cache-Control: public, max-age=31536000
```

### Lazy Loading (Future Enhancement)
For even better performance:
```javascript
// Load CalDAV only when configured
if (config.caldav.enabled) {
    await import('./caldav-client.js');
}
```

## Monitoring Bundle Size

### Set size budgets in CI:
```javascript
// check-size.js
const stats = require('./dist/bundle-stats-advanced.json');
const maxSize = 75 * 1024; // 75 KB

if (stats.totals.optimizedSize > maxSize) {
    console.error(`Bundle too large: ${stats.totals.optimizedSize} bytes`);
    process.exit(1);
}
```

### GitHub Actions example:
```yaml
- name: Build and check size
  run: |
    npm install
    npm run build:advanced
    node check-size.js
```

## Regular Maintenance

Run analysis periodically:
```bash
# Check current state
npm run analyze

# Compare with previous builds
diff bundle-analysis.json previous-bundle-analysis.json
```

Monitor for:
- Growing file sizes
- New console.log statements
- Unused dependencies
- Duplicate code

## Documentation

- Full details: [BUNDLE_OPTIMIZATION.md](BUNDLE_OPTIMIZATION.md)
- Project readme: [README.md](README.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)
