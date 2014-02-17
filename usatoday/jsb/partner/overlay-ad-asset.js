define([
    'jquery',
    'underscore',
    'partner/overlay-ad-base',
    'meteredAdPosition',
    'adLogger'
],
function(
    $,
    _,
    OverlayAdBase,
    MeteredAdPosition,
    AdLogger
) {
    'use strict';
    var OverlayMeteredAd = OverlayAdBase.extend(
    /**
     * @lends partner/overlay-ad-asset.prototype
     */
    {
        /**
         * @classdesc Metered overlay ad, defaulted to transition ad placement/rateMeterId and elastic size, subclass of {@link partner/overlay-ad-base}
         * @constructs partner/overlay-ad-asset
         * @author Jay Merrifield <jmerrifiel@gannett.com>
         * @extends partner/overlay-ad-base
         * @param {Object} options backbone options object
         *     @param {jQuery|Element|String} options.el - element or string selector to attach to
         *     @param {Array<String>} [options.adSizes=['elastic']] - adSize targeting
         *     @param {String} [options.adPlacement=transition] - AdPlacement targeting
         *     @param {String} [options.rateMeterId=transition] - Rate MeterId for Overlay
         *     @param {PageInfo} [options.pageInfo] - PageInfo used for ad targeting
         */
        initialize: function(options) {
            options = $.extend({
                adSizes: ['elastic'],
                adPlacement: 'transition',
                rateMeterId: 'transition',
                pageInfo: null
            }, options);

            _.bindAll(this, 'onAdReady');

            // call base class initialize
            OverlayAdBase.prototype.initialize.call(this, options);

            this.loadAdPlacement(this.options.pageInfo);

            AdLogger.logDebug('Partner Metered Overlay initialized', this);

        },

        loadAdPlacement: function(pageInfo) {
            pageInfo = pageInfo || this.options.pageInfo;
            this.subviews.ad = new MeteredAdPosition({
                el: this.$placement,
                adSizes: this.options.adSizes,
                adPlacement: this.options.adPlacement,
                rateMeterId: this.options.rateMeterId,
                pageInfo: pageInfo,
                onAdReady: this.onAdReady,
                beforeAdRender: this.onResize
            });
        },

        triggerAd: function(){
            var isTransitionReferrer = (this.options.adPlacement === 'transition_referrer');
            var excludeTransAd = (this.options.pageInfo.excludeTransitionAd);
            this._tickMeterFetchAd(excludeTransAd);

            if (isTransitionReferrer && !excludeTransAd) {
                this.$placement.children('.partner-overlay-close').data('uotrack', 'referreradclosed');
            }
        },

        getCurrentMeterCount: function() {
            return this._tellAd('getCurrentMeterCount');
        },

        _tickMeterFetchAd: function(excludeTransitionAd){
            if (this.tickMeter(excludeTransitionAd) && !excludeTransitionAd) {
                // if we're not excluding a transitionAd on this page and the meter has ticked to 0,
                // we want to prefetch an add and then show it (through onAdReady callback)
                this.subviews.ad.prefetchAd();
            }
        },

        tickMeter: function(decrementButNoReset, alternateRateMeter) {
            return this._tellAd('tickMeter', decrementButNoReset, alternateRateMeter);
        },

        _tellAd: function(funcName) {
            var ad = this.subviews.ad;
            if (ad && ad[funcName]) {
                return ad[funcName].apply(ad, Array.prototype.slice.call(arguments, 1));
            }
            return null;
        },
        resetMeter: function(alternateRateMeter) {
            return this._tellAd('resetMeter', alternateRateMeter);
        },

        /**
         * Refreshes the overlay ad, destroying the current ad and reloading it with an optional pageInfo targeting object
         * @param {PageInfo} [pageInfo]
         */
        refresh: function(pageInfo) {
            this.destroyAdPosition();
            this.loadAdPlacement(pageInfo);
        }
    });

    return OverlayMeteredAd;
});
