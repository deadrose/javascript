/**
 * @fileoverview Sidebar Poster Ad View
 * @author teckels@gannett.com (Trey Eckels)
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'pubsub',
    'state',
    'sharedAdPosition',
    'directAdPosition'
],
function(
    $,
    _,
    BaseView,
    PubSub,
    StateManager,
    SharedAdPosition,
    DirectAdPosition
)
    {
        'use strict';
        /**
         * View class.
         */
        var SidebarPosterAd = BaseView.extend({

            /**
             * Initialize view.
             */
            initialize: function(options) {
                _.bindAll(this,
                    'onSidebarAdReady'
                );

                var siteConfig = window.site_config.ADS.SIDEBAR_POSTER_AD || {},
                    $el = this.$el;
                this.layoutType = this._getLayoutType();

                options = $.extend({
                    adType : $el.attr('data-ad-type') || siteConfig.TYPE || 'sidebar',
                    adPlacement: $el.attr('data-ad-placement') || siteConfig.PLACEMENT || 'poster_front',
                    adSizes: $el.attr('data-ad-sizes') || siteConfig.SIZES || 'mediumrectangle,halfpage',
                    isShared: siteConfig.IS_SHARED || false
                }, options);

                this.showOnlyWhenNoSidebar = !!($el.closest('.show-only-when-no-sidebar').length);

                BaseView.prototype.initialize.call(this, options);
            },

            /**
             * Used to initiate a direct ad position
             * @private
             */
            _initAds: function(){
                if (!this.subviews.sidebarAd) {
                    var options = this.options;
                    var adSizes = options.adSizes;
                    if (adSizes){
                        adSizes = adSizes.split(',');
                    }
                    var adOptions = {
                        el: this.$el,
                        adPlacement: options.adPlacement,
                        pageInfo: StateManager.getActivePageInfo(),
                        adSizes: adSizes,
                        onAdReady: this.onSidebarAdReady,
                        adType: options.adType
                    };
                    if (!options.isShared){
                        this.subviews.sidebarAd = new DirectAdPosition(adOptions);
                    } else {
                        adOptions.defaultPosition = true;
                        this.subviews.sidebarAd = new SharedAdPosition(adOptions);
                    }
                }
            },

            _getLayoutType: function(){
                var layout = null;
                if(this.options.layoutType){
                    if (this.options.layoutType.indexOf('primary') !== -1) {
                        layout = 'primary';
                    } else if (this.options.layoutType === 'sidebar'){
                        layout = 'sidebar';
                    }
                }
                return layout;
            },

            onSidebarAdReady : function(){
                this.subviews.sidebarAd.showAd();
                // announce that the scrollbar should update
                this.refreshSidebar();
            },

            refreshSidebar: function(){
                if (StateManager.getActiveApp().refreshSidebarScroll) {
                    StateManager.getActiveApp().refreshSidebarScroll();
                }
            },

            /**
             * Used to call the ad position's destroy method if the card width changes and the ad exists
             * because the sidebar width will be too small to show ad
             * @private
             */
            _onHideSidebarAd: function() {
                //if we have an ad placement
                if(this.subviews.sidebarAd){
                    if(this.options.isShared){
                        this.subviews.sidebarAd.destroy(true);
                        this.subviews.sidebarAd = false;
                    } else {
                        this.hide();
                    }
                    if(this.layout === 'sidebar'){
                        // clear ad height on sidebar
                        this.$('.sidebar-wrapper').css('top', 0);
                        // announce that the scrollbar should update
                        this.refreshSidebar();
                    }
                }
            },

            /**
             * Triggered from card.js
             * If the card width has changed and there is an ad placement, we need to destory the
             * ad placement because any size change at this point will be too small to handle the ad
             * @param {Object} currentCardInfo provides state information about the card
             */
            onCardWidthChange: function(currentCardInfo){
                if(currentCardInfo.sidebarOpen){
                    if(this.layoutType === 'primary'){
                        if(this.showOnlyWhenNoSidebar){
                            this._onHideSidebarAd();
                        }
                    } else {
                        if(currentCardInfo.sidebarAds){
                            if(!this.options.isShared){
                                this.show();
                                this._initAds();
                            }
                        } else {
                            this._onHideSidebarAd();
                       }
                    }
                } else {
                    if(this.layoutType === 'sidebar'){
                        this._onHideSidebarAd();
                    } else {
                        if(this.showOnlyWhenNoSidebar){
                            this.show();
                            this._initAds();
                        }
                    }
                }
            },

             /**
             * Triggered from card.js
             * We place the initAds function here and not in initialize so that we only call an
             * ad once the card is ready to render modules in the sidebar and once we know if the
             * sidebar is actually big enough to handle the ad
             * @param {Object} currentCardInfo provides state information about the card
             */
            renderCardInfo: function(currentCardInfo) {
                //sidebar is open
                if (currentCardInfo.sidebarOpen){
                    //primary layout
                    if(this.layoutType === 'primary'){
                        //only show ad if the primary ad doesn't depend on the sidebar status
                        if(!this.showOnlyWhenNoSidebar){
                            this._initAds();
                        }
                    //sidebar layout
                    } else {
                        //only show ad if the cord says its capable to show an ad
                        if(currentCardInfo.sidebarAds){
                            this._initAds();
                        }
                    }
                //sidebar is closed
                } else {
                    //only primary ads will display when the sidebar is closed
                    if(this.layoutType === 'primary'){
                        this._initAds();
                    }
                }
            }

        });


        /**
         * Return view class.
         */
        return SidebarPosterAd;
    }
);
