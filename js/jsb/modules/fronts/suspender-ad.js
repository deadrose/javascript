/**
 * @fileoverview Suspender Ad View
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
        var SuspenderAd = SimpleAd.extend({

            /**
             * Initialize view.
             */
            initialize: function(options) {

                options = $.extend({
                    adPlacement: 'sponsor_logo_front',
                    adSizes: 'sponsor_logo_medium'
                }, options);

                this.visibleWithSidebarOpen = this.$el.attr('data-visible-with-sidebar-open') !== "false";

                SimpleAd.prototype.initialize.call(this, options);

            },

            /**
             * Used to call our private function to destory the ad position if the sidebar opens
             * because while the sidebar is open and the weather module is present,
             * we need to hide this ad. Triggered from cards.js. Only on home page and for the sponsor_logo_front.
             */
            openSideBar : function(){
                if(!this.visibleWithSidebarOpen){
                    this._onHideSidebarAd();
                }
            },

            /**
             * Used to call our private function to call the ad position if the sidebar closes
             * because while the sidebar is closed and the weather module is not present,
             * we need to show this ad. Triggered from cards.js. Only on home page and for the sponsor_logo_front.
             */
            closeSideBar : function(){
                if(!this.visibleWithSidebarOpen){
                    this._initAds();
                }
            },

            /**
             * Used to call the ad position's destroy method if the sidebar opens
             * because while the sidebar is open and the weather module is present,
             * we need to hide this ad
             * @private
             */
            _onHideSidebarAd: function() {
                //if we have an ad placement
                if(this.subviews.simpleAd){
                    this.subviews.simpleAd.destroy();
                    this.hide();
                    this.subviews.simpleAd = false;
                }
            },

            /**
             * Triggered from card.js
             * We place the initAds function here and not in initialize so that we only call an
             * ad once the card is ready to render modules in the sidebar and suspender and once we know if the
             * sidebar is open. On the homefront, we only show the suspender ad when the sidebar is closed
             * @param {Object} currentCardInfo provides state information about the card
             */
            renderCardInfo: function(currentCardInfo) {
                if(this.visibleWithSidebarOpen){
                    //kickoff ads
                    this._initAds();
                } else {
                    if (!currentCardInfo.sidebarOpen){
                        //kickoff ads
                        this._initAds();
                    }
                }
            }
        });


        /**
         * Return view class.
         */
        return SuspenderAd;
    }
);
