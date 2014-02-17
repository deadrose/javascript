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
        var LeaderBoardAd = SimpleAd.extend({

            /**
             * Initialize view.
             */
            initialize: function(options) {

                var $el = this.$el;

                options = $.extend({
                    adType : $el.attr('data-ad-type') || 'leaderboard',
                    adPlacement: $el.attr('data-ad-placement') || 'leaderboard_btf',
                    adSizes: $el.attr('data-ad-sizes') || 'leaderboard'
                }, options);

                SimpleAd.prototype.initialize.call(this, options);

                this._initAds();
            }
        });

        /**
         * Return view class.
         */
        return LeaderBoardAd;
    }
);
