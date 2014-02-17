/**
 * @fileoverview Live feed
 * @author plinders@gannett.com (Pim Linders)
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'pubsub'
],
function(
    $,
    _,
    BaseView,
    StateManager,
    PubSub
){
        'use strict';
        /**
         * View class.
         */
        var PopularSocial = BaseView.extend({

            /**
             * Initialize view.
             */
            initialize: function(options) {
                _.bindAll(this,
                    'initMarkup'
                );
                this.options = options;
                // set variables
                this.setElement(this.options.el);
            },

            renderCardInfo: function(currentCardInfo) {
                this.currentCardInfo = currentCardInfo;
                if (currentCardInfo.sidebarOpen){
                    this.setupPos();
                }
            },

            openSideBar: function() {
                if (this.currentCardInfo) {
                    this.setupPos();
                }
            },

            setupPos: function() {
                if (!this.$el.children().length) {
                    StateManager.fetchHtml('/feeds/popular-social/').done(this.initMarkup);
                }
            },

            /**
             * Handler initial data loaded only.
             * @param {Object} markup list of li's that will be added to the ul.
             */
            initMarkup: function(markup) {
                // remove loader
                this.$el.removeClass('popular-social-loading');
                // add markup
                this.$el.append($(markup));
                // call on update
                if (StateManager.getActiveApp().refreshSidebarScroll) {
                    StateManager.getActiveApp().refreshSidebarScroll();
                }
            },

            destroy: function(removeEl) {
                if (removeEl){
                    this.$el.empty();
                }
                // call base class initialize
                BaseView.prototype.destroy.apply(this, arguments);
            }

        });

        /**
         * Return view class.
         */
        return PopularSocial;
    }
);
