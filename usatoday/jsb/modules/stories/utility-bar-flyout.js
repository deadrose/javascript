/**
 * @fileoverview Utility bar flyout.
 * @author Erik Kallevig <ekallevig@gannett.com>
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'baseview',
    'pubsub',
    'utils',
    'site-manager',
    'modules/scroller/vertical-scroll'
],
function(
    $,
    _,
    Backbone,
    BaseView,
    PubSub,
    Utils,
    SiteManager,
    VerticalScroll
) {


    /**
     * View class.
     */
    var UtilityBarFlyout = BaseView.extend({

        // Events.
        events: {
            'click .util-bar-flyout-close-ribbon': 'close',
            'click': 'onClickFlyout'
        },

        /**
         * Initialize view.
         */
        initialize: function(options) {
            _.bindAll(this, 'onBodyClick', 'onWindowResize');
            this.$body = Utils.get('body');
            this.$win = Utils.get('win');
            this.$flyout = this.$('.util-bar-flyout');
            this.pubSub = this.pubSub || {};
            this.pubSub['breakingbar:after:open'] = this.onWindowResize;
            BaseView.prototype.initialize.call(this, options);
        },

        onWindowResize: function() {
            var availableVerticalSpace = this.getAvailableVerticalSpace();
            this.updateFlyoutHeight(availableVerticalSpace);
            if (!this.options.noFlyoutScroll) {
                this.updateFlyoutScroller();
            }
        },

        getAvailableVerticalSpace: function() {
            var header = SiteManager.getHeader(),
                headerHeight = 0;
            if (header) {
                headerHeight = header.getCollapsedHeight();
            }
            return this.$win.height() - headerHeight;
        },

        getContentHeight: function() {
            return this.$scrollableContent.outerHeight();
        },

        updateFlyoutHeight: function(height) {
            this.$flyout.css('height', height);
        },

        /**
         * Sets up the proper height of the panel.
         */
        updateFlyoutScroller: function() {
            if (this.subviews.vscroll) {
                this.subviews.vscroll.refresh();
            } else {
                // Initialize the Vertical Scroll
                this.subviews.vscroll = new VerticalScroll({
                    el: this.$flyout
                });
            }
        },

        open: function(sectionName) {
            this.$scrollableContent = this.$('.scrollable-content').eq(0);
            this.$('.util-bar-btn').removeClass('active');
            this.$btn = sectionName ? this.$('.util-bar-btn-' + sectionName) : this.$('.util-bar-btn');
            this.$btn.addClass('active');
            this.$body.on('click.' + this.cid, this.onBodyClick);

            // Must manually attach this click handler because recaptcha
            // widget has awful innerHtml replacement, which destroys reference
            // to target's parents during bubble. Manual click attachment avoids
            // 'delegate' search when bubbling, so click still gets triggered.
            // this.$flyout.on('click.' + this.cid, this.onClickFlyout);
            this.$win.on('resize.' + this.cid, _.throttle(this.onWindowResize, 50));
            this.$flyout
                .css({
                    'left': 40,
                    'visibility': 'visible'
                })
                .addClass('open');
            if (sectionName) {
                if (sectionName == 'share') {
                    this.showSection('facebook');
                } else {
                    this.showSection(sectionName);
                }
            }
            this.onWindowResize();

            if (sectionName) {
                PubSub.trigger('uotrack', 'utilitybar' + sectionName + 'open');
            }
        },

        close: function(e) {
            this.destroy();
        },

        onBodyClick: function(e) {
            var $target = $(e.target);
            var href = $target.attr('href');
            var noClose = $target.hasClass('util-bar-noclose');
            if (noClose) {
                return;
            }
            if (!e.isDefaultPrevented() || Utils.getDefinedRoute(href)) {
                this.close();
            }
        },

        /**
         * Stop click propagation inside the flyout (to avoid closing it)
         * unless it's a valid internal link or target for a new window.
         */
        onClickFlyout: function(e) {
            var $target = $(e.target);
            var noClose = $target.hasClass('util-bar-noclose');
            var $parentLink = $target.closest('a');
            if (noClose) {
                return;
            } else if (!$parentLink.attr('href')) {
                e.preventDefault();
            }
        },

        /**
         * Clean up view.
         * Removes event handlers and element (optionally).
         * @param {boolean} removeEl option to also remove View from DOM.
         */
        destroy: function(removeEl) {
            this.$body.off('.' + this.cid);
            // this.$flyout.off('click.' + this.cid);
            this.$win.off('.' + this.cid);
            if (this.$btn) {
                this.$btn.removeClass('active');
            }
            this.$flyout
                .css({
                    'left': '-1000px',
                    'visibility': 'hidden'
                })
                .removeClass('open');
            BaseView.prototype.destroy.call(this, removeEl);
            if (this.options.onDestroy) this.options.onDestroy(this);
        }
    });

    /**
     * Return view class.
     */
    return UtilityBarFlyout;
});
