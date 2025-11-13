// DateUtils - Centralized date and time utilities for the Family Dashboard
// Handles timezone conversions, date formatting, and date calculations

class DateUtils {
    constructor(config = {}) {
        this.defaultTimezone = config.timezone || 'America/New_York';
        this.tomorrowThresholdHour = config.tomorrowThresholdHour || 17;
    }

    /**
     * Get current time in specified timezone
     * @param {string} timezone - IANA timezone (e.g., 'America/New_York')
     * @returns {Date} Current date/time
     */
    getCurrentTimeInTimezone(timezone = this.defaultTimezone) {
        const now = new Date();
        return new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    }

    /**
     * Get current hour in specified timezone
     * @param {string} timezone - IANA timezone
     * @returns {number} Current hour (0-23)
     */
    getCurrentHourInTimezone(timezone = this.defaultTimezone) {
        const now = new Date();
        return parseInt(now.toLocaleString('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            hour12: false
        }), 10);
    }

    /**
     * Determine if display should show "today" or "tomorrow" based on current time
     * @param {string} timezone - IANA timezone
     * @param {number} thresholdHour - Hour after which to show tomorrow (default 17)
     * @returns {string} 'today' or 'tomorrow'
     */
    getDisplayMode(timezone = this.defaultTimezone, thresholdHour = this.tomorrowThresholdHour) {
        const currentHour = this.getCurrentHourInTimezone(timezone);
        return currentHour >= thresholdHour ? 'tomorrow' : 'today';
    }

    /**
     * Get target date based on display mode
     * @param {string} displayMode - 'today' or 'tomorrow'
     * @returns {Date} Target date
     */
    getTargetDate(displayMode) {
        const now = new Date();
        if (displayMode === 'tomorrow') {
            return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }
        return now;
    }

    /**
     * Get target date for a specific date string
     * @param {string} dateParam - 'today', 'tomorrow', or 'YYYY-MM-DD'
     * @returns {Date} Target date
     */
    getTargetDateFromParam(dateParam) {
        const now = new Date();

        if (dateParam === 'tomorrow') {
            return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        } else if (dateParam === 'today') {
            return now;
        } else if (dateParam && dateParam.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Handle specific date strings like "2025-09-13"
            const [year, month, day] = dateParam.split('-').map(Number);
            return new Date(year, month - 1, day);
        }

        return now;
    }

    /**
     * Get the start of day (00:00:00.000) for a date
     * @param {Date} date - Target date
     * @returns {Date} Start of day
     */
    getStartOfDay(date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        return startOfDay;
    }

    /**
     * Get the end of day (23:59:59.999) for a date
     * @param {Date} date - Target date
     * @returns {Date} End of day
     */
    getEndOfDay(date) {
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        return endOfDay;
    }

    /**
     * Format date for CalDAV time-range queries (YYYYMMDDTHHMMSSZ)
     * @param {Date} date - Date to format
     * @returns {string} CalDAV formatted date string
     */
    formatDateForCalDAV(date) {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }

    /**
     * Get display date string (e.g., "Today's Schedule" or "Tomorrow's Schedule")
     * @param {string} displayMode - 'today' or 'tomorrow'
     * @param {string} timezone - IANA timezone
     * @returns {string} HTML formatted display string
     */
    getDisplayDateString(displayMode, timezone = this.defaultTimezone) {
        const now = new Date();
        const targetDate = displayMode === 'tomorrow'
            ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
            : now;

        const dayName = targetDate.toLocaleDateString('en-US', {
            weekday: 'long',
            timeZone: timezone
        });
        const monthDay = targetDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            timeZone: timezone
        });

        const scheduleLabel = displayMode === 'tomorrow' ? "Tomorrow's Schedule" : "Today's Schedule";
        const dateInfo = `${dayName}, ${monthDay}`;

        return `${scheduleLabel}<br><small style="font-size: 14px; font-weight: 400; opacity: 0.8;">${dateInfo}</small>`;
    }

    /**
     * Format a date to local time string
     * @param {Date|string} date - Date to format
     * @param {string} timezone - IANA timezone
     * @returns {string} Formatted time string (e.g., "3:45 PM")
     */
    formatTime(date, timezone = this.defaultTimezone) {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: timezone
        });
    }

    /**
     * Format a date to local date string
     * @param {Date|string} date - Date to format
     * @param {string} timezone - IANA timezone
     * @returns {string} Formatted date string (e.g., "January 15, 2025")
     */
    formatDate(date, timezone = this.defaultTimezone) {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            timeZone: timezone
        });
    }

    /**
     * Calculate next weekend (Saturday and Sunday)
     * @param {Date} fromDate - Starting date (default: today)
     * @returns {Object} Object with saturday and sunday Date objects
     */
    getNextWeekend(fromDate = new Date()) {
        const currentDay = fromDate.getDay(); // 0 = Sunday, 6 = Saturday

        // Calculate days until next Saturday
        const daysUntilSaturday = currentDay === 0 ? 6 : (6 - currentDay);

        const nextSaturday = new Date(fromDate);
        nextSaturday.setDate(fromDate.getDate() + daysUntilSaturday);

        const nextSunday = new Date(nextSaturday);
        nextSunday.setDate(nextSaturday.getDate() + 1);

        return {
            saturday: nextSaturday,
            sunday: nextSunday
        };
    }

    /**
     * Get day of week name
     * @param {Date} date - Date to get day name for
     * @param {string} timezone - IANA timezone
     * @returns {string} Day name (e.g., "Monday")
     */
    getDayName(date, timezone = this.defaultTimezone) {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            timeZone: timezone
        });
    }

    /**
     * Check if a date is today
     * @param {Date} date - Date to check
     * @returns {boolean} True if date is today
     */
    isToday(date) {
        const now = new Date();
        return date.toDateString() === now.toDateString();
    }

    /**
     * Check if a date is tomorrow
     * @param {Date} date - Date to check
     * @returns {boolean} True if date is tomorrow
     */
    isTomorrow(date) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return date.toDateString() === tomorrow.toDateString();
    }

    /**
     * Parse ICS date format to JavaScript Date
     * @param {string} icsDate - ICS formatted date (YYYYMMDD or YYYYMMDDTHHMMSS)
     * @param {string} timezone - Optional timezone for timed events
     * @returns {string} ISO date string
     */
    parseICSDate(icsDate, timezone = null) {
        try {
            if (icsDate.length === 8) {
                // YYYYMMDD format (all-day event)
                const year = icsDate.substring(0, 4);
                const month = icsDate.substring(4, 6);
                const day = icsDate.substring(6, 8);
                return `${year}-${month}-${day}`;
            } else if (icsDate.includes('T')) {
                // YYYYMMDDTHHMMSS format
                const datePart = icsDate.split('T')[0];
                const timePart = icsDate.split('T')[1].replace('Z', '');

                const year = datePart.substring(0, 4);
                const month = datePart.substring(4, 6);
                const day = datePart.substring(6, 8);

                const hour = timePart.substring(0, 2);
                const minute = timePart.substring(2, 4);
                const second = timePart.substring(4, 6);

                return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
            }

            return icsDate;
        } catch (error) {
            console.error('Failed to parse ICS date:', icsDate, error);
            return icsDate;
        }
    }

    /**
     * Get relative time description (e.g., "in 2 hours", "5 minutes ago")
     * @param {Date} date - Target date
     * @returns {string} Relative time description
     */
    getRelativeTime(date) {
        const now = new Date();
        const diff = date - now;
        const absDiff = Math.abs(diff);

        const minutes = Math.floor(absDiff / (1000 * 60));
        const hours = Math.floor(absDiff / (1000 * 60 * 60));
        const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));

        const isPast = diff < 0;
        const suffix = isPast ? 'ago' : 'from now';

        if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''} ${suffix}`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ${suffix}`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ${suffix}`;
        } else {
            return 'just now';
        }
    }
}

// Export as global
window.DateUtils = DateUtils;

// Create default instance with config from dashboardConfig if available
window.dateUtils = new DateUtils({
    timezone: window.dashboardConfig?.get('settings.timezone') || 'America/New_York',
    tomorrowThresholdHour: window.dashboardConfig?.get('settings.tomorrow_threshold_hour') || 17
});
