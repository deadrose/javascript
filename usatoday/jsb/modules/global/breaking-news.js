define([
    'jquery',
    'underscore',
    'baseview',
    'pubsub',
    'utils',
    'state',
    'modules/global/livevideo',
    'easing',
    'animatecolors'
],
function($, _, BaseView, PubSub, Utils, StateManager, LiveVideo) {
    'use strict';

    var BreakingNews = BaseView.extend({

        events: {
            'click #breaking a': 'onClickBreakingBtn',
            'click #breaking .close-btn': 'onClickCloseBreakingBtn'
        },

        breakingColors: {
            breaking: {
                normal: 'rgb(247,0,0)',
                highlight: 'rgb(191,49,49)'
            },
            live: {
                normal: 'rgb(0,170,255)',
                highlight: 'rgb(0,145,218)'
            },
            developing: {
                normal: 'rgb(0,170,255)',
                highlight: 'rgb(0,145,218)'
            }
        },
        breakingBarHeight: 0,

        initialize: function(options) {

            options = $.extend({
                slideSpeed: 200,
                onBreakingNewsChange: null
            }, options);

            _.bindAll(this, 'updateBreakingBar', 'parseBreakingNews');

            // Breaking News Bar
            // Set breaking bar's initial lastUpdate to the lastUpdate of when the bar was manually closed
            this.lastUpdate = localStorage.getItem('breakingLastUpdateClosed');
            // Delay initial checking for breaking news
            this.initBreakingBar = setTimeout(this.updateBreakingBar, 1000);
            // Breaking news poll.
            this.breakingBarPoll = setInterval(this.updateBreakingBar, 91000);

            BaseView.prototype.initialize.call(this, options);
        },

        destroy: function() {
            clearTimeout(this.initBreakingBar);
            clearInterval(this.breakingBarPoll);
            BaseView.prototype.destroy.apply(this, arguments);
        },

        getHeight: function() {
            return this.breakingBarHeight;
        },

        /**
         * Click handler for close button in breaking news bar.
         * @param {Event} e Click event object.
         */
        onClickCloseBreakingBtn: function(e) {
            this.closeBreakingBar(true);
            PubSub.trigger('uotrack', 'breakingnewsbarexit');
        },

        /**
         * Breaking news click handler.
         * @param {Event} e Hover event.
         */
        onClickBreakingBtn: function(e) {
            var href = $(e.currentTarget).attr('href');
            if (href.indexOf('livevideoassetid') > 0) {
                var live = new LiveVideo();
                live.loadLiveVideo(href.split('#')[1].split('=')[1]);
                e.preventDefault();
            }
        },

        /**
         * Close breaking news bar.
         * @param {Boolean} [clickClose] True if closing from from click, not automatically during poll.
         */
        closeBreakingBar: function(clickClose) {
            if (!this.breakingBarHeight) {
                return;
            }
            if (clickClose) {
                localStorage.setItem('breakingLastUpdateClosed', this.lastUpdate);
            }
            this.breakingBarHeight = 0;
            if (this.options.onBreakingNewsChange) {
                this.options.onBreakingNewsChange(false);
            }
            this.animate(this.$el, 'height', 0, this.options.slideSpeed)
                .done(_.bind(function() {
                    this.$el.css('background-color', '');
                    this.$el.hide();
                    PubSub.trigger('breakingbar:after:close');
                }, this));
        },

        /**
         * Open breaking news bar.
         */
        openBreakingBar: function() {
            this.$el.show();
            var newBreakingBarHeight = this.$('#breaking').outerHeight();
            if (newBreakingBarHeight != this.breakingBarHeight) {
                this.breakingBarHeight = newBreakingBarHeight;
                if (this.options.onBreakingNewsChange) {
                    this.options.onBreakingNewsChange(true);
                }
                this.animate(this.$el, 'height', this.breakingBarHeight, this.options.slideSpeed).done(this.onCompleteOpenBreakingBar);
            }
        },

        /**
         * Update breaking bar after opening it.
         */
        onCompleteOpenBreakingBar: function() {
            PubSub.trigger('breakingbar:after:open');
        },

        /**
         * Update breaking news bar.
         */
        updateBreakingBar: function() {
            if (this.busyCheckingBreakingNews) return;
            this.busyCheckingBreakingNews = true;
            StateManager.fetchHtml('/services/breaking-news/nav-bar/')
                .done(this.parseBreakingNews);
        },

        /**
         * Parse breaking news response and append/show/hide.
         * @param {jQuery} breakingHtml HTML response text from XHR.
         */
        parseBreakingNews: function(breakingHtml) {
            var breaking = breakingHtml.find('#breaking');
            if (!breaking.length) {
                return;
            }
            try {
                var breakingType = breaking.data('type'),
                    lastBreakingUpdate = breaking.data('lastUpdate');

                // do we need to update the breaking bar?
                if (this.lastUpdate != lastBreakingUpdate) {
                    // replace contents with new
                    this.$el.html(breaking).stop();
                    this.lastUpdate = lastBreakingUpdate;

                    var breakingAlreadyOpen = (this.breakingBarHeight > 0);

                    // make sure breaking bar is visible
                    this.openBreakingBar();

                    if (breakingAlreadyOpen) {
                        // breaking bar already open, so flash to highlight change
                        var highlightColor = this.breakingColors[breakingType].highlight;
                        var normalColor = this.breakingColors[breakingType].normal;
                        this.$('#breaking')
                            .animate({'backgroundColor': highlightColor})
                            .animate({'backgroundColor': normalColor});
                    }
                }

            } catch (e) {
                // if there's a problem get rid of the breaking bar
                this.closeBreakingBar();
            } finally {
                // no matter what, we're done updating the breaking news bar
                this.busyCheckingBreakingNews = false;
            }
        }
    });
    return BreakingNews;
});
