/**
 * @fileoverview Sports Carousel module view.
 * @author ikenticus (extends basic carousel)
 */
define([
    'jquery',
    'underscore',
    'utils',
    'pubsub',
    'modules/carousel/carousel',
    'modules/sports/sports-carousel-gallery'
],
function(
    $,
    _,
    Utils,
    PubSub,
    Carousel,
    SportsCarouselGallery
) {
    'use strict';

    var SportsFrontCarouselView = Carousel.extend({

        events: function() {
            var parentEvents = Carousel.prototype.events;
            if(_.isFunction(parentEvents)){
                parentEvents = parentEvents();
            }
            return _.extend({},parentEvents,{
                mouseenter: 'mouseEnter'
            });
        },

        initialize: function(options) {
            this.$primary = $('.sports-front-galleries-primary');
            this.$module = $('.sports-front-galleries-modules');
            this.$closer = $('.gallery-sidebar-close');
            this.$sidebar = $('.gallery-sidebar-ad');
            this.$counter = $('.gallery-count');
            this.$cardfilm = $('.card-film');
            this.$cardcolor = $('.card-suspender-color');
            this.$suspender = $('.sports-front-galleries-suspender');
            this.$caption = $('.gallery-sidebar-ad .caption').html();

            _.bindAll(this, 'mouseScroll', 'mouseClick', 'mouseEnter', 'isSideBarOpen', 'sidebarCaption');

            Carousel.prototype.initialize.call(this, options);

            this.sidebarCaption();
            PubSub.on('carousel:switchSlide', _.bind(function() {
                this.captionPoll = setInterval(this.sidebarCaption, 200);
            },this));

            this.$win = Utils.get('win');
            this.$win.on('scroll.' + this.cid, this.mouseScroll);
            this.$win.on('click.' + this.cid, this.mouseClick);
        },

        _initializeGallery: function(imageLazySrcAttr, slideTransition, showAds, selector){
            this.subviews.gallery = new SportsCarouselGallery({
                ads: showAds,
                el: (selector ? this.$(selector) : this.$el),
                index: this.index,
                imageLazySrcAttr: imageLazySrcAttr,
                slideTransition: slideTransition,
                carousel: this,
                isSideBarOpen: this.isSideBarOpen,
                sidebarAds: this.options.sidebarAds
            });
        },

        sidebarCaption: function() {
            var sidebar = $('.gallery-sidebar-ad .caption');
            var caption = $('.selected .active .gallery-viewport-caption').html();
            if (caption != this.$caption) {
                this.$caption = caption;
                clearInterval(this.captionPoll);
            }
            if (caption) {
                sidebar.html(caption);                
            } else {
                sidebar.empty();
            }
        },

        openSidebar: function(e) {
            if (e){
                e.preventDefault();
                e.stopPropagation();
            }
            var w = parseInt(this.$sidebar.outerWidth() + 1, 10);
            var slideAnimation = null;
            if (!this.$sidebar.hasClass('active')) {
                this.$sidebar.addClass('active');
                slideAnimation = this.animate(this.$sidebar, 'right', -(w)+'px', 250, 'ease-in-out').promise().done(_.bind(function() {
                    //call function to initialize medium rectangle
                    if(this.options && this.options.onSidebarAfterReveal) {
                        this.options.onSidebarAfterReveal();
                    }
                }, this));
            }
        },

        isSideBarOpen: function() {
            return !this.$cardfilm.hasClass('inactive');
        },

        mouseEnter: function() {
            //box-shadow: inset 0 5px 5px 0 rgba(0, 0, 0, 0.5);
            this.$primary.addClass('active');
            this.$counter.css('opacity', 0);
            this.$counter.css('visibility', 'hidden');
            this.$sidebar.find('.partner-placement').css('display', 'block');
            Carousel.prototype.mouseEnter.call(this);
            if (!$('.util-bar-flyout-pane-success').is(':visible')) {
                this.sidebarCaption();
            }
            this.openSidebar();
        },

        mouseScroll: function(e) {
            if (!this.$sidebar.hasClass('active'))
                return;
            var modSize = this.$sidebar.outerHeight();
            var modTop = this.$module.position().top;
            var scrollTop = $(window).scrollTop();
            var viewSize = $(window).outerHeight();
            if ((scrollTop > (modTop + modSize + 90)) ||
                    (modTop > (scrollTop + viewSize - 130)))
                this.$closer.click();
        },

        mouseClick: function(e) {
            if (!this.$sidebar.hasClass('active'))
                return;
            PubSub.trigger('carousel:cardfilmActive');
            var modTop = this.$module.offset().top;
            var modLeft = this.$module.offset().left;
            var modWide = this.$module.outerWidth() + this.$sidebar.outerWidth();
            var modTall = this.$sidebar.outerHeight();
            if ((e.pageX < modLeft) || (e.pageX > (modLeft + modWide)) ||
                    (e.pageY < modTop) || (e.pageY > (modTop + modTall))) {
                this.$closer.click();
            } else {
                if (!this.$closer.hasClass('active')) {
                    this.$closer.addClass('active');
                    this.$cardfilm.removeClass('inactive');
                    this.$module.css('z-index', 501);
                    this.$suspender.css('background-color', this.$cardcolor.css('background-color'));
                }
            }
        },

        destroy: function(removeEl) {
            clearInterval(this.captionPoll);
            this.$win.off('.' + this.cid);
            if (removeEl){
                this.$el.parent().remove();
            }
            PubSub.off('carousel:switchSlide');
            Carousel.prototype.destroy.call(this, false);
        }

    });

    return SportsFrontCarouselView;

});
