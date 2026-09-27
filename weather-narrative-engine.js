// WeatherNarrativeEngine - Centralized weather forecast text generation
// Consolidates duplicate weather logic from app-client.js and api-client.js

class WeatherNarrativeEngine {
    /**
     * Create the forecast text for the "today" summary panel
     * @param {Object} data - Weather data object
     * @returns {string} Forecast text
     */
    createTodayForecast(data) {
        if (data.daily_summary?.summary) {
            return data.daily_summary.summary;
        }

        const temp = data.temperature ?? data.daily_summary?.current_temp ?? data.daily_summary?.high_temp ?? 70;
        const condition = (data.description || data.daily_summary?.description || 'partly cloudy').toLowerCase();
        const humidity = data.humidity ?? 50;
        const windSpeed = data.windSpeed || 0;

        let forecast = '';
        if (temp >= 80) forecast = "It's hot out there! ";
        else if (temp >= 70) forecast = "Beautiful weather right now! ";
        else if (temp >= 60) forecast = "Pleasant conditions today! ";
        else if (temp >= 40) forecast = "A bit cool - jacket weather! ";
        else forecast = "Bundle up - it's chilly! ";

        if (condition.includes('rain') || condition.includes('shower')) forecast += "Rain in the area. ";
        else if (condition.includes('snow')) forecast += "Snow is falling! ";
        else if (condition.includes('clear') || condition.includes('sunny')) forecast += "Clear and bright! ";
        else if (condition.includes('cloud')) forecast += "Overcast skies. ";

        if (humidity > 70) forecast += "Feeling humid. ";
        else if (humidity < 30) forecast += "Nice and dry. ";
        if (windSpeed > 15) forecast += "Quite breezy today. ";
        else if (windSpeed > 8) forecast += "Light breeze. ";

        return forecast.trim();
    }

    /**
     * Create the forecast text for the "tomorrow" summary panel
     * @param {Object} data - Weather data object
     * @returns {string} Forecast text
     */
    createTomorrowForecast(data) {
        const summary = data.daily_summary;

        if (summary?.summary) {
            return summary.summary;
        }

        const temp = summary?.high_temp;
        const condition = (summary?.description || '').toLowerCase();
        const precipitation = data.precipitation;

        let forecast = '';
        if (temp == null) forecast = '';
        else if (temp >= 80) forecast = "It's going to be a hot one! ";
        else if (temp >= 70) forecast = "Perfect weather ahead! ";
        else if (temp >= 60) forecast = "Pleasant temperatures expected! ";
        else if (temp >= 40) forecast = "Pack a jacket - it'll be cool! ";
        else forecast = "Bundle up - it's going to be chilly! ";

        if (condition.includes('rain') || condition.includes('shower')) forecast += "Keep an umbrella handy. ";
        else if (condition.includes('snow')) forecast += "Snow is in the forecast! ";
        else if (condition.includes('clear') || condition.includes('sunny')) forecast += "Clear skies all day! ";
        else if (condition.includes('cloud')) forecast += "Cloudy but dry conditions. ";

        if (precipitation?.expected) {
            const precipType = precipitation.hours?.[0]?.type || 'precipitation';
            forecast += `Expect ${precipitation.total_hours}h of ${precipType}. `;
        }

        return forecast.trim() || 'Forecast details unavailable.';
    }

    /**
     * One plain heads-up line for the summary panel: upcoming rain/snow/storms
     * and temperatures below 40°F. Returns '' when there is nothing to flag.
     * @param {Object} data - Weather data object
     * @param {string} forecast - Forecast text already shown, so a cue it covers is skipped
     * @param {string} view - 'today' or 'tomorrow'
     * @returns {string} Heads-up text
     */
    createHeadsUp(data, forecast, view) {
        const cues = [];
        const shown = (forecast || '').toLowerCase();

        const precipOf = (description) => {
            const d = (description || '').toLowerCase();
            if (d.includes('thunderstorm')) return { label: 'Storms', word: 'storm' };
            if (d.includes('snow') || d.includes('sleet')) return { label: 'Snow', word: 'snow' };
            if (d.includes('rain') || d.includes('drizzle') || d.includes('shower')) return { label: 'Rain', word: 'rain' };
            return null;
        };
        for (const hour of data.hourly_forecasts || []) {
            const precip = precipOf(hour.description);
            if (!precip) continue;
            if (!shown.includes(precip.word)) cues.push(`${precip.label} expected around ${hour.time}.`);
            break;
        }

        const high = data.daily_summary?.high_temp;
        const low = data.daily_summary?.low_temp;
        const now = data.temperature ?? data.daily_summary?.current_temp;
        if (high != null && high < 40) cues.push(`Cold all day, high of ${high}°F.`);
        else if (view === 'today' && now != null && now < 40) cues.push(`Cold now, warming to ${high ?? now}°F.`);
        else if (view === 'tomorrow' && low != null && low < 40) cues.push(`Cold morning, low of ${low}°F.`);

        return cues.join(' ');
    }

    /**
     * Generate a simple weather summary (used by API client)
     * @param {Object} currentData - Current weather data
     * @param {number} highTemp - High temperature
     * @param {number} lowTemp - Low temperature
     * @returns {string} Summary text
     */
    generateWeatherSummary(currentData, highTemp, lowTemp) {
        const condition = currentData.weather[0].description.toLowerCase();

        let summary = '';

        // Focus on weather story, not temperatures
        if (condition.includes('rain')) {
            summary = 'Rainy conditions are in the forecast. ';
        } else if (condition.includes('snow')) {
            summary = 'Snow is expected today. ';
        } else if (condition.includes('clear')) {
            summary = 'Beautiful clear skies await you. ';
        } else if (condition.includes('cloud')) {
            summary = 'Cloudy weather is expected. ';
        } else {
            summary = `${condition.charAt(0).toUpperCase() + condition.slice(1)} conditions today. `;
        }

        // Wind conditions
        const windSpeed = Math.round(currentData.wind?.speed || 0);
        if (windSpeed > 15) {
            summary += 'Strong winds expected. ';
        } else if (windSpeed > 8) {
            summary += 'Breezy conditions. ';
        }

        return summary.trim();
    }

    /**
     * Generate forecast summary for future weather
     * @param {Array} forecasts - Array of forecast data
     * @param {number} highTemp - High temperature
     * @param {number} lowTemp - Low temperature
     * @param {Object} firstForecast - First forecast object
     * @returns {string} Summary text
     */
    generateForecastSummary(forecasts, highTemp, lowTemp, firstForecast) {
        const condition = firstForecast.weather[0].description.toLowerCase();

        let summary = '';

        // Analyze conditions throughout the day - focus on story
        const conditions = forecasts.map(f => f.weather[0].description.toLowerCase());
        const hasRain = conditions.some(c => c.includes('rain'));
        const hasSnow = conditions.some(c => c.includes('snow'));
        const hasClear = conditions.some(c => c.includes('clear'));
        const mostlyCloudy = conditions.filter(c => c.includes('cloud')).length > conditions.length / 2;

        if (hasRain) {
            summary = 'Tomorrow brings rain showers. ';
        } else if (hasSnow) {
            summary = 'Snow is in tomorrow\'s forecast. ';
        } else if (hasClear && !mostlyCloudy) {
            summary = 'Tomorrow looks bright with clear skies. ';
        } else if (mostlyCloudy) {
            summary = 'Expect cloudy skies tomorrow. ';
        } else {
            summary = `Tomorrow will have ${condition} conditions. `;
        }

        // Wind analysis
        const avgWind = forecasts.reduce((sum, f) => sum + (f.wind?.speed || 0), 0) / forecasts.length;
        if (avgWind > 15) {
            summary += 'Windy conditions expected. ';
        } else if (avgWind > 8) {
            summary += 'Light to moderate breeze. ';
        }

        return summary.trim();
    }
}

// Export as global singleton
window.WeatherNarrativeEngine = WeatherNarrativeEngine;
window.weatherNarrativeEngine = new WeatherNarrativeEngine();
