/**
 * @fileoverview Controls subview of carousel. In charge of the next/prev arrows, buttons, widgets, autoplay
 * @author jmerrifiel@gannett.com (Jay Merrifield)
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'baseview',
    'pubsub',
    'utils'
],
    function(
        $,
        _,
        Backbone,
        BaseView,
        PubSub
    ) {
        var CarouselControls = BaseView.extend({

            events: {
                'click .slide-nav': 'switchSlide',
                'click .autoplay': 'autoplay',
                'click .thumbnails': 'thumbsToggle',
                'click .captions': 'captionsToggle',
                'mouseenter': 'mouseover',
                'mouseleave' : 'mouseout',
                'click .fullscreen': 'launchFullscreen'
            },

            selectors: {
                allCaptions: '.meta',
                captionBtnLabel: '.captionLabel',
                nextArrow: '.slide-nav.next',
                playBtn: '.playbtn',
                prevArrow: '.slide-nav.prev',
                thumbsBtnLabel: '.thumbLabel',
                thumbsWrapper: '.thumbs',
                ticker: '.ticker',
                viewport: '.viewport'
            },

            /**
             * Initialize view.
             * @param {Object} options View options passed in during init.
             */
            initialize: function(options) {

                options = $.extend({
                    index: 0,
                    hoverShowControls: true,
                    interactionDemo: true,
                    interactionShowDelay: 600, // ms
                    interactionHideDelay: 3600, // ms
                    totalImages: 0,
                    totalSlides: 0
                }, options);

                this.index = options.index;

                // Call base class initialize
                BaseView.prototype.initialize.call(this, options);
            },

            /**
             * post initialize render function. Updates ticker, updates Next/Prev Arrows
             * starts interaction demo if the option is provided
             */
            render: function(){
                this.updateTicker();
                this.updateNextPrevArrows(this.index);
                if (this.options.interactionDemo){
                    // don't start the interaction demo in full screen since it's hard to stop it from
                    // happening since it's based on mouseovers that might not fire
                    this.startInteractionDemo();
                }
            },

            destroy: function(removeEl){
                this.clearUserInteractionDemo();
                BaseView.prototype.destroy.call(this, removeEl);
            },

            /**
             * Event callback on next/prev slide-nav.
             * Will trigger carousel to switch 1 forward or one back
             * @param e
             */
            switchSlide: function(e){
                e.preventDefault();
                var $e = $(e.currentTarget),
                    isPrev = $e.hasClass('prev');
                $e.attr('data-lastClicked','true').siblings('.slide-nav').removeAttr('data-lastClicked');
                
                if (isPrev){
                    this.options.carousel.switchSlide(null, -1,false);
                }else{
                    this.options.carousel.switchSlide(null, 1,false);
                }
            },

            /**
             * Event callback that turns on or off autoplay (all controled by carousel)
             * @param e
             */
            autoplay: function(e) {
                e.preventDefault();
                // auto play just notifies the carousel to change it's state
                // the carousel itself controls the start/stop logic of the autoplay and associated event calling
                this.options.carousel.autoplay();
            },

            /**
             * Starts timers to initially expose next/prev navigation.
             */
            startInteractionDemo: function() {
                var _this = this;
                this.uxTimeout1 = setTimeout(function() {
                    _this.$el.addClass('hover');
                }, this.options.interactionShowDelay);

                this.uxTimeout2 = setTimeout(function() {
                    _this.$el.removeClass('hover');
                }, this.options.interactionHideDelay);
            },

            /**
             * Stops interaction timers
             */
            clearUserInteractionDemo: function(){
                clearTimeout(this.uxTimeout1);
                clearTimeout(this.uxTimeout2);
            },

            /**
             * Mouseover handler for the carousel
             * - will add hover class to this.$el
             * - will add hover class to the viewport if hoverShowControls = true
             * - clears user interaction demo so the user's experience isn't interrupted
             */
            mouseover: function(){
                if (this.options.hoverShowControls){
                    this.$$(this.selectors.viewport).addClass('hover');
                }
                this.$el.addClass('hover');
                this.clearUserInteractionDemo();
            },

            /**
             * Mouseout handler for the carousel
             * - will remove hover class on this.$el
             * - will remove hover class on the viewport if hoverShowControls = true
             */
            mouseout: function(){
                if (this.options.hoverShowControls){
                    this.$$(this.selectors.viewport).removeClass('hover');
                }
                this.$el.removeClass('hover');
            },

            /**
             * Launch fullscreen view
             * @param {Event} e View click event.
             */
            launchFullscreen: function(e) {
                e.preventDefault();

                // need PubSub to break circular dependency
                PubSub.trigger('openFullScreenCarousel', {
                    carousel: this,
                    fullScreen: true,
                    parent: this.$el
                });
            },

            /**
             * Toggle on/off captions, updates button label
             * @param {Event} e Browser event.
             */
            captionsToggle: function(e) {
                var meta = this.$$(this.selectors.allCaptions),
                    label = this.$$(this.selectors.captionBtnLabel);

                e.preventDefault();
                if (meta.hasClass('on')) {
                    meta.removeClass('on');
                    label.html('Show Captions');
                } else {
                    meta.addClass('on');
                    label.html('Hide Captions');
                }
            },

            /**
             * Toggle on/off thumbnails, updates button label
             * @param {Event} e Browser event.
             */
            thumbsToggle: function(e) {
                var label = this.$$(this.selectors.thumbsBtnLabel),
                    thumbs = this.$$(this.selectors.thumbsWrapper);

                e.preventDefault();
                if (thumbs.hasClass('on')) {
                    thumbs.removeClass('on');
                    label.html('Show Thumbnails');
                    this.options.carousel.toggleThumbnail(false);
                } else {
                    thumbs.addClass('on');
                    label.html('Hide Thumbnails');
                    this.options.carousel.toggleThumbnail(true);
                }
            },

            /**
             * shows and hides the next/prev arrows based on the index provided
             * @param {Integer} index
             */
            updateNextPrevArrows: function(index){
                var $prevArrow = this.$$(this.selectors.prevArrow),
                    $nextArrow = this.$$(this.selectors.nextArrow);
                if (index === 0) {
                    $prevArrow.hide();
                }else{
                    $prevArrow.show();
                }
                if (index < (this.options.totalSlides - 1)){
                    $nextArrow.show();
                }else{
                    $nextArrow.hide();
                }
            },

            /**
             * Update slide ticker html (Image 1 of 9).
             */
            updateTicker: function() {
                // Get the details of what we're setting.
                var $ticker = this.$$(this.selectors.ticker);

                if ($ticker.length){
                    if (this.index < this.options.totalImages){
                        $ticker.css({'visibility': 'visible'});
                    }else{
                        // we set visibility to keep the other icons in line
                        $ticker.css({'visibility': 'hidden'});
                    }
                    $ticker.html('<b>' + (this.index + 1) + '</b> of <b>' + this.options.totalImages + '</b>');
                }
            },

            /**
             * Go to slide event callback from carousel, will update next/prev arrows and ticker
             * @param index
             */
            goToSlide: function(index){
                this.index = index;
                this.updateNextPrevArrows(index);
                this.updateTicker();
            },

            /**
             * onPlay event callback from carousel
             * will change playButton text to 'Pause' and add a 'pause' class
             */
            onPlay: function(){
                this.$$(this.selectors.playBtn).addClass('pause').text('Pause');
            },

            /**
             * onStop event callback from carousel
             * will change playButton text to 'Autoplay' and remove 'pause' class
             */
            onStop: function(){
                this.$$(this.selectors.playBtn).removeClass('pause').text('Autoplay');
            }

        });
        return CarouselControls;
    }
);