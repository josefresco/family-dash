// WeatherNarrativeEngine - Centralized weather narrative and commentary generation
// Consolidates duplicate weather logic from app-client.js and api-client.js

class WeatherNarrativeEngine {
    constructor() {
        // Weather-specific commentary arrays (156 total — comedian-edition, family-friendly)
        this.sunnyOutdoorComments = [
            // Classic one-liners
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
            // Comedian-inspired
            "Carlin was right — gorgeous days are wasted on people who stay indoors! ☀️",
            "Richard Pryor wouldn't waste a day like this — get out there and make it count! 🌞🔥",
            "Rodney Dangerfield got no respect, but this weather respects YOU! ☀️👔",
            "Joan Rivers: 'Can we talk? It's TOO gorgeous to stay home!' 💅☀️",
            "Bill Burr: 'You have zero good excuses not to go outside. ZERO.' ☀️🎤",
            "Dave Chappelle: 'The sun is out — and so should you be! No excuses!' ☀️",
            "John Mulaney energy: this weather is a CHOICE and that choice should be outside! ☀️",
            "Norm Macdonald would call this 'pretty good, actually' — highest praise possible! 😐☀️",
            "Don Rickles would call you a bum for staying inside on a day like this, ya hockey puck! 😤☀️",
            "Wanda Sykes: 'Uh-uh, no excuses — get yourself out that door!' 👋☀️",
            "Mitch Hedberg: 'The weather outside is perfect. I'm gonna assume that's true and go out.' ☀️",
            "Amy Schumer approves: gorgeous outside — no reason not to be out there! ☀️",
            "Robin Williams energy: why are you still inside?! Go be spectacular! 🌟☀️",
            "Jerry Seinfeld: 'What IS it with perfect weather? You still can't find a parking spot.' ☀️",
            "Steven Wright: 'Beautiful day outside. Something feels off.' ☀️😐",
            "Jim Gaffigan: 'Gorgeous weather! Now I feel judged for having eaten breakfast in bed.' ☀️",
            "Kevin Hart: 'This weather?! INCREDIBLE! My whole body said YES today! LET'S GO!' ☀️🏃",
            "Ellen DeGeneres: 'Days like this — go outside, be kind, pet a dog. Do it.' ☀️🐶",
            "Conan O'Brien: 'Stunning weather. I'd fully enjoy it but I burn in under four minutes.' ☀️🧛",
            "Steve Martin: 'WELL EXCUUUSE ME — I must go enjoy this spectacular day immediately!' ☀️",
            "Jay Leno: 'Weather this good should come with a bill.' ☀️💸",
            "George Burns: 'Beautiful day. At my age, I count every single one of these.' ☀️",
            "Bob Hope: 'Perfect weather — makes you feel young for about twenty minutes.' ☀️",
            "Kathleen Madigan: 'Days like this remind you that everything terrible was worth it.' ☀️",
            "Mike Birbiglia: 'I had a plan to stay inside. The weather has ruined that plan magnificently.' ☀️",
            "Demetri Martin: 'The sun today: unprompted, unrequested, absolutely crushing it.' ☀️"
        ];

        this.cloudyOutdoorComments = [
            // Classic one-liners
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
            // Comedian-inspired
            "George Carlin: 'It's not the weather that's grey — it's your attitude!' ☁️",
            "Rodney Dangerfield cloudy day: still no respect, but at least no sunburn! ☁️👔",
            "Bill Burr: 'It's FINE. Stop being a baby about some clouds!' ☁️🎤",
            "Norm Macdonald's cloud review: 'Welp.' That's the whole review. ☁️😐",
            "Anthony Jeselnik: 'The sky looks how I feel about your life choices.' ☁️😈",
            "Joan Rivers: 'Even the sky needs a touch-up today, honey!' 💄☁️",
            "Sarah Silverman: clouds are just God saying 'meh' to the day. ☁️🤷",
            "Jeff Ross roasting today's weather: 'Is that a sky or my will to live?' ☁️🎤",
            "Phyllis Diller's silver lining: 'My face looks MUCH better in this lighting!' 😂☁️",
            "Henny Youngman's cloud review: 'Take my sunshine... please!' ☁️🎻",
            "Don Rickles: 'Beautiful day, ya hockey puck! ...no, I'm serious!' ☁️😤",
            "Jerry Seinfeld: 'Overcast. The sky can't commit. Classic sky.' ☁️",
            "Steven Wright: 'The sky is grey. I feel understood.' ☁️😐",
            "Jim Gaffigan: 'Cloudy but comfortable! Like a Wendy's — reliable, no surprises.' ☁️",
            "Kevin Hart: 'Cloudy? That's FINE! I'm not upset about it! I'm completely FINE!' ☁️😤",
            "Ellen DeGeneres: 'Cloudy skies are just the Earth being a little mysterious today.' ☁️",
            "Steve Martin: 'A magnificent grey sky! Nature at its most magnificently indifferent!' ☁️",
            "Jay Leno: 'Overcast today — like every conference call you've ever been on.' ☁️",
            "Bob Newhart: 'Well... it's overcast. And... that's just what it is today. Yes.' ☁️",
            "George Burns: 'Cloudy day. Still here to complain about it — that's a win.' ☁️",
            "Kathleen Madigan: 'Overcast is the introvert of weather. Not flashy. Gets the job done.' ☁️",
            "Mike Birbiglia: 'Grey skies — my entire emotional palette, externalized.' ☁️",
            "Demetri Martin: 'Clouds: fog with ambition and nowhere to be.' ☁️",
            "Mitch Hedberg: 'I like cloudy days because the sun owes me nothing and we both know it.' ☁️"
        ];

        this.rainyIndoorComments = [
            // Classic one-liners
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
            // Comedian-inspired
            "George Carlin on rain: 'It's not bad weather — it's nature's permission to cancel everything!' 🌧️",
            "Richard Pryor's rainy day plan: stay inside, pour a drink, be brilliant! 🥃🌧️",
            "Robin Williams: rainy days are nature's improv — embrace the beautiful chaos! 🌧️🎭",
            "Bill Burr: 'Rain's doing what it wants — maybe you should too!' 🌧️🎤",
            "Dave Chappelle: 'I'm staying inside! The weather said so!' 🌧️",
            "Amy Schumer's rainy day formula: wine, delivery, zero obligations — living the dream! 🍷🌧️",
            "John Mulaney: 'I am a large adult baby and I REFUSE to go out there!' 👶🌧️",
            "Anthony Jeselnik: 'Even the sky knows your plans were terrible.' ☔😈",
            "Norm Macdonald's weather report: 'It's raining. [long pause] Yeah.' 🌧️😐",
            "Wanda Sykes: 'Hell no! My hair just got done!' 💇‍♀️🌧️",
            "Joan Rivers: 'My hair will NOT survive this — we are staying home!' 💅☔",
            "Mitch Hedberg: 'Rain is like a concert — you didn't want to go out anyway!' 🌧️🎸",
            "Jeff Ross: 'This rain hits harder than my last relationship!' 💔🌧️",
            "Jerry Seinfeld: 'Rain — nature's way of saying your plans were probably bad anyway.' 🌧️",
            "Steven Wright: 'I thought about going outside. Then it started raining. Good call, rain.' 🌧️😐",
            "Jim Gaffigan: 'Rainy day! Perfect excuse to eat everything in the house slowly.' 🌧️🍕",
            "Kevin Hart: 'RAINING?! That's fine! I did NOT want to go anywhere ANYWAY!' 🌧️😤",
            "Ellen DeGeneres: 'Rainy days are the universe saying: rest, recharge, eat snacks.' ☔🍿",
            "Conan O'Brien: 'Rain. Once again the universe is not on my side.' 🌧️",
            "Steve Martin: 'It is RAINING! Wild and magnificent and completely inconvenient!' 🌧️",
            "Bob Hope: 'Raining like I owe it money.' 🌧️🎩",
            "Kathleen Madigan: 'Rainy day. The perfect alibi for absolutely everything.' 🌧️",
            "Mike Birbiglia: 'I had plans. The rain heard my plans. The rain had other plans.' ☔",
            "Demetri Martin: 'Rain is the sky changing its mind about today. Loudly.' 🌧️"
        ];

        this.coldIndoorComments = [
            // Classic one-liners
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
            // Comedian-inspired
            "George Carlin: 'The weather does not care about your plans — and honestly, fair enough!' ❄️",
            "Richard Pryor: 'It's colder than a politician's soul out there!' ❄️🎤",
            "Rodney Dangerfield: 'I asked the cold to give me some respect — it didn't!' ❄️👔",
            "Bill Burr: 'It's FREEZING! Who decided we'd live somewhere with seasons?!' 🥶🎤",
            "Robin Williams: 'Layer up or become a delightful human popsicle — your choice!' 🧊🎭",
            "Joan Rivers: 'I've had colder receptions, but barely, honey!' 💔❄️",
            "Dave Chappelle: 'Stay inside. Order food. Re-evaluate everything.' ❄️🛋️",
            "Amy Schumer's cold survival guide: tea, blanket, zero expectations. ❄️",
            "John Mulaney: 'This is a CRIME and someone should be arrested for it!' ❄️😤",
            "Sarah Silverman: 'Cold enough to make me consider being nicer to people.' ❄️😇",
            "Don Rickles: 'You'd stay inside too if you had a face like yours, pal!' ❄️😤",
            "Norm Macdonald: 'Cold as heck out there. Heck is very cold, turns out.' ❄️😐",
            "Jerry Seinfeld: 'Cold outside. This entire season is a terrible idea that keeps happening.' ❄️",
            "Steven Wright: 'It's cold. I have no feeling in my ambitions.' ❄️😐",
            "Jim Gaffigan: 'Freezing outside — perfect Hot Pocket weather. Every weather is Hot Pocket weather.' ❄️",
            "Kevin Hart: 'It is COLD! I did NOT agree to this!' 🥶",
            "Ellen DeGeneres: 'Cold days are nature's reminder to be cozy, kind, and mostly horizontal.' ❄️🛋️",
            "Conan O'Brien: 'Absolutely freezing. My face is doing something concerning.' 🥶",
            "Jay Leno: 'Cold enough that my excuses for skipping the gym feel medically justified.' ❄️",
            "Bob Hope: 'Cold as a January in Washington — and about as cheerful.' ❄️🎩",
            "Kathleen Madigan: 'Cold like this makes you rethink every city you have ever lived in.' ❄️",
            "Mike Birbiglia: 'I stepped outside for a moment. It was a cold, humbling mistake.' 🥶",
            "Demetri Martin: 'Winter is the planet asking you to become a blanket.' ❄️",
            "George Burns: 'Cold out there. Still warmer than some people I know.' ❄️"
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
     * Create today's narrative split into { forecast, commentary } for two-color rendering
     */
    createTodayNarrativeParts(data) {
        if (data.daily_summary?.summary) {
            return {
                forecast: data.daily_summary.summary,
                commentary: this.getWeatherEncouragement(data.daily_summary, data.precipitation)
            };
        }

        const temp = data.temperature || data.daily_summary?.current_temp || data.daily_summary?.high_temp || 70;
        const condition = (data.description || data.daily_summary?.description || 'partly cloudy').toLowerCase();
        const humidity = data.humidity || 50;
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

        const fallbackSummary = { high_temp: temp, description: condition };
        const fallbackPrecip = condition.includes('rain') || condition.includes('snow') ? { expected: true } : null;

        return { forecast: forecast.trim(), commentary: this.getWeatherEncouragement(fallbackSummary, fallbackPrecip) };
    }

    /**
     * Create tomorrow's narrative split into { forecast, commentary } for two-color rendering
     */
    createWeatherNarrativeParts(data) {
        const summary = data.daily_summary;

        if (summary?.summary) {
            return {
                forecast: summary.summary,
                commentary: this.getWeatherEncouragement(summary, data.precipitation)
            };
        }

        const temp = summary.high_temp;
        const condition = summary.description.toLowerCase();
        const precipitation = data.precipitation;

        let forecast = '';
        if (temp >= 80) forecast = "It's going to be a hot one! ";
        else if (temp >= 70) forecast = "Perfect weather ahead! ";
        else if (temp >= 60) forecast = "Pleasant temperatures expected! ";
        else if (temp >= 40) forecast = "Pack a jacket - it'll be cool! ";
        else forecast = "Bundle up - it's going to be chilly! ";

        if (condition.includes('rain') || condition.includes('shower')) forecast += "Keep an umbrella handy. ";
        else if (condition.includes('snow')) forecast += "Snow is in the forecast! ";
        else if (condition.includes('clear') || condition.includes('sunny')) forecast += "Clear skies all day! ";
        else if (condition.includes('cloud')) forecast += "Cloudy but dry conditions. ";

        if (precipitation && precipitation.expected) {
            const precipType = precipitation.hours[0]?.type || 'precipitation';
            forecast += `Expect ${precipitation.total_hours}h of ${precipType}. `;
        }

        return { forecast: forecast.trim(), commentary: this.getWeatherEncouragement(summary, precipitation) };
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
