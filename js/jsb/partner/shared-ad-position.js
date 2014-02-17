define([
    'jquery',
    'underscore',
    'partner/ad-position',
    'utils',
    'admanager'
],
function($, _, AdPosition, Utils, AdManager) {
    'use strict';

    var SharedAdPosition = AdPosition.extend(
    /**
     * @lends sharedAdPosition.prototype
     */
    {
        /**
         * @classdesc Shared Ad Position, also known as page load ads. Are a subclass of {@link partner/ad-position}
         * All shared ads are combined at page load, and only make X requests where X is the number of different
         * adPlacements registered. The returning ad is then matched up with the provided adType to decide which ad
         * position renders the ad
         * @author Jay Merrifield <jmerrifiel@gannett.com>
         * @constructs sharedAdPosition
         * @extends partner/ad-position
         * @see {@link partner/ad-position} for addition initialize options
         * @param {Object} options backbone options object
         *     @param {jQuery|Element|String} options.el - element or string selector to attach to
         *     @param {String} options.adType - type of ad that this position handles
         *     @param {String} [options.defaultPosition=false] - If no adType is returned, it means gpt is rendering a generic ad
         *                                                      and we want it rendered wherever defaultPosition = true, only one
         *                                                      shared position can have defaultPosition = true per adPlacement
         */
        initialize: function(options) {
            options = $.extend({
                // required options
                adType: null, // name of this ad type in DFP (ie, pushdown, heroflip), can be an array
                // this specifies whether this is where the 'slot' lives in case an IAB ad appears in the slot
                defaultPosition: false
            }, options);

            // call base class initialize
            AdPosition.prototype.initialize.call(this, options);

            AdManager.registerSharedAdPosition(this);
        },

        /**
         * Returns whether or not this ad position is meant to render generic IAB ads
         * @returns {Boolean}
         */
        isDefaultPosition: function() {
            return this.options.defaultPosition;
        },

        getAdType: function() {
            return this.options.adType;
        },

        /**
         * Tells ad manager to refresh all shared positions for this ad placement
         */
        refreshPosition: function() {
            AdManager.refreshSharedAdPosition(this.getAdPlacement());
        },

        /**
         * Destroys the ad position, and unregisters it from AdManager
         * @param {Boolean} [removeEl]
         */
        destroy: function(removeEl) {
            AdPosition.prototype.destroy.call(this, removeEl);
            AdManager.destroySharedAdPosition(this);
        }
    });
    return SharedAdPosition;
});