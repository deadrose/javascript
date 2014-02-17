/**
 * @fileoverview Share Tools view.
 * @author Jonathan Hensley <jhensley@gannett.com>
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'pubsub',
    'utils',
    'modules/stories/utility-bar-flyout',
    'modules/scroller/vertical-scroll',
    'third-party-apis/facebook/facebook'
],
function(
    $,
    _,
    Backbone,
    PubSub,
    Utils,
    UtilityBarFlyout,
    VerticalScroll,
    Facebook
) {


    /**
     * View class.
     */
    var UtilityBarModuleComment = UtilityBarFlyout.extend({

        /**
         * Initialize view.
         */
        initialize: function(options) {
            this.pubSub = {
                'breakingbar:after:open': this.scalePanel
            };
            options = $.extend({
                noFlyoutScroll: true
            }, options);
            this.events = _.extend({},UtilityBarFlyout.prototype.events,this.events);
            UtilityBarFlyout.prototype.initialize.call(this, options);
        },

        /**
         * Listen for new comment to update count.
         */
        attachCommentListener: function() {

            Facebook.getLoginStatus().done(_.bind(function() {
                Facebook.subscribeEvent('comment.create',
                    _.bind(function() {
                        PubSub.trigger('comment:created');
                    }, this)
                );
                Facebook.subscribeEvent('comment.remove',
                    _.bind(function() {
                        PubSub.trigger('comment:removed');
                    }, this)
                );
            }, this));

        },

        /**
         * Stop listening for new comments.
         */
        unattachCommentListener: function() {
            Facebook.getLoginStatus().done(function() {
                Facebook.unsubscribeEvent('comment.create');
                Facebook.unsubscribeEvent('comment.remove');
            });
        },

        /**
         * Load Facebook Comments social plugin.
         */
        loadComments: function() {
            Facebook.parse(this.$scrollable[0]);
            this.scrollableHeight = this.$scrollable.height();
            this.heightPoll = setInterval(_.bind(function(){
                if (this.scrollableHeight !== this.$scrollable.height()) {
                    this.scrollableHeight = this.$scrollable.height();
                    this.scalePanel();
                }
            }, this), 200);

            // We need to use native scrolling for FF/IE/iOS because the iframes capture the
            // mousewheel/touch events so we can't actually scroll properly
            var nativeScrolling = false;
            if (navigator.userAgent.indexOf('Chrome') === -1) {
                nativeScrolling = true;
            } else if (Modernizr.touch) {
                this.$scrollWrap.css({'-webkit-overflow-scrolling': 'touch'});
                if (this.$scrollWrap.css('-webkit-overflow-scrolling') === 'touch') {
                    nativeScrolling = true;
                }
            }
            if (nativeScrolling) {
                this.$scrollWrap.css('overflow', 'auto');
            } else {
                // Initialize the Vertical Scroll
                this.subviews.vscroll = new VerticalScroll({
                    el: this.$scrollWrap,
                    draggerPaddingTop: 0,
                    color: 'lighter'
                });
            }
        },

        onWindowResize: function() {
            this.scalePanel();
            UtilityBarFlyout.prototype.onWindowResize.call(this);
        } ,

        /**
         * Sets up the proper height of the panel.
         */
        scalePanel: function() {
            this.$scrollWrap.css('height', this.$win.height() - Utils.get('headerHeight') - 115);
            if (this.subviews.vscroll) this.subviews.vscroll.refresh();
        },

        open: function() {
            this.$scrollWrap = this.$('.util-bar-scroll-wrap');
            this.$scrollable = this.$('.scrollable-content');
            this.$fbPluginWrap = this.$('.facebook-comments-plugin-wrap');
            this.$win = Utils.get('win');

            this.loadComments();
            this.attachCommentListener();
            PubSub.trigger('uotrack', 'UtilityBarCommentsOpen');
            UtilityBarFlyout.prototype.open.call(this);
        },

        close: function() {
            PubSub.trigger('uotrack', 'UtilityBarCommentsClose');
            this.destroy();
        },

        /**
         * Clean up view.
         * Removes event handlers and element (optionally).
         * @param {boolean} removeEl option to also remove View from DOM.
         */
        destroy: function(removeEl) {
            clearInterval(this.heightPoll);
            this.unattachCommentListener();
            UtilityBarFlyout.prototype.destroy.call(this, removeEl);
        }
    });

    /**
     * Return view class.
     */
    return UtilityBarModuleComment;
});
