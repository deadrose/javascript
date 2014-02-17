/**
 * @fileoverview Hero module view.
 * @author Chad Shryock <cdshryock@gannett.com>
 */
define(['jquery',
    'underscore',
    'backbone',
    'baseview',
    'pubsub',
    'utils',
    'state',
    'modules/global/brightcove-video',
    'modules/carousel/carousel',
    'sharedAdPosition',
    'partner/leavebehind',
    'modules/fronts/primary-poster-ad',
    'uiPageTurn',
    'uiFlip'
],
function(
    $,
    _,
    Backbone,
    BaseView,
    PubSub,
    Utils,
    StateManager,
    Video,
    Carousel,
    SharedAdPosition,
    LeaveBehind,
    PrimaryPosterAd
    ) {
        /**
         * View class.
         */
        var HeroView = BaseView.extend({

            // Events.
            events: {
                'click .slide' : 'open',
                'click .hero-asset-open' : 'open',
                'click .carousel-thumbs > li' : 'openTile',
                'click .hero-turn-trigger, .hero-popular .hero-page-trigger' : 'toggleFrontBack',
                'click .partner-close': 'closeAdClick',
                'click .hero-headline-video-close': 'toggleFrontVideo'
            },

            destroy: function(removeEl) {
                if (this.adShowing) {
                    this.closeAd(true);
                }
                BaseView.prototype.destroy.call(this, removeEl);
            },

            initialize: function(options){
                // remember that the durations are the duration for each stage of the animation
                // (0 -> 90, -90 -> 0)
                // so a complete animation is 2x duration
                options = $.extend(true, {animate: {duration: 200},
                    popularCount: this.$el.data('popular-count') || 6,
                    shadow: {
                        opacity: '.4',
                        duration: 200,
                        delay: 0
                    }
                }, options);
                BaseView.prototype.initialize.call(this, options);

                _.bindAll(this, 'onVideoShow', 'onVideoHide', 'onAdReady', 'showHeroAd', 'belowHeroAdReady');

                this.visibleFace = 'front';

                this.$openSidebar = $(".open-sidebar");
                this.mostPopularLoaded = false;
                this.isPageTurn = this.$el.hasClass('hero-page-turn');
                if (this.isPageTurn) {
                    this.pageTurn = {
                        'frontIndex': this.$('.hero-page-front').index(),
                        'backIndex': this.$('.hero-page-back').index(),
                        'adIndex': this.$('.hero-page-ad').index(),
                        'videoIndex': this.$('.hero-page-video').index()
                    };
                    this.$el.uiPageTurn({
                        perspective: '1400px'
                    });
                } else {
                    this.$el.uiFlip({
                        perspective: '1400px'
                    });
                }
                this.adShowing = false;

                // Initialize the hero module's carousel when needed.
                if (this.$el.hasClass('carousel')) {
                    this.subviews.heroCarousel = new Carousel({
                        el : this.$el,
                        ads: false,
                        hoverTransition: 200,
                        thumbsSelector: '.carousel-thumbs',
                        rotate: true,
                        autostart: true
                    });
                }
                // Initialize each video as its own video instance.
                this.subviews.video = [];
                this.$('.video').each(_.bind(function(idx, el) {
                    var $videoEl = $(el),
                        video = new Video({
                            // Use .video parent() because hero markup is different.
                            el: $videoEl.parent(),
                            onVideoShow: this.onVideoShow,
                            onVideoHide: this.onVideoHide
                        });
                    if ($videoEl.closest('.hero-page-video').length) {
                        this.subviews.heroVideo = video;
                    } else {
                        this.subviews.video.push(video);
                    }
                }, this));

                // Initialize the poster_front ad, if there is one
                var posterAdPrimaryEl = this.$('.poster-ad-primary');
                if(posterAdPrimaryEl.length > 0){
                    this.subviews.posterAdPrimary = new PrimaryPosterAd({
                        el: posterAdPrimaryEl
                    });
                }

                this.$('.partner-heroflip-ad').each(_.bind(function(idx, el){
                    if (idx > 0){
                        console.error('why are there multiple ad placements for this hero?');
                        return;
                    }
                    this.subviews.ad = new SharedAdPosition({
                        el: el,
                        adSizes: ['heroflip'],
                        adPlacement: 'high_impact',
                        adType: 'heroflip',
                        onAdReady: this.onAdReady
                    });
                }, this));
                if (this.$('.popular').length){
                    var popularUrl = '/services/most-popular/hero/' + Utils.getSectionPath(window.location.pathname) + '/' + this.options.popularCount + '/';
                    StateManager.fetchHtml(popularUrl).done(_.bind(function(htmlFrag){
                        this.$('.popular .ui-placer').html(htmlFrag);
                        this.$('.hero-turn-trigger').fadeIn(500);
                        this.mostPopularLoaded = true;
                    }, this));
                }
            },
            renderCardInfo: function(currentCardInfo) {
                if (StateManager.getActivePageInfo().cardHeadlineGridAd){
                    this.belowHeroModule = this.$el.next('.below-hero-ad-module');
                    if (this.belowHeroModule.length) {
                        if (!currentCardInfo.belowHeroAd) {
                            // clear out the width/height/display if we're coming back from an overlay to the card and the width has changed
                            this.belowHeroModule.hide();
                        } else {
                            this.subviews.belowHeroAd = new SharedAdPosition({
                                el: this.belowHeroModule.find('.below-hero-ad'),
                                adSizes: ['mediumrectangle'],
                                adPlacement: 'high_impact',
                                adType: 'below_hero',
                                defaultPosition: true,
                                onAdReady: this.belowHeroAdReady
                            });
                        }
                    }
                }
            },

            belowHeroAdReady: function() {
                var adBackfillUrl = '/services/most-popular/headline-ad/' + Utils.getSectionPath(window.location.pathname) + '/2/';

                StateManager.fetchHtml(adBackfillUrl).done(_.bind(function(htmlFrag){
                    this.belowHeroModule.find('.below-hero-popular').html(htmlFrag);
                    this.belowHeroModule.show();
                    this.subviews.belowHeroAd.playAd();
                }, this));
            },

            onAdReady: function(adInfo) {
                if (adInfo.leaveBehindImage && adInfo.leaveBehindText) {
                    this.createAdLeaveBehind(this.subviews.ad, adInfo.leaveBehindImage, adInfo.leaveBehindText);
                } else {
                    // no leave behind, no close button
                    this.showHeroAd();
                }
            },
            createAdLeaveBehind: function(ad, imageUrl, altText) {
                this.subviews.adLeaveBehind = new LeaveBehind({
                    el: StateManager.getActiveApp().$('.partner-leavebehind'),
                    onShowAd: this.showHeroAd,
                    imageUrl: imageUrl,
                    altText: altText,
                    isCompact: StateManager.getActiveApp().isCurrentCardBumped()
                });
                this.subviews.adLeaveBehind.render(ad);
            },
            showHeroAd: function() {
                this.adShowing = true;
                PubSub.trigger('hero:ad:open');
                this.subviews.ad.show();
                return this.triggerAnimation(_.bind(function(){
                    var promise;
                    if (this.isPageTurn) {
                        promise = this.$el.uiPageTurn('goToPage', this.pageTurn.adIndex, false, this.$('.partner-placement iframe').length);
                    } else {
                        promise = this.$el.uiFlip('flipForward');
                    }
                    promise.done(_.bind(function(){
                        this.subviews.ad.playAd();
                    }, this));
                    return promise;
                }, this));
            },

            /**
             * close ad click event
             * @param {Event} e click event
             */
            closeAdClick: function(e){
                e.preventDefault();
                this.closeAd();
            },
            closeAd: function(immediate){
                this.adShowing = false;
                this.subviews.ad.stopAd();
                this.triggerAnimation(_.bind(function(){
                    var promise;
                    if (this.isPageTurn){
                        if (this.visibleFace === 'back') {
                            promise = this.$el.uiPageTurn('goToPage', this.pageTurn.backIndex, immediate, this.$('.partner-placement iframe').length);
                        } else {
                            promise = this.$el.uiPageTurn('goToPage', this.pageTurn.frontIndex, immediate, this.$('.partner-placement iframe').length);
                        }
                    } else {
                        promise = this.$el.uiFlip('flipBackward', immediate);
                    }
                    return promise;
                }, this)).done(_.bind(function(){
                    PubSub.trigger('hero:ad:close');
                    if (this.subviews.adLeaveBehind){
                        this.subviews.adLeaveBehind.show();
                    }
                }, this));
                return false;
            },

            triggerAnimation: function(action){
                return this.registerAnimation(action());
            },

            onVideoShow: function(){
                //remove "right now" tag that covers video player
                this.$openSidebar.addClass("hidden");
                this.$('.hero-turn-trigger').hide();
            },

            onVideoHide: function(){
                //remove "right now" tag that covers video player
                this.$openSidebar.removeClass("hidden");
                if (this.mostPopularLoaded) {
                    this.$('.hero-turn-trigger').show();
                }
            },

            /**
             * Open anchor.
             * @param {Event} event View click event.
             */
            open: function(event) {
                var $target = $(event.target),
                    $currentTarget = $(event.currentTarget),
                    contentType = $currentTarget.data('content-type') || '';
                if (this.subviews.heroVideo && ($target.hasClass('videoStillPlay') || contentType === 'video')) {
                    // Check to see if the target is the play button or a video.
                    this.toggleFrontVideo(event);
                    return false;
                } else if ($target.prop('tagName').toLowerCase() != 'a') {
                    Utils.triggerRoute($currentTarget.find('.hero-story > h1 > a'));
                }
            },

            openTile: function(event) {
                var index = $(event.currentTarget).index();
                this.$('.slide:eq(' + index + ') .hero-story > h1 > a').click();
            },

            /**
             * Toggle between the front and back views.
             * @param {Event} event View click event.
             */
            toggleFrontBack: function(event) {
                if (!this.mostPopularLoaded) {
                    return false;
                }

                // Get the indiex of the current page.
                this.triggerAnimation(_.bind(function() {
                    if (this.visibleFace !== 'back') {
                        // Switch to the back page.
                        PubSub.trigger('uotrack', 'mostpopularopen');
                        return this.goToBack();
                    } else {
                        // Switch to the front page.
                        PubSub.trigger('uotrack', 'mostpopularclose');
                        return this.goToFront();
                    }
                }, this));
                return false;
            },

            goToFront: function(){
                this.visibleFace = 'front';
                return this.$el.uiPageTurn('goToPage', this.pageTurn.frontIndex);
            },

            goToBack: function() {
                this.visibleFace = 'back';
                return this.$el.uiPageTurn('goToPage', this.pageTurn.backIndex);
            },
            goToVideo: function() {
                this.visibleFace = 'video';
                return this.$el.uiPageTurn('goToPage', this.pageTurn.videoIndex).done(_.bind(function(){
                    this.subviews.heroVideo.swapImageForVideo();
                }, this));
            },

            /**
             * Toggles between the hero headline pack and playing the
             * inline video. Requires first position to have video.
             * @param {Event} event View click event.
             */
            toggleFrontVideo: function(event) {
                if (!this.subviews.heroVideo) {
                    return false;
                }

                this.triggerAnimation(_.bind(function() {
                    if (this.visibleFace !== 'video') {
                        // Switch to the video page.
                        PubSub.trigger('uotrack', 'headlinevideoopen');
                        this.$('.hero-headline-video-close').show();
                        return this.goToVideo();
                    } else {
                        // Switch to the front page.
                        this.subviews.heroVideo.hidePlayer();
                        PubSub.trigger('uotrack', 'headlinevideoclose');
                        this.$('.hero-headline-video-close').hide();
                        return this.goToFront();
                    }
                }, this));
                return false;
            }
        });

        /**
         * Return view class.
         */
        return HeroView;
    }
);
