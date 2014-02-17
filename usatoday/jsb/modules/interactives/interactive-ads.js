 /**
 * @fileoverview Interactive Templates ad view.
 * @author jlcross@gannett.com (Jon Cross)
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'pubsub',
    'utils',
    'baseview',
    'directAdPosition'
],
function(
    $,
    _,
    Backbone,
    PubSub,
    Utils,
    BaseView,
    DirectAdPosition
 ) {
    /**
     * View class.
     */
    var interactiveAds = BaseView.extend({
        /**
         * Initialize view.
         * @param {Object} options View options passed during init.
         */
        initialize: function(options) {
            options = $.extend({
                ads: false,
                adSponsor: false,
                adTransition: false,
                interactiveType: '',
                isFramed: false,
                standAlone: false
            }, options);

            // Call base class initialize to make options available to class.
            BaseView.prototype.initialize.call(this, options);

            this.setupAds();
        },

        /**
         * Sets up sponsorship ads when enabled.
         */
        setupAds: function() {
            if (!this.options.ads) {
                return;
            }

            var data = this.$el.data();
            var targeting = {
                title: data.seoTitle,
                series: data.series,
                sitePage: 'usat/' + (data.ssts || '').replace(/\/\/*$/, ''),
                topic: data.topic
            };

            // Set up sponsorship ad.
            this.$sponsorshipAd = this.$('.interactive-sponsor');
            if (this.$sponsorshipAd.length > 0) {
                this.options.adSponsor = true;
                this.subviews.sponsorshipAd = new DirectAdPosition({
                    el: this.$sponsorshipAd,
                    adPlacement: 'sponsor_logo/interactive',
                    adSizes: ['sponsor_logo'],
                    targeting: targeting
                });
            }
        }

    });

    /**
     * Return view class.
     */
    return interactiveAds;
});
 