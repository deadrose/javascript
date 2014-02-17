/**
 * @fileoverview Simple Ad View
 * @author teckels@gannett.com (Trey Eckels)
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'sharedAdPosition',
    'directAdPosition'
],
function(
    $,
    _,
    BaseView,
    StateManager,
    SharedAdPosition,
    DirectAdPosition
)
    {
        'use strict';
        /**
         * View class.
         */
        var SimpleAd = BaseView.extend({

            /**
             * @classdesc Simple Ad, a subclass of {@link baseview}. This is basic ad view instantiantion
             * @author Trey Eckels <teckels@gannett.com>
             * @constructs SimpleAd
             * @extends baseview
             * @param {Object} options backbone options object
             *    @param {Object.<String, String>} [options.adPlacement] - placement in DFP (e.g. high_impact)
             *    @param {Object.<String, String>} [options.adSizes] - sizes the ad can render (e.g. mediumrectangle)
             *    @param {PageInfo} [options.pageInfo] - alternative to options.targeting, will build targeting out of a pageInfo object
             *    @param {Function} [options.onAdReady] - custom callback to run when ad has signaled it is ready to run
             *    @param {Boolean} [options.isShared] - Indicates whether this is a shared ad or not
             */
            initialize: function(options) {
                _.bindAll(this, 'onAdReady');

                options = $.extend({
                    adPlacement: 'poster_front',
                    adSizes: 'mediumrectangle',
                    pageInfo: StateManager.getActivePageInfo(),
                    onAdReady: this.onAdReady,
                    isShared: false
                }, options);

                BaseView.prototype.initialize.call(this, options);
            },

            /**
             * Used to initiate an ad position
             * @private
             */
            _initAds: function(){
                var options = this.options;
                var adSizes = options.adSizes;
                if (adSizes){
                    adSizes = adSizes.split(',');
                }
                var adOptions = {
                    el: this.$el,
                    adPlacement: options.adPlacement,
                    pageInfo: options.pageInfo,
                    adSizes: adSizes,
                    onAdReady: this.onAdReady,
                    adType: options.adType
                };
                if (!options.isShared){
                    this.subviews.simpleAd = new DirectAdPosition(adOptions);
                } else {
                    adOptions.defaultPosition = true;
                    this.subviews.simpleAd = new SharedAdPosition(adOptions);
                }
            },

            onAdReady: function() {
                this.subviews.simpleAd.show();
            }
        });


        /**
         * Return view class.
         */
        return SimpleAd;
    }
);
