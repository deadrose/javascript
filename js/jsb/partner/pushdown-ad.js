define([
    'jquery',
    'underscore',
    'utils',
    'baseview',
    'sharedAdPosition',
    'partner/leavebehind',
    'adLogger',
    'admanager',
    'animatecolors'
],
function(
    $,
    _,
    Utils,
    BaseView,
    SharedAdPosition,
    LeaveBehind,
    AdLogger,
    AdManager
) {
    'use strict';
    var PushdownView = BaseView.extend(
    /**
     * @lends partner/pushdown-ad.prototype
     */
    {

        events: {
            'click .partner-pushdown-ad > .partner-close': 'closeAdClick'
        },

        /**
         * @classdesc Pushdown ad type, this is a {@link partner/shared-ad-position}.
         *          The el for this view needs to contain both .partner-pushdown-ad.partner-placement and
         *          .partner-leavebehind divs to work as well as the styles included in partner.css
         * @constructs partner/pushdown-ad
         * @author Jay Merrifield <jmerrifiel@gannett.com>
         * @author Chad Shryock <cdshryock@gannett.com>
         * @param {Object} options backbone options object
         *     @param {jQuery|Element|String} options.el - element or string selector that contains both the pushdown and leave behind divs
         */
        initialize: function(options) {
            options = $.extend({
                adClasses: '',
                animations: {
                    vertical: {
                        duration: 350,
                        easing: 'cubic-bezier(0.645, 0.045, 0.355, 1.000)'
                    }
                }
            }, options);

            _.bindAll(this, 'onAdReady', 'showAd', 'beforeAdRender');

            // call base class initialize
            BaseView.prototype.initialize.call(this, options);

            this.$body = Utils.get('body');
            this.$pushdown = this.$('.partner-pushdown-ad');
            this.$bigHeadline = this.$('.big-headline');
            AdLogger.logDebug('Pushdown Advertisment initialized', this);
        },

        /**
         * This function triggers the SharedAdPosition to register and request an ad
         * @param {Object} currentCardInfo current viewport sizing information
         *     @param {Number} currentCardInfo.cardWidth The width the ad can fit inside of
         *     @param {String} currentCardInfo.adClass ad class the pushdown is looking for (usually size-s, size-m, size-l)
         *     @param {Boolean} [options.isCardBumped=false] - Used for specifying if the leave behind is compact or not
         */
        renderCardInfo: function(currentCardInfo, isCardBumped){
            var adSizes = this.filterAdsByCardWidth(
                ['pushdown', 'iabpushdown', 'iabpushdown2', 'billboard'],
                currentCardInfo
            );
            this.subviews.adPosition = new SharedAdPosition({
                el: this.$pushdown,
                adSizes: adSizes,
                adPlacement: 'high_impact',
                adType: ['pushdown', 'risingstar'],
                onAdReady: this.onAdReady,
                beforeAdRender: this.beforeAdRender
            });
            this.currentCardInfo = currentCardInfo;
            this.isCardBumped = isCardBumped;
        },

        filterAdsByCardWidth: function(adSizes, currentCardInfo) {
            return _.filter(adSizes, function(size) {
                var adFlexible = AdManager.isFlexibleAdSize(size),
                    adSize = AdManager.getSize(size);
                return adFlexible || (adSize && adSize[0] <= currentCardInfo.cardWidth);
            });
        },

        beforeAdRender: function(adInfo){
            this.adType = adInfo.adType;
            if (this.currentCardInfo) {
                this.onCardWidthChange(this.currentCardInfo);
            }
        },

        destroy: function(removeEl) {
            // no need to cleanup ad, it gets cleaned up by the ad position
            if (this.showingAd) {
                this.closeAd(true);
            } else {
                this.clearBackground();
            }
            BaseView.prototype.destroy.call(this, removeEl);
        },

        onAdReady: function(adInfo) {
            this.backgroundSolidColor = adInfo.backgroundSolidColor;
            this.backgroundRepeatingImage = adInfo.backgroundRepeatingImage;
            if (adInfo.adType === 'Pushdown+') {
                this.persistBackground = true;
                this.changeBackground();
                this.$pushdown.css({display: 'block', height: 0});
            }
            if (adInfo.leaveBehindImage && adInfo.leaveBehindText) {
                this.subviews.adLeaveBehind = new LeaveBehind({
                    el: this.$('.partner-leavebehind'),
                    onShowAd: this.showAd,
                    imageUrl: adInfo.leaveBehindImage,
                    altText: adInfo.leaveBehindText,
                    isCompact: this.isCardBumped
                });
                this.subviews.adLeaveBehind.render(this.subviews.adPosition);
            } else {
                this.showAd();
            }
        },

        showAd: function() {
            var pushdownHeight;
            this.showingAd = true;
            this.subviews.adPosition.show();
            if (this.$pushdown.hasClass('iab-risingstar')) {
                if (this.isCardBumped) {
                    this.$pushdown.css('margin', '0 auto 25px');
                }
            } else {
                // rising star ads have their own logic for revealing the ads
                this.$pushdown.css({height: 0});
                pushdownHeight = 615 - this.getBigHeadlineHeight();
                this.$bigHeadline.css('visibility', 'hidden');
                $.when( this.animate(this.$pushdown, 'height', pushdownHeight, this.options.animations.vertical.duration),
                        this.animate(this.$pushdown, 'top', 0, this.options.animations.vertical.duration))
                    .done(_.bind(function(){
                    if (this.subviews.adPosition) {
                        this.subviews.adPosition.playAd();
                    }
                }, this));
                this.$body.addClass('high-impact-ad-visible');
            }
            this.changeBackground();
        },

        closeAdClick: function(e){
            e.preventDefault();
            this.closeAd();
        },

        getBigHeadlineHeight: function(){
            return this.$bigHeadline.height() || 0;
        },

        closeAd: function(clearBackground) {
            if (this.$pushdown.hasClass('iab-risingstar')){
                // rising star ads don't close, but still need margin reset
                if (this.isCardBumped) {
                    this.$pushdown.css('margin', '');
                }
            } else {
                var bigHeadlineHeight = this.getBigHeadlineHeight();
                this.showingAd = false;
                this.subviews.adPosition.stopAd();
                $.when( this.animate(this.$pushdown, 'height', 0, this.options.animations.vertical.duration),
                        this.animate(this.$pushdown, 'top', bigHeadlineHeight + 'px', this.options.animations.vertical.duration))
                    .done(_.bind(function() {
                    this.$bigHeadline.css('visibility', 'visible');
                    if (this.subviews.adLeaveBehind) {
                        this.subviews.adLeaveBehind.show();
                    }
                }, this));
            }
            this.$body.removeClass('high-impact-ad-visible');
            if (!this.persistBackground || clearBackground) {
                this.clearBackground();
            }
        },

        changeBackground: function() {
            if (!this.backgroundSolidColor || this.backgroundSolidColor === 'transparent') {
                return;
            }

            this.startingBackgroundColor = this.$body.css('background-color');
            if (this.startingBackgroundColor === 'transparent' || !this.startingBackgroundColor){
                // our plugin can't handle transitioning from 'transparent' to a color
                this.startingBackgroundColor = ''; // setting startingBackgroundColor to empty so it's easier to check the clearBackground function
                return;
            }

            // Body Background goes to the png
            this.$body.addClass('partner-background');

            // Animate into the background color
            this.animate(this.$body, 'background-color', this.backgroundSolidColor, 200, 'ease-in').done(_.bind(function() {
                if (this.backgroundRepeatingImage) {
                    this.changeBackgroundImage(this.backgroundRepeatingImage);
                } else {
                    this.changeBackgroundImage(window.site_static_url + 'images/pixels/pixel-transparent.png');
                }
            }, this));
        },

        changeBackgroundImage: function(imageSrc) {
            this.$body.css({
                'background-image': 'url(\'' + imageSrc + '\')',
                'background-repeat': 'repeat'
            });
        },

        clearBackground: function() {
            // animatecolors errors out when the background color is transparent in IE9.
            // mirrors same behavior in changeBackground function above.
            if (!this.startingBackgroundColor || !this.backgroundSolidColor || this.backgroundSolidColor === 'transparent') {
                return;
            }
            this.$body.css({
                'background-image': '',
                'background-repeat': ''
            });
            this.animate(this.$body, 'background-color', this.startingBackgroundColor, 200, 'ease-in').done(_.bind(function() {
                this.$body.removeClass('partner-background');
            }, this));
        },

        onCardWidthChange: function(newCardInfo) {
            if (!this.subviews.adPosition){
                return;
            }
            var bigHeadlineHeight = this.getBigHeadlineHeight();
            this.currentCardInfo = newCardInfo;
            if (this.adType === 'Pushdown+' && !this.showingAd) {
                this.$pushdown.css('top', bigHeadlineHeight);
            }
            this.$pushdown.removeClass(this.options.adClasses).addClass(newCardInfo.adClass);
            this.subviews.adPosition.resizeAd(newCardInfo.cardWidth, 615);

            // Remove rising star, which is incompatible with narrow width.
            if (this.$pushdown.hasClass('iab-risingstar') && newCardInfo.name === 'small') {
                this.$pushdown.remove();
                this.destroy();
            }
        }

    });
    return PushdownView;

});
