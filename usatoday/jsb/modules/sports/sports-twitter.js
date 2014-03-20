/**
 * @fileoverview Sprts Twitter view module.
 * @author tdljackson@usatoday.com (Tony Jackson)
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
            var SportsTwitterView = BaseView.extend({

                // Events.
                events: {
                    'click .sports-twittertab-option': 'twitterTabClicked'
                },
                
                /**
                 * Initialize view.
                 * @param {Object} options
                 */
                initialize: function(options) {

                    options = $.extend({
                        num_tweets: null,
                        twitter_id: null,
                        layoutType: null, // set by state manager, could be sidebar, or primary, or primary-with-suspender
                        refreshInterval: 30000,
                        failureRefreshInterval: 60000,
                        twitter_cache: 12000
                    }, options);

                    //          clear the el top in case an ad used to be showing after we close an overlay
                    if (this.options.layoutType === 'sidebar') {
                        this.onHideSidebarAd();
                    }

                    this.$twitterTabs = $('.sports-twitter-modules .front-gallery-item, .sports-twitter-data');
                    
                    _.bindAll(this, 'createTweetsHTML', 'loadTweets', 'twitterTabClicked');
                    this.twitter_el = this.$('.tweet-list');
                    this.update = false;
                    this.continueRefresh = true;
                    this.handles = $(this.$twitterTabs[0]).attr('tab-target-handles');
                    this.hashtags = $(this.$twitterTabs[0]).attr('tab-target-hashtags');
                    this.refreshInterval = $(this.$twitterTabs[0]).attr('tab-target-refresh-rate') || options.refreshInterval;
                    this.failureRefreshInterval = this.twitter_el.attr('data-twitter-failure-refresh-rate') || options.failureRefreshInterval;
                    this.twitter_cache = this.twitter_el.attr('data-twitter-cache-ttl') || options.twitter_cache;
                    this.selectedTab = 1;

                    this.$primary = $('.sports-twitter-modules .sports-twitter-primary');
                    this.$suspender = $('.sports-twitter-modules .sports-twitter-suspender');
                    this.$viewport = $('.sports-twitter-modules .twitter-scroll-content');


                    //          Check if the JSON user attr is there otherwise use current section feed.
                    this.row_size = this.options.row_size || this.twitter_el.attr('data-row-size');
                    this.num_tweets = this.options.num_tweets || this.twitter_el.attr('data-num-tweets');

                    this.twitterID = options.twitter_id || this.twitter_el.attr('data-twitter-id');
                    if (!this.twitterID) {
                        this.$el.hide();
                        return;
                    }
                    this.addscrollBar();
                    this.loadTweets();

                    //          Call base class initialize.
                    BaseView.prototype.initialize.call(this, options);
                },

                twitterTabClicked: function(e) {
                    if (this.refreshID) {
                        clearTimeout(this.refreshID);
                    }
                    var targetLink = $(e.currentTarget);
                    e.preventDefault();
                    this.$twitterTabs.removeClass('selected');
                    targetLink.addClass('selected');
                    this.refreshInterval = targetLink.attr('tab-target-refresh-rate');
                    this.handles = targetLink.attr('tab-target-handles');
                    this.hashtags = targetLink.attr('tab-target-hashtags');
                    this.twitter_el.html("");
                    $('.sports-twitter-modules .scrollable-content').outerHeight($('.tweet-list')[0].scrollHeight);
                    this.update = false;
                    this.refreshScrollbar();
                    this.$viewport.addClass('loading');
                    this.loadTweets();
                },

                refreshScrollbar: function() {
                    if (this.scrollbar){
                        this.scrollbar.refresh();
                        if(this.update === false){
                            this.scrollbar.moveDraggerToPosition(0, 0);
                        }
                    }
                },

                loadTweets: function() {
        
                    this.tweetsLoaded = true;
                    var user = this.twitterID;  
                    var tweetCount = this.num_tweets; 
                    var rowSize = this.row_size; 
                    var callback = this.createTweetsHTML; 
                    var handles = this.handles;
                    var hashtags = this.hashtags;
                    var refreshInterval = this.refreshInterval;
                    var update = this.update;
                    var twitter_cache = this.twitter_cache;
                    var searchkeys = handles + "~~" + hashtags;

                    StateManager.fetchHtml('/sports/services/sportstwitter/json/' + user + '/' + tweetCount + '/' + rowSize + '/' + twitter_cache + '/' + searchkeys + '/')
                    .done(callback)
                    .fail(_.bind(function(){
                        this.twitter_el.html("<div id='sports-no-tweets'>No tweets available.</div>");
                        callback("TWITTER SERVER FAILURE");
                    }, this))
                    .always(_.bind(function(){
                        this.$viewport.removeClass('loading');
                    }, this));
                },

                /**
                 * The function stops the refresh routine
                 */
                stopRefresh: function() {
                    this.continueRefresh = false;
                    if (this.refreshID) {
                        clearTimeout(this.refreshID);
                    }
                },

                /**
                 * Calls the template file and fills it with the tweets
                 */
                createTweetsHTML: function(tweets) {
                    
                    if (tweets === "TWITTER SERVER FAILURE") {
                        if (this.continueRefresh && (this.failureRefreshInterval != "0")){
                            this.update = true;
                            this.refreshID = setTimeout(this.loadTweets, this.failureRefreshInterval);
                        }
                            
                    } else {
   
                        if ((tweets) && (String(tweets.html()).length > 10)) {
            
                            var oldTweets = $(this.twitter_el.html());
                            var change = false;
            
                            var newlist = $(tweets).find('.tweet');
                            var oldlist = $(oldTweets).find('.tweet');
            
                            for(var i=0; i < $(newlist).length; i++){
                                if($(newlist[i]).html() != $(oldlist[i]).html()){
                                    change = true;
                                    break;
                                }
                            }
    
                            if (change) {
                                $('.sports-twitter-modules .scrollable-content').outerHeight(0);
                                this.refreshScrollbar();
                                this.twitter_el.html(tweets);
                                $('.sports-twitter-modules .scrollable-content').outerHeight($('.tweet-list')[0].scrollHeight - 150);
                                this.refreshScrollbar();
                            }
    
                            var timeAgo_Method = this.timeAgo;
                            tweets.find('.tweet_time_ago').each(function(index, value) {
                                $(value).html(timeAgo_Method($(value).html()));
                            });
    
                        } else {
                            $('.sports-twitter-modules .scrollable-content').outerHeight(0);
                            this.refreshScrollbar();
                            this.twitter_el.html("<div id='sports-no-tweets'>No tweets available.</div>");
                        }
    
                        if (this.continueRefresh && (this.refreshInterval != "0")){
                            this.update = true;
                            this.refreshID = setTimeout(this.loadTweets, this.refreshInterval);
                        }
                    }
                },

                /**
                 * Add scrollbar.
                 */
                addscrollBar: function(){
                    this.scrollbar = new SidebarScroll({  
                        el: $('.sports-twitter-modules .twitter-scroll-content'),
                        color: 'dark',
                        padding: 2,
                        lockPageScroll: true,
                        delayScroll: false,
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
                },

                destroy: function(removeEl) {
                    if (removeEl) {
                        this.twitter_el.empty();
                    }
                    this.stopRefresh();
                    BaseView.prototype.destroy.call(this);
                }
            });

            /**
             * Return view class.
             */
            return SportsTwitterView;
        }
);
