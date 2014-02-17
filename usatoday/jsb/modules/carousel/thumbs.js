/**
 * @fileoverview Thumbs subview of carousel. Handles rendering of the thumbs, clicking of the thumbs
 * and the hover transition over thumbs if turned on
 * @author jmerrifiel@gannett.com (Jay Merrifield)
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'baseview',
    'pubsub',
    'utils',
    'modules/scroller/horizontal-scroll'
],
    function(
        $,
        _,
        Backbone,
        BaseView,
        PubSub,
        Utils,
        HorizontalScroll
    ) {

        /**
         * View class.
         */
        var CarouselThumbs = BaseView.extend({

            events: {
                'mouseenter li' : 'thumbMouseover',
                'mouseleave li' : 'thumbMouseout',
                'click li' : 'switchSlide'
            },

            selectors: {
                thumbs: 'li'
            },

            /**
             * Initialize view.
             * @param {Object} options View options passed in during init.
             */
            initialize: function(options) {
                options = $.extend({
                    // setting the hoverTransition to 0 will disable hover transition, any other value
                    // will delay that many ms and switch to that slide
                    hoverTransition: 0
                }, options);

                this.index = options.index;

                // Call base class initialize
                BaseView.prototype.initialize.call(this, options);

                // Initialize the horizontal scroll
                this.subviews.scrollbar = new HorizontalScroll({
                    el: this.$el,
                    color: this.options.scrollerColor,
                    padding: 2
                });
            },

            destroy: function(removeEl) {
                // Call base class destroy
                BaseView.prototype.destroy.call(this, removeEl);
            },

            /**
             * Event callback on thumbs that will trigger switching to that thumb's index
             * @param e
             */
            switchSlide: function(e){
                e.preventDefault();
                var clickIndex = $(e.currentTarget).index();
                this.options.carousel.switchSlide(clickIndex);
            },

            /**
             * Function that is triggered when an ad is being shown, will remove the active class of the current thumb
             */
            showAd: function(){
                var $thumbs = this.$$(this.selectors.thumbs);
                $thumbs.eq(this.index).removeClass('active');
            },

            /**
             * Event callback on mouse over on thumbs, used when hoverTransition is on, will
             * switch to that slide after a specified amount of time (this.options.hoverTransition)
             * @param event
             */
            thumbMouseover: function(event) {
                var target = event.currentTarget;
                if (this.options.hoverTransition) {
                    this.hoverTimeout = setTimeout(_.bind(function() {
                        this.hoverTimeout = null;
                        // don't track the hover transition because it's only used on heros
                        // which don't have the right attributes for the data track
                        this.options.carousel.switchSlide($(target).index(), null, true);
                    }, this), this.options.hoverTransition);
                }
            },

            /**
             * Event callback on mouse out on thumbs, will clear the hover timeout if it's still active
             * @param event
             */
            thumbMouseout: function(event) {
                if (this.options.hoverTransition) {
                    if (this.hoverTimeout) {
                        clearTimeout(this.hoverTimeout);
                    }
                }
            },

            /**
             * Function that will remove the current index's 'active' class and add 'active'
             * to the given index
             * @param index
             */
            goToSlide: function(index){
                var $thumbs = this.$$(this.selectors.thumbs),
                    $targetThumb = $thumbs.eq(index);
                $thumbs.eq(this.index).removeClass('active');
                $targetThumb.addClass('active');
                this.index = index;
                if ($targetThumb.length){
                    // the end slate element is not active and we should execute the scrollToElement method
                    this.subviews.scrollbar.scrollToElement($targetThumb, false, 300);
                }
            },

            /**
             * carousel callback triggered on viewport size changed,
             * allows us to update the thumbnail scrollbar
             */
            viewportResize: function(){
                if (this.subviews.scrollbar){
                    this.subviews.scrollbar.refresh();
                }
            }

        });

        return CarouselThumbs;
    }
);