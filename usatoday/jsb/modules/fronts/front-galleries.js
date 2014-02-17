/**
 * @fileoverview Gallery Carousel module view.
 * @author pkane, cwmanning
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'pubsub',
    'baseview',
    'utils',
    'modules/carousel/carousel',
    'ui/loader',
    'state'
],
function(
    $,
    _,
    Backbone,
    PubSub,
    BaseView,
    Utils,
    Carousel,
    Loader,
    StateManager
) {
    'use strict';
        /**
         * View class.
         */
        var GalleryCarouselView = BaseView.extend({

            /*
             * Analytics must ignore a gallery "switch" which is not really a switch
             */
            empty: true,

            /**
             * Events
             */
            events: {
                'click .front-gallery-link' : 'select'
            },

            /**
             * Initialize view.
             * @param {Object} options View options passed in during init.
             */
            initialize: function(options) {
                this.$galleries = this.$('.front-gallery');
                this.$navItems = this.$('.front-gallery-item');

                _.bindAll(this, 'switchGallery');

                // call base class initialize
                BaseView.prototype.initialize.call(this, {});

                this.subviews.loader = new Loader({
                    el: this.$galleries.parent()
                });

                if (this.$galleries.find(".slide.active").length) {
                    var $gallery = this.$(".front-gallery.selected");
                    this.subviews['gallery' + $gallery.index()] = new Carousel({
                        ads: true,
                        linkPath: this.$navItems.filter('.selected').find('a').attr('href'),
                        el: $gallery.find('.galleries'),
                        fullScreen: true
                    });
                    this.empty= false;
                } else {
                    var href = this.$navItems.first().find("a").attr("href");
                    if (typeof href !== 'undefined' && href.length > 1) {
                        this.fetchData(href, 0, this.switchGallery);
                    }
                }
            },

            /**
             * Fetch data from server via AJAX. Takes a path to fetch and a
             * callback to parse the data and initialize views.
             * @param {String} path The path to the ajax endpoint.
             * @param {Number} index The Gallery list item position.
             * @param {Function} callback Function to call when data is returned
             *      from server.
             */
            fetchData: function(path, index, callback) {
                var _this = this;
                // state manager failures return immediately without waiting for the promises to finish
                // so we need to track whether we're still loading after the animation is running
                var loading = true;

                var $gallery = this.$(".front-gallery.selected");
                if ($gallery.length){
                    $gallery.css({'opacity': 1});
                    this.animate($gallery, 'opacity', 0, 200).done(function(){
                        if (loading){
                            _this.loading(true);
                        }
                    });
                }
                StateManager.fetchHtml('/front-gallery' + path)
                            .done(function(html){
                        callback(html, index,path);
                    }).always(function(){
                        loading = false;
                        _this.loading(false);
                    });
            },

            /**
             * Toggle loading presentation
             * @param {boolean} showLoading Whether or not to display loading.
             */
            loading: function(showLoading) {
                if (showLoading) {
                    this.subviews.loader.show();
                } else {
                    this.subviews.loader.hide();
                }
            },

            /**
             * Toggle selected class and load gallery data.
             * @param {Event} event View click event.
             */
            select: function(event) {
                var targetLink = $(event.currentTarget),
                    path = targetLink.attr('href'),
                    item = targetLink.parent(),
                    index = item.index(),
                    $gallery = this.$galleries.eq(index);

                // Heattracking
                Utils.setTrack(targetLink);

                if (path.indexOf('://') === -1) {
                    if ($gallery.find('.galleries').length > 0) {
                        this.switchGallery(null, index, path);
                    } else {
                        this.fetchData(path, index, this.switchGallery);
                    }

                    if (event) {
                        event.preventDefault();
                    }
                }

                // Highlight clicked navigation item.
                this.$navItems.removeClass('selected');
                item.addClass('selected');
            },

            /**
             * Switch to selected gallery.
             * @param {String} html Returned from fetchData.
             * @param {Number} index The Gallery list item position.
             * @param {String} path url for the gallery associated with the html.
             */
            switchGallery: function(html, index, path) {
                var $gallery = this.$galleries.eq(index);

                // Show chosen gallery.
                this.$galleries.removeClass('selected');
                $gallery.addClass('selected');

                if (html) {
                    $gallery.html(html);
                }
                if (!this.subviews['gallery' + index]) {
                    var carousel = this.subviews['gallery' + index] = new Carousel({
                        ads: true,
                        el: $gallery.find('.galleries'),
                        fullScreen: true,
                        linkPath: path
                    });
                    if (!this.empty) {
                        this.trackGalleryChange(carousel);
                        this.empty = false;
                    }
                } else {
                    this.trackGalleryChange(this.subviews['gallery' + index]);
                }
                $gallery.css({opacity: 0});
                this.animate($gallery, 'opacity', 1, 200);
            },

            // carousel is not issuing a slide:change event for our first slide
            // so... ask it to do so
            trackGalleryChange: function(carousel) {
                carousel._trackSlideChange();
            }
        });

        /**
         * Return view class.
         */
        return GalleryCarouselView;
    }
);
