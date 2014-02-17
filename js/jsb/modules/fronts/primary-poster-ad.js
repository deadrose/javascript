/**
 * @fileoverview Sidebar Poster Ad View
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
        var PrimaryPosterAd = SimpleAd.extend({

            /**
             * Initialize view.
             */
            initialize: function(options) {

                var $el = this.$el;

                options = $.extend({
                    adType : $el.attr('data-ad-type') || 'poster',
                    adPlacement: $el.attr('data-ad-placement') || 'poster_front',
                    adSizes: $el.attr('data-ad-sizes') || 'mediumrectangle'
                }, options);

                SimpleAd.prototype.initialize.call(this, options);

                this._initAds();
            }
        });

        /**
         * Return view class.
         */
        return PrimaryPosterAd;
    }
);
