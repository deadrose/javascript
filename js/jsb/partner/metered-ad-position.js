define([
    'jquery',
    'underscore',
    'directAdPosition',
    'utils',
    'managers/cachemanager',
    'admanager',
    'adLogger'
],
function($,
     _,
     DirectAdPosition,
     Utils,
     CacheManager,
     AdManager,
     AdLogger) {
        "use strict";

        var MeteredAdPosition = DirectAdPosition.extend(
        /**
         * @lends meteredAdPosition.prototype
         */
        {
            /**
             * @classdesc Metered Ad Position, a subclass of {@link directAdPosition}. Metered ads are designed
             *          to render an ad after X number of ticks on the meter. The meter rate is grabbed from the site_config
             *          settings using the first segment of the ad placement. Ex: window.site_config.ADS.THRESHOLDS['transition'].
             *          A setting of [1, 3] will show an ad after 1 tick, and then every 3rd tick after that.
             * @author Jay Merrifield <jmerrifiel@gannett.com>
             * @constructs meteredAdPosition
             * @extends directAdPosition
             * @see {@link directAdPosition} for addition initialize options
             * @see {@link partner/ad-position} for addition initialize options
             * @param {Object} options backbone options object
             *     @param {jQuery|Element|String} options.el - element or string selector to attach to
             *     @param {String} options.rateMeterId - Unique isolation identifier to use when counting down the meter
             *     @param {String} [options.slotType=out] - in vs out of page types,
             *                                  in pages ads use adSizes for targeting and will render immediately when delivered,
             *                                  out of page are meant for overlays or galleries where the ad is preloaded or metered
             */
            initialize: function(options) {
                options = $.extend({
                    // required options
                    slotType: 'out', // out of page by default for legacy purposes, no reason it can't be 'in' page
                    rateMeterId: null
                }, options);

                // call base class initialize
                DirectAdPosition.prototype.initialize.call(this, options);
            },

            /**
             * Gets the default threshold of the meter
             * @param {String} [alternateRateMeter] override for what meter you'd like to use
             * @returns {Array}
             */
            getDefaultThreshold: function(alternateRateMeter) {
                var thresholdType = alternateRateMeter || this.options.meterThreshold || this.options.adPlacement,
                    split = thresholdType.indexOf('/');
                if (split !== -1) {
                    thresholdType = thresholdType.substring(0, split);
                }
                var defaultThreshold = Utils.getNested(window, 'site_config', 'ADS', 'THRESHOLDS', thresholdType.toUpperCase());
                if (!defaultThreshold) {
                    AdLogger.logError('Could not find default threshold for metered ad: ' + thresholdType);
                }
                return defaultThreshold;
            },

            /**
             * Ticks the meter
             * @param {Boolean} [decrementButNoReset] prevents the meter from resetting when it hits 0, useful for ticking the meter
             *                         when you don't intend to show an ad
             * @param {String} [alternateRateMeter] override for what meter you'd like to tick
             * @returns {Boolean} whether the meter has ticked to 0 and it's time to show an ad
             */
            tickMeter: function(decrementButNoReset, alternateRateMeter) {
                var showAd = false,
                    meter = this.getCurrentMeter(alternateRateMeter);
                if (!meter.length) {
                    // fail for invalid meter
                    return showAd;
                }
                meter[0] = Math.max(0, meter[0] - 1);
                if (meter[0] < 1) {
                    showAd = true;
                    if (!decrementButNoReset) {
                        meter[0] = meter[1]; // reset the meter to the next position
                    }
                }
                // save new rate meter
                CacheManager.setValue(this.getRateMeterId(alternateRateMeter), meter);
                return showAd;
            },

            /**
             * This will force the meter to be reset to it's high point
             * @param {String} [alternateRateMeter] override for what meter you'd like to reset
             */
            resetMeter: function(alternateRateMeter) {
                var meter = this.getCurrentMeter(alternateRateMeter);
                meter[0] = meter[1];
                CacheManager.setValue(this.getRateMeterId(alternateRateMeter), meter);
            },

            /**
             * Gets the rate meter id for this ad position
             * @param {String} [alternateRateMeter] override for what meter you'd like to use
             * @returns {String}
             */
            getRateMeterId: function(alternateRateMeter){
                return 'dfpc_' + (alternateRateMeter || this.options.rateMeterId);
            },

            /**
             * Retrieves the current meter data count without ticking it
             * @param {String} [alternateRateMeter] override for what meter you'd like to use
             * @returns {Number}
             */
            getCurrentMeterCount: function(alternateRateMeter){
                return this.getCurrentMeter(alternateRateMeter)[0] || 0;
            },

            /**
             * Retrieves the current meter data
             * @param {String} [alternateRateMeter] override for what meter you'd like to use
             * @returns {Array}
             */
            getCurrentMeter: function(alternateRateMeter) {
                var rateMeterId = this.getRateMeterId(alternateRateMeter),
                    defaultThreshold = this.getDefaultThreshold(alternateRateMeter);
                if (defaultThreshold) {
                    return CacheManager.getValue(rateMeterId, defaultThreshold);
                }
                return [];
            },

            /**
             * Ticks the current meter, prefetching an ad if needed, and returns true or false on whether an ad should be shown.
             * Will refresh an ad position if the meter ticks but no ad was delivered
             * @returns {Boolean}
             */
            shouldShowAd: function() {
                var showAd = this.tickMeter();
                this.prefetchAd();
                if (showAd && !this.isAdReady()) {
                    // ad isn't ready to be shown, skip it and try again
                    AdLogger.logDebug('ad skipped due to no ad being delivered in time, refreshing slot');
                    this.refreshPosition();
                    showAd = false;
                }
                AdLogger.logDebug('shouldShowAd: ' + showAd, this);
                return showAd;
            }
        });
        return MeteredAdPosition;
    });