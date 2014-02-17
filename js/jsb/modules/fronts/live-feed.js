/**
 * @fileoverview Live feed
 * @author plinders@gannett.com (Pim Linders)
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'utils'
],
function(
    $,
    _,
    BaseView,
    StateManager,
    Utils
)
    {
        'use strict';
        /**
         * View class.
         */
        var LiveFeed = BaseView.extend({


            /**
             * Initialize view.
             */
            initialize: function(options) {
                _.bindAll(this,
                    'initMarkup',
                    'updateMarkup',
                    'fetchUpdate',
                    'hideBrokenHasImage'
                );
                var section = this.$el.attr('data-livefeed') || Utils.getSectionPath(window.location.pathname),
                    site_id = this.$el.attr('data-livefeed-site-id'),
                    site_prefix = this.$el.attr('data-livefeed-site-prefix');

                options = $.extend({
                    maxItems: 60,
                    itemFetchLimit: 40,
                    removeNewHighlight: 20, // seconds
                    updateDelay: 30, // seconds
                    dataSrcAttr: 'data-src',
                    autoUpdate: true,
                    site_id: site_id,
                    site_prefix: site_prefix,
                    section: section,
                    afterFetchResults: null,
                    ajaxOptions: null
                }, options);

                var defaultAjaxData = {
                    count: options.itemFetchLimit
                };

                // Pass an override site_id when defined
                if (typeof site_id != 'undefined') {
                    if (site_id !== '') defaultAjaxData.site_id = options.site_id;
                }

                // Pass an override site_prefix when defined
                if (typeof site_prefix != 'undefined') {
                    if (site_prefix !== '') defaultAjaxData.site_prefix = options.site_prefix;
                }

                var defaultAjaxOptions = {
                    url: '/feeds/live/' + section + '/',
                    data: defaultAjaxData
                };
                this.requestOptions = $.extend(true, defaultAjaxOptions, options.ajaxOptions);

                BaseView.prototype.initialize.call(this, options);
            },

            onCardWidthChange: function(currentCardInfo){
                this.currentCardInfo = currentCardInfo;
                this.setLiveFeedWidth(currentCardInfo);
            },

            /**
             * Used to change/set the live feed width, sets the this.options.dataSrcAttr option
             * and the live-feed-width class on the ul
             * @param {{name: String}} currentCardInfo card width info object with a name we can key off of
             */
            setLiveFeedWidth: function(currentCardInfo) {
                var dataSrcAttr = 'data-src',
                    cardWidth = 'small';
                if(currentCardInfo){
                    cardWidth = currentCardInfo.name;
                }
                this.$el.removeClass('live-feed-wide');
                if (cardWidth === 'large') {
                    dataSrcAttr = 'data-src-large';
                    this.$el.addClass('live-feed-wide');
                } else {
                    this.$el.removeClass('live-feed-wide');
                }
                this.options.dataSrcAttr = dataSrcAttr;
            },

            openSideBar: function() {
                if (this.currentCardInfo) {
                    this.setupLiveFeed();
                }
            },

            closeSideBar: function() {
                this.stopUpdateCheck();
            },

            renderCardInfo: function(currentCardInfo) {
                this.currentCardInfo = currentCardInfo;
                if (currentCardInfo.sidebarOpen){
                    this.setupLiveFeed();
                }
            },

            setupLiveFeed: function() {
                // set live feed width
                this.setLiveFeedWidth(this.currentCardInfo);
                // content is present, occurs after a siderbar has been opened
                if (this.$el.children('li').length) {
                    // remove the new content class that might not be removed, cleanup just in case
                    this.$el.children('.newcontent').removeClass('newcontent');
                    this.fetchUpdate();
                } else {
                    StateManager.fetchHtml(null, this.requestOptions).done(_.bind(function(response){
                        this.initMarkup(response);
                        this.afterFetchResultsSuccess(response);
                    }, this));
                }
            },

            /**
             * After the results have been fetched.
             * @param {Object|String} response The response
             */
            afterFetchResultsSuccess: function(response) {
                if (this.options.afterFetchResults) {
                    this.options.afterFetchResults(response);
                }
            },

            /**
             * Handler initial data loaded only.
             * @param {Object} markup list of li's that will be added to the ul.
             */
            initMarkup: function(markup) {
                // remove loader
                this.$el.removeClass('livefeed-loading');
                this.$el.append(markup);
                // add markup
                this.loadLazyImages(markup.find('img'));
                this.refreshSidebar();
                // start update loop
                if (this.options.autoUpdate) {
                    this.startUpdateCheck();
                }

            },

            loadLazyImages: function(images) {
                images = images || this.$('img');
                Utils.lazyLoadImage(images, this.options.dataSrcAttr, true, this.hideBrokenHasImage);
            },

            refreshSidebar: function(){
                if (StateManager.getActiveApp().refreshSidebarScroll) {
                    StateManager.getActiveApp().refreshSidebarScroll();
                }
            },

            /**
             * Broken image error function
             * finds and removes closest has-image class to switch layout to none image styles
             */
            hideBrokenHasImage: function(img) {
                img.closest('.has-image').removeClass('has-image');
                this.refreshSidebar();
            },

            /**
             * Checks for updated data for specified section.
             */
            fetchUpdate: function() {
                this.requestOptions.data.date = this.$('li:first').attr('data-timestamp');
                StateManager.fetchHtml(null, this.requestOptions).done(_.bind(function(response){
                    this.updateMarkup(response);
                    this.afterFetchResultsSuccess(response);
                }, this));
            },

            /**
             * Handler for when additional data is loaded.
             * Prepends new items to the live feed list.
             * @param {Object} newMarkup markup from ajax request.
             */
            updateMarkup: function(newMarkup) {
                if (!newMarkup || newMarkup.length === 0) {
                    return;
                }
                var $li = this.$('li'),
                    contentIdMap = {},
                    $this;
                // take off the current top class, new content will get the top class
                $li.removeClass('top');
                newMarkup.each(function() {
                    contentIdMap[$(this).attr('data-content-id')] = true;
                });
                // If a duplicate is in the new markup, remove the existing one from the DOM.
                $li.each(function() {
                    $this = $(this);
                    if (contentIdMap[$this.attr('data-content-id')]) {
                        $this.remove();
                    }
                });
                // Prepend all new items.
                newMarkup.eq(0).addClass('top').append('<div class="shadow"></div>');
                this.$el.prepend(newMarkup);
                // Show updates to new content, etc.
                newMarkup.addClass('newcontent');
                this.loadLazyImages(newMarkup.find('img'));
                $li = this.$el.children('li');
                // If there are over 60 items remove oldest.
                if ($li.length > 60) {
                    $li.slice(60).remove();
                }
                this.afterNewContent = setTimeout(_.bind(function() {
                    newMarkup.removeClass('newcontent');
                }, this), this.options.removeNewHighlight * 1000);

                this.refreshSidebar();
            },

            /**
             * Starts the update check.
             */
            startUpdateCheck: function() {
                clearInterval(this.interval);
                this.interval = setInterval(this.fetchUpdate, this.options.updateDelay * 1000);
            },

            /**
             * Stops the update check.
             */
            stopUpdateCheck: function() {
                clearInterval(this.interval);
            },

            /**
             * Clean up the view (no argument).
             */
            destroy: function(removeEl) {
                if (removeEl){
                    this.$el.empty();
                }
                this.stopUpdateCheck();
                clearTimeout(this.afterNewContent);
                // call base class initialize
                BaseView.prototype.destroy.apply(this, arguments);
            }

        });


        /**
         * Return view class.
         */
        return LiveFeed;
    }
);
