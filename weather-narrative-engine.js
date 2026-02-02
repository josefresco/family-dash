// WeatherNarrativeEngine - Centralized weather narrative and commentary generation
// Consolidates duplicate weather logic from app-client.js and api-client.js

class WeatherNarrativeEngine {
    constructor() {
        // Weather-specific commentary arrays (106 total comments - includes 50 R-rated additions!)
        this.sunnyOutdoorComments = [
            "Perfect excuse to touch grass! 🌱",
            "Time to make your vitamin D proud! ☀️",
            "Weather: 10/10, would recommend! 👌",
            "Mother Nature is showing off today! 💅",
            "Weather app says you're legally required to go outside! 📱",
            "This is your sign to cancel indoor plans! 🚪",
            "Your weather app is basically flexing right now! 💪",
            "Weather report: Chef's kiss approved! 👨‍🍳💋",
            "Weather: Netflix has left the chat! 📺❌",
            "Sunscreen is your only homework today! 🧴",
            "Too nice to waste scrolling indoors! 📵",
            "Peak 'main character energy' weather! 🎬",
            "The sun woke up and chose excellence! ☀️👑",
            "Golden hour lasting all day vibes! 🌅",
            "Forecast: 100% chance of 'wow moments'! 🤩",
            // R-rated additions
            "Hot as balls outside - embrace it! 🔥🍒",
            "The sun is out and so should you be, dammit! ☀️",
            "Weather so nice, it's practically foreplay! 💋",
            "Get your ass outside, it's gorgeous! 🌞",
            "This weather fucks. Hard. 🔥",
            "Mother Nature's feeling slutty today! 💃",
            "Sun's out, buns out weather! 🍑☀️",
            "Holy shit, it's beautiful out there! 😍",
            "Weather hotter than your ex's new partner! 🔥",
            "Damn, even the weather is showing off today! 💅",
            "The kind of weather that makes you wanna call in 'sick'! 🤒😏",
            "Perfect day to give zero f*cks indoors! 🌞",
            "Weather so good it's borderline obscene! 🥵"
        ];

        this.cloudyOutdoorComments = [
            "Cloudy but comfortable for activities! ☁️",
            "Perfect overcast for hiking! 🥾",
            "Soft lighting courtesy of Mother Nature! 📷",
            "Perfect photography weather! 📸",
            "Natural sun protection included! 🕶️",
            "Clouds are just the sky's mood lighting! 🌥️",
            "No squinting required - eyes approved! 👀✅",
            "Perfect for those 'thoughtful walk' vibes! 🚶",
            "Clouds giving you that soft-focus glow! ✨",
            "Goldilocks weather: not too bright, just right! 🐻",
            // R-rated additions
            "Overcast like your ex's personality! ☁️😒",
            "Clouds thicker than a Kardashian! 🍑☁️",
            "The sky's looking thicc today! 🌥️",
            "Moody weather for moody bitches! 💅☁️",
            "Grey skies, zero f*cks given! 🤷",
            "Cloudy with a chance of not giving a damn! ☁️",
            "The sky looks hungover but still cute! 🍻☁️",
            "Nature's 'soft filter' for your walk of shame! 📸",
            "Even the weather is feeling emo today! 🖤☁️",
            "Perfect for hiding from your responsibilities! 🏃☁️",
            "Clouds rolling in like your in-laws! 😬☁️",
            "Sky's looking as confused as my love life! 🌥️"
        ];

        this.rainyIndoorComments = [
            "Perfect day to practice your couch potato skills! 🛋️",
            "Weather report: Netflix stock is up! 📈",
            "Weather brought to you by blanket season! 🛋️",
            "Today's forecast: maximum coziness required! ☕",
            "Nature's way of saying 'read a book'! 📚",
            "Weather: sponsored by hot chocolate! ☕",
            "Today's vibe: professional indoor enthusiast! 🏠",
            "Weather report: pajamas are business casual today! 👔➡️👕",
            "Mother Nature hit the snooze button! 😴",
            "Rain is just the sky doing laundry! 🌧️🧺",
            "Perfect weather for your blanket fort empire! 🏰",
            "Rain: Nature's 'do not disturb' sign! 🚫",
            "Weather says: movie marathon mandatory! 🎬",
            "Productivity from bed: 100% acceptable! 🛏️✅",
            "Rainy day = guilt-free lazy day! 😌",
            "Rain check on life? Approved! ✓",
            // R-rated additions
            "Wet outside, stay inside and get wet... your whistle! 🍺🌧️",
            "Rain so hard it's practically pornographic! 🌧️💦",
            "F*ck it, it's a Netflix and actually chill day! 📺",
            "Weather giving major 'stay in bed with someone' vibes! 🛏️😏",
            "The sky is pissing down - don't go out there! ☔",
            "Raining like God left the damn faucet on! 🌧️",
            "Perfect excuse to day-drink guilt-free! 🍷🌧️",
            "Mother Nature is having a breakdown - stay inside! 😭🌧️",
            "Too wet to function - couch it is! 🛋️💦",
            "The sky's crying harder than you did at that movie! 😢🌧️",
            "Shitty weather = excellent excuse to be a slob! 🛋️",
            "Rain making everywhere look like a wet t-shirt contest! 👕💦",
            "Weather saying 'your plans can kiss my ass!' ☔🍑"
        ];

        this.coldIndoorComments = [
            "Bundle up or stay cozy inside! 🧥",
            "Perfect excuse for hot drinks and blankets! ☕",
            "Weather brought to you by sweater season! 🧶",
            "Time to embrace the hygge lifestyle! 🕯️",
            "Perfect day for soup and comfort food! 🍲",
            "Cozy vibes only today! ✨",
            "Mother Nature wants you to stay warm! ❄️",
            "Your thermostat is the MVP today! 🏆",
            "Cold weather = hot cocoa season! ☕🔥",
            "Perfect day to become one with your couch! 🤝",
            "Winter is just nature's hibernation hint! 🐻",
            "Layers on layers: today's fashion trend! 🧥🧣",
            "Brrr-illiant day to stay inside! 🥶🏠",
            "Cold outside, warm inside = perfection! 🎯",
            "Time for competitive coziness! 🏅",
            // R-rated additions
            "Cold as a witch's tit out there! 🧙‍♀️❄️",
            "Freezing your balls off weather! 🥶🍒",
            "It's colder than my ex's heart! 💔❄️",
            "Jack Frost can kiss my warm ass! 🍑❄️",
            "Nippy? More like nipples-visible cold! 🥶",
            "Time to snuggle or get f*cking cold! 🛋️❄️",
            "Cold enough to freeze the tits off a brass monkey! 🐒❄️",
            "Your heating bill is about to get f*cked! 💸❄️",
            "Whiskey weather - doctor's orders! 🥃❄️",
            "Colder than a penguin's pecker! 🐧❄️",
            "Perfect weather for spooning... or more! 🥄😏",
            "So cold, Hell might actually freeze over! 😈❄️"
        ];
    }

    /**
     * Get weather-specific encouragement based on conditions
     * @param {Object} summary - Daily weather summary with high_temp and description
     * @param {Object} precipitation - Precipitation data
     * @returns {string} Random encouraging comment
     */
    getWeatherEncouragement(summary, precipitation) {
        const temp = summary.high_temp;
        const condition = summary.description.toLowerCase();

        // Determine weather category and return appropriate comment
        if (condition.includes('rain') || condition.includes('shower') || condition.includes('storm') ||
            (precipitation && precipitation.expected)) {
            return this.rainyIndoorComments[Math.floor(Math.random() * this.rainyIndoorComments.length)];
        } else if (condition.includes('snow') || temp < 40) {
            return this.coldIndoorComments[Math.floor(Math.random() * this.coldIndoorComments.length)];
        } else if (condition.includes('clear') || condition.includes('sunny') ||
                   (temp >= 70 && !condition.includes('cloud'))) {
            return this.sunnyOutdoorComments[Math.floor(Math.random() * this.sunnyOutdoorComments.length)];
        } else if (condition.includes('cloud') || condition.includes('overcast') ||
                   (temp >= 55 && temp < 70)) {
            return this.cloudyOutdoorComments[Math.floor(Math.random() * this.cloudyOutdoorComments.length)];
        } else if (temp >= 60) {
            // Default to sunny outdoor comments for pleasant weather
            return this.sunnyOutdoorComments[Math.floor(Math.random() * this.sunnyOutdoorComments.length)];
        } else {
            // Default to indoor comments for less ideal weather
            return this.rainyIndoorComments[Math.floor(Math.random() * this.rainyIndoorComments.length)];
        }
    }

    /**
     * Create a weather narrative for "today" view
     * @param {Object} data - Weather data object
     * @returns {string} Narrative text
     */
    createTodayNarrative(data) {
        // Use API-generated summary if available
        if (data.daily_summary?.summary) {
            const apiSummary = data.daily_summary.summary;

            // Get weather-specific encouragement
            const encouragement = this.getWeatherEncouragement(data.daily_summary, data.precipitation);

            return apiSummary + " " + encouragement;
        }

        // Fallback to custom narrative if no API summary
        const temp = data.temperature || data.daily_summary?.current_temp || data.daily_summary?.high_temp || 70;
        const condition = (data.description || data.daily_summary?.description || 'partly cloudy').toLowerCase();
        const humidity = data.humidity || 50;
        const windSpeed = data.windSpeed || 0;

        let narrative = '';

        // Current condition assessment
        if (temp >= 80) {
            narrative = "🔥 It's hot out there! ";
        } else if (temp >= 70) {
            narrative = "☀️ Beautiful weather right now! ";
        } else if (temp >= 60) {
            narrative = "🌤️ Pleasant conditions today! ";
        } else if (temp >= 40) {
            narrative = "🧥 A bit cool - jacket weather! ";
        } else {
            narrative = "❄️ Bundle up - it's chilly! ";
        }

        // Add condition-specific details
        if (condition.includes('rain') || condition.includes('shower')) {
            narrative += "Rain in the area. ";
        } else if (condition.includes('snow')) {
            narrative += "Snow is falling! ";
        } else if (condition.includes('clear') || condition.includes('sunny')) {
            narrative += "Clear and bright! ";
        } else if (condition.includes('cloud')) {
            narrative += "Overcast skies. ";
        }

        // Add comfort details
        if (humidity > 70) {
            narrative += "Feeling humid. ";
        } else if (humidity < 30) {
            narrative += "Nice and dry. ";
        }

        if (windSpeed > 15) {
            narrative += "Quite breezy today. ";
        } else if (windSpeed > 8) {
            narrative += "Light breeze. ";
        }

        // Get weather-specific encouragement for fallback narrative
        const fallbackSummary = {
            high_temp: temp,
            description: condition
        };
        const fallbackPrecipitation = condition.includes('rain') || condition.includes('snow') ? { expected: true } : null;
        const encouragement = this.getWeatherEncouragement(fallbackSummary, fallbackPrecipitation);
        narrative += encouragement;

        return narrative;
    }

    /**
     * Create a weather narrative for "tomorrow" view
     * @param {Object} data - Weather data object
     * @returns {string} Narrative text
     */
    createWeatherNarrative(data) {
        const summary = data.daily_summary;

        // Use API-generated summary if available
        if (summary?.summary) {
            const apiSummary = summary.summary;

            // Get weather-specific encouragement
            const encouragement = this.getWeatherEncouragement(summary, data.precipitation);

            return apiSummary + " " + encouragement;
        }

        // Fallback to custom narrative if no API summary
        const temp = summary.high_temp;
        const condition = summary.description.toLowerCase();
        const precipitation = data.precipitation;

        let narrative = '';

        // Temperature-based opening
        if (temp >= 80) {
            narrative = "🔥 It's going to be a hot one! ";
        } else if (temp >= 70) {
            narrative = "☀️ Perfect weather ahead! ";
        } else if (temp >= 60) {
            narrative = "🌤️ Pleasant temperatures expected! ";
        } else if (temp >= 40) {
            narrative = "🧥 Pack a jacket - it'll be cool! ";
        } else {
            narrative = "❄️ Bundle up - it's going to be chilly! ";
        }

        // Add condition-specific details
        if (condition.includes('rain') || condition.includes('shower')) {
            narrative += "Keep an umbrella handy. ";
        } else if (condition.includes('snow')) {
            narrative += "Snow is in the forecast! ";
        } else if (condition.includes('clear') || condition.includes('sunny')) {
            narrative += "Clear skies all day! ";
        } else if (condition.includes('cloud')) {
            narrative += "Cloudy but dry conditions. ";
        }

        // Add precipitation details if present
        if (precipitation && precipitation.expected) {
            const precipType = precipitation.hours[0]?.type || 'precipitation';
            const hours = precipitation.total_hours;
            narrative += `Expect ${hours}h of ${precipType}. `;
        }

        // Get weather-specific encouragement
        const encouragement = this.getWeatherEncouragement(summary, precipitation);
        narrative += encouragement;

        return narrative;
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
