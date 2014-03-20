define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'utils',
    'modules/partner/simple-ad',
    'adLogger'
],
function(
    $,
    _,
    BaseView,
    StateManager,
    Utils,
    SimpleAd,
    AdLogger
) {
    'use strict';

    var RepeatingPosterScrollAd = BaseView.extend({
        classes: {
            asset_double_wide: 'asset-double-wide',
            poster_ad_asset_module: 'poster-ad-asset-modules',
            datasphere: 'datasphere-community-modules'
        },

        constants:{
            AD_PLACEMENT: 'poster_scroll',
            AD_SIZES: {
                LARGE: {
                    TEXT: 'mediumrectangle,halfpage,filmstrip',
                    HEIGHT: 600
                },
                MEDIUM: {
                    TEXT: 'mediumrectangle',
                    HEIGHT: 250
                }
            },
            THROTTLE: 16
        },

        /**
         * @classdesc RepeatingPosterScrollAd, a subclass of {@link baseview}. This is a poster ad
         * that shows up when the current app is long enough and the previous poster ad is no longer
         * in view
         * @author Trey Eckels <teckels@gannett.com>
         * @constructs RepeatingPosterScrollAd
         * @extends baseview
         */
        initialize: function(options) {
            _.bindAll(this, 'overlayScrollListener');

            this.$win = Utils.get('win');
            this.activeApp = StateManager.getActiveApp();
            this.$sidebar = this.$el.closest('aside');
            if(!this.$sidebar.length){ return; } //eek no sidebar?!
            this.$el.css('overflow','auto');

            this.articleBody = this.activeApp.$('.' + this.classes.asset_double_wide);
            this.viewInfo = this.getViewInfo();
            this.debug = window.isAdDebug;
            this.logMessages = [];

            this.logMessages.push('View Info: articleHeight ' + this.viewInfo.articleHeight);
            this.logMessages.push('View Info: windowHeight ' + this.viewInfo.windowHeight);
            this.logMessages.push('View Info: moduleTop ' + this.viewInfo.moduleTop);

            if(this.isArticleTooShort()) {
                this.logMessages.push('Article is too short to calculate if we can show scroll ads');
            } else{
                this.setAdMetaData();

                if(this.numberOfPossibleAds){
                    this.placedAdsInfo = {
                        numberOfAdsPlaced: 0,
                        placedAds:[]
                    };
                    this.j= 0;
                    this.ad_template = '<div class="partner-placement partner-asset-right-ad-2" id="<%= id %>" style="margin-top:<%= margin_top %>"></div>';
                    this.overlayScrollListenerThrottle = _.throttle(this.overlayScrollListener, this.constants.THROTTLE);
                    this.$win.on('scroll.' + this.cid, this.overlayScrollListenerThrottle);
                }
            }

            BaseView.prototype.initialize.call(this, options);
            this.doDebuggingTasks('Poster Scroll Debug Infomation on Init');
        },

        doDebuggingTasks: function(groupName){
            if(this.debug){
                if(groupName) this.publishLogs(groupName);
                var $scrollAds = this.$('.partner-asset-right-ad-2');
                $scrollAds.css({
                    'display': 'block',
                    'border': '1px solid rgb(0,0,0)',
                    'height': 250
                });
                if(this.placedAdsInfo.numberOfAdsPlaced === this.numberOfPossibleAds){
                    $('<hr />').appendTo(this.$el).css('margin-top',this.viewInfo.windowHeight);
                    $('<hr />').appendTo(this.$el).css('margin-top',this.constants.AD_SIZES.MEDIUM.HEIGHT);
                }
            }
        },

        publishLogs: function(groupName){
            AdLogger.logGroup(groupName);
            _.each(this.logMessages, function(value){
                AdLogger.logInfo(value);
            });
            AdLogger.logGroupEnd();
            this.logMessages = [];
        },

        setAdMetaData: function(){
            // set number of possible ads
            this.numberOfPossibleAds = this.getNumberOfPossibleAds();
            this.logMessages.push('How many scroll ads can we show: ' + this.numberOfPossibleAds);
            // set ad position tops
            this.adPositions = this.getAdTopPositions();
            this.logMessages.push('Ad Position Tops: ' + this.adPositions);
        },

        isArticleTooShort: function(){
            return this.viewInfo.articleHeight < this.viewInfo.moduleTop;
        },

        getAdTopPositions: function(){
            var positions = [],
                viewInfo = this.viewInfo,
                adSpacing = viewInfo.windowHeight + this.constants.AD_SIZES.MEDIUM.HEIGHT;
            for(var i=0; i < this.numberOfPossibleAds; i++){
                var pos = viewInfo.moduleTop;
                if (i > 0) {
                    pos = viewInfo.moduleTop + (i * adSpacing);
                }
                positions[i] = pos;
            }
            return positions;
        },

        getViewInfo: function(){
            return {
                articleHeight: this.articleBody.height(),
                windowHeight: this.getWindowHeight(),
                moduleTop: this.getModuleTop()
            };
        },

        isAdModuleAboveMe: function(){
            //a poster ad should not show directly below a datasphere ad or a GPT ad
            var adIsAboveMe = this.adIsAboveMe;
            if(adIsAboveMe === undefined){
                var $moduleAboveMe = this.$el.parent().prev();
                adIsAboveMe = $moduleAboveMe.hasClass(this.classes.datasphere) || $moduleAboveMe.hasClass(this.classes.poster_ad_asset_module);
                this.adIsAboveMe = adIsAboveMe;
            }
            return adIsAboveMe;
        },

        getModuleTop: function(){
            var adIsAboveMe = this.isAdModuleAboveMe(),
                moduleTop = this.$el.position().top - this.$sidebar.position().top;
            if(adIsAboveMe){
                moduleTop = moduleTop + this.getWindowHeight();
            }
            return moduleTop;
        },

        getWindowHeight: function(){
            return this.$win.height();
        },

        getNumberOfPossibleAds: function(){
            var viewInfo = this.viewInfo,
                availableSpace = viewInfo.articleHeight - viewInfo.moduleTop,
                adSize = this.constants.AD_SIZES.MEDIUM.HEIGHT,
                adSpacing = adSize + viewInfo.windowHeight;
            if (availableSpace < adSize) {
                return 0;
            } else {
                return Math.floor((availableSpace - adSize)/adSpacing) + 1;
            }
        },

        getNumberOfAdsPlaced: function() {
            return this.placedAdsInfo.numberOfAdsPlaced;
        },

        environmentCheck: function(){
            var moduleTop = this.getModuleTop();
            this.logMessages.push('View Info: moduleTop ' + moduleTop);
            if(this.viewInfo.moduleTop !== moduleTop){
                this.viewInfo.moduleTop = moduleTop;
                this.setAdMetaData();
                this.doDebuggingTasks('Poster Scroll Debug Infomation on Env Changed');
            }
        },

        didWePlaceAllPossibleAds: function(){
            return this.placedAdsInfo.numberOfAdsPlaced >= this.numberOfPossibleAds;
        },

        overlayScrollListener: function() {
            // first we need to find out if our ad modules has shifted down because other content was
            // ajaxed in (e.g. the top poster ad took longer than normal), subsequently pushing this
            // modules down, after this modules was init-ed
            var windowOffset = this.getScrollTop();

            // check the environment and reset any variables that are needed for this function to succeed
            this.environmentCheck();

            // check out how many ads have been delivered and compare to the number we are
            // supposed to get. If we have placed all the ads that we should have, then no
            // need to move forward
            if(!this.didWePlaceAllPossibleAds()){
                _.each(this.adPositions,function(value,index){
                    // if we have scrolled to or past the ad position, we need to
                    // make sure the ad call has been made, and if not, set up
                    // the DOM and place the call. This ensures that if a system
                    // does not have smooth scrolling and the user scrolled too quickly
                    // to the bottom, all ads will still be called
                    if(windowOffset >= value && !this.placedAdsInfo.placedAds[index]){
                        var marginTop = 0;
                        if (index > 0 || (index === 0 && this.isAdModuleAboveMe())){
                            marginTop = this.viewInfo.windowHeight + 'px';
                        }
                        this.renderNextAd(value, marginTop, this.constants.AD_SIZES.MEDIUM.TEXT);
                    }
                }, this);
            } else {
               // we've determined we have no more room for ads, turn off event listener
               this._destroyHandlers();
            }
        },

        getScrollTop: function(){
            return Utils.getScrollPosition();
        },

        renderNextAd: function(adTop, marginTop, adSizes) {
            var ad_placement = this.constants.AD_PLACEMENT,
                id = ad_placement + '_' + adTop,
                vars = {'id':id,'margin_top': marginTop},
                $ad = $(_.template(this.ad_template, vars)).appendTo(this.$el);
            this.subviews[ad_placement + '_'+(this.j++)]= this.$currentAdPosition = new SimpleAd({
                el: $ad,
                adSizes: adSizes || this.constants.AD_SIZES.MEDIUM.TEXT,
                adPlacement: ad_placement,
                adType: 'poster'
            });
            this.$currentAdPosition._initAds();
            this.placedAdsInfo.placedAds.push(adTop);
            (this.placedAdsInfo.numberOfAdsPlaced)++;
        },

        /**
         * Clean up view.
         * Removes event handlers and element (optionally).
         * @param {boolean} removeEl option to also remove View from DOM.
         */
        destroy: function(removeEl) {
            this._destroyHandlers();
            BaseView.prototype.destroy.call(this, removeEl);
        },

        _destroyHandlers: function(){
            this.doDebuggingTasks();
            this.$win.off('.' + this.cid);
        }

    });
    return RepeatingPosterScrollAd;
});
