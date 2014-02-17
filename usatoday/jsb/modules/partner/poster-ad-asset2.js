define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'site-manager',
    'utils',
    'directAdPosition'
],
function(
    $,
    _,
    BaseView,
    StateManager,
    SiteManager,
    Utils,
    DirectAdPosition
) {
    'use strict';

    var PosterAd2 = BaseView.extend({

        initialize: function(options) {
            _.bindAll(this, 'overlayScrollListener', 'onSecondAdReady');

            this.$win = Utils.get('win');
            this.header = SiteManager.getHeader();
            this.overlayScrollListenerThrottle = _.throttle(this.overlayScrollListener, 100);
            this.$win.on('scroll.' + this.cid, this.overlayScrollListenerThrottle);
            this.articleBody = StateManager.getActiveApp().$('.asset-double-wide');

            this.pubSub = {
                'breakingbar:after:open': this.overlayScrollListener,
                'breakingbar:after:close': this.overlayScrollListener
            };

            BaseView.prototype.initialize.call(this, options);
        },

        overlayScrollListener: function() {
            var windowOffset = this.$win.scrollTop(),
                posterAd = StateManager.getActiveApp().$('.partner-asset-right-ad'),
                posterAdBottom = posterAd.offset().top + posterAd.height(),
                headerHeight = 70;

            if (this.header) {
                headerHeight = this.header.getFixedHeight() + 30;
            }

            if (!this.subviews.posterad2) {
                if (windowOffset >= posterAdBottom) {
                    this.renderSecondAd();
                }
            } else {
                if (this.subviews.posterad2.isAdReady()) {
                    // trick to figure out where the ad sits on the page when not fixed
                    var adOriginalPosition = this.$el.parent().offset().top,
                        adOriginalPositionWindowOffset = adOriginalPosition - windowOffset;
                    if (windowOffset >= posterAdBottom) {
                        if (this.$el.hasClass('hidden')) {
                            this.$el.removeClass('hidden');
                        }

                        // only lock the poster ad if we can figure out how long the article body is
                        if (this.articleBody.length) {
                            var adBottomOffset = this.articleTop + this.articleHeight - windowOffset,
                                articleAdPosition = adBottomOffset-this.posterAd2Height;

                            //locks ad in place to top of screen when it comes within 30px of the header
                            //and locks it to the bottom of the artciel when the ad comes within 90px of the bottom of the article
                            if(adOriginalPositionWindowOffset <= headerHeight && articleAdPosition > 90) {
                                this.$el.css({position: 'fixed', top: headerHeight}).addClass('adFixed').removeClass('adBottomedOut');
                            } else if (adOriginalPositionWindowOffset > headerHeight && (articleAdPosition > 90 || this.$el.hasClass('adBottomedOut'))) {
                                this.$el.css({position: 'static', top: 'auto'}).removeClass('adFixed');
                            } else if (!this.$el.hasClass('adBottomedOut')) {
                                var articleTopOffset = (this.articleBody.position() || {}).top || 0,
                                    newTop = this.articleHeight - this.posterAd2Height + articleTopOffset-20;
                                this.$el.css({position: 'absolute', top: newTop}).removeClass('adFixed').addClass('adBottomedOut');
                            }
                        }
                    } else if (windowOffset < posterAdBottom) {
                        if(!this.$el.hasClass('hidden')) {
                            this.$el.addClass('hidden');
                        }
                    }
                }
            }
        },

        renderSecondAd: function() {
            var adSizes = this.$el.data('sizes');
            if (adSizes){
                adSizes = adSizes.split(',');
            }
            this.subviews.posterad2 = new DirectAdPosition({
                el: this.$el,
                adSizes: adSizes || ['mediumrectangle'],
                adPlacement: 'poster_scroll',
                adType: 'poster',
                onAdReady: this.onSecondAdReady,
                pageInfo: StateManager.getActivePageInfo()
            });
        },

        onSecondAdReady: function(adData, adType) {
            this.subviews.posterad2.show();
            if (this.articleBody.length) {
                this.articleHeight = this.articleBody.height();
                this.articleTop = this.articleBody.offset().top;
            }
            this.posterAd2Height = this.$('iframe').eq(0).height() + 20;
        },

        /**
         * Clean up view.
         * Removes event handlers and element (optionally).
         * @param {boolean} removeEl option to also remove View from DOM.
         */
        destroy: function(removeEl) {
            this.$win.off('.' + this.cid);
            BaseView.prototype.destroy.call(this, removeEl);
        }

    });
    return PosterAd2;
});