/**
 * @fileoverview Video Carousel module view.
 * @author Brendan Bagley
 */
define(['jquery', 
    'underscore', 
    'baseview', 
    'pubsub',
    'state',
    'modules/global/brightcove-video'
],
    function(
        $, 
        _, 
        BaseView, 
        PubSub, 
        StateManager,
        Video
    ) {
        'use strict';

        /**
         * View class.
         */
        var VideoCarouselView = BaseView.extend({

            // Events.
            events: {
                'click .carousel-nav' : 'onCarouselNavClick',
                'mouseleave .video-carousel-viewport': 'carouselMouseOut',
                'mouseenter .video-carousel-viewport': 'carouselMouseIn'
            },

            initialize: function(options) {
                options = $.extend({
                    animations: {
                        useCSSTransforms : false
                    }
                }, options);

                this.$carouselContainer = this.$('.video-carousel-series');
                this.moveMe = this.$carouselContainer;
                this.viewport = this.moveMe.parent();

                this.$slides = this.$carouselContainer.find('.video-carousel-item');
                this.totalSlides = this.$slides.length;

                this.index = this.$('.video-carousel-item-wrap.active').index();

                this.subviews = {};
                this.subviews.video = [];

                this.autoplay = false;

                _.bindAll(this, 'goToNextVideo');

                if(this.totalSlides>1) {
                    this.slideChangeInterval = setInterval(this.goToNextVideo,5000);
                }
                else {
                    this.$('.carousel-nav').hide();
                }

                var _this = this;

                _.bindAll(this, 'bcPlayerLoaded');

                // Process video(s) within slide.
                $.each(this.$slides.find('.video'), function() {
                    var video = new Video({
                        el: this,
                        onVideoComplete : _this.goToNextVideo,
                        onVideoLoaded : _this.bcPlayerLoaded,
                        autostart: false
                    });
                    _this.subviews.video.push(video);
                });

                if(this.$el.hasClass('autoplay')) {
                    this.subviews.video[0].$('.videoStillPlay').click();
                    clearInterval(this.slideChangeInterval);
                }

                // call base class initialize
                BaseView.prototype.initialize.call(this, options);
            },

            bcPlayerLoaded: function(bcID) {
                this.autoplay = true;
            },

            onCarouselNavClick : function(e) {
                e.preventDefault();
                if(this.totalSlides>1) {
                    var $e = $(e.currentTarget),
                        isPrev = $e.hasClass('prev'),
                        index = this.$('.video-carousel-item-wrap.active').index();
                    this.index = index;
                    this.autoplay=false;
                    
                    if(isPrev) {
                        index--;
                    }
                    else {
                        index++;
                    }

                    this.goTo(index);
                }
            },

            goTo: function(index) {
                if(index>=this.totalSlides) {
                    index=0;
                }
                else if(index<0) {
                    index = this.totalSlides-1;
                }

                var offsetBy = this.viewport.outerWidth(),
                    targetOffset = offsetBy * index * -1;

                if(this.subviews.video[this.index].player) {
                    this.subviews.video[this.index].resetVideoState();
                }

                this.animate(this.moveMe, 'left', targetOffset + 'px', 450, 'ease-in-out');

                if(this.autoplay) {
                    PubSub.trigger('uotrack', 'videocarousel|nextauto');
                    if(!this.subviews.video[index].player) {
                        this.subviews.video[index].$('.videoStillPlay').click();
                    }
                }

                this.updateDom(index);
            },

            updateDom: function(index) {
                this.updateNextPrevArrows(index);

                this.$('.video-carousel-item-wrap').eq(this.index).removeClass('active');
                this.$('.video-carousel-item-wrap').eq(index).addClass('active');

                this.index=index;
            },

            goToNextVideo: function() {
                var index = this.$('.video-carousel-item-wrap.active').index() + 1;
                if(this.subviews.video[this.index].modVP) {
                    this.subviews.video[this.index].modVP.getIsPlaying(_.bind(function(result) {
                        if(!result) {
                            this.goTo(index);
                        }
                    }, this));
                }
                else {
                    this.goTo(index);
                }
            },

            carouselMouseIn: function(e) {
                if(this.slideChangeInterval) {
                    clearInterval(this.slideChangeInterval);
                    this.slideChangeInterval=false;
                }
            },

            carouselMouseOut: function(e) {
                if(this.totalSlides>1) {
                    if(!this.autoplay) {
                        if(!this.slideChangeInterval) {
                            this.slideChangeInterval = setInterval(this.goToNextVideo,5000);
                        }
                    }
                }
            },

            /**
             * shows and hides the next/prev arrows based on the index provided
             * @param {Integer} index
             */
            updateNextPrevArrows: function(index){
                var $prevArrow = this.$('.carousel-prev'),
                    $nextArrow = this.$('.carousel-next');
                if (index === 0) {
                    $prevArrow.hide();
                }else{
                    $prevArrow.show();
                }
            },
            destroy: function(removeEl){
                clearInterval(this.slideChangeInterval);
                // call base class destroy
                BaseView.prototype.destroy.call(this, removeEl);
            }
        });

        /**
         * Return view class.
         */
        return VideoCarouselView;
    }
);
