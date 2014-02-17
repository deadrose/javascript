/**
 * @fileoverview Gallery subview of carousel. In charge of the the stacked images and endslate
 * @author jmerrifiel@gannett.com (Jay Merrifield)
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'baseview',
    'pubsub',
    'utils',
    'modules/global/taboola',
    'modules/carousel/gallery',
    'directAdPosition',
    'modules/sports/sports-gallery-sponsorship-skin',
    'adLogger'
],
    function(
        $,
        _,
        Backbone,
        BaseView,
        PubSub,
        Utils,
        Taboola,
        CarouselGallery,
        DirectAdPosition,
        SportsGallerySponsorshipSkin,
        AdLogger
    ) {

        /**
         * View class.
         */
        var SportsCarouselGallery = CarouselGallery.extend({

            initialize: function(options) {
                _.bindAll(this, 'onAdReady', '_initializeAds', 'startVisible', 'teardownSponsorshipAd');
                options = $.extend({galleryClass: '.sports-front-galleries-primary'}, options);
                CarouselGallery.prototype.initialize.call(this, options);
            },

            _initializeAds: function() {
                if (!this.options.ads) {
                    return;
                }
                this.galleryData = this.$el.data() || {};
                var targeting = this.getAdTargeting();

                this.teardownSponsorshipAd();
                if (this.$sponsorshipAd.length) {
                    var currentSlideId = this._getSlideIn(this.index).data('qqid');
                    targeting.snapshotid = currentSlideId;
                    this.subviews.sponsorshipAd = new DirectAdPosition({
                        el: this.$sponsorshipAd,
                        adPlacement: 'sponsor_logo/' + this.$el.data('cst'),
                        adSizes: ['sponsor_logo'],
                        targeting: targeting,
                        onAdReady: this.onAdReady
                    });
                }
            },

            onAdReady: function(adData, adType) {
                if (adType === 'sponsorshiplogo' && adData.hasSkin === 'Yes') {
                    this.subviews.sponsorshipSkin = new SportsGallerySponsorshipSkin($.extend({
                        el: this.$sponsorshipAd,
                        startVisible: this.startVisible,
                        sidebarAds: this.options.sidebarAds,
                        galleryClass: this.options.galleryClass
                    }, adData));
                    this.subviews.sponsorshipSkin.render();
                }
            },

            startVisible: function() {
                if (this.options.isSideBarOpen() && this.options.sidebarAds()) {
                    return true;
                }
                return false;
            },

            teardownSponsorshipAd: function() {
                //This is for the sponsorship logo and skin
                this.$sponsorshipAd = this.$el.closest(this.options.galleryClass).find('.sp-galleries-sponsored-by');
                this.$sponsorshipSkin = this.$el.closest(this.options.galleryClass).find('.sp-galleries-skin');
                this.$sponsorshipAd.children().empty();
                this.$sponsorshipSkin.remove();
            },

            refreshSponsorshipAd: function(snapshotId){
                //remove default behaviour, we'll call our own refresh on gallery change
                return;
            },

            refreshSportsSponsorshipAd: function() {
                this.teardownSponsorshipAd();
                var targeting = this.getAdTargeting();
                this.subviews.sponsorshipAd.setTargeting(targeting);
                this.subviews.sponsorshipAd.refreshPosition();
            }

        });
        return SportsCarouselGallery;
    }
);