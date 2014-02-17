/**
 * @fileoverview Topic view.
 * @author kris.hedstrom@f-i.com (Kris Hedstrom)
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'utils',
    'state',
    'site-manager',
    'pubsub',
    'base-app',
    'sharedAdPosition',
    'partner/slider',
    'partner/overlay-ad-fronts',
    'modules/global/brightcove-video'
],
function(
    $,
    _,
    Backbone,
    Utils,
    StateManager,
    SiteManager,
    PubSub,
    BaseApp,
    SharedAdPosition,
    SliderAd,
    OverlayAdFront,
    Video
) {

    'use strict';
        /**
         * View class.
         */
        var StagView = BaseApp.extend({

            el: '.cards.stag',

            afterPageReveal: function(fromUrl, toUrl) {
                this._initializeTopic(fromUrl, 'stag');
            },

            _initializeTopic: function(fromUrl, pageType) {
                var _this = this;

                this.subviews.video = [];
                // Initialize each video as its own video instance.
                $('.stag.hero .video').each(function() {
                    var video = new Video({
                        // Use .video parent() because hero markup is different.
                        el: $(this).parent().get(0)
                    });
                    _this.subviews.video.push(video);
                });

                this.subviews.overlayAd = new OverlayAdFront({
                    el: this.$('.partner-overlay'),
                    leaveBehindEl: this.$('.partner-leavebehind'),
                    isStagFront: true,
                    getHeaderOffset: function() {
                        var header = SiteManager.getHeader();
                        if (header) {
                            return header.getExpandedHeight();
                        } else {
                            return 0;
                        }
                    }
                });

                // Generic Ad Call for PointRoll
                this.subviews.genericad = new SharedAdPosition({
                    el: '#ad-staging',
                    adSizes: ['generic'],
                    adPlacement: 'high_impact',
                    adType: 'generic'
                });

                this.subviews.sliderad = new SliderAd();
            }

        });


        /**
         * Return view class.
         */
        return StagView;
    }
);
