// WeatherNarrativeEngine - Centralized weather narrative and commentary generation
// Consolidates duplicate weather logic from app-client.js and api-client.js

class WeatherNarrativeEngine {
    constructor() {
        // Weather-specific commentary arrays (108 total comments - doubled from original 54)
        this.sunnyOutdoorComments = [
            "Perfect excuse to touch grass! 🌱",
            "Time to make your vitamin D proud! ☀️",
            "Great day to be outside! 🌳",
            "Weather: 10/10, would recommend! 👌",
            "Mother Nature is showing off today! 💅",
            "Weather app says you're legally required to go outside! 📱",
            "Even your houseplants are jealous! 🪴",
            "This is your sign to cancel indoor plans! 🚪",
            "Weather so nice, it should be illegal! 🚨",
            "Your weather app is basically flexing right now! 💪",
            "Nature's apology for yesterday! 🙏",
            "Weather report: Chef's kiss approved! 👨‍🍳💋",
            "Forecast brought to you by good vibes only! ✨",
            "Weather: Netflix has left the chat! 📺❌",
            "Perfect day to pretend you're outdoorsy! 🏃‍♀️",
            "Even the weather app is smiling today! 😊",
            "Perfect for outdoor plans! 🚀",
            "Make it a great day! 🌟",
            "Sunscreen is your only homework today! 🧴",
            "The universe is giving you a free outdoor pass! 🎫",
            "Too nice to waste scrolling indoors! 📵",
            "Weather's flexing harder than your gym buddy! 🏋️",
            "Your AC unit is filing for unemployment! ❄️✖️",
            "Peak 'main character energy' weather! 🎬",
            "Nature's Instagram filter: ON! 📸",
            "The sun woke up and chose excellence! ☀️👑",
            "Weather so good, you'll forgive it for last week! 🤝",
            "Your calendar just cleared itself! 📅✨",
            "Golden hour lasting all day vibes! 🌅",
            "Weather app is showing off its A+ work! 📊",
            "Forecast: 100% chance of 'wow moments'! 🤩",
            "Even your introverted side wants out! 🚪➡️",
            "Mother Nature graduated top of her class! 🎓",
            "Weather brought to you by pure joy! 😄",
            "Today's forecast: absolutely radiant! ✨",
            "The sun is doing a victory lap! 🏆",
            "Weather that makes you believe in miracles! 🙌"
        ];

        this.cloudyOutdoorComments = [
            "Cloudy but comfortable for activities! ☁️",
            "Perfect overcast for hiking! 🥾",
            "Great weather for a walk! 🚶‍♀️",
            "No harsh sun - ideal for outdoor time! 🌫️",
            "Soft lighting courtesy of Mother Nature! 📷",
            "Perfect photography weather! 📸",
            "Great day for exploring! 🗺️",
            "Natural sun protection included! 🕶️",
            "Comfortable temps for being active! 💪",
            "Still a beautiful day to be out! 🌤️",
            "Clouds are just the sky's mood lighting! 🌥️",
            "No squinting required - eyes approved! 👀✅",
            "Nature's built-in shade system activated! ⛱️",
            "Perfect for those 'thoughtful walk' vibes! 🚶",
            "Clouds giving you that soft-focus glow! ✨",
            "Great weather for mystery novel walks! 📖",
            "Overcast means underrated outdoor time! 🌲",
            "The sky is wearing its cozy sweater! 🧥",
            "Goldilocks weather: not too bright, just right! 🐻",
            "Diffused sunlight = chef's kiss for photos! 💋"
        ];

        this.rainyIndoorComments = [
            "Perfect day to practice your couch potato skills! 🛋️",
            "Weather report: Netflix stock is up! 📈",
            "Time to channel your inner hermit! 🏠",
            "Weather brought to you by blanket season! 🛋️",
            "Perfect excuse to order takeout! 🥡",
            "Today's forecast: maximum coziness required! ☕",
            "Nature's way of saying 'read a book'! 📚",
            "Perfect day to win at being indoors! 🏆",
            "Weather: sponsored by hot chocolate! ☕",
            "Today's vibe: professional indoor enthusiast! 🏠",
            "Weather report: pajamas are business casual today! 👔➡️👕",
            "Perfect conditions for advanced sofa surfing! 🏄‍♀️",
            "Stay cozy! 🏠",
            "Mother Nature called in sick today! 🤒",
            "Weather app apologizes for the inconvenience! 📱😅",
            "Mother Nature hit the snooze button! 😴",
            "Rain is just the sky doing laundry! 🌧️🧺",
            "Perfect weather for your blanket fort empire! 🏰",
            "The clouds are having a spa day! 💆",
            "Indoor Olympics officially in session! 🏅",
            "Rain: Nature's 'do not disturb' sign! 🚫",
            "Your plants are happier than you right now! 🪴😊",
            "Time to be a baking show contestant! 🍰",
            "Weather says: movie marathon mandatory! 🎬",
            "Productivity from bed: 100% acceptable! 🛏️✅",
            "The outside is on timeout today! ⏱️",
            "Rainy day = guilt-free lazy day! 😌",
            "Perfect excuse to ignore your to-do list! 📝❌",
            "The universe is granting you a rest day! 🧘",
            "Weather: brought to you by fuzzy socks! 🧦",
            "Today's dress code: maximum comfort! 👕",
            "Rain check on life? Approved! ✓"
        ];

        this.coldIndoorComments = [
            "Bundle up or stay cozy inside! 🧥",
            "Perfect excuse for hot drinks and blankets! ☕",
            "Indoor activities are calling your name! 🏠",
            "Great day for warming up indoors! 🔥",
            "Weather brought to you by sweater season! 🧶",
            "Time to embrace the hygge lifestyle! 🕯️",
            "Perfect day for soup and comfort food! 🍲",
            "Indoor adventures await! 🎲",
            "Cozy vibes only today! ✨",
            "Mother Nature wants you to stay warm! ❄️",
            "Your thermostat is the MVP today! 🏆",
            "Time to show off your blanket collection! 🛋️",
            "Cold weather = hot cocoa season! ☕🔥",
            "Perfect day to become one with your couch! 🤝",
            "Winter is just nature's hibernation hint! 🐻",
            "Layers on layers: today's fashion trend! 🧥🧣",
            "Your heater deserves a raise! 💰",
            "Brrr-illiant day to stay inside! 🥶🏠",
            "Cold outside, warm inside = perfection! 🎯",
            "Time for competitive coziness! 🏅"
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
