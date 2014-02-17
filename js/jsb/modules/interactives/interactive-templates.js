/**
 * @fileoverview Interactive Templates view.
 * @author mdkennedy@gannett.com (Mark Kennedy)
 */
define([
    'jquery',
    'underscore',
    'state',
    'pubsub',
    'utils',
    'baseview',
    'ui/loader',
    'modules/global/brightcove-video',
    'ui/generic-paginator',
    'touchswipe',
    'meteredAdPosition',
    'adLogger',
    'modules/interactives/interactive-ads'
],
function(
    $,
    _,
    StateManager,
    PubSub,
    Utils,
    BaseView,
    Loader,
    Video,
    GenericPaginatorView,
    TouchSwipe,
    MeteredAdPosition,
    AdLogger,
    InteractiveAds
 )
    {
        /**
         * View class.
         */
        var InteractiveTemplateView = BaseView.extend({

            el: ".interactive",

            // Events.
            events: {
                "click .slide-nav.prev, .slide-nav.next": "onArrowClick",
                "click .navigation li": "onNavClick"
            },

            /**
             * Initialize view.
             * @param {Object} options View options passed during init.
             */
            initialize: function(options) {
                _.bindAll(this, 'beforePaginatorClick', 'goTo');

                options = $.extend({
                    ads: false,
                    adSponsor: false,
                    adTransition: false,
                    ignoreFirstNav: false,
                    interactiveType: '',
                    isFramed: false,
                    standAlone: false
                }, options);

                this.$leftArrow = this.$el.find(".slide-nav.prev");
                this.$rightArrow = this.$el.find(".slide-nav.next");
                this.$viewport = this.$el.find(".viewport");
                this.$slideContainer = this.$viewport.find(".slides");
                this.$slides = this.$slideContainer.find('.slide');
                this.$navigation = this.$(".navigation");
                this.$navigationItems = this.$navigation.find("li");
                this.slideNum = this.$slides.length;
                // Don't count the ad slide.
                if ($(this.$slides[this.$slides.length - 1]).hasClass('partner-slide-ad')) {
                    this.slideNum -= 1;
                }
                this.slideWidth = this.$slides.outerWidth();
                this.slideHeight = this.$slides.outerHeight();
                this.slideWidthPad = this.options.interactiveType === "sequencer" ? this.$el.find('.stage').outerWidth() - this.slideWidth : 0;
                this.maxSlides = this.slideNum;
                this.$slideContainer.width(this.maxSlides * this.slideWidth);
                this.currentSlideIndex = 0;
                this.subviews = {};

                this.setupSwipes();

                // setup slides according to prepare for transitions
                if (this.$viewport.hasClass("slide")) {
                    this.$slides.css({
                        'display':'inline-block'
                    });
                }

                // call base class initialize
                BaseView.prototype.initialize.call(this, options);
                this.subviews.video = [];
                this.useCSSTransforms = false;
                this.subviews.paginator = new GenericPaginatorView({
                    onBeforePaginator: this.beforePaginatorClick,
                    el: this.$('.paginator'),
                    onGoTo: this.goTo
                });

                // Set up ads.
                this.setupAds();
            },

            /**
             * Determines if pagination click should interrupt slide change and show ad.
             * @param {Number} index. Index of slide to switch to.
             * @param {Object} event. Event object from pagination click.
             */
            beforePaginatorClick: function(index, event) {

                var direction = index < this.currentSlideIndex ? 'left' : 'right';

                if (!this.showingAd && this.shouldShowAd()) {
                    this.showAd(direction);
                    return false;
                }

                if (this.options.isFramed !== true) {
                    this.trackPageView();
                }

                return true;
            },

            /**
             * Reveals slide
             * @param {Number} index. Index of slide to go to.
             */
            goTo: function(index) {
                this._switchSlides(this._getSlideIn(index), this._getSlideOut());
            },

            /**
             * When an arrow is clicked.
             * @param {Object} event. Event object from pagination click.
             */
            onArrowClick: function(event) {

                var direction = $(event.currentTarget).is(this.$leftArrow) ? 'left' : 'right';

                if ((this.options.interactiveType === "chronology" || this.options.interactiveType === "beforeandafter") &&
                    this.options.isFramed !== true
                ) {
                    this.trackPageView();
                }

                if (!this.showingAd && this.shouldShowAd()) {
                    this.showAd(direction);
                    return false;
                } else if (this.showingAd && this.showingAd.index() === this.currentSlideIndex) {
                    if (direction === 'left') {
                        this.subviews.paginator.goToPage(this.currentSlideIndex - 1);
                    } else {
                        this.subviews.paginator.goToPage(this.currentSlideIndex);
                    }
                    return false;
                }

                if (direction === 'left') {
                    this.previousSlide();
                } else {
                    this.nextSlide();
                }
                return false;
            },

            /**
             * When navigation item is clicked.
             * @param {Object} event. Event object from pagination click.
             */
            onNavClick: function(event) {

                var target = $(event.currentTarget),
                    parent = target.parent().find("li");

                var newSlideIndex = parent.index(target);

                // Disable when the first list item should be ignored.
                if (newSlideIndex === 0 && this.options.ignoreFirstNav) {
                    return false;
                }

                if (this.options.ignoreFirstNav) {
                    newSlideIndex --;
                }
                this.goTo(newSlideIndex);
                return false;       
            },

            /**
             * Handles the swipe event.
             */
            onSwipeSlide: function(e, direction, distance, duration, fingerCount, swipeOptions) {
                if (direction === 'right' || direction === 'down') {
                    swipeOptions.self.previousSlide();
                } else {
                    swipeOptions.self.nextSlide();
                }
            },

            /**
             * Loads the slide before the current slide.
             */
            previousSlide: function() {
                // Not all interactives have the paginator. Provide a fall-back.
                if (this.subviews.paginator.$el.length < 1) {
                    var newSlideIndex = this.currentSlideIndex > 0 ? this.currentSlideIndex - 1 : this.slideNum - 1;
                    this.goTo(newSlideIndex);
                } else {
                    this.subviews.paginator.goToPrevPage(this.currentSlideIndex);
                }
            },

            /**
             * Loads the slide after the current slide.
             */
            nextSlide: function() {
                // Not all interactives have the paginator. Provide a fall-back.
                 if (this.subviews.paginator.$el.length < 1) {
                    var newSlideIndex = this.currentSlideIndex < this.slideNum - 1 ? this.currentSlideIndex + 1 : 0;
                    this.goTo(newSlideIndex);
                } else {
                    this.subviews.paginator.goToNextPage(this.currentSlideIndex);
                }
            },

            /**
             * Sets up sponsorship and transition ads when enabled.
             */
            setupAds: function() {
                // Initialize sponshorship ad for the interactive.
                this.subviews.interactiveAds = new InteractiveAds(this.options);

                if (!this.options.ads) {
                    return;
                }

                var data = this.$el.data();
                var targeting = {
                    title: data.seoTitle,
                    series: data.series,
                    sitePage: 'usat/' + (data.ssts || '').replace(/\/\/*$/, ''),
                    topic: data.topic
                };

                // Set up transition ad between slides.
                var viewportWidth = this.$viewport.width(), 
                    viewportHeight = this.$viewport.height();
                if (viewportHeight < 450 || viewportWidth < 600) {
                    AdLogger.logWarn('Advertisement viewport is too small: ' + viewportWidth + 'x' + viewportHeight);
                } else {
                    this.$adSlide = this.$('.partner-slide-ad');
                    if (this.$adSlide.length > 0) {
                        this.options.adTransition = true;
                        this.$adContents = this.$adSlide.find('.interactive-ad');
                        this.subviews.ad = new MeteredAdPosition({
                            el: this.$adContents,
                            adPlacement: 'transition_interactive/' + data.cst,
                            adSizes: ['elastic'],
                            meterThreshold: 'transition_interactive',
                            rateMeterId: 'asset_' + data.interactiveId,
                            targeting: targeting
                        });
                    }
                }
            },

            /**
             * Sets up swipe events on supported interactive assets.
             */
            setupSwipes: function() {
                // Set up swipe events to move between slides, but ignore
                // timeline and before and after interactives. Timeline has its
                // own swipe functions. The below interferes with before after.
                if (!Modernizr.touch || this.options.interactiveType === 'beforeandafter' || 
                    this.options.interactiveType === 'timeline'
                ) {
                    return;
                }

                var self = this;
                this.$slideContainer.swipe({
                    self: self,
                    swipe: self.onSwipeSlide
                });
            },

            /**
             * Asks the gallery whether the next slide should be an ad
             * @return {Boolean}
             */
            shouldShowAd: function() {
                if (!this.showingAd && this.options.ads && this.subviews.ad && this.subviews.ad.shouldShowAd()) {
                    return true;
                }
                return false;
            },

            /**
             * Shows the ad instead of the next slide.
             * @param {String} direction (left, right). Direction the slides will move.
             */
            showAd: function(direction) {
                var slideOut = this._getSlideOut();
                this.showingAd = this.$adSlide;
                this.$adContents.show();
                if (slideOut[0] !== this.showingAd[0]) {
                    // If the ad slides in, move it to be next to the slideOut.
                    var ad = this.showingAd.detach();
                    if (direction === 'left') {
                        ad.insertBefore(slideOut);
                    } else if (direction === 'right') {
                        ad.insertAfter(slideOut);
                    }
                    // Refresh the slide indexes.
                    this.$slides = this.$slideContainer.find('.slide');
                    this._switchSlides(this.showingAd, slideOut, direction).done(_.bind(function() {
                        this.$slides.removeClass("active");
                        this.subviews.ad.playAd();
                    }, this));
                }
            },

            /**
             * Tracks the user's click event.
             * @param {String} clickName. The click action.
             */
            trackClick: function(clickName) {
                this.trackFirstClick();
                PubSub.trigger('uotrack', clickName);
            },

            /**
             * Track the first click on the interactive.
             */
            trackFirstClick: function() {
                if (!this.firstClick) {
                    PubSub.trigger('uotrack', this.options.interactiveType + 'firstclick');
                    this.firstClick = true;
                }
            },

            /**
             * Records a page load event for the current interactive.
             * Used when the interactive is by itself (stand-alone) and not framed.
             */
            trackPageView: function() {
                this.trackFirstClick();
                var pageInfo = {
                    'contenttype': this.$el.data('contenttype'),
                    'pathName': this.trackPathName('')
                };
                var activePageInfo = StateManager.getActivePageInfo();
                pageInfo = $.extend(activePageInfo, pageInfo);
                PubSub.trigger('analytics:pageload', pageInfo);
            },

            /**
             * Builds the path name for the click event.
             * @param {String} clickName. The click action.
             * @return {String} pathName. The path to use for the click event.
             */
            trackPathName: function(clickName) {
                var pathName;
                // Use the document's path when the interactive is stand-alone.
                if (this.options.standAlone === true) {
                    pathName = document.location.pathname;
                // Build the interactive's stand-alone path when attached to a story.
                } else {
                    pathName = '/interactive/' + this.$el.data('interactive-id') + '/';
                }
                pathName = this.options.interactiveType + pathName + this.$el.data('seoTitle') + '/' + clickName;
                return pathName;
            },

            /**
             * Determines the active slide or ad that needs to be hidden.
             * @return {jQuery}
             * @private
             */
            _getSlideOut: function() {
                var slideOut;
                if (this.showingAd && this.showingAd.length > 0) {
                    slideOut = this.showingAd;
                }else{
                    slideOut = this.$slides.eq(this.currentSlideIndex);
                }
                return slideOut;
            },

            /**
             * Gets the slide to show.
             * @param {Number} index. Index of the slide to load in, assumes it's a valid index.
             * @return {jQuery}
             * @private
             */
            _getSlideIn: function(index) {
                if (this.options.adTransition && this.$adSlide.index() <= index) {
                    index += 1;
                }
                var slideIn = this.$slides.eq(index);
                return slideIn;
            },

            /**
             * Switches the slides currently in view.
             * @param {jQuery} slideIn. Slide to show.
             * @param {jQuery} slideOut. Slide to hide.
             * @return {Deferred}
             * @private
             */
            _switchSlides: function(slideIn, slideOut) {

                var deferred;
                var oldSlideIndex = slideOut.index(),
                    newSlideIndex = slideIn.index(),
                    distanceWidth = this.slideWidth * newSlideIndex,
                    distanceHeight = this.slideHeight * newSlideIndex;

                var countAdIndex = (this.options.adTransition && this.$adSlide.index() < this.maxSlides) ? true : false;

                if (slideOut === this.showingAd) {
                    this.subviews.ad.stopAd();
                }

                //update arrows
                if (newSlideIndex === 0) {
                    this.$leftArrow.addClass('invisible');
                    this.$rightArrow.removeClass('invisible');
                } else if (newSlideIndex === this.maxSlides - 1 && !countAdIndex ||
                    newSlideIndex === this.maxSlides && countAdIndex
                ) {
                    this.$leftArrow.removeClass('invisible');
                    this.$rightArrow.addClass('invisible');
                } else {
                    this.$leftArrow.removeClass('invisible');
                    this.$rightArrow.removeClass('invisible');
                }

                // Destroy current video instances if exist.
                _.each(this.subviews.video, function(v) {
                    // Destroys the Brightcove object, but leaves it in a paused state
                    v.destroy(false, true);
                });
                this.subviews.video = [];

                //update navigation if exists
                var navIndex = newSlideIndex;
                if (this.options.ignoreFirstNav) {
                    navIndex ++;
                }
                this.$navigationItems.removeClass("active").eq(navIndex).addClass("active");           

                // slide the current slide in if 'slide' transition is specified, if not, fade it in
                if (this.$viewport.hasClass("slide") || this.$viewport.hasClass("slide-transition") ) {

                    deferred = this.animate(this.$slideContainer,'left', (-1 * distanceWidth + this.slideWidthPad) + 'px', 400, 'ease-in-out', 0).done(_.bind(function() {
                        if (this.showingAd && slideOut[0] === this.showingAd[0]) {
                            // Refresh the ad for its next view and hide it until then.
                            this.subviews.ad.refreshPosition();
                            if (this.$adContents.css('display') !== 'none') {
                                this.$adContents.hide();
                            }
                            this.showingAd = null;
                        }
                    }, this));
                } else if (this.$viewport.hasClass("vslide-transition")) {

                    deferred = this.animate(this.$slideContainer,'top', -1 * distanceHeight + 'px', 400, 'ease-in-out', 0).done(_.bind(function() {
                        if (this.showingAd && slideOut[0] === this.showingAd[0]) {
                            // Refresh the ad for its next view and hide it until then.
                            this.subviews.ad.refreshPosition();
                            if (this.$adContents.css('display') !== 'none') {
                                this.$adContents.hide();
                            }
                            this.showingAd = null;
                        }
                    }, this));
                } else if (this.$viewport.hasClass("fade")  ||  this.$viewport.hasClass("fade-transition") ) {
                     var $newSlide = this.$slides.eq(newSlideIndex),
                        $oldSlide = this.$slides.eq(oldSlideIndex);
                    if (newSlideIndex !== oldSlideIndex) {
                        $oldSlide.css({'z-index':1  });
                        $newSlide.css({'z-index':2 , 'opacity': 0,'display' :'block'  });
                        deferred = this.animate($newSlide,'opacity',1, 400, 'linear').done(function() {
                            $oldSlide.css({'opacity':0,'display' :'none'  });
                        });
                    } else {
                        $newSlide.css({ 'opacity': 0 ,'display' :'block'  });
                        deferred = this.animate($newSlide,'opacity',1, 400, 'linear');
                    }
                }

                //add active state to slide
                this.$slides.removeClass("active").eq(newSlideIndex).addClass("active");

                var _this = this;

                // Process video(s) within slide.
                $.each(this.$slides.eq(newSlideIndex).find('.video'), function() {
                    var video = new Video({
                        el: $(this).get(0),
                        autostart: true    // We do not have a video still for a 'click to create' embed.
                    });
                    _this.subviews.video.push(video);
                });

                //update current global slide number
                this.currentSlideIndex = newSlideIndex;

                return deferred;
            }

        });
        
        /**
         * Return view class.
         */
        return InteractiveTemplateView;
});