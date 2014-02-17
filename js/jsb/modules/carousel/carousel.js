/**
 * @fileoverview Global carousel module view.
 * @author jmerrifiel@gannett.com (Jay Merrifield)
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'baseview',
    'pubsub',
    'state',
    'utils',
    'modules/carousel/gallery',
    'modules/carousel/controls',
    'modules/carousel/thumbs'
    ],
    function(
        $,
        _,
        Backbone,
        BaseView,
        PubSub,
        StateManager,
        Utils,
        CarouselGallery,
        CarouselControls,
        CarouselThumbs
    ) {

        /**
         * View class.
         */
        var CarouselView = BaseView.extend({

            events: {
                mouseenter: 'mouseEnter'
            },

            selectors: {
                slides: '.slide:not(.partner-placement)',
                images: '.slide:not(.partner-placement,.endslate)'
            },

            /**
             * Initialize view.
             * @param {Object} options View options passed in during init.
             */
            initialize: function(options) {
                options = $.extend({
                    ads: true,
                    // transition set to 0 to resolve "flash" - Reinstate to 200 to add transition effect
                    slideTransition: 0,
                    hoverShowControls: true,
                    hoverTransition: 0, // if set to non-zero, will cause hovering over thumbs to switch to that slide
                    interactionDemo: true,
                    linkPath: null, // the path to the gallery (used for ads)
                    rotate: false,
                    controlsSelector: null, // by default selector is this.$el
                    gallerySelector: null, // by default selector is this.$el
                    thumbsSelector: '.thumbs',
                    imageLazySrcAttr: 'data-src',
                    scrollerColor: 'light',
                    rotateInterval: 3000,
                    autostart: false
                }, options);

                _.bindAll(this, 'rotateCarousel');

                this.index = this.$('.slide.active').index();
                if (this.index === -1){
                    this.index = 0;
                }

                this.linkPath =  options.linkPath? options.linkPath : '';
                //Tracking on hold for FW
                //this.tracking = (options.track) ? options.track : false;
                this.playTimer = null;

                this.subviews = {};

                // All initialization functions assume that this.index has been set
                this._initializeGallery(options.imageLazySrcAttr, options.slideTransition, options.ads, options.gallerySelector);
                this._initializeControls(options.hoverShowControls, options.interactionDemo, options.controlsSelector);
                this._initializeThumbs(options.hoverTransition, options.scrollerColor, options.thumbsSelector);

                // Listen for pause from hero flip ad
                this.pubSub = {
                    'carousel:stoptimer': this.stoptimer,
                    'carousel:starttimer': this.resumeAutoPlay
                };

                // Call base class initialize
                BaseView.prototype.initialize.call(this, options);

                if (options.autostart) {
                    this._startCarouselRotate();
                }
            },

            _initializeGallery: function(imageLazySrcAttr, slideTransition, showAds, selector){
                this.subviews.gallery = new CarouselGallery({
                    ads: showAds,
                    el: (selector ? this.$(selector) : this.$el),
                    index: this.index,
                    imageLazySrcAttr: imageLazySrcAttr,
                    slideTransition: slideTransition,
                    carousel: this
                });
            },

            _initializeControls: function(hoverShowControls, interactionDemo, selector) {
                var images = this.$(this.selectors.images);
                var slides = this.$$(this.selectors.slides);
                this.subviews.controls = new CarouselControls({
                    el: (selector ? this.$(selector) : this.$el),
                    hoverShowControls: hoverShowControls,
                    interactionDemo: interactionDemo,
                    index: this.index,
                    totalSlides: slides.length,
                    totalImages: images.length,
                    carousel: this
                });
                this.subviews.controls.render();
            },

            _initializeThumbs: function(hoverTransition, scrollerColor, selector) {
                this.subviews.thumbs = new CarouselThumbs({
                    el: (selector ? this.$(selector) : this.$el),
                    hoverTransition: hoverTransition,
                    index: this.index,
                    scrollerColor: scrollerColor,
                    carousel: this
                });
            },

            mouseEnter: function(){
                if (this.options.autostart){
                    this._stopCarouselRotate();
                }
            },

            /*
             * Function to handle automated rotation of the carousel.
             */
            rotateCarousel: function() {
                // Get the details of what we're automating.
                var numberOfItems = this.$$(this.selectors.slides).length - 1;

                this.switchSlide(null, 1, true);
                if (this.index === numberOfItems && !this.options.rotate){
                    // stop rotation when we hit the end
                    this._stopCarouselRotate();
                }
            },

            /**
             * Clean up view.
             * Removes event handlers and element (optionally).
             * @param {boolean} removeEl option to also remove View from DOM.
             */
            destroy: function(removeEl) {
                if (this.playTimer) {
                    this._stopCarouselRotate();
                }
                // Call base class destroy
                BaseView.prototype.destroy.call(this, removeEl);
            },

            /*
             * Stop the interval - primarily used when hovering the module and hero flip
             */
            stoptimer: function() {
                clearInterval(this.playTimer);
                this.playTimer = null;
            },

            /*
             * Switch from one slide to another.
             * @param {Number} index position to move the carousel to.
             * @param {Number} slideOffset offset from current index to go to, this takes precidence over index position.
             * @param {Boolean} [noTrack] variable to specify whether the event was generated from an auto rotator
             */
            switchSlide: function(index, slideOffset, noTrack) {
                var numSlides = this.$$(this.selectors.slides).length;
                if (!this.showingAd && this.subviews.gallery.shouldShowAd()){
                    this.showingAd = true;
                    this.slideAdStep = slideOffset;
                    this.triggerEvent('showAd');
                    return;
                }

                if (slideOffset) {
                    if (this.slideAdStep && this.slideAdStep !== slideOffset){
                        // we've changed direction, pretend like we actually succeeded in the last slide offset
                        slideOffset += this.slideAdStep;
                    }
                    var newIndex = this.index + slideOffset;
                    if (newIndex < 0){
                        index = numSlides - 1;
                    }else if (newIndex >= numSlides){
                        index = 0;
                    }else{
                        index = newIndex;
                    }
                }else if (index < 0){
                    index = 0;
                }else if (index >= numSlides){
                    index = numSlides - 1;
                }

                if (this.index === index && !this.showingAd) {
                    return;
                }
                this.showingAd = false;
                this.slideAdStep = 0;
                this.index = index;
                this.triggerEvent('goToSlide', index);

                if (!noTrack) {
                    this._trackSlideChange();
                }
            },

            _trackSlideChange: function() {
                var $el;
                if (this.$el.hasClass('galleries')){
                    $el = this.$el;
                }else{
                    $el = this.$('.galleries');
                }
                // hero galleries get their layout name instead of gallery id as they do not have an id
                var galleryID = $el.attr('data-gallery-id');
                // embedded galleries get thier path name from the markup.
                var gallerypathname = ($el.attr('data-gal-pageurl') || "").replace(/^.*\/\/[^\/]+/, '');
                var galleryType = StateManager.getActivePageInfo().contenttype;
                if (!galleryType) {
                    // default to "galleries"
                    galleryType = "galleries";
                } else if (-1 === galleryType.indexOf("gallery")) {
                    galleryType = $.trim(galleryType) + " gallery";
                }

                //gallery info object
                var galleryInfObj = {
                    'gallery_id': galleryID,
                    'gallery_title': $el.attr('data-title'),
                    'gallery_index': this.index+1,
                    'slide_id': $el.find('.slide.active img').attr('data-id'),
                    'ssts': $el.attr('data-ssts'),
                    'cst': ($el.attr('data-cst') || 'bugpages').replace(/\/+$/, ""),
                    'contenttype': ('snapshot' === galleryID ? 'snapshot' : galleryType),
                    'pathName':(gallerypathname ==="")? this.linkPath :gallerypathname
                };
                PubSub.trigger('slide:change', galleryInfObj);
                /*  COMSCORE custom tracking request  */
                $.ajax({url: window.site_static_path + "html/comscorepvcandidate.xml", cache: false});
            },

            /**
             * Start autoplay.
             */
            autoplay: function() {
                if (this.playTimer) {
                    this._stopCarouselRotate();
                } else {
                    this._startCarouselRotate(true);
                }
            },

            /**
             * Starts the autoplay rotate
             * @private
             */
            _startCarouselRotate: function(advanceImmediately){
                // switchSlide will call autostart again for the next transition
                this.playTimer = setInterval(this.rotateCarousel, this.options.rotateInterval);
                if (advanceImmediately){
                    this.rotateCarousel();
                }
                this.triggerEvent('onPlay');
            },

            /**
             * Stops autoplay rotate.
             * @private
             */
            _stopCarouselRotate: function() {
                this.stoptimer();
                this.options.autostart = false;
                this.triggerEvent('onStop');
            },

            resumeAutoPlay: function(){
                if (this.options.autostart && !this.playTimer){
                    this._startCarouselRotate();
                }
            },

            /**
             * called when thumbnails are shown or hidden, used by autosize carousel to change the viewport size
             * @param {Boolean} on indicating whether the thumbnails are being turned on or off
             */
            toggleThumbnail: function(on){
                this.triggerEvent('viewportResize');
            }
        });


        /**
         * Return view class.
         */
        return CarouselView;
    }
);
