define([
    'jquery',
    'underscore',
    'pubsub',
    'state',
    'utils',
    'baseview'
],
function(
    $,
    _,
    PubSub,
    StateManager,
    Utils,
    BaseView
) {
    'use strict';
    var OverlayView = BaseView.extend(
    /**
     * @lends partner/overlay-ad-base.prototype
     */
    {

        events: {
            'click .partner-close,.ui-film': 'onClickCloseButton'
        },

        /**
         * Function called when the overlay wants to lock the page scrolling
         * @callback partner/overlay-ad-base~lockScroll
         */
        /**
         * Function called when the overlay wants to unlock the page scrolling
         * @callback partner/overlay-ad-base~unlockScroll
         */
        /**
         * Function called when the overlay wants to know how large the header is so it can center the ad correctly
         * @callback partner/overlay-ad-base~getHeaderOffset
         * @returns {Number} how tall the header is
         */
        /**
         * @classdesc This is the base class for overlay ads, either metered or indexed
         * @constructs partner/overlay-ad-base
         * @author Jay Merrifield <jmerrifiel@gannett.com>
         * @author Chad Shryock <cdshryock@gannett.com>
         * @param {Object} options backbone options object
         *     @param {jQuery|Element|String} options.el - element or string selector to attach to
         *     @param {partner/overlay-ad-base~lockScroll} [options.lockScroll] - function the overlay can use to lock the page scroll
         *     @param {partner/overlay-ad-base~unlockScroll} [options.unlockScroll] - function the overlay can use to unlock the page scroll
         *     @param {partner/overlay-ad-base~getHeaderOffset} [options.getHeaderOffset] - function the overlay can use to find out the height
         *                                  of the header so the ad can be centered correctly
         */
        initialize: function(options) {
            options = $.extend({
                getHeaderOffset: null //function, returns number
            }, options);

            _.bindAll(this, 'onResize');

            this.listen();

            this.$body = Utils.get('body');

            // call base class initialize
            BaseView.prototype.initialize.call(this, options);

            this.$placement = this.$('.partner-placement');
        },

        showAd: function() {
            StateManager.setActiveAppFixed(true);
            this.showingAd = true;
            this.show(true).done(_.bind(function() {
                if (this.subviews.ad) {
                    this.subviews.ad.playAd();
                }
            }, this));
            this.$body.addClass('high-impact-ad-visible');
        },

        stopAd: function() {
            if (this.subviews.ad) {
                this.subviews.ad.stopAd();
            }
        },

        onAdReady: function(adData, adType) {
            var ad = this.subviews.ad;
            if (ad) {
                if (adType === 'blank') {
                    ad.trackAd();
                } else {
                    this.showAd();
                }
            }
        },

        /**
         * closes the overlay and destroys the ad
         */
        destroy: function(removeEl) {
            this.close();
            BaseView.prototype.destroy.call(this, removeEl);
        },

        /**
         * Will determine ad sizing information given the current window size, and header offset
         * @returns {{adSizeClass: String, adTop: String, adHeight: Number, adWidth: Number}}
         */
        findSizeForAd: function() {
            // default to small
            var obj = {
                adSizeClass: 'size-s',
                adTop: '50%',
                adHeight: 450,
                adWidth: 600
            };
            // get visible area height and width
            var breakingNewsHeight = 0;
            if (this.options.getHeaderOffset) {
                breakingNewsHeight = this.options.getHeaderOffset() || 0;
            }
            // 80 is for the padding between the header/bottom of browser and the ad
            var viewportHeight = document.documentElement.clientHeight - breakingNewsHeight - 80;
            // 160 = 80 for the arrows. 40 for padding between the arrows and the ad
            var viewportWidth = document.documentElement.clientWidth - 160;
            // check size
            if (viewportWidth > 1080 && viewportHeight > 810) {
                obj.adSizeClass = 'size-xl';
                obj.adHeight = 810;
                obj.adWidth = 1080;
            } else if (viewportWidth > 936 && viewportHeight > 700) {
                obj.adSizeClass = 'size-l';
                obj.adHeight = 700;
                obj.adWidth = 936;
            } else if (viewportWidth > 768 && viewportHeight > 576) {
                obj.adSizeClass = 'size-m';
                obj.adHeight = 576;
                obj.adWidth = 768;
            }

            obj.adTop = (((document.documentElement.clientHeight - breakingNewsHeight - obj.adHeight) / 2) + breakingNewsHeight) + 'px';
            return obj;
        },

        listen: function() {
            this.pubSub = {};

            // Tell pubSub object
            this.pubSub['resize:app'] = this.onResize;
            this.pubSub['breakingbar:after:open'] = this.onResize;
            this.pubSub['breakingbar:after:close'] = this.onResize;
        },

        onClickCloseButton: function(e) {
            e.preventDefault();
            this.close(true);
        },

        close: function(animate) {
            if (this.showingAd && this.subviews.ad) {
                this.showingAd = false;
                StateManager.clearActiveAppFixed(true);
                this.subviews.ad.stopAd();
                this.hide(animate);
            }
            this.$body.removeClass('high-impact-ad-visible');
        },

        onResize: function() {
            var obj = this.findSizeForAd();
            this.$placement.removeClass('size-s size-m size-l size-xl').addClass(obj.adSizeClass).css({'top': obj.adTop});
            if (this.subviews.ad) {
                this.subviews.ad.resizeAd(obj.adWidth, obj.adHeight);
            }
        }
    });
    return OverlayView;
});
