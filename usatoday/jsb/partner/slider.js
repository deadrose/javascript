define([
    'jquery',
    'underscore',
    'baseview',
    'sharedAdPosition'
],
function(
    $,
    _,
    BaseView,
    SharedAdPosition
) {
    'use strict';
        var SliderView = BaseView.extend(
        /**
         * @lends partner/slider.prototype
         */
        {

            el: '.partner-slider-ad',

            events: {
                'click .partner-slider-close' : 'onClickCloseButton'
            },

            /**
             * Stops close timer, hides the slider ad, cleans up resources
             */
            destroy: function(removeEl) {
                this.stopCloseTimer();
                this.hide(true);
                // call base class initialize
                BaseView.prototype.destroy.call(this, false);
            },

            /**
             * @classdesc Slider Ad Type, a SharedAdPosition high_impact Ad that handles IAB ads when no other gpt IAB
             * ad placement is available. This can not be rendered with other gpt IAB ads
             * @constructs partner/slider
             * @author Jay Merrifield <jmerrifiel@gannett.com>
             * @author Chad Shryock <dshryock@gannett.com>
             * @param {Object} options backbone options object
             *     @param {jQuery|Element|String} options.el - element or string selector to append the ad to
             *     @param {Array<String>} [options.adSizes=['mediumrectangle','halfpage','portrait','filmstrip']] - adSize targeting
             *     @param {String} [options.adPlacement=high_impact] - AdPlacement targeting
             */
            initialize: function(options) {
                _.bindAll(this, 'onAdReady');

                options = $.extend({
                    adSizes: ['mediumrectangle', 'halfpage', 'portrait', 'filmstrip'],
                    adPlacement: 'high_impact'
                }, options);

                // call base class initialize
                BaseView.prototype.initialize.call(this, options);

                this.subviews.ad = new SharedAdPosition({
                    el: this.$el,
                    adSizes: options.adSizes,
                    adPlacement: options.adPlacement,
                    adType: 'slider',
                    defaultPosition: true,
                    onAdReady: this.onAdReady
                });
            },

            onAdReady: function(){
                this.subviews.ad.show();
                this.show(true).done(_.bind(function(){
                    this.startCloseTimer();
                }, this));
            },

            onClickCloseButton: function(e) {
                e.preventDefault();
                this.destroy(false);
            },

            startCloseTimer: function() {
                var closeTime = window.site_config.ADS.SLIDER.CLOSETIME;
                if (closeTime) {
                    this.closeTimer = setTimeout(_.bind(function() {
                        this.hide();
                    }, this), closeTime);
                }
            },

            stopCloseTimer: function() {
                clearTimeout(this.closeTimer);
            }
        });

        /**
         * Return view class.
         */
        return SliderView;
    }
);
