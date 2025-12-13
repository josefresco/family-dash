/**
 * Claude Weather Service
 * Generates AI-powered weather descriptions using Claude API
 */

class ClaudeWeatherService {
    constructor(config) {
        this.config = config;
        this.apiEndpoint = 'https://api.anthropic.com/v1/messages';
        this.model = 'claude-3-5-sonnet-20241022';
        this.maxTokens = 300;
    }

    /**
     * Check if Claude API is configured
     */
    isConfigured() {
        const apiKey = this.config.get('claude_api_key');
        return !!(apiKey && apiKey.trim().length > 0);
    }

    /**
     * Generate a weather description using Claude API
     * @param {Object} weatherData - Weather data from OpenWeatherMap
     * @param {string} dateType - 'today' or 'tomorrow'
     * @returns {Promise<string>} - AI-generated weather description
     */
    async generateWeatherDescription(weatherData, dateType = 'today') {
        if (!this.isConfigured()) {
            console.log('Claude API not configured, skipping AI description');
            return null;
        }

        try {
            const apiKey = this.config.get('claude_api_key');

            // Build a comprehensive weather summary for Claude
            const weatherSummary = this.buildWeatherSummary(weatherData, dateType);

            const prompt = this.buildPrompt(weatherSummary, dateType);

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: this.maxTokens,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Claude API error:', errorData);
                return null;
            }

            const data = await response.json();

            // Extract the text from Claude's response
            if (data.content && data.content[0] && data.content[0].text) {
                return data.content[0].text.trim();
            }

            return null;

        } catch (error) {
            console.error('Error generating Claude weather description:', error);
            return null;
        }
    }

    /**
     * Build a weather summary from the weather data
     */
    buildWeatherSummary(weatherData, dateType) {
        const summary = {
            dateType: dateType,
            temperature: weatherData.temperature || weatherData.daily_summary?.current_temp,
            highTemp: weatherData.daily_summary?.high_temp,
            lowTemp: weatherData.daily_summary?.low_temp,
            condition: weatherData.description || weatherData.daily_summary?.description,
            humidity: weatherData.humidity,
            windSpeed: weatherData.windSpeed,
            visibility: weatherData.visibility,
            pressure: weatherData.pressure
        };

        // Add hourly forecasts if available
        if (weatherData.hourly_forecasts && weatherData.hourly_forecasts.length > 0) {
            summary.hourlyForecasts = weatherData.hourly_forecasts.map(forecast => ({
                time: forecast.time,
                temp: forecast.temperature,
                condition: forecast.description
            }));
        }

        return summary;
    }

    /**
     * Build the prompt for Claude
     */
    buildPrompt(weatherSummary, dateType) {
        const tempInfo = weatherSummary.highTemp && weatherSummary.lowTemp
            ? `High: ${Math.round(weatherSummary.highTemp)}°F, Low: ${Math.round(weatherSummary.lowTemp)}°F`
            : `Temperature: ${Math.round(weatherSummary.temperature)}°F`;

        let hourlyInfo = '';
        if (weatherSummary.hourlyForecasts && weatherSummary.hourlyForecasts.length > 0) {
            hourlyInfo = '\n\nUpcoming hours:\n';
            weatherSummary.hourlyForecasts.forEach(forecast => {
                hourlyInfo += `- ${forecast.time}: ${Math.round(forecast.temp)}°F, ${forecast.condition}\n`;
            });
        }

        const prompt = `You are a friendly weather assistant for a family dashboard. Write a brief, engaging weather summary for ${dateType}.

Weather data:
- Condition: ${weatherSummary.condition}
- ${tempInfo}
- Humidity: ${weatherSummary.humidity}%
- Wind: ${weatherSummary.windSpeed} mph${hourlyInfo}

Write a concise 2-3 sentence weather description that:
1. Describes what the weather will be like in a friendly, conversational tone
2. Suggests what to wear or activities that suit the weather
3. Is helpful for a family planning their day

Keep it brief, warm, and practical. Do NOT use emojis. Just friendly, clear text.`;

        return prompt;
    }

    /**
     * Generate a simple fallback description when Claude is not available
     */
    getFallbackDescription(weatherData, dateType) {
        const temp = weatherData.temperature || weatherData.daily_summary?.current_temp;
        const condition = weatherData.description || weatherData.daily_summary?.description;

        if (!temp || !condition) {
            return null;
        }

        const tempRounded = Math.round(temp);
        const conditionCapitalized = condition.charAt(0).toUpperCase() + condition.slice(1);

        return `${conditionCapitalized} with temperatures around ${tempRounded}°F.`;
    }

    /**
     * Get weather description (AI-generated if available, fallback otherwise)
     */
    async getWeatherDescription(weatherData, dateType = 'today') {
        if (this.isConfigured()) {
            const aiDescription = await this.generateWeatherDescription(weatherData, dateType);
            if (aiDescription) {
                return aiDescription;
            }
        }

        // Fallback to simple description
        return this.getFallbackDescription(weatherData, dateType);
    }
}

// Make it globally available
window.ClaudeWeatherService = ClaudeWeatherService;
