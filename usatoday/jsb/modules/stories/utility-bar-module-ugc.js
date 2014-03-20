/**
 * @fileoverview UGC Utility bar flyout.
 * @author Mark Kennedy <mdkennedy@gannett.com>
 */
define([
    'jquery',
    'underscore',
    'state',
    'modules/stories/utility-bar-flyout',
    'modules/ugc/ugc-user',
    'modules/ugc/upload/utility-bar-upload-view',
    'pubsub',
    'modules/ugc/report-abuse'
],
function(
    $,
    _,
    StateManager,
    UtilityBarFlyout,
    UGCUser,
    UGCUtilityBarUploadView,
    PubSub,
    ReportAbuse
) {
    'use strict';

    /**
     * View class.
     */
    var UtilityBarModuleUGC = UtilityBarFlyout.extend({

        /**
         * Initialize view.
         * @param {Object} options Share modules init options.
         */
        initialize: function(options) {

            this.$footer = this.$('.ugc-util-bar-flyout-footer');
            this.$shortDisclaimer = this.$('.ugc-util-bar-flyout-disclaimer-short');
            this.$longDisclaimer = this.$('.ugc-util-bar-flyout-disclaimer-long');

            this.events = _.extend({}, UtilityBarFlyout.prototype.events, this.events);
            UtilityBarFlyout.prototype.initialize.call(this, options);

            this.$recentPosts = this.$('.ugc-util-bar-flyout-recent-post-item');

            this.setup();

        },

        setup: function() {
            this.$footer.hide();
            if (!this.subviews.uploadView) {
                this.subviews.uploadView = new UGCUtilityBarUploadView({
                    onRefresh: this.onWindowResize
                });
            }
            this._handleDisclaimer();
            this.setupReportAbuse();
            this.$footer.fadeIn();

        },

        /**
         * Sets up recent posts.
         */
        _handleDisclaimer: function(){
            if (this.$recentPosts.length) {
                this.$shortDisclaimer.hide();
                this.$longDisclaimer.show();
            } else {
                this.$longDisclaimer.hide();
                this.$shortDisclaimer.show();
            }
        },

        /**
         * Sets up report abuse links clicks.
         */
        setupReportAbuse: function() {
            this.subviews.reportAbuse = new ReportAbuse({
                el: this.$el,
                tooltipOptions: {
                    customPanelClass: 'ugc-util-bar-flyout-recent-post-item-report-abuse-tooltip-panel',
                    customTextClass: 'ugc-util-bar-flyout-recent-post-item-report-abuse-tooltip-text'
                }
            });
        }

    });

    /**
     * Return view class.
     */
    return UtilityBarModuleUGC;
});
