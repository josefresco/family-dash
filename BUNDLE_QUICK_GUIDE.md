# Bundle Optimization Quick Guide

## Quick Start

### For Production Deployment
```bash
npm run build:optimized
```

This creates optimized bundles in the `dist/` folder:
- `core-bundle.js` (9.89 KB) - Utilities
- `app-bundle.js` (50.05 KB) - Main application
- `caldav-client.js` (7.16 KB) - Lazy loaded when needed

### Build Options

| Command | Size | Reduction | Use Case |
|---------|------|-----------|----------|
| `npm run build` | 137.05 KB | 14% | Development |
| `npm run build:advanced` | 67.00 KB | 58% | Testing |
| `npm run build:optimized` | 59.94 KB* | 62.5%* | **Production** |

*Initial load size (excludes lazy-loaded modules)

### Analyze Your Bundle
```bash
npm run analyze
```

View detailed statistics about file sizes and optimization opportunities.

## What Changed

### 1. Weather Comments Reduced
- Before: 108 comments (17.18 KB)
- After: 56 comments (14.15 KB)
- Still plenty of variety!

### 2. CalDAV Lazy Loading
- Only loads when calendar is configured
- Saves ~7 KB on initial page load
- Automatically loaded when needed

### 3. Module Bundling
- Individual files combined into optimized bundles
- Reduces HTTP requests
- Better compression

## File Structure

```
src/
  ├── Individual modules (for development)

dist/
  ├── core-bundle.js      # Core utilities
  ├── app-bundle.js       # Main application
  ├── caldav-client.js    # Lazy loaded
  └── *.html              # HTML files
```

## Performance Impact

**Initial JavaScript Load:**
- Before: 160.02 KB
- After: 59.94 KB
- **Improvement: 62.5% smaller**

**With gzip (estimated):**
- ~18-24 KB total
- **~90% smaller than original**

## Development vs Production

### Development
Use unbundled files or basic build:
```bash
# No build needed, or:
npm run build
```

### Production
Use optimized bundles:
```bash
npm run build:optimized
```

## Troubleshooting

### Calendar not loading?
CalDAV is lazy-loaded. It will automatically load when:
1. Dashboard initializes
2. Calendar configuration is detected

### Want individual files?
Use `npm run build:advanced` for minified individual files.

### Need source maps?
Edit build scripts and set `sourceMap: true` in Terser options.

## Next Steps

1. ✅ Build optimized bundle
2. ✅ Test in dist/ folder
3. ✅ Deploy to production
4. ⏭️ Enable gzip/brotli on server (huge additional savings!)
5. ⏭️ Monitor real-world performance

## Questions?

See `BUNDLE_OPTIMIZATION.md` for detailed technical information.
