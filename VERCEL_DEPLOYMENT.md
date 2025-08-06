# Vercel Deployment Guide for Family Dashboard CalDAV Proxy

## Overview
This guide explains how to deploy the serverless CalDAV proxy to Vercel, enabling your always-on family dashboard to work with calendar services without CORS issues.

## Prerequisites
- Vercel account (free): https://vercel.com/signup
- GitHub account (you already have this)

## Deployment Steps

### 1. Install Vercel CLI (Optional)
```bash
npm install -g vercel
```

### 2. Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Import Project**: Click "Add New..." → "Project"
3. **Connect GitHub**: Select your `josefresco/family-dash` repository
4. **Configure Project**:
   - Project Name: `family-dash-api` (or any name you prefer)
   - Framework Preset: Other
   - Root Directory: `.` (leave as default)
   - Build Command: Leave empty
   - Output Directory: Leave empty
   - Install Command: Leave empty

5. **Environment Variables** (if needed): None required for basic setup

6. **Deploy**: Click "Deploy"

### 3. Get Your Vercel URL
After deployment, Vercel will provide a URL like:
```
https://family-dash-api.vercel.app
```

### 4. Update CalDAV Client
The CalDAV client is already configured to use:
- Local development: `http://localhost:3000`
- Production: `https://family-dash-api.vercel.app`

If your Vercel URL is different, update the `getProxyUrl()` method in `caldav-client.js`:

```javascript
getProxyUrl() {
    const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : 'https://YOUR-VERCEL-URL.vercel.app';  // Replace with your actual URL
        
    return `${baseUrl}/api/calendar`;
}
```

## How It Works

### Architecture
```
GitHub Pages (Dashboard) → Vercel (CalDAV Proxy) → Calendar Servers
```

1. **Dashboard** (GitHub Pages) makes requests to Vercel proxy
2. **Vercel Proxy** handles CalDAV authentication and requests server-side
3. **Calendar Servers** (Google, Apple, Outlook) return calendar data
4. **Proxy** returns formatted data to dashboard (no CORS issues)

### API Endpoint
- **URL**: `https://your-vercel-url.vercel.app/api/calendar`
- **Method**: POST
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "provider": "google",
  "username": "your.email@gmail.com", 
  "password": "your-app-password",
  "dateParam": "today"
}
```

## Testing

### Local Development
```bash
# Install Vercel CLI
npm install -g vercel

# Start local development server
vercel dev

# Test the API
curl -X POST http://localhost:3000/api/calendar \
  -H "Content-Type: application/json" \
  -d '{"provider":"google","username":"test@gmail.com","password":"test","dateParam":"today"}'
```

### Production Testing
Once deployed, test the production endpoint:
```bash
curl -X POST https://your-vercel-url.vercel.app/api/calendar \
  -H "Content-Type: application/json" \
  -d '{"provider":"google","username":"test@gmail.com","password":"test","dateParam":"today"}'
```

## Supported Calendar Providers

### Google Calendar
- **Setup**: Create an [App Password](https://support.google.com/accounts/answer/185833)
- **Username**: Your Gmail address
- **Password**: Generated app password (not your regular password)

### Apple iCloud Calendar
- **Setup**: Create an [app-specific password](https://support.apple.com/en-us/102654)
- **Username**: Your Apple ID
- **Password**: Generated app-specific password

### Microsoft Outlook
- **Username**: Your Outlook/Hotmail email
- **Password**: Your account password (or app password if 2FA enabled)

## Troubleshooting

### Common Issues

1. **CORS Errors**: The proxy should handle CORS automatically
2. **Authentication Failures**: Double-check app passwords and usernames
3. **502/500 Errors**: Check Vercel function logs in dashboard
4. **Timeout Issues**: CalDAV servers may be slow; function timeout is set appropriately

### Debug Steps

1. **Check Vercel Logs**: Visit your Vercel dashboard → Functions → View logs
2. **Test Locally**: Use `vercel dev` for local testing
3. **Verify Credentials**: Test CalDAV credentials with other CalDAV clients

## Security Notes

- ✅ **HTTPS Only**: All communication is encrypted
- ✅ **No Credential Storage**: Credentials are only used for requests, not stored
- ✅ **CORS Protection**: Only your dashboard domain can access the API
- ✅ **Server-Side Processing**: Sensitive operations happen server-side

## Cost
- **Vercel Free Tier**: 100GB bandwidth, 1M requests/month
- **Typical Usage**: Family dashboard uses ~1-10 requests/hour = ~240-2400/month
- **Cost**: FREE for typical family dashboard usage

## Benefits of This Architecture

✅ **Always Works**: No OAuth token refresh issues
✅ **No CORS Problems**: Server-side requests avoid browser restrictions  
✅ **Fast & Reliable**: Vercel edge functions with global CDN
✅ **Secure**: Proper HTTPS and credential handling
✅ **Scalable**: Handles multiple calendar providers
✅ **Cost-Effective**: Free tier covers typical usage

Your always-on family dashboard will now work perfectly! 🎉