define([
    'jquery',
    'underscore',
    'baseview',
    'utils',
    'admanager',
    'managers/cachemanager',
    'pubsub',
    'partner/iab',
    'adLogger'
],
function(
    $,
    _,
    BaseView,
    Utils,
    AdManager,
    CacheManager,
    PubSub,
    IAB,
    AdLogger
) {
    'use strict';
    /**
     * HighImpactAdData delivered from dfp that is used to render custom ads
     * @typedef HighImpactAdData
     * @property {String} adType - the type of ad that was delivered, ex: pushdown
     * @property {Object} dfp - dfp ids
     * @property {String} script - url to load a require script containing custom ad behavior
     * @property {String} stylesheet - url to a stylesheet to load for the ad
     * @property {String} viewUrl - dfp tracking url generated for out of page ads
     * @property {String} trackVCE - Yes or No, specifying whether we should fire the trackVCE url
     * @property {String} vCEUrl - url to script tag containing vce code, this script tag needs to be put on the page near the element that's being tracked
     */
    var AdPosition = BaseView.extend(
    /**
     * @lends partner/ad-position.prototype
     */
    {

        $head: $('head'),

        /**
         * This callback is called immediately after an ad has been delivered, but not rendered, giving the ad position
         * time to set up the dom with the correct classes necessary to support the ad
         * @callback partner/ad-position~beforeAdRender
         * @param {HighImpactAdData} [adData] dfp high impact ad data
         * @param {String} [adType] normalized ad type that was delivered (without any special characters, pushdown+ => pushdown)
         */
        /**
         * This callback is called when an ad has been delivered and successfully created/rendered
         * @callback partner/ad-position~onAdReady
         * @param {HighImpactAdData} [adData] dfp high impact ad data
         * @param {String} [adType] normalized ad type that was delivered (without any special characters, pushdown+ => pushdown)
         */
        /**
         * This callback is called when no ad has been delivered
         * @callback partner/ad-position~onNoAd
         */
        /**
         * @classdesc Generic Ad Position on the page, used as a base class for more specialized ad positions
         * @author Jay Merrifield <jmerrifiel@gannett.com>
         * @constructs partner/ad-position
         * @param {Object} options backbone options object
         *     @param {jQuery|Element|String} options.el - element or string selector to attach to
         *     @param {Array.<String>} [options.adSizes] - ad size targeting for this position, only used for in slot types
         *     @param {String} options.adPlacement - name for this placement in the scheduling system (ie: high_impact)
         *     @param {String} options.subSection - sub section targeting for dfp (sports/nfl/etc)
         *     @param {Number} options.adWidth - width of the container the ad must fit in
         *     @param {Number} options.adHeight - height of the container the ad must fit in
         *     @param {String} [options.slotType=in] - in vs out of page types,
         *                                  in pages ads use adSizes for targeting and will render immediately when delivered,
         *                                  out of page are meant for overlays or galleries where the ad is preloaded or metered
         *      @param {partner/ad-position~beforeAdRender} [options.beforeAdRender] - callback when an ad is delivered, but before it's created/rendered
         *      @param {partner/ad-position~onNoAd} [options.onNoAd] - callback when an no ad is delivered
         *      @param {partner/ad-position~onAdReady} [options.onAdReady] - callback when an ad is delivered/created/rendered. Skipping
         *                                                              this option will automatically show and play the ad immediately.
         *                                                              If this option is provided, it's up to you to show and play the ad
         */
        initialize: function(options) {
            options = $.extend({
                // required options
                adSizes: [],
                adPlacement: null, // name for this placement in the scheduling system (ie: high_impact)
                subSection: null, // sub section targeting for dfp (sports/nfl/etc)
                slotType: 'in',
                adWidth: null,
                adHeight: null,

                // optional options
                onAdReady: null,
                onNoAd: null,
                beforeAdRender: null
            }, options);

            _.bindAll(this, 'adReady');

            if (!this.$el.prop('id')) {
                this.$el.prop('id', _.uniqueId('ad-position-'));
            }

            // call base class initialize
            BaseView.prototype.initialize.call(this, options);

            // we set this up after initialization so we have a place to put them for destroy if we get a partnerView
            this.tracked = false;
            this.adState = 'pending';

            // clear out any possible width/height left over from a destroyed ad, let it vanish
            this.$el.css({width: '', height: '', display: ''});

            /* Comscore Monetization is a project to decide how we should place our ads
             * we have Comscore monitor "ad zones" for visibility
             * an "ad zone" is a rectangle where we might display an ad in the future
             * an ad zone is any element in the DOM with class partner-placement and attribute data-monetization-id and attribute data-monetization-sizes
             * potential future: maybe use a new system for monetization size names
             */
            var partnerPlacement = this.$el.closest('.partner-placement');
            partnerPlacement.attr('data-monetization-id', this.options.adPlacement.replace(/\/.*/, ''));
            partnerPlacement.attr('data-monetization-sizes', this.options.adSizes.join(','));
        },

        /**
         * Callback from the ad framework telling us an ad has been delivered
         * @param {HighImpactAdData} [adData] dfp high impact ad data
         * @param {String} [adType] normalized ad type that was delivered (without any special characters, pushdown+ => pushdown)
         */
        render: function(adData, adType) {
            if (this.options.beforeAdRender) {
                this.options.beforeAdRender(adData, adType);
            }
            if (!adType && !adData) {
                this.adReady();
            } else {
                this.adType = adType; // normalized ad type
                this.adData = adData;
                AdLogger.logDebug('AdPosition HighImpact Ad recieved with type: ' + adType, adData);
                if (adType === 'risingstar' || adType === 'generic') {
                    // render IAB rising star ad
                    this.subviews.partnerView = new IAB({
                        el: this.$el
                    });
                    
                    this.subviews.partnerView.render(adData).done(_.bind(function() {
                        if (this.destroyed) {
                            return;
                        }
                        if (adType !== 'generic') {
                            this.adReady();
                        }
                    }, this));
                    return;
                } else {
                    this._renderCustomAd(adData);
                }
            }
        },

        /**
         * Function called by the ad slot when no ad is delivered
         */
        noAd: function(){
            this.adState = 'noad';
            if (this.options.onNoAd) {
                this.options.onNoAd();
            }
        },

        /**
         * returns 'pending', 'hasad', or 'noad' depending on whether an ad is in flight, was delivered an ad
         * or was not delivered an ad
         * @returns {String}
         */
        getAdState: function(){
            return this.adState;
        },

        /**
         * build and trigger a high impact ad
         * @param {HighImpactAdData} adData dfp high impact ad data
         * @private
         */
        _renderCustomAd: function(adData){
            if (!adData.dfp || !adData.dfp.ecid) {
                AdLogger.logError('invalid ad returned, no dfp/ecid found', adData);
                return;
            }
            if (adData.html) {
                this.$adEl = $($.parseHTML(adData.html, document, true)); // keep script tags for ads?
                this.$el.append(this.$adEl);
            }
            if (adData.stylesheet) {
                this.$stylesheet = $('<link rel="stylesheet" data-ad-stylesheet="' + adData.dfp.ecid + '" href="' + adData.stylesheet + '">');
                this.$head.append(this.$stylesheet);
            }
            if (adData.script) {
                adData.el = this.$el;
                Utils.requireSingleUseScript(adData.script).done(_.bind(function(PartnerView) {
                    var pubSubKey = this._getPubSubKey();
                    if (this.destroyed){
                        return;
                    }
                    adData.initialWidth = this.options.adWidth;
                    adData.initialHeight = this.options.adHeight;
                    // remember the pubSub so we can unregister it on destruction
                    PubSub.on(pubSubKey, this.adReady, this);
                    try {
                        this.subviews.partnerView = new PartnerView(adData);
                    } catch (ex) {
                        AdLogger.logError('AdSlot(' + this.options.adUnit + '): ad delivered threw exception on creation', (ex.stack || ex.stacktrace || ex.message));
                    }
                }, this));
            } else {
                this.adReady();
            }
        },

        _getPubSubKey: function(){
            return 'partner:' + this.adData.dfp.ecid + ':ready';
        },

        /**
         * Destroys the ad element. If an ad was rendered, it'll keep it's shape to avoid UI jumps.
         * This function will also remove data-monetization-id and and data-monetization-sizes attributes
         * @param {Boolean} [removeEl]
         */
        destroy: function(removeEl) {
            // put in place a placeholder so we don't shift the page around
            if (this.adState === 'hasad'){
                this.$el.css({width: this.getWidth(), height: this.getHeight()});
            }
            this.destroyAdPlacement();
            // clean up monetization info
            var partnerPlacement = this.$el.closest('.partner-placement');
            partnerPlacement.removeAttr('data-monetization-id');
            partnerPlacement.removeAttr('data-monetization-sizes');
            this.destroyed = true;
            BaseView.prototype.destroy.call(this, removeEl);
        },

        /**
         * Destroys the current ad, and removes the html and resources it was using
         */
        destroyAdPlacement: function(){
            this.tracked = false;
            if (this.subviews.partnerView) {
                this.stopAd();
                this._dispatchToPartner('destroy', false);
                this.subviews.partnerView = null;
            }
            if (this.adData) {
                PubSub.off(this._getPubSubKey(), this.adReady, this);
            }
            this.adType = this.adData = null;
            if (this.$adEl) {
                this.$adEl.remove();
                this.$adEl = null;
            } else {
                this.$('iframe').remove();
            }
            if (this.$stylesheet) {
                this.$stylesheet.remove();
                this.$stylesheet = null;
            }
        },

        /**
         * Gets the AdPlacement, which is a union of [this.options.adPlacement, '/', this.options.subSection]
         * @returns {String}
         */
        getAdPlacement: function() {
            var adPlacement = this.options.adPlacement;
            if (this.options.subSection) {
                adPlacement += '/' + this.options.subSection;
            }
            return adPlacement;
        },

        /**
         * Get the ad sizes registered to the ad position
         * @returns {Array.<String>}
         */
        getAdSizes: function() {
            return this.options.adSizes;
        },

        /**
         * Get the slot type of this ad position
         * @returns {String}
         */
        getSlotType: function() {
            return this.options.slotType;
        },

        /**
         * Signifies that the ad is ready, default behavior is to show the ad and trigger play,
         * is overridable by specifying onAdReady in the options
         */
        adReady: function() {
            AdLogger.logDebug('AdPosition(' + this.getAdPlacement() + ') ' + this.adType + ' ready');
            this.adState = 'hasad';
            if (!this.options.onAdReady) {
                if (this.options.slotType === 'in') {
                    // in page slots show and play immediately
                    this.show();
                    this.playAd(); // playAd calls trackAd()
                }
            } else {
                // by registering onAdReady, you are taking control of the viewing of this ad.
                this.options.onAdReady(this.adData, this.adType);
            }
        },

        /**
         * Function that specifies if the ad is delivered and ready to be shown
         * @returns {Boolean}
         */
        isAdReady: function(){
            var adReady = this.adState === 'hasad';
            if (adReady && Utils.getNested(this.adData, 'adType') === 'blank') {
                this.trackAd();
                return false;
            }
            return adReady;
        },

        /**
         * Gets the creative state for this high impact ad from the session store
         * @param {Object} [defaultState] optional default state
         * @param {Number} [expirationMinutes=0] - how long to cache the state for, default is session
         * @return {Object}
         */
        getCreativeState: function(defaultState, expirationMinutes) {
            if (this.adData && this.adData.dfp && this.adData.dfp.ecid) {
                return CacheManager.getValue('dfpc_' + this.adData.dfp.ecid, defaultState, expirationMinutes);
            } else {
                AdLogger.logWarn('Attempted to get state on non high impact ad');
            }
        },

        /**
         * Saves a state object to a session store
         * @param {Object} state object to save
         * @param {Number} [expirationMinutes=0] - how long to cache the state for, default is session
         */
        setCreativeState: function(state, expirationMinutes) {
            if (this.adData && this.adData.dfp && this.adData.dfp.ecid) {
                CacheManager.setValue('dfpc_' + this.adData.dfp.ecid, state, expirationMinutes);
            } else {
                AdLogger.logWarn('Attempted to set state on non high impact ad');
            }
        },

        /**
         * Get current height of the el
         * @returns {Number}
         */
        getHeight: function() {
            return this.$el.outerHeight();
        },

        /**
         * Get current width of the el
         * @returns {Number}
         */
        getWidth: function() {
            return this.$el.outerWidth();
        },

        /**
         * Shows the ad and fires off any tracking pixels
         * @deprecated
         */
        showAd: function(width, height) {
            this.$el.show();
            this._dispatchToPartner('onShow', width, height);
            this.trackAd();
        },

        /**
         * Tells the high impact ad to resize itself
         * @param {Number} width - new width of the container the ad needs to fit it
         * @param {Number} height - new height of the container the ad needs to fit it
         */
        resizeAd: function(width, height) {
            this.options.adWidth = width;
            this.options.adHeight = height;
            this._dispatchToPartner('onResize', width, height);
        },

        /**
         * Helper function to send messages to the ad object
         * @param {String} funcName name of the function to call on the partner
         * @private
         */
        _dispatchToPartner: function(funcName) {
            var funcArgs, partnerView = this.subviews.partnerView;
            if (!partnerView) {
                return;
            }
            if (partnerView[funcName]) {
                funcArgs = Array.prototype.slice.call(arguments, 1);
                AdLogger.logDebug.apply(AdLogger, ['AdPosition(' + this.getAdPlacement() + ') ' + funcName].concat());
                try {
                    partnerView[funcName].apply(partnerView, funcArgs);
                } catch (ex) {
                    AdLogger.logError('Ad threw an exception in function ' + funcName, (ex.stack || ex.stacktrace || ex.message));
                }
            } else {
                AdLogger.logWarn('Ad does not implement ' + funcName);
            }
        },

        /**
         * Tells the high impact ad to stop animating
         */
        stopAd: function() {
            this._dispatchToPartner('onStopToClose');
        },

        /**
         * Triggers tracking pixels for this ad
         * @param {jQuery} [trackDom] optional alternative id if you want to track a dom element other than the ad itself
         */
        trackAd: function(trackDom) {
            var trackDomId;
            if (this.tracked || !this.adData) {
                return;
            }
            this.tracked = true;
            if (this.adData.viewUrl) {
                // adData.viewUrl is in the format:
                // http://pubads.g.doubleclick.net/pagead/adview?ai=Bqas7at8GUda8K8-_6gH97oDwD62Qwu4CAAAAEAEg_bLvGTgAWLWo2YI9YMmGgIDspIAQugEJZ2ZwX2ltYWdlyAEJwAIC4AIA6gIoNzA3MC91c2F0b2RheS90cmFuc2l0aW9uX2dhbGxlcnkvd2VhdGhlcvgCgtIekAPQBZgDpAOoAwHQBJBO4AQBoAYf&sigh=_3Sxed4-ABo&template_id=10016309&adurl=
                // where the last parameter is a redirect url for an image
                var trackingPixel = $('<img src="' + this.adData.viewUrl + encodeURIComponent(window.site_static_url + 'images/pixels/pixel-transparent.png') + '" style="display:none;">');
                if (this.$adEl){
                    this.$adEl.append(trackingPixel);
                } else {
                    this.$adEl = trackingPixel;
                    this.$el.append(trackingPixel);
                }
                AdLogger.logDebug('Fired Tracking Pixel', this.adData.viewUrl);
            }
            if (this.adData.trackVCE === 'Yes' && this.adData.vCEUrl) {
                trackDom = trackDom || this.$el;
                trackDomId = trackDom.prop('id');
                var vceScript = this.adData.vCEUrl.replace(/\[domid\]/g, trackDomId);
                AdManager._createScript('vce_' + trackDomId, vceScript, trackDom);
                AdLogger.logDebug('Tracked vCE', vceScript);
            }
        },

        /**
         * Tells the ad to play, will also show the ad and fire tracking pixels if not already done
         */
        playAd: function() {
            this.trackAd();
            this._dispatchToPartner('onPlay');
        }
    });
    return AdPosition;
});