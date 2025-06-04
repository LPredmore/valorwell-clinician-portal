
/**
 * Custom Console Log Capturing System
 * This script should be included early in the application's JavaScript execution lifecycle
 * to capture all console logs from the start of the application.
 */

(function() {
  'use strict';

  // Configuration
  const MAX_LOG_ENTRIES = 1000;

  // Store original console methods
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;

  // Initialize the global captured logs array
  if (!window.capturedLogs) {
    window.capturedLogs = [];
  }

  /**
   * Safely stringify an argument for logging
   * @param {any} arg - The argument to stringify
   * @returns {string} - The stringified representation
   */
  function safeStringify(arg) {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
    if (typeof arg === 'function') return `[Function: ${arg.name || 'anonymous'}]`;
    
    // Handle objects and arrays
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (error) {
        // Handle circular references or other stringify errors
        if (error.message.includes('circular')) {
          return '[Circular Reference Object]';
        }
        return '[Unserializable Object]';
      }
    }
    
    return String(arg);
  }

  /**
   * Format multiple arguments into a single message string
   * @param {array} args - Array of arguments passed to console method
   * @returns {string} - Formatted message string
   */
  function formatMessage(args) {
    return args.map(safeStringify).join(' ');
  }

  /**
   * Add a log entry to the captured logs array
   * @param {string} type - Type of log ('log', 'error', 'warn', 'info')
   * @param {array} args - Arguments passed to the console method
   */
  function captureLog(type, args) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: type,
      message: formatMessage(args)
    };

    // Add to captured logs array
    window.capturedLogs.push(logEntry);

    // Implement circular buffer - remove oldest entries if at max capacity
    if (window.capturedLogs.length > MAX_LOG_ENTRIES) {
      window.capturedLogs.shift(); // Remove first (oldest) entry
    }
  }

  // Override console.log
  console.log = function(...args) {
    captureLog('log', args);
    originalConsoleLog.apply(console, args);
  };

  // Override console.error
  console.error = function(...args) {
    captureLog('error', args);
    originalConsoleError.apply(console, args);
  };

  // Override console.warn
  console.warn = function(...args) {
    captureLog('warn', args);
    originalConsoleWarn.apply(console, args);
  };

  // Override console.info
  console.info = function(...args) {
    captureLog('info', args);
    originalConsoleInfo.apply(console, args);
  };

  /**
   * Get formatted captured logs as a single string
   * @returns {string} - Formatted log string
   */
  window.getFormattedCapturedLogs = function() {
    return window.capturedLogs
      .map(entry => `[${entry.timestamp}] [${entry.type.toUpperCase()}] ${entry.message}`)
      .join('\n');
  };

  /**
   * Copy captured logs to clipboard
   */
  window.copyLogsToClipboard = function() {
    const logString = window.getFormattedCapturedLogs();
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(logString)
        .then(() => {
          originalConsoleLog('✅ Logs successfully copied to clipboard!');
        })
        .catch(error => {
          originalConsoleError('❌ Failed to copy logs to clipboard:', error);
          // Fallback to prompt
          fallbackCopyMethod(logString);
        });
    } else {
      // Fallback for browsers without clipboard API
      fallbackCopyMethod(logString);
    }
  };

  /**
   * Fallback method for copying logs when clipboard API is not available
   * @param {string} logString - The formatted log string
   */
  function fallbackCopyMethod(logString) {
    try {
      const result = prompt("Copy logs manually (Ctrl+C, Enter):", logString);
      if (result !== null) {
        originalConsoleLog('📋 Logs displayed in prompt. Please copy manually.');
      }
    } catch (error) {
      originalConsoleError('❌ Fallback copy method failed:', error);
    }
  }

  /**
   * Download captured logs as a text file
   */
  window.downloadLogs = function() {
    try {
      const logString = window.getFormattedCapturedLogs();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `app_logs_${timestamp}.txt`;
      
      // Create blob and download link
      const blob = new Blob([logString], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create temporary download link
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = filename;
      downloadLink.style.display = 'none';
      
      // Trigger download
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Clean up object URL
      URL.revokeObjectURL(url);
      
      originalConsoleLog(`📁 Logs downloaded as ${filename}`);
    } catch (error) {
      originalConsoleError('❌ Failed to download logs:', error);
    }
  };

  /**
   * Clear all captured logs
   */
  window.clearCapturedLogs = function() {
    const count = window.capturedLogs.length;
    window.capturedLogs.length = 0;
    originalConsoleLog(`🗑️ Cleared ${count} captured log entries`);
  };

  /**
   * Get statistics about captured logs
   * @returns {object} - Statistics object
   */
  window.getLogStats = function() {
    const stats = {
      total: window.capturedLogs.length,
      log: 0,
      error: 0,
      warn: 0,
      info: 0
    };

    window.capturedLogs.forEach(entry => {
      stats[entry.type]++;
    });

    return stats;
  };

  // Log that the console capture system is initialized
  originalConsoleLog('🔍 Console log capturing system initialized');
  originalConsoleLog(`📊 Max log entries: ${MAX_LOG_ENTRIES}`);
  originalConsoleLog('🛠️ Available functions: getFormattedCapturedLogs(), copyLogsToClipboard(), downloadLogs(), clearCapturedLogs(), getLogStats()');

})();
