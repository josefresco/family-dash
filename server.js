'use strict';
require('dotenv').config();
const express = require('express');
const basicAuth = require('express-basic-auth');
const path = require('path');
const calendarRoute = require('./api/calendar');

const app = express();

// HTTP Basic Auth — single shared family password
app.use(basicAuth({
  users: { [process.env.DASHBOARD_USERNAME]: process.env.DASHBOARD_PASSWORD },
  challenge: true,
  realm: 'Family Dashboard',
}));

app.use(express.json());

// Config endpoint — returns weather key + CalDAV account list (no passwords)
app.get('/api/config', (req, res) => {
  const accounts = [];
  let i = 1;
  while (process.env[`CALDAV_${i}_LABEL`]) {
    accounts.push({
      id: `acc_${i}`,
      label: process.env[`CALDAV_${i}_LABEL`],
      provider: process.env[`CALDAV_${i}_PROVIDER`] || 'google',
      color: process.env[`CALDAV_${i}_COLOR`] || '#4285f4',
    });
    i++;
  }
  const location = {};
  if (process.env.LOCATION_ZIP)      location.zip = process.env.LOCATION_ZIP;
  if (process.env.LOCATION_TIMEZONE) location.timezone = process.env.LOCATION_TIMEZONE;

  res.json({
    openweather_api_key: process.env.OPENWEATHER_API_KEY,
    location: Object.keys(location).length ? location : undefined,
    caldav_accounts: accounts,
  });
});

// Calendar proxy — credentials looked up server-side by accountId
app.post('/api/calendar', calendarRoute);

// Static files — serve project root
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3003;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`family-dash running on http://127.0.0.1:${PORT}`);
});
