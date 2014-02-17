/**
 * @fileoverview Sponsored Logo Ad View
 * @author teckels@gannett.com (Trey Eckels)
 */
define([
    'jquery',
    'underscore',
    'modules/partner/simple-ad'
],
function(
    $,
    _,
    SimpleAd
)
    {
        'use strict';
        /**
         * View class.
         */
        var SponsorLogoAd = SimpleAd.extend({

            /**
             * Initialize view.
             */
            initialize: function(options) {

                var $el = this.$el;

                options = $.extend({
                    adType : $el.attr('data-ad-type') || 'sponsor_logo_module',
                    adPlacement: $el.attr('data-ad-placement') || 'sponsor_logo_module',
                    adSizes: $el.attr('data-ad-sizes') || 'sponsor_logo_medium'
                }, options);

                SimpleAd.prototype.initialize.call(this, options);

                this._initAds();
            }
        });

        /**
         * Return view class.
         */
        return SponsorLogoAd;
    }
);
