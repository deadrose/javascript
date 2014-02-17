define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'sharedAdPosition',
    'partner/asset-sponsorship'
],
function(
    $,
    _,
    BaseView,
    StateManager,
    SharedAdPosition,
    AssetSponsorship
) {
    'use strict';

    var PosterAd = BaseView.extend({
        initialize: function(options) {
            _.bindAll(this, 'onAdReady');

            if (window.site_config.ADS && window.site_config.ADS.GALLERY && window.site_config.ADS.GALLERY.REFRESH) {
                this.pubSub = {'carousel:switchSlide': this.refreshAdPosition};
            }

            BaseView.prototype.initialize.call(this, options);

            var adSizes = this.$el.data('sizes');
            if (adSizes) {
                adSizes = adSizes.split(',');
            }
            this.subviews.posterad = new SharedAdPosition({
                el: this.$el,
                adSizes: adSizes || ['mediumrectangle', 'halfpage', 'portrait', 'filmstrip'],
                adPlacement: 'poster',
                adType: 'sponsorship',
                defaultPosition: true,
                onAdReady: this.onAdReady
            });
        },
        refreshAdPosition: function() {
            this.subviews.posterad.refreshPosition();
        },
        onAdReady: function(adData, adType) {
            this.subviews.posterad.show();
            if (adType === 'sponsorship') {
                if (this.subviews.sponsorshipad) {
                    this.subviews.sponsorshipad.destroy();
                }
                this.subviews.sponsorshipad = new AssetSponsorship($.extend({
                    el: StateManager.getActiveApp().$('.asset')
                }, adData));
                this.subviews.sponsorshipad.render();
            }
        }

    });
    return PosterAd;
});
