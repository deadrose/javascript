/*global Modernizr:true*/
define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'site-manager',
    'utils',
    'partner/overlay-ad-asset'
],
function(
    $,
    _,
    BaseView,
    StateManager,
    SiteManager,
    Utils,
    OverlayAssetAd
) {
    'use strict';

    var TransitionAd = BaseView.extend({
        initialize: function(options) {
            BaseView.prototype.initialize.call(this, options);
            this.renderAd();
        },

        renderAd: function() {
            var lastUrl = StateManager.getLastUrl(),
                overlayAdObj = {
                    el: this.$el,
                    pageInfo: StateManager.getActivePageInfo(),
                    getHeaderOffset: function(){
                        var header = SiteManager.getHeader();
                        if (header) {
                            return header.getExpandedHeight();
                        } else {
                            return 0;
                        }
                    }
                };
            // We've been initialized, which means we're in one of these 4 scenarios
            // 1: transition_referrer - trigger ad
            // 2: !Modernizr.history - trigger ad
            // 3: StoryTransitionAd.getCurrentMeterCount() === 0 - trigger ad
            // 4: StoryTransitionAd.getCurrentMeterCount() !== 0 - just tick meter
            var triggerAd = false;
            var referrer = this.getDocumentReferrer();

            // scenario 1
            if (lastUrl === null && referrer && referrer.match(/:\/\/(.[^/]+)/)[1].indexOf(window.location.hostname) === -1) {
                overlayAdObj.adPlacement = 'transition_referrer';
                overlayAdObj.rateMeterId = 'transition_referrer';
                triggerAd = true;
            }
            this.subviews.transitionAd = new OverlayAssetAd(overlayAdObj);
            // scenario 2
            if (!Modernizr.history) {
                triggerAd = true;
            }

            // scenario 3
            if (this.subviews.transitionAd.getCurrentMeterCount() === 0) {
                triggerAd = true;
            }

            if (triggerAd) {
                this.subviews.transitionAd.triggerAd();
            } else {
                // tickMeter, don't reset, always tick transition
                this.subviews.transitionAd.tickMeter(true, 'transition');
            }
            if (overlayAdObj.rateMeterId === 'transition_referrer') {
                // transition_referrer meter is guarenteed to show an ad,
                // so we reset the transition meter, so the transition_referrer ad acts like a transition ad
                // and resets the transition meter to the high water mark
                this.subviews.transitionAd.resetMeter('transition');
            }
        },
        getDocumentReferrer: function(){
            return document.referrer;
        },
        getTransitionMeterCount: function(){
            if (this.subviews.transitionAd) {
                return this.subviews.transitionAd.getCurrentMeterCount('transition');
            }
            return 0;
        }
    });
    return TransitionAd;
});