/**
 * @fileoverview Autosizing carousel. This is an extension of Carousel that attachs a window resize
 * handler that will cause the carousel to fill the window (with horizontal and vertical margins)
 * @author jmerrifiel@gannett.com (Jay Merrifield)
 */
define(['jquery', 'underscore', 'backbone', 'baseview', 'utils', 'modules/carousel/carousel'],
function($, _, Backbone, BaseView, Utils, Carousel) {
    /**
     * View class.
     */
    var AutoSizeGallery = Carousel.extend({

        /**
         * Initialize view.
         * @param {Object} options View options passed in during init.
         */
        initialize: function(options) {
            _.bindAll(this, 'handleResizeWindow');

            this.options = $.extend({
                hoverShowControls: false,
                verticalAdjust: 80,
                interactionDemo: false,
                horizontalAdjust: 0,
                thumbSize: 84,
                imageLazySrcAttr: 'data-large-src'
            }, options);

            this.$win = Utils.get('win');

            if (this.$el.hasClass('galleries')){
                this.$el.addClass('autosize');
            }else{
                this.$('.galleries').addClass('autosize');
            }

            var throttledResize = _.throttle(this.handleResizeWindow, 50);
            this.$win.on('resize.' + this.cid, throttledResize);
            this.handleResizeWindow();

            // call base class initialize
            Carousel.prototype.initialize.call(this, this.options);

            // triggers the updating of the image with the correctly sized one
            this.subviews.gallery.render();
        },

        /**
         * Clean up view.
         * @param {boolean} removeEl option to also remove View from DOM.
         */
        destroy: function(removeEl) {
            this.$win.off('.' + this.cid);

            // call base class destroy
            Carousel.prototype.destroy.call(this, removeEl);
        },

        handleResizeWindow: function(){
            this.windowHeight = this.$win.height();
            this.windowWidth = this.$win.width();

            this.viewportResize();
        },

        viewportResize: function(){
            var galleryheight = this.windowHeight - this.options.verticalAdjust;
            if (this.showThumbs){
                galleryheight -= this.options.thumbSize;
            }
            this.$$('.viewport').height(galleryheight);

            this.triggerEvent('viewportResize', this.windowWidth - this.options.horizontalAdjust, galleryheight);
        },

        /**
         * event callback when thumbnails are toggled on and off
         * @override
         * @param on
         */
        toggleThumbnail: function(on){
            this.showThumbs = on;
            this.viewportResize();
        }

    });
    return AutoSizeGallery;
});