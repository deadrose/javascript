/**
 * @fileoverview Overlay App (always has a dormant app below it, ie. Cards).
 * @author erik.kallevig@f-i.com (Erik Kallevig)
 */
/*global Modernizr:true*/
define([
    'jquery',
    'underscore',
    'backbone',
    'pubsub',
    'utils',
    'site-manager',
    'apps/simple-overlay',
    'state',
    'modules/partner/story-transition-ad',
    'meteredAdPosition'
],
function(
    $,
    _,
    Backbone,
    PubSub,
    Utils,
    SiteManager,
    SimpleOverlay,
    StateManager,
    StoryTransitionAd,
    MeteredAdPosition
) {
    'use strict';

    /**
     * App class.
     */
    var OverlayApp = SimpleOverlay.extend({

        // View element.
        el: '#overlay',

        // Events.
        events: function() {
            return $.extend(SimpleOverlay.prototype.events, {
                'click .overlay-content-arrows': 'nextArticleClick'
            });
        },

        /**
         * Initialize the view.
         * @param {Object=} options Init options.
         */
        initialize: function(options) {
            options = $.extend({
                inbetweenAdTemplate: '<div class="partner-inbetween transition-wrap">' +
                                        '<div class="partner-inbetween-content partner-placement"></div>' +
                                    '</div>'
            });
            this.init = false;

            this.currentStoryIndex = -1;
            this.storyCollection = [];
            this.animationIndex = 0;

            // Call base class initialize
            SimpleOverlay.prototype.initialize.call(this, options);
        },

        resizeHandler: function() {
            SimpleOverlay.prototype.resizeHandler.apply(this, arguments);
            if (this.inbetweenAd) {
                this.inbetweenAd.resizeAd(950, this.winSize.height);
            }
            if (this.$inbetweenPartner) {
                this.$inbetweenPartner.css(this.winSize);
            }
        },

        afterPageReveal: function(fromUrl, toUrl, paused, ViewClass) {
            SimpleOverlay.prototype.afterPageReveal.apply(this, arguments);

            // Initial page load, could be ajax, could not be.
            if (!this.init) {
                this.initializeDom();
                this.init = true;
                this.updateArrowLinks(true);
                // ad scenarios
                // 1: transition_referrer -> StoryTransitionAd()
                // 2: !Modernizr.history -> StoryTransitionAd()
                // 3: StoryTransitionAd.getCurrentMeterCount() === 0 -> StoryTransitionAd.triggerAd()
                this.subviews.storyTransitionAd = new StoryTransitionAd({
                    el: this.$('.partner-overlay')
                });
                // scenario where meter is at 1, going to 0, should prepare the inbetween ad anyways
                if (this.subviews.storyTransitionAd.getTransitionMeterCount() === 0) {
                    this.renderInbetweenAd();
                }
            } else {
                // ajax only possible, Modernizr.history === true
                // ad scenario 4, prepare inbetween ads
                this.renderInbetweenAd();
                this.updateArrowLinks();
            }

            if (fromUrl !== null) {
                this.triggerEvent('storyCollectionLoaded', this.getStoryCollection(), this.currentStoryIndex);
            }

        },

        /**
         * @overrides SimpleOverlay.preloadPath
         */
        preloadPath: function(){
            // Determine which section front should load
            // behind depending on the story.
            StateManager.preloadPath(this.currentSection).done(_.bind(function(){
                this.updateArrowLinks(true);
                this.triggerEvent('storyCollectionLoaded', this.getStoryCollection(), this.currentStoryIndex);
            }, this));
        },

        renderInbetweenAd: function(){
            if (!this.$inbetweenPartner) {
                this.$inbetweenPartner = $(this.options.inbetweenAdTemplate);
                this.$el.append(this.$inbetweenPartner);
            } else if (!this.$inbetweenPartner.parent().length) {
                this.$el.append(this.$inbetweenPartner.hide());
            }

            if (!this.inbetweenAd) {
                this.inbetweenAd = new MeteredAdPosition({
                    el: this.$inbetweenPartner.find('.partner-inbetween-content'),
                    adPlacement: 'transition',
                    adSizes: ['bigpageflex'],
                    rateMeterId: 'transition'
                });
            } else if (this.isShowingAd) {
                this.isShowingAd = false;
            }
            this.inbetweenAd.setPageInfo(StateManager.getActivePageInfo());

            if (this.inbetweenAd.tickMeter(true)) {
                this.timeToShowAd = true;
                this.inbetweenAd.refreshPosition();
            }

        },

        nextArticleClick: function(e) {
            var direction = 'right', link = $(e.currentTarget), href = link.attr('href'), ad = this.inbetweenAd;
            if (link.hasClass('overlay-content-arrows-previous-wrap')) {
                direction = 'left';
            }
            if (this.isShowingAd) {
                href = Utils.getDefinedRoute(href);
                // article clicks only have 2 choices, going to the destination, or going back
                // if we're going back, just let the browser handle the transition
                // if we're not going back, we complete the transition that was interrupted by the ad
                // by telling state manager to go to the url
                if (href !== this.currentPath) {
                    // we're actually moving forward, move the current story index back so we can animate the correct direction
                    e.preventDefault();
                    // move the story index back to it's original position so the animation is correct
                    this.currentStoryIndex = this.currentStoryIndex + (direction === 'left' ? 1 : -1);
                    StateManager._loadPath(href);
                }
            } else if (this.timeToShowAd && ad.isAdReady()) {
                // we decrement the interval above, but don't reset it until we successfully show an ad so we need to tick it again
                this.inbetweenAd.tickMeter();
                this.timeToShowAd = false;
                // time to show an ad, skip default behavior
                e.preventDefault();
                // TODO check with analytics to see what they want to track here
                // so the goal here is to update the browser url and internal variables to the next path,
                // but don't trigger state manager. This allows us to put ourselves inbetween two urls
                // so if the user decides to use the back arrow it'll take them to the correct place.
                if (StateManager.partialNavigateToUrl(href)) {
                    var arrow, collection = this.getStoryCollection();

                    // we pretend we're at the next story index incase the user hits the back button on the ad
                    if (direction === 'left') {
                        arrow = this.buildArrowDom(collection[this.currentStoryIndex], 'next');
                        this.currentStoryIndex = this.currentStoryIndex - 1;
                        this.$('.overlay-content-arrows-next-wrap').remove();
                    } else {
                        arrow = this.buildArrowDom(collection[this.currentStoryIndex], 'previous');
                        this.currentStoryIndex = this.currentStoryIndex + 1;
                        this.$('.overlay-content-arrows-previous-wrap').remove();
                    }
                    if (arrow) {
                        this.arrowContainer.append(arrow);
                    }

                    this.isShowingAd = true;
                    ad.showAd(this.winSize.width, this.winSize.height);
                    return this.animateToContent(this.$inbetweenPartner, direction).done(_.bind(function() {
                        // async destruction test
                        if (this.inbetweenAd) {
                            ad.playAd();
                        }
                    }, this));
                }
            }
        },

        initializeDom: function(){
            // Get template.
            this.arrowWrapTemplate = this.$('#overlay-arrow-wrap');

            // Cache container query.
            this.arrowContainer = this.$('.overlay-arrows');
        },

        destroyModules: function() {
            if (this.inbetweenAd) {
                this.inbetweenAd.stopAd();
            }
            SimpleOverlay.prototype.destroyModules.apply(this, arguments);
         },

        beforeAppRemove: function(fromUrl, toUrl){
            if (this.inbetweenAd) {
                this.inbetweenAd.destroy();
            }
            SimpleOverlay.prototype.beforeAppRemove.apply(this, arguments);
        },

        /**
         * Update arrow links and toggle disabled state as necessary.
         */
        updateArrowLinks: function(initialLoad) {
            if (this.currentStoryIndex === -1){
                // make one last attempt to figure out what our index in incase something changed
                this.currentStoryIndex = this.getBestStoryIndex(window.location.pathname, initialLoad);
                if (this.currentStoryIndex === -1){
                    return;
                }
            }
            var collection = this.getStoryCollection();

            // Populate arrow links.
            var arrowDom = this.buildArrowDom(collection[this.currentStoryIndex - 1], 'previous');
            arrowDom = arrowDom.add(this.buildArrowDom(collection[this.currentStoryIndex + 1], 'next'));
            this.arrowContainer.empty().append(arrowDom);
            this.animate(this.arrowContainer, 'opacity', 1, 250);
        },

        buildArrowDom: function(asset, direction) {
            var disabled = (!asset);
            if (!asset) {
                asset = {
                    disabled: 'disabled'
                };
            } else {
                asset.disabled = '';
            }
            asset.dir = direction;

            // Check for square photo.
            if (asset.photo && asset.photo.crops) {
                if (asset.photo.crops['1_1'] && asset.photo.crops['1_1'].indexOf('.jpg') !== -1) {
                    asset.image = asset.photo.crops['1_1'];
                }
            }
            if (!this.arrowWrapTemplate.length) {
                return null;
            }

            var arrow = $($.trim(_.template(this.arrowWrapTemplate.html(), asset)));
            if (disabled){
                if (this.isApple){
                    arrow.css({display: 'none'});
                }else{
                    arrow.css({'z-index': 1});
                }
            }else if (this.isApple){
                arrow.find('.preview').remove();
            }
            return arrow;
        },

        getBestStoryIndex: function(toUrl, initialLoad){
            if (toUrl && toUrl[0] !== '/'){
                toUrl = '/' + toUrl;
            }
            // there's a chance the same story could exist multiple times in the carousel
            // so we search based on the currentIndex
            var collection = this.getStoryCollection();
            if (!collection || collection.length === 0){
                return -1;
            }
            var min = -1, max = -1;
            var current = this.currentStoryIndex;
            if (current === -1){
                current = 0;
            }

            var i;
            for (i = current; i >= 0; i--){
                if (collection[i].links === toUrl){
                    min = i;
                    break;
                }
            }
            for (i = current; i < collection.length; i++){
                if (collection[i].links === toUrl){
                    max = i;
                    break;
                }
            }
            if (max === -1 && min === -1 && initialLoad){
                // Story not found. Add story to the beginning of
                // the preloaded front's collection.
                var story = {
                    "links": toUrl
                };
                this.storyCollection.unshift(story);
                return 0;
            }else if (max === -1){
                return min;
            }else if (min === -1){
                return max;
            }else{
                // we have a duplicate, find the article closests to the current
                if ((current - min) < (max - current)){
                    return min;
                }else{
                    return max;
                }
            }
        },

        getStoryCollection: function(){
            if (this.storyCollection.length === 0) {
                var pageInfo = StateManager.getPreloadedPageInfo();
                var collection = pageInfo && pageInfo.asset_collection;
                if (collection) {
                    this.storyCollection = _.filter(collection, function(item) {
                        return item.headline && item.links && !item.links.match('http');
                    });
                }
            }
            return this.storyCollection;
        },

        animateChangePagePreData: function(fromUrl, toUrl) {
            var direction, nextStoryIndex = this.getBestStoryIndex(toUrl);
            if (this.currentStoryIndex !== -1 && nextStoryIndex !== -1) {
                if (this.currentStoryIndex > nextStoryIndex) {
                    direction = 'left';
                } else {
                    direction = 'right';
                }
            }
            this.currentStoryIndex = nextStoryIndex;
            return this.animateToContent($(this.options.template).find('.transition-wrap'), direction);
        },
        animateToContent: function(newTransitionWrap, direction) {
            var winHeight = this.winSize.height,
                scrollPosition = Utils.getScrollPosition(),
                activeTransitionWrap = this.$('.transition-wrap:first');

            scrollPosition -= SiteManager.scrollTop(0);

            this.$el.css({position:'relative'});
            this.prepareContentForTransition(activeTransitionWrap, scrollPosition, winHeight);

            newTransitionWrap.css({position: 'absolute', display: 'block'});
            newTransitionWrap.attr('data-animation-index', ++this.animationIndex);
            this.prepareContentForTransition(newTransitionWrap, 0, winHeight);

            this.$el.prepend(newTransitionWrap);

            if (this.header.isFixed()) {
                this.positionCloseButton('absolute', scrollPosition, activeTransitionWrap);
            }

            if (direction) {
                // aha, we know which direction to animate
                activeTransitionWrap.css({'left': '0%'});
                var activeDest, stagedDest = '0%';
                if (direction === 'left') {
                    newTransitionWrap.css('left', '-100%');
                    activeDest = '100%';
                } else {
                    newTransitionWrap.css('left', '100%');
                    activeDest = '-100%';
                }

                return $.Deferred(_.bind(function(defer) {
                    var promise = $.when(this.animate(activeTransitionWrap, 'left', activeDest, 350, 'ease-in-out'),
                        this.animate(newTransitionWrap, 'left', stagedDest, 350, 'ease-in-out'));
                    promise.done(_.bind(function() {
                        activeTransitionWrap.remove();
                        if (parseInt(newTransitionWrap.attr('data-animation-index'), 10) === this.animationIndex) {
                            this.resetContentTransition(newTransitionWrap);
                        }
                        defer.resolve();
                    }, this));
                }, this)).promise();
            } else {
                // No slideDirection specified, so fade/prev-story load required.
                // swap content neeeds the fadeIn to be position relative for height
                newTransitionWrap.css({position: 'relative'});
                return this.swapContent(activeTransitionWrap, newTransitionWrap);
            }
        },

        prepareContentForTransition: function(transitionWrap, scrollPosition, winHeight){
            transitionWrap.css({height:winHeight});
            transitionWrap.children().css({'top': -1 * scrollPosition});
        },

        resetContentTransition: function(transitionWrap){
            transitionWrap.css({position:'relative'});
            this.$el.css({position:''});
        }
    });


    /**
     * Return view class.
     */
    return OverlayApp;
});
