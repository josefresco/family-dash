// ErrorHandler - Centralized error handling for the Family Dashboard
// Provides consistent error handling patterns and user notifications

class ErrorHandler {
    constructor(options = {}) {
        this.logger = options.logger || window.logger;
        this.showUserNotifications = options.showUserNotifications !== undefined
            ? options.showUserNotifications
            : true;
        this.retryConfig = {
            maxRetries: options.maxRetries || 3,
            baseDelay: options.baseDelay || 1000, // 1 second
            maxDelay: options.maxDelay || 30000 // 30 seconds
        };
    }

    /**
     * Handle an error with logging and optional user notification
     * @param {Error|string} error - Error object or message
     * @param {Object} options - Error handling options
     * @returns {Object} Normalized error object
     */
    handle(error, options = {}) {
        const {
            context = 'Unknown',
            severity = 'error',
            showNotification = this.showUserNotifications,
            userMessage = null,
            logLevel = 'error'
        } = options;

        // Normalize error
        const normalizedError = this.normalizeError(error);

        // Log error
        const logMessage = `[${context}] ${normalizedError.message}`;
        if (this.logger) {
            this.logger[logLevel](logMessage, normalizedError.details);
        }

        // Show user notification if enabled
        if (showNotification) {
            const displayMessage = userMessage || this.getUserFriendlyMessage(normalizedError, context);
            this.showNotification(displayMessage, severity);
        }

        return normalizedError;
    }

    /**
     * Normalize error to a consistent format
     * @param {Error|string|Object} error - Error to normalize
     * @returns {Object} Normalized error
     */
    normalizeError(error) {
        if (error instanceof Error) {
            return {
                message: error.message,
                name: error.name,
                stack: error.stack,
                details: error
            };
        } else if (typeof error === 'string') {
            return {
                message: error,
                name: 'Error',
                stack: null,
                details: null
            };
        } else if (error && typeof error === 'object') {
            return {
                message: error.message || error.error || 'Unknown error',
                name: error.name || 'Error',
                stack: error.stack || null,
                details: error
            };
        }

        return {
            message: 'Unknown error occurred',
            name: 'UnknownError',
            stack: null,
            details: error
        };
    }

    /**
     * Get user-friendly error message
     * @param {Object} error - Normalized error
     * @param {string} context - Error context
     * @returns {string} User-friendly message
     */
    getUserFriendlyMessage(error, context) {
        const errorMessage = error.message.toLowerCase();

        // Network errors
        if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            return '⚠️ Network error. Please check your internet connection.';
        }

        // API key errors
        if (errorMessage.includes('api key') || errorMessage.includes('unauthorized')) {
            return '🔑 API key issue. Please check your configuration.';
        }

        // Calendar/CalDAV errors
        if (context.toLowerCase().includes('calendar') || context.toLowerCase().includes('caldav')) {
            if (errorMessage.includes('authentication') || errorMessage.includes('401')) {
                return '📅 Calendar authentication failed. Please reconnect your calendar.';
            }
            return '📅 Calendar error. Please try refreshing.';
        }

        // Weather errors
        if (context.toLowerCase().includes('weather')) {
            return '🌤️ Weather data unavailable. Please try again later.';
        }

        // Generic fallback
        return `⚠️ ${context} error. Please try again or contact support.`;
    }

    /**
     * Show notification to user
     * @param {string} message - Message to display
     * @param {string} type - Notification type ('info', 'success', 'warning', 'error')
     */
    showNotification(message, type = 'error') {
        // Check if showNotification method exists globally
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else if (window.dashboard && typeof window.dashboard.showNotification === 'function') {
            window.dashboard.showNotification(message, type);
        } else {
            // Fallback to console
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * Wrap an async function with error handling
     * @param {Function} fn - Async function to wrap
     * @param {Object} options - Error handling options
     * @returns {Function} Wrapped function
     */
    wrapAsync(fn, options = {}) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handle(error, options);
                if (options.rethrow) {
                    throw error;
                }
                return options.fallbackValue || null;
            }
        };
    }

    /**
     * Retry an async operation with exponential backoff
     * @param {Function} fn - Async function to retry
     * @param {Object} options - Retry options
     * @returns {Promise<*>} Result of successful operation
     */
    async retry(fn, options = {}) {
        const {
            maxRetries = this.retryConfig.maxRetries,
            baseDelay = this.retryConfig.baseDelay,
            maxDelay = this.retryConfig.maxDelay,
            context = 'Retry',
            shouldRetry = (error) => true
        } = options;

        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn(attempt);
            } catch (error) {
                lastError = error;

                // Check if we should retry
                if (attempt === maxRetries || !shouldRetry(error)) {
                    throw error;
                }

                // Calculate delay with exponential backoff
                const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

                if (this.logger) {
                    this.logger.warn(
                        `[${context}] Attempt ${attempt + 1}/${maxRetries + 1} failed. Retrying in ${delay}ms...`,
                        error
                    );
                }

                // Wait before retrying
                await this.sleep(delay);
            }
        }

        throw lastError;
    }

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Create a fallback handler for promises
     * @param {Promise} promise - Promise to handle
     * @param {*} fallbackValue - Value to return on error
     * @param {Object} options - Error handling options
     * @returns {Promise<*>} Promise that resolves to result or fallback
     */
    async withFallback(promise, fallbackValue, options = {}) {
        try {
            return await promise;
        } catch (error) {
            this.handle(error, {
                ...options,
                showNotification: options.showNotification !== undefined
                    ? options.showNotification
                    : false
            });
            return fallbackValue;
        }
    }

    /**
     * Validate required parameters and throw if missing
     * @param {Object} params - Parameters object
     * @param {Array<string>} requiredFields - Array of required field names
     * @param {string} context - Context for error message
     * @throws {Error} If required fields are missing
     */
    validateRequired(params, requiredFields, context = 'Operation') {
        const missingFields = requiredFields.filter(field => {
            const value = field.split('.').reduce((obj, key) => obj?.[key], params);
            return value === undefined || value === null || value === '';
        });

        if (missingFields.length > 0) {
            const error = new Error(
                `${context} failed: Missing required fields: ${missingFields.join(', ')}`
            );
            error.missingFields = missingFields;
            throw error;
        }
    }

    /**
     * Check if error is a network error
     * @param {Error} error - Error to check
     * @returns {boolean} True if network error
     */
    isNetworkError(error) {
        const message = error.message?.toLowerCase() || '';
        return message.includes('network') ||
               message.includes('fetch') ||
               message.includes('connection') ||
               error.name === 'NetworkError' ||
               error.name === 'TypeError';
    }

    /**
     * Check if error is an authentication error
     * @param {Error} error - Error to check
     * @returns {boolean} True if authentication error
     */
    isAuthError(error) {
        const message = error.message?.toLowerCase() || '';
        const statusCode = error.status || error.statusCode;
        return message.includes('unauthorized') ||
               message.includes('authentication') ||
               message.includes('401') ||
               statusCode === 401;
    }

    /**
     * Create error boundary for UI components
     * @param {Function} component - Component function
     * @param {Object} options - Error boundary options
     * @returns {Function} Wrapped component with error boundary
     */
    createErrorBoundary(component, options = {}) {
        const {
            fallbackUI = '<div class="error">Something went wrong. Please refresh.</div>',
            context = 'Component'
        } = options;

        return (...args) => {
            try {
                return component(...args);
            } catch (error) {
                this.handle(error, {
                    context,
                    severity: 'error',
                    showNotification: true
                });
                return fallbackUI;
            }
        };
    }
}

// Export as global
window.ErrorHandler = ErrorHandler;

// Create default error handler instance
window.errorHandler = new ErrorHandler({
    logger: window.logger,
    showUserNotifications: true,
    maxRetries: 3,
    baseDelay: 2000,
    maxDelay: 16000
});
