// Logger - Centralized logging utility for the Family Dashboard
// Replaces scattered console.log statements with structured logging

class Logger {
    constructor(options = {}) {
        this.level = options.level || 'info'; // 'debug', 'info', 'warn', 'error'
        this.enabled = options.enabled !== undefined ? options.enabled : true;
        this.prefix = options.prefix || 'Dashboard';

        // Log levels (lower number = more important)
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };

        this.currentLevel = this.levels[this.level] || this.levels.info;
    }

    /**
     * Set logging level
     * @param {string} level - 'debug', 'info', 'warn', or 'error'
     */
    setLevel(level) {
        if (this.levels[level] !== undefined) {
            this.level = level;
            this.currentLevel = this.levels[level];
        }
    }

    /**
     * Enable or disable logging
     * @param {boolean} enabled - Whether to enable logging
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Format log message with timestamp and prefix
     * @param {string} level - Log level
     * @param {string} message - Message to log
     * @returns {string} Formatted message
     */
    formatMessage(level, message) {
        const timestamp = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        return `[${timestamp}] [${this.prefix}] [${level.toUpperCase()}] ${message}`;
    }

    /**
     * Check if message should be logged based on current level
     * @param {string} level - Level to check
     * @returns {boolean} Whether to log
     */
    shouldLog(level) {
        return this.enabled && this.levels[level] >= this.currentLevel;
    }

    /**
     * Log debug message
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments to log
     */
    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.log(this.formatMessage('debug', message), ...args);
        }
    }

    /**
     * Log info message
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments to log
     */
    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.log(this.formatMessage('info', message), ...args);
        }
    }

    /**
     * Log warning message
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments to log
     */
    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message), ...args);
        }
    }

    /**
     * Log error message
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments to log
     */
    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message), ...args);
        }
    }

    /**
     * Create a child logger with a specific context prefix
     * @param {string} context - Context name for the child logger
     * @returns {Logger} New logger instance with context
     */
    child(context) {
        return new Logger({
            level: this.level,
            enabled: this.enabled,
            prefix: `${this.prefix}:${context}`
        });
    }

    /**
     * Log with custom emoji prefix for visual categorization
     * @param {string} emoji - Emoji to prefix message
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments
     */
    withEmoji(emoji, message, ...args) {
        if (this.shouldLog('info')) {
            console.log(`${emoji} ${this.formatMessage('info', message)}`, ...args);
        }
    }

    /**
     * Log a group of related messages
     * @param {string} title - Group title
     * @param {Function} callback - Function containing grouped logs
     */
    group(title, callback) {
        if (this.shouldLog('info')) {
            console.group(this.formatMessage('info', title));
            try {
                callback();
            } finally {
                console.groupEnd();
            }
        }
    }

    /**
     * Log a table of data
     * @param {Array|Object} data - Data to display in table format
     * @param {string} label - Optional label for the table
     */
    table(data, label = null) {
        if (this.shouldLog('debug')) {
            if (label) {
                console.log(this.formatMessage('debug', label));
            }
            console.table(data);
        }
    }

    /**
     * Time a function execution and log the result
     * @param {string} label - Label for the timer
     * @param {Function} callback - Function to time
     * @returns {*} Result of callback function
     */
    time(label, callback) {
        const timerLabel = `${this.prefix}:${label}`;
        if (this.shouldLog('debug')) {
            console.time(timerLabel);
        }
        try {
            return callback();
        } finally {
            if (this.shouldLog('debug')) {
                console.timeEnd(timerLabel);
            }
        }
    }

    /**
     * Time an async function execution and log the result
     * @param {string} label - Label for the timer
     * @param {Function} callback - Async function to time
     * @returns {Promise<*>} Result of callback function
     */
    async timeAsync(label, callback) {
        const timerLabel = `${this.prefix}:${label}`;
        if (this.shouldLog('debug')) {
            console.time(timerLabel);
        }
        try {
            return await callback();
        } finally {
            if (this.shouldLog('debug')) {
                console.timeEnd(timerLabel);
            }
        }
    }
}

// Create global logger instances
window.Logger = Logger;

// Main dashboard logger (default info level for production)
window.logger = new Logger({
    level: 'info',
    enabled: true,
    prefix: 'Dashboard'
});

// Create context-specific loggers for different modules
window.loggers = {
    api: new Logger({ prefix: 'API', level: 'info' }),
    weather: new Logger({ prefix: 'Weather', level: 'info' }),
    calendar: new Logger({ prefix: 'Calendar', level: 'info' }),
    caldav: new Logger({ prefix: 'CalDAV', level: 'info' }),
    dom: new Logger({ prefix: 'DOM', level: 'info' }),
    config: new Logger({ prefix: 'Config', level: 'info' })
};

// Helper to set all loggers to debug mode
window.enableDebugLogging = () => {
    window.logger.setLevel('debug');
    Object.values(window.loggers).forEach(log => log.setLevel('debug'));
    console.log('🐛 Debug logging enabled for all modules');
};

// Helper to set all loggers to info mode (production)
window.enableProductionLogging = () => {
    window.logger.setLevel('info');
    Object.values(window.loggers).forEach(log => log.setLevel('info'));
    console.log('📊 Production logging enabled');
};

// Helper to disable all logging
window.disableLogging = () => {
    window.logger.setEnabled(false);
    Object.values(window.loggers).forEach(log => log.setEnabled(false));
    console.log('🔇 Logging disabled');
};
