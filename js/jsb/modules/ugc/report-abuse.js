/**
 * @fileoverview A class that houses common functionality among all UGC views.
 * @author Mark Kennedy
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'ui/tooltip',
    'modules/ugc/ugc-user',
    'easing'
],
    function(
        $,
        _,
        BaseView,
        StateManager,
        Tooltip,
        UGCUser
        ) {
        "use strict";

        /**
         * Page class.
         */
        var ReportAbuse = BaseView.extend({

            events: {
                'click .ugc-media-item-report-abuse-link': 'onReportAbuseItemClick'
            },

            /**
             * Initialize page.
             * @param {Object} options Page options passed during init.
             */
            initialize: function(options) {

                options = $.extend({
                    tooltipOptions: null
                }, options);

                this.pubSub = {
                    'user:login': this.onUserLogin,
                    'user:logout': this.onUserLogout
                };

                BaseView.prototype.initialize.call(this, options);
                this.$reportAbuseLinks = this.$('.ugc-media-item-report-abuse-link');
                this.reportAbuseSubviewIndex = 0;
                this.subviewPrefix = 'reportAbuseItem';

                this.setupReportAbuseItems(this.$reportAbuseLinks);
            },

            /**
             * Sets up the report abuse links.
             * @param {Array} $items Array of jquery items
             */
            setupReportAbuseItems: function($items) {
                _.each($items, function(el){
                    this._setupTooltipView(this.getTooltipOptions(el));
                }, this);
            },

            /**
             * Gets the options for the report abuse tooltip.
             * @param el
             * @returns {Object} options
             */
            getTooltipOptions: function(el) {
                var options = $.extend({
                    el: el,
                    text: this.getReportAbuseText(),
                    position: 'left'
                }, this.options.tooltipOptions);

                var classPrefix = 'ugc-media-item-report-abuse',
                    customPanelClass = classPrefix + '-tooltip-panel',
                    customTextClass = classPrefix + '-tooltip-text';
                if (options.customPanelClass) {
                    options.customPanelClass = customPanelClass + ' ' + options.customPanelClass;
                }
                if (options.customTextClass) {
                    options.customTextClass = customTextClass + ' ' + options.customTextClass;
                }
                return options;
            },

            /**
             * Sets up the report abuse view.
             * @param {Object} options Custom options
             * @private
             */
            _setupTooltipView: function(options) {
                var subviewName = this.subviewPrefix + this.reportAbuseSubviewIndex;
                if (!this.subviews[subviewName]) {
                    this.subviews[subviewName] = new Tooltip(options);
                    this.reportAbuseSubviewIndex++;
                }
            },

            /**
             * Gets report abuse text to show to the user.
             */
            getReportAbuseText: function() {
                if (UGCUser.getLoginState() === 'loggedIn') {
                    return this.getLoggedInText();
                } else {
                    return this.getLoggedOutText();
                }
            },

            /**
             * Gets text to show when the user is logged out.
             */
            getLoggedOutText: function() {
                return 'Please sign in to report abuse';
            },

            /**
             * Gets text to show when the user is logged in.
             */
            getLoggedInText: function() {
                return 'Report abuse';
            },

            /**
             * When a report abuse link is clicked
             * @param {Event} e click event
             */
            onReportAbuseItemClick: function(e) {
                var $item = $(e.currentTarget),
                    idx = this.$reportAbuseLinks.index($item),
                    tooltipView = this.subviews[this.subviewPrefix + idx],
                    itemData = $item.data(),
                    isLoggedIn = UGCUser.getLoginState() === 'loggedIn';

                // bail out if report abuse has already been submitted for this item
                if ($item.hasClass('ugc-media-item-report-abuse-sent') || !isLoggedIn) {
                    return;
                }

                UGCUser.getUserInfo().done(_.bind(function(userInfo){
                    tooltipView.setText('Reporting...');
                    this.reportAbuse(userInfo.fmid, itemData.mediaId)
                        .done(_.bind(function(){
                            this.onReportAbuseSuccess(tooltipView, $item);
                        }, this))
                        .fail(_.bind(function(){
                            this.onReportAbuseFail(tooltipView, $item);
                        },this));
                }, this));
            },

            /**
             * When abuse is successfully reported.
             * @param {Object} tooltipView The subview of the report abuse item.
             * @param {jQuery} $item The report abuse el
             */
            onReportAbuseSuccess: function(tooltipView, $item) {
                $item.removeClass('ugc-media-item-report-abuse-failed');
                $item.addClass('ugc-media-item-report-abuse-sent');
                tooltipView.setText('Thanks for reporting abuse');
            },

            /**
             * When abuse reported fails.
             * @param {Object} tooltipView The subview of the report abuse item.
             * @param {jQuery} $item The report abuse el
             */
            onReportAbuseFail: function(tooltipView, $item) {
                $item.addClass('ugc-media-item-report-abuse-failed');
                tooltipView.setText('There was a problem reporting abuse.');
            },

            /**
             * Should be called when the DOM updates with new report abuse items.
             */
            update: function($items) {
                this.setupReportAbuseItems($items);
            },

            /**
             * When user logs in.
             */
            onUserLogin: function() {
                this.setTextForItems(this.getLoggedInText());
            },

            /**
             * When user logs out.
             */
            onUserLogout: function() {
                this.setTextForItems(this.getLoggedOutText());
            },

            /**
             * Sets the text for the tooltip panel for all report abuse items.
             * @param {String} text Text
             */
            setTextForItems: function(text) {
                _.each(this.subviews, function(subview){
                    subview.setText(text);
                },this);
            },

            /**
             * Reports abuse for a given user and their media item.
             * @param {String|Number} userId The user
             * @param {String|Number} mediaId The id of the media item to be reported
             * @returns {Deferred} Returns a promise that resolves when the abuse is reported
             */
            reportAbuse: function(userId, mediaId) {
                var options = {
                    method: 'POST',
                    data: {
                        fmuserid: userId,
                        mediaitemid: mediaId
                    }
                };
                return StateManager.fetchData('/yourtake/reportabuse/', options);
            }

        });

        /**
         * Return page class.
         */
        return ReportAbuse;
    });
