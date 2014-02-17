define([
    'underscore'
],
function(_) {
    "use strict";

    /**
     * Ad Logging singleton that turns on or off debug and info logging by checking window.isAdDebug
     * @exports adLogger
     * @author Jay Merrifield <jmerrifiel@gannett.com>
     * @author Chad Shryock <cdshryock@gannett.com>
     */
    var AdLogger = function(){
        this.initialize();
    };
    AdLogger.prototype = {
        initialize: function(){
            this.debug = window.isAdDebug;
            // polyfill for IE8/9 which treats console.XXX as objects instead of functions so we can't do .apply below
            if (Function.prototype.bind && window.console && typeof window.console.log === "object") {
                _.each(["log","info","warn","error"], function (method) {
                    window.console[method] = Function.prototype.call.bind(window.console[method], window.console);
                });
            }
        },

        logGroup: function(groupName) {
            if (this.debug) {
                window.console.groupCollapsed(groupName);
            }
        },

        logGroupEnd: function() {
            if (this.debug) {
                window.console.groupEnd();
            }
        },

        _log: function(msg, type, args){
            var title = 'Ad ' + type + ': ' + msg;
            if (window.console && window.console[type]) {
                if (!args.length) {
                    window.console[type](title);
                } else {
                    window.console.groupCollapsed(title);
                    for (var i = 0, j = args.length; i < j; i++) {
                        window.console[type](args[i]);
                    }
                    window.console.groupEnd();
                }
            }
        },

        /**
         * Log Debug
         * @param {String} msg
         * @param {...*} [objects] additional objects to print out in the console
         */
        logDebug : function(msg) {
            if (this.debug){
                this._log(msg, 'log', Array.prototype.slice.call(arguments, 1));
            }
        },

        /**
         * Log Error
         * @param {String} msg
         * @param {...*} [objects] additional objects to print out in the console
         */
        logError : function(msg) {
            this._log(msg, 'error', Array.prototype.slice.call(arguments, 1));
        },

        /**
         * Log Info
         * @param {String} msg
         * @param {...*} [objects] additional objects to print out in the console
         */
        logInfo : function(msg) {
            if (this.debug){
                this._log(msg, 'info', Array.prototype.slice.call(arguments, 1));
            }
        },

        /**
         * Log Warn
         * @param {String} msg
         * @param {...*} [objects] additional objects to print out in the console
         */
        logWarn : function(msg) {
            this._log(msg, 'warn', Array.prototype.slice.call(arguments, 1));
        }
    };
    return new AdLogger();
});