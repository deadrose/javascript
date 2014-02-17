/**
 * @fileoverview Global footer module view.
 * @author erik.kallevig@f-i.com (Erik Kallevig)
 * @author kris.hedstrom@f-i.com (Kris Hedstrom)
 */
define(['jquery', 'underscore', 'baseview', 'easing', 'pubsub', 'utils'],
    function($, _, BaseView, Easing, PubSub, Utils) {


        /**
         * View class.
         */
        var FooterView = BaseView.extend({

            // Events.
            events: {
                'click .site-index': 'toggle',
                'click .footer-more-trigger': 'showMore'
            },

            /**
             * Initialize class view.
             */
            initialize: function(options) {
                // Cache selectors.
                this.$scrollEl = Utils.get('scrollEl');
                this.$nav = this.$('nav');
                this.$toggle = this.$('.site-index');

                BaseView.prototype.initialize.call(this, options);
            },

            /**
             * Show more footer items when clicking 'more...'
             */
            showMore: function(e) {
                e.preventDefault();
                var moreLink = $(e.currentTarget);
                moreLink.hide().siblings('.footer-more-item').show();
            },

            /**
             * Show/hide toggle for footer.
             * @param {Event} e Browser event triggering toggle.
             */
            toggle: function(e) {
                if(e) {e.preventDefault();}
                var scrollTop = this.$el.offset().top - (Utils.get('headerHeight') || 0);
                this.$toggle.toggleClass('open');
                this.$scrollEl.animate(
                    {'scrollTop': scrollTop},
                    500,
                    'easeInOutCubic');
                this.$nav.slideToggle(500, 'easeInOutCubic');
            }
        });


        /**
         * Return view class.
         */
        return FooterView;
    }
);
