define([
    'jquery',
    'underscore',
    'partner/overlay-ad-base',
    'sharedAdPosition',
    'partner/leavebehind',
    'adLogger'
],
function(
    $,
    _,
    OverlayAdBase,
    SharedAdPosition,
    LeaveBehind,
    AdLogger
) {
    'use strict';
    var OverlaySharedAd = OverlayAdBase.extend(
    /**
     * @lends partner/overlay-ad-fronts.prototype
     */
    {
        /**
         * @classdesc Shared overlay ad with leave behind, defaults targeting to high_impact ad placement and elastic size
         * subclass of {@link partner/overlay-ad-base}
         * @constructs partner/overlay-ad-fronts
         * @author Jay Merrifield <jmerrifiel@gannett.com>
         * @extends partner/overlay-ad-base
         * @param {Object} options backbone options object
         *     @param {jQuery|Element|String} options.el - element or string selector to attach to
         *     @param {Array<String>} [options.adSizes=['elastic']] - adSize targeting
         *     @param {String} [options.adType=elastic] - adType targeting
         *     @param {String} [options.adPlacement=high_impact] - AdPlacement targeting
         *     @param {Boolean} [options.isCardBumped=true] - Used for specifying if the leave behind is compact or not
         *     @param {Boolean} [options.isStagFront=false] - Used for leave behind to specify if there is a .stag-masthead-name that needs text-align: left
         */
        initialize: function(options) {
            options = $.extend({
                adSizes: ['elastic'],
                adType: 'elastic',
                adPlacement: 'high_impact',
                isCardBumped: true,
                isStagFront: false
            }, options);

            _.bindAll(this, 'onAdReady', 'showAd');

            // call base class initialize
            OverlayAdBase.prototype.initialize.call(this, options);

            this.loadAdPlacement();

            AdLogger.logDebug('Partner Shared Overlay initialized', this);
        },

        destroy: function() {
            if (this.stagMasthead) {
                this.stagMasthead.css('text-align', '');
                this.stagMasthead = null;
            }
            OverlayAdBase.prototype.destroy.apply(this, arguments);
        },

        loadAdPlacement: function() {
            this.subviews.ad = new SharedAdPosition({
                el: this.$placement,
                adSizes: this.options.adSizes,
                adPlacement: this.options.adPlacement,
                adType: this.options.adType,
                onAdReady: this.onAdReady,
                beforeAdRender: this.onResize
            });
        },

        onAdReady: function(adInfo) {
            if (adInfo.leaveBehindImage && adInfo.leaveBehindText && this.options.leaveBehindEl) {
                if (this.options.isStagFront) {
                    this.stagMasthead = this.$('.stag-masthead-name').css('text-align', 'left');
                }
                this.subviews.adLeaveBehind = new LeaveBehind({
                    el: this.options.leaveBehindEl,
                    onShowAd: this.showAd,
                    imageUrl: adInfo.leaveBehindImage,
                    altText: adInfo.leaveBehindText,
                    isCompact: this.options.isCardBumped
                });
                this.subviews.adLeaveBehind.render(this.subviews.ad);
            } else {
                this.showAd();
            }
        },
        close: function() {
            if (this.subviews.adLeaveBehind) {
                this.subviews.adLeaveBehind.show();
            }
            OverlayAdBase.prototype.close.apply(this, arguments);
        }
    });

    return OverlaySharedAd;
});
