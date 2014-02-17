/**
 * @fileoverview Cover View.
 * @author Chris Manning
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'site-manager',
    'pubsub',
    'utils',
    'admanager',
    'base-app',
    'directAdPosition',
    'uiPageTurn'
],
function(
    $,
    _,
    Backbone,
    SiteManager,
    PubSub,
    Utils,
    AdManager,
    BaseApp,
    DirectAdPosition
)
    {
        /**
         * View class.
         */
        var CoverViewApp = BaseApp.extend({

            el: '#cover-view',

            events: {
                'click .big-page-prev': 'prevSlide',
                'click .ui-page-turn': 'palmSlide',
                'click .big-page-next': 'nextSlide'
            },

            initialize: function(options) {
                options = $.extend(true, {animation: {slideDuration: 350}}, options);

                _.bindAll(this, 'keyboardShortcuts', 'onPageTurn', 'resizeHandler', 'moveSlide', 'playAd');
                this.$body = Utils.get('body');
                this.$top = Utils.get('scrollEl');
                this.$doc = Utils.get('doc');
                this.$win = Utils.get('win');

                this.$adContents = this.$('.partner-coverview-contents');

                this.flipTransformStyle = this.transformCssHyphenName + ' ' + options.animation.slideDuration + 'ms linear';

                var throttledResize = _.throttle(this.resizeHandler, 50);
                this.$win.on('resize.' + this.cid, throttledResize);

                // call base class initialize
                BaseApp.prototype.initialize.call(this, options);
            },

            resizeHandler: function(){
                if (this.$pages) {
                    var winWidth = this.$win.width(),
                        winHeight = this.$win.height() - 40; // exclude top menubar
                    if (winWidth % 2){
                        this.$pages.addClass('width-wiggler');
                    } else {
                        this.$pages.removeClass('width-wiggler');
                    }
                    this.$adContents.css({width: winWidth + 'px', top: 40, height: winHeight + 'px'});
                    // need to update all placed ads
                    $.each(this.subviews,function(k,v){
                        // check if the subview is an ad -
                        // all ad subviews start with 'ad_'
                        if(k.indexOf('ad_') === 0){
                            v.resizeAd(winWidth, winHeight);
                        }
                    });
                }
            },

            palmSlide: function(e){
                // let clicks of stories through or the ad stuff
                var $target = $(e.target);
                if ($target.hasClass('load-story') || $target.hasClass('parent-label') || $target.closest('.partner-placement').length){
                    return;
                }
                var screenX = e.screenX;
                var midPoint = this.$win.width() >> 1;
                if (screenX > midPoint){
                    this.nextSlide(e);
                }else{
                    this.prevSlide(e);
                }
            },

            prevSlide: function(e) {
                if (e){e.preventDefault();}

                this.moveSlide(-1);

                PubSub.trigger('heattrack', 'thebigpageleft');
            },

            nextSlide: function(e) {
                if (e){e.preventDefault();}

                this.moveSlide(1);

                PubSub.trigger('heattrack', 'thebigpageright');
            },

            moveSlide: function(direction) {
                var currentIndex = this.$pages.uiPageTurn('getCurrentPage').index(),
                    nextIndex = currentIndex + direction,
                    shouldShowAd = false,
                    playAd = this.playAd;

                if(this.isIndexAd(nextIndex)) {
                    // we are on an ad, has the ad been played?
                    shouldShowAd = this.isAdReady(nextIndex);
                    // we could be on ad but the ad wasn't ready to be played because
                    // no ad was scheduled/delivered, dfp hiccup, ad had errors, etc
                    // so then we should skip the ad slide and move on to the subsequent slide
                    // in the direction the user is going
                    if (!shouldShowAd) {
                        nextIndex = nextIndex + direction;
                    }
                } else {
                    this.prepareNextAd(currentIndex);
                }

                //turn the page and play the ad if we have determined that we should do so
                this.registerAnimation(this.$pages.uiPageTurn('goToPage',nextIndex)).done(function(){
                    if (shouldShowAd) {
                        // ad play
                        playAd(nextIndex);
                    }
                });
            },

            animateRevealApp: function(fromUrl, toUrl) {
                SiteManager.getHeader().setClosedFixed();
                return BaseApp.prototype.animateRevealApp.apply(this, arguments);
            },

            playAd: function(index){
                var ad = this.subviews['ad_' + index];
                if(ad){
                    ad.playAd();
                    ad.show();
                }
            },

            fetchAd: function(index){
                var pageInfoObj,
                    currentAd,
                    $obj = this.$pagesChildren.eq(index),
                    siteName = Utils.getNested(window, 'site_vars', 'aws_site_name') || 'usat',
                    $adContents = $obj.find('.partner-coverview-contents');

                //get pageInfoObj of previous slide
                pageInfoObj = this.getPageInfo($obj.prev());
                //build ad position
                this.subviews['ad_' + index] = currentAd = new DirectAdPosition({
                    el: $adContents,
                    adPlacement: 'coverview/' + pageInfoObj.aws,
                    adSizes: ['coverviewfullpage'],
                    targeting: {
                        'title' : AdManager.getAdSafePageTitle(pageInfoObj.seotitle),
                        'sitePage' : siteName + '/' + (pageInfoObj.ssts || '').replace(/\/\/*$/, '')
                    },
                    slotType: 'out'
                });
                currentAd.prefetchAd();
                // housekeeping
                this.resizeHandler();
                return true;
            },

            beforeOverlayRemove: function(toUrl){
                SiteManager.getHeader().setClosedFixed();
            },

            afterOverlayReveal: function(offset) {
                var header = SiteManager.getHeader();
                if (header) {
                    // undock the header
                    header.setFixingScroller(true);
                    header.scrollTop(0);
                }
            },

            afterAppRemove: function(fromUrl, toUrl){
                SiteManager.getHeader().restoreDefaultState();
            },

            getNextAdIndex : function(index){
                return this.$pagesChildren.eq(index).nextAll('.partner-placement').first().index();
            },

            checkIfAdHasBeenFetched: function(index){
                // index is either a positive integer or -1
                // if index is a postive integer, check to see if
                // the subview has been created yet and if not,
                // fetch the ad
                if((index > 0) && (!this.subviews['ad_' + index])){
                    // fetch ad
                    this.fetchAd(index);
                }
            },

            isIndexAd: function(index){
                return this.$pagesChildren.eq(index).hasClass('partner-placement');
            },

            prepareNextAd: function(index) {
               // what is the next ad and has it been fetched?
               var nextAdIndex = this.getNextAdIndex(index);
               this.checkIfAdHasBeenFetched(nextAdIndex);
            },

            isAdReady: function(index){
                var ad = this.subviews['ad_' + index];
                if(ad){
                    return ad.isAdReady();
                } else {
                    return false;
                }
            },

            slideTransition: function($newSlide, left){
                $newSlide.addClass('active');
                if (left){
                    $newSlide.css('left', '100%');
                } else {
                    $newSlide.css('left', '-100%');
                }
                this.animate($newSlide, 'left', 0, this.options.animation.slideDuration, 'linear')
                    .done(_.bind(function(){
                        this.$activePage = $newSlide;
                        this.busy = false;
                    }, this));
                this.$activePage.css('left', '0%');
                this.animate(this.$activePage, 'left', (left ? '-100%': '100%'), this.options.animation.slideDuration, 'linear');
            },

            setFixedPosition: function(offset){
                BaseApp.prototype.setFixedPosition.call(this, 0);
            },

            keyboardShortcuts: function(e) {
                if (e.which === 37) {
                    this.prevSlide(e);
                } else if (e.which === 39) {
                    this.nextSlide();
                }
            },

            afterPageReveal: function(fromUrl, toUrl, paused) {
                this.$prev = this.$('.big-page-prev');
                this.$next = this.$('.big-page-next');
                this.$pages = this.$('#cover-view-pages');
                this.$pagesChildren = this.$pages.children();
                this.$pages.uiPageTurn({
                    onPageTurn: this.onPageTurn,
                    turnDuration: 600,
                    fallback: 'slide',
                    shadow: false // Browser can't handle shadow for large viewports.
                });
                this.resizeHandler();
                this.$doc.on('keyup.' + this.cid, this.keyboardShortcuts);
                this.trackPageChange(this.$('.ui-page-turn.active'));
            },

            onPageTurn: function($el){
                if ($el.prev('.ui-page-turn').length){
                    this.$prev.show();
                }else{
                    this.$prev.hide();
                }
                if ($el.next('.ui-page-turn').length){
                    this.$next.show();
                }else{
                    this.$next.hide();
                }
                this.trackPageChange($el);
            },

            trackPageLoad: function() {
                /* coverview is special, so turn off regular analytics
                 * let .trackPageChange() deal with analytics
                 */
            },

            trackPageChange: function(page){
                //fakes pageload event per visible page
                this.pageInfo = this.getPageInfo(page);
                PubSub.trigger('page:load', this.pageInfo);
            },

            getPageInfo: function(page){
                var coverInfo = page.find('.coverInfo').html() || '{}',
                    pageInfo;
                try {
                    pageInfo = JSON.parse(coverInfo);
                }catch (e) {
                    console.error('could not get current asset page info', (e.stack || e.stacktrace || e.message));
                }
                return pageInfo || {};
            },

            // keeps the big page from continuing to flip when a story is open and an arrow key is pressed.
            pause: function(){
                this.$doc.off('.' + this.cid);
                BaseApp.prototype.pause.apply(this, arguments);
            },

            destroy: function() {
                this.$doc.off('.' + this.cid);
                this.$win.off('.' + this.cid);
                BaseApp.prototype.destroy.apply(this, arguments);
            }

        });

        /**
         * Return view class.
         */
        return CoverViewApp;
    }
);
