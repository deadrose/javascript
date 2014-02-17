/**
 * @fileoverview Headlines module view.
 * @author Chad Shryock <cdshryock@gannett.com>
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'state',
    'pubsub',
    'utils',
    'baseview',
    'ui/button-toggle'
],
function(
    $,
    _,
    Backbone,
    StateManager,
    PubSub,
    Utils,
    BaseView,
    ButtonToggle
) {
    'use strict';
    /**
     * View class.
     */
    var HeadlineView = BaseView.extend({

        // Events.
        events: {
            'click .button-add-content': 'showMore'
        },

        /**
         * Initialize view.
         * @param {Object} options View options passed in during init.
         */
        initialize: function(options) {
            this.$button = this.$('.button-add-content');
            BaseView.prototype.initialize.call(this, options);
            _.bindAll(this, 'transitionMore', 'toggleGridListView');
            // setup view toggler
            var toggler = this.$('.headline-toggler');
            if (toggler.length) {
                this.subviews.gridListViewToggler = new ButtonToggle({
                    el: toggler,
                    onSelect: this.toggleGridListView
                });
            }
            
        },

        getMoreHeadlines: function(nextPageNum, callback) {
            StateManager.fetchHtml(window.location.pathname + nextPageNum + '/').done(
                _.bind(function(htmlFrag){
                    var $page = htmlFrag.find('.headline-page').removeClass('active').addClass('inactive');
                    var $button = htmlFrag.find('.button-add-content');
                    this.$('.headline-collection').append($page);
                    if ($button.length > 0) {
                        this.$('.headlines-show-more').empty().append($button);
                    } else {
                        this.$button.addClass('inactive');
                    }
                    callback($page);
                }, this)
            ).fail(_.bind(function(){
                var origText = this.$button.attr('data-default');
                this.$button.removeClass('loading').addClass('inactive').text(origText);
            }, this));
        },

        /**
         * Shows the next block of headlines.
         * @param {Event} event View click event.
         */
        showMore: function(event) {
            if ($(event.target).hasClass('inactive')) return false;
            this.$button = $('.button-add-content',this.el);
            this.$button.addClass('loading').text(this.$button.attr('data-loading'));
            var $nextPage;
            if (this.$el.hasClass('stagfront-primary') && !this.$('.front-headlines-header').hasClass('staff')) {
                var nextPageNum = parseInt($(event.target).data('next'), 10);
                this.getMoreHeadlines(nextPageNum, this.transitionMore);
            } else {
                // On a typical front - headlines already in DOM.
                $nextPage = this.$('.headline-page.active:last').next();
                var ditemnum = $nextPage.attr("data-itemnum");
                var ditemperpage = $nextPage.attr("data-items-per-page");
                var count = Math.round(ditemnum/ditemperpage);
                var $collection = $('.headline-collection');
                var dataSrc;
                if($collection.hasClass('listview')){
                    dataSrc = "data-list-src";
                } else {
                    dataSrc = "data-grid-src";
                }
                Utils.lazyLoadImage($nextPage.find('img'), dataSrc, true);

                PubSub.trigger('uotrack', Utils.getSectionPath(window.location.pathname) + 'morestories' + count);
                this.transitionMore($nextPage);
            }
            event.preventDefault();
        },

        /**
         * Toggle between list and grid modes
         * @param {Jquery} clickedToggleItem Clicked toggle item
         */
        toggleGridListView: function(clickedToggleItem) {
            var $collection = this.$('.headline-collection');
            var viewState = clickedToggleItem.hasClass('grid-big') ? 'grid-big' : 'list-big';
            if (viewState === 'list-big') {
                $collection.addClass('listview');
                PubSub.trigger('uotrack', 'listview');
                Utils.lazyLoadImage(this.$('img'), 'data-list-src', true);
            } else {
                $collection.removeClass('listview');
                PubSub.trigger('uotrack', 'gridview');
                Utils.lazyLoadImage(this.$('img'), 'data-grid-src', true);
            }
        },

        transitionMore: function($nextPage) {
            var $collection = $('.headline-collection');
            var dataSrc;
            if (Modernizr.csstransitions) {
                $nextPage.removeClass('inactive').addClass('active');
            } else {
                $nextPage.animate({
                    'max-height': '5000px'
                }, 200, function() {
                    $(this).removeClass('inactive').addClass('active').css('max-height', '');
                });
            }
            if (this.$('.headline-page.inactive').length <= 0) {
                // no more items to show, inactivate the show more button
                this.$button.addClass('inactive');
            }
            if($collection.hasClass('listview')) {
                dataSrc = "data-list-src";
            } else {
                dataSrc = "data-grid-src";
            }

            Utils.lazyLoadImage($nextPage.find('img'), dataSrc, true);

            this.$button.removeClass('loading').text(this.$button.attr('data-default'));
            PubSub.trigger('showmore:headlines');
        }

    });

    /**
     * Return view class.
     */
    return HeadlineView;
});