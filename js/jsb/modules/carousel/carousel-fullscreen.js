/**
 * @fileoverview Fullscreen carousel. This is an extension of carousel-autosize that will copy
 * an existing carousel into a full screen shell with close button and takeover of the current
 * view
 * @author jmerrifiel@gannett.com (Jay Merrifield)
 */
define(['jquery', 'exports', 'underscore', 'backbone', 'baseview', 'utils', 'state', 'site-manager', 'modules/carousel/carousel-autosize'],
    function($, exports, _, Backbone, BaseView, Utils, StateManager, SiteManager, CarouselAutoSize) {
        var FullScreenCarousel = CarouselAutoSize.extend({

            /**
             * Initialize view.
             * @param {Object} options View options passed in during init.
             */
            initialize: function(options) {
                _.bindAll(this, 'handleKeyPress', 'close');

                options = $.extend({
                    scrollerColor: 'dark'
                }, options);

                this.$body = Utils.get('body');
                this.$doc = Utils.get('document');
                this.carousel = options.carousel;
                this.parent = options.parent;
                StateManager.registerFullScreenView(this);
                SiteManager.getHeader().setClosedFixed(true);
                SiteManager.scrollTop(0);

                this.$doc.on('keydown.' + this.cid, this.handleKeyPress);
                // sadly, we can't use $el because the $el needs to be the inner gallery for the analytics in carousel to work
                this.$body.on('click.' + this.cid, '.close', this.close);

                this.launch();

                // call base class initialize
                CarouselAutoSize.prototype.initialize.call(this, options);
            },

            /**
             * Close Full Screen Experience.
             * @param {Event} e Browser event.
             */
            close: function(e) {
                if (e) e.preventDefault();
                SiteManager.getHeader().restoreLastState();
                this.animate(this.$el.parent(), 'opacity', 0, 300, 'ease-in-out').done(_.bind(function(){
                    this.destroy(true);
                    StateManager.clearFullScreenView().done(_.bind(function(){
                        // this click handler has to happen in here because clearFullScreenView will restore the click
                        // handlers of the original carousel
                        if (this.carousel) {
                            // click the original image so the user goes back to the same image they were looking at
                            var $thumbs = $('.thumbs li', this.parent);
                            $thumbs.eq(this.index).click();
                        }
                    }, this));
                }, this));
            },

            /**
             * Clean up view.
             * Removes event handlers and element (optionally).
             * @param {boolean} removeEl option to also remove View from DOM.
             */
            destroy: function(removeEl) {
                this.$doc.off('.' + this.cid);
                this.$body.off('.' + this.cid);

                if (removeEl){
                    this.$el.parent().remove();
                }

                // call base class destroy
                CarouselAutoSize.prototype.destroy.call(this, false);
            },

            /**
             * Launch Full Screen Experience.
             */
            launch: function() {
                var html = $('<article class="gallery fullscreen" style="opacity: 0">' +
                    '<a class="close" href="#"></a>' +
                    '<div class="ui-film fullscreen"></div></article>');
                var parentGallery = this.parent.clone();
                parentGallery.find('.viewport').removeClass('hover');
                var pp = parentGallery.find('.partner-placement');
                if (pp.length){
                    var ppId = pp.attr('id') + '_fs';
                    pp.attr('id', ppId).attr('data-slot-id', ppId);
                }
                html.append(parentGallery);
                this.$body.append(html);
                this.animate(html, 'opacity', 1, 300, 'ease-in-out');

                // Manually set the fullscreen view element since it was just appended.
                this.setElement(parentGallery);
            },

            handleKeyPress: function(e){
                if (e.keyCode === 37) {
                    // left arrow
                    this.prevSlide();
                    return false;
                }
                if (e.keyCode === 39) {
                    // right arrow
                    this.nextSlide();
                    return false;
                }
                if (e.keyCode === 27) {
                    // escape
                    this.close();
                    return false;
                }
            }
        });
        return FullScreenCarousel;
});