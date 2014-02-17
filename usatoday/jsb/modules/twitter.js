/**
 * @fileoverview Twitter view module.
 * @author jheiner@usatoday.com (John Heiner)
 */
define([
    'jquery',
    'underscore',
    'state',
    'baseview',
    'modules/scroller/sidebar-scroll'
],
function(
    $,
    _,
    StateManager,
    BaseView,
    SidebarScroll
) {

    'use strict';
        /**
         * View class.
         */
        var TwitterView = BaseView.extend({

            /**
             * Initialize view.
             * @param {Object} options
             */
            initialize: function(options) {
                options = $.extend({
                    num_tweets: null,
                    twitter_id: null,
                    layoutType: null // set by state manager, could be sidebar, or primary, or primary-with-suspender
                }, options);

                _.bindAll(this, 'createTweetsHTML');
                this.twitter_el = this.$('.tweet-list');
                this.isFixed = this.$el.closest('.sidebar-fixed-content').length;

                // Check if the JSON user attr is there otherwise use current section feed.
                this.row_size = this.twitter_el.attr('data-row-size');
                options.num_tweets = this.options.num_tweets || this.twitter_el.attr('data-num-tweets');
                this.twitterID = options.twitter_id || this.twitter_el.attr('data-twitter-id');
                if (!this.twitterID) {
                    this.$el.hide();
                    return;
                }
                if (options.layoutType !== 'sidebar') {
                    this.loadTweets(this.twitterID, options.num_tweets, this.row_size, this.createTweetsHTML);
                }
                // Call base class initialize.
                BaseView.prototype.initialize.call(this, options);
            },

            renderCardInfo: function(currentCardInfo) {
                if (this.options.layoutType === 'sidebar' && currentCardInfo.sidebarOpen) {
                    this.addScrollbar();
                    this.loadTweets(this.twitterID, this.options.num_tweets, this.row_size, this.createTweetsHTML);
                }
            },
            onCardWidthChange: function(currentCardInfo) {
                if (!this.tweetsLoaded) {
                    this.renderCardInfo(currentCardInfo);
                }
            },
            openSideBar: function(){
                if (!this.tweetsLoaded) {
                    this.renderCardInfo({sidebarOpen: true});
                }
            },

            destroy: function(removeEl) {
                if (removeEl) {
                    this.twitter_el.empty();
                }
                BaseView.prototype.destroy.call(this, false);
            },

            /**
             * Update size when a sidebar ad shows up.
             */
            onSidebarScrollableHeightChange: function(fixedHeight, scrollableHeight) {
                if (this.options.layoutType === 'sidebar') {
                    var siblingHeight = _.reduce(this.$el.siblings('.card-sidebar'), function(total, el){return total + $(el).outerHeight();}, 0);
                    this.$el.css('height', (this.isFixed ? fixedHeight : scrollableHeight) - siblingHeight);
                    this.refreshScrollbar();
                }
            },

            refreshScrollbar: function() {
                var activeApp = StateManager.getActiveApp();
                if (this.subviews && this.subviews.scrollbar) {
                    this.subviews.scrollbar.refresh();
                }
                if (this.options.layoutType === 'sidebar' && !this.isFixed && activeApp.refreshSidebarScroll) {
                    activeApp.refreshSidebarScroll();
                }
            },

            loadTweets: function(user, tweetCount, rowSize, callback) {
                this.tweetsLoaded = true;
                StateManager.fetchHtml('/services/twitter/json/' + user + '/' + tweetCount + '/' + rowSize + '/').done(callback);
            },

            /**
             * Calls the template file and fills it with the tweets
             */
            createTweetsHTML: function(tweets) {
                this.twitter_el.html(tweets);
                var timeAgo_Method = this.timeAgo;
                this.twitter_el.find('.tweet_time_ago').each(function(index, value) {
                    $(value).html(timeAgo_Method($(value).html()));
                });

                this.refreshScrollbar();
            },

            /**
             * Add scrollbar.
             */
            addScrollbar: function() {
                this.subviews.scrollbar = new SidebarScroll({
                    el: this.$('.twitter-sidebar-content'),
                    color: 'light',
                    lockPageScroll: true,
                    fadeout: true
                });
            },

            /**
             * relative time calculator FROM TWITTER
             * @param {String} dateString date string returned from Twitter API.
             */
            timeAgo: function(dateString) {
                var rightNow = new Date();
                var then = new Date(dateString);

                if (!then.getTime()) {
                    // IE can't parse these crazy Ruby dates
                    then = Date.parse(dateString.replace(/( \+)/, ' UTC$1'));
                }

                var diff = rightNow - then;

                var second = 1000,
                    minute = second * 60,
                    hour = minute * 60,
                    day = hour * 24;

                if (isNaN(diff) || diff < 0) {
                    return ''; // return blank string if unknown
                }

                if (diff < second * 2) {

                    // Within 2 seconds
                    return 'right now';
                }

                if (diff < minute) {
                    return Math.floor(diff / second) + ' seconds ago';
                }

                if (diff < minute * 2) {
                    return 'about 1 minute ago';
                }

                if (diff < hour) {
                    return Math.floor(diff / minute) + ' minutes ago';
                }

                if (diff < hour * 2) {
                    return 'about 1 hour ago';
                }

                if (diff < day) {
                    return  Math.floor(diff / hour) + ' hours ago';
                }

                if (diff > day && diff < day * 2) {
                    return 'yesterday';
                }

                if (diff < day * 365) {
                    return Math.floor(diff / day) + ' days ago';
                }

                else {
                    return 'over a year ago';
                }
            }
        });

        /**
         * Return view class.
         */
        return TwitterView;
    }
);

