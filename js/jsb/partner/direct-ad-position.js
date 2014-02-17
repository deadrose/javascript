define([
    'jquery',
    'underscore',
    'partner/ad-position',
    'admanager'
],
    function($, _, AdPosition, AdManager) {
        'use strict';

        var DirectAdPosition = AdPosition.extend(
        /**
         * @lends directAdPosition.prototype
         */
        {
            /**
             * @classdesc Direct Ad Position, a subclass of {@link partner/ad-position}. This represents a 1 to 1 direct
             * instantiation of an ad in GPT. This allows us to build an ad after page load, but still have it show up
             * immediately like a sharedAdPosition, and gives us refresh abilities
             * @author Jay Merrifield <jmerrifiel@gannett.com>
             * @constructs directAdPosition
             * @extends partner/ad-position
             * @see {@link partner/ad-position} for addition initialize options
             * @param {Object} options backbone options object
             *     @param {jQuery|Element|String} options.el - element or string selector to attach to
             *     @param {Object.<String, String>} [options.targeting] - extra ad targeting for this position
             *     @param {PageInfo} [options.pageInfo] - alternative to options.targeting, will build targeting out of a pageInfo object
             *     @param {String} [options.slotType=in] - in vs out of page types. In Slot Types will request an ad immediately.
             *                                  In pages ads also use adSizes for targeting and will render immediately when delivered,
             *                                  out of page are meant for overlays or galleries where the ad is preloaded or metered
             */
            initialize: function(options) {
                options = $.extend({
                    // required options
                    targeting: {},
                    pageInfo: null,
                    slotType: 'in' // in page by default
                }, options);

                // call base class initialize
                AdPosition.prototype.initialize.call(this, options);

                if (options.pageInfo) {
                    this.setPageInfo(options.pageInfo);
                }
                if (options.slotType == 'in'){
                    this.refreshPosition();
                }
            },

            /**
             * Triggers creation of the ad slot if one doesn't already exist
             * @return {Boolean} whether or not a slot was created
             */
            prefetchAd: function() {
                if (!this.subviews.adSlot) {
                    this.adSlotPlacement = this.getAdPlacement();
                    this.subviews.adSlot = AdManager.getAdSlot(this.adSlotPlacement, this.options.targeting, this.options.adSizes, this, this.options.slotType);
                    return true;
                }
                return false;
            },

            /**
             * Changes the current targeting, will only apply on the next ad requested
             * @param {Object.<String, String>} targeting
             */
            setTargeting: function(targeting) {
                this.options.targeting = targeting;
                if (this.subviews.adSlot) {
                    this.subviews.adSlot.setTargeting(this.options.targeting);
                }
            },

            /**
             * Destroys the ad slot, then delegates to ad-position's destroyAdPlacement function
             * @augments partner/ad-position#destroy
             */
            destroy: function() {
                this.destroyAdSlot();
                AdPosition.prototype.destroy.apply(this, arguments);
            },

            /**
             * Destroys the ad slot if one exists
             */
            destroyAdSlot: function(){
                if (this.subviews.adSlot) {
                    this.subviews.adSlot.destroy();
                    this.subviews.adSlot = null;
                }
            },

            /**
             * Changes the targeting using a pageInfo object, will only apply on the next ad requested
             * @param {PageInfo} pageInfo
             */
            setPageInfo: function(pageInfo){
                if (pageInfo.aws) {
                    this.options.subSection = pageInfo.aws;
                }
                this.setTargeting($.extend(AdManager.getPageTargeting(pageInfo), this.options.targeting));
            },

            /**
             * Destroys the current ad placement, and refreshes the ad slot
             */
            refreshPosition: function() {
                this.adState = 'pending';
                if (this.subviews.adSlot && this.adSlotPlacement !== this.getAdPlacement()) {
                    // we can't update the ad slot placement without destroying and rebuilding the ad slot
                    this.destroyAdPlacement();
                    this.destroyAdSlot();
                }
                if (!this.prefetchAd()) {
                    this.destroyAdPlacement();
                    this.subviews.adSlot.refresh();
                }
            }
        });
        return DirectAdPosition;
    });