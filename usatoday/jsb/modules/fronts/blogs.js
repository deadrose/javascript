/**
 * @fileoverview Blogs module view.
 * @author Chad Shryock <cdshryock@gannett.com>
 */
define(['jquery', 'underscore', 'backbone', 'baseview', 'pubsub'],
    function($, _, Backbone, BaseView, PubSub) {


        /**
         * View class.
         */
        var BlogsView = BaseView.extend({

            // Events.
            events: {
                'click .scroller' : 'scroll'
            },

            /**
             * Initialize view.
             * @param {Object} options View options passed in during init.
             */
            initialize: function(options) {
                this.$moveMe = this.$('.stage ul');
                this.totalItems = $('li', this.$moveMe).length;
                this.$scrollerLeft = this.$('.scroller.left');
                this.$scrollerRight = this.$('.scroller.right');

                // call base class initialize
                BaseView.prototype.initialize.call(this, options);
            },

            scroll: function(event) {
                if (event) event.preventDefault();

                // pressed scroller
                var $scroller = $(event.target);

                // ignore if disabled
                if ($scroller.hasClass('disabled')) {
                    return false;
                }

                // get the vars to do the math
                var isScrollRight = $scroller.hasClass('right');
                var currentItemOffset = this.$moveMe.data("item-offset");
                var byNoItems = 4;
                if (Modernizr.mq("screen and (min-width: 1250px)")) {
                    byNoItems = 6;
                } else if (Modernizr.mq("screen and (min-width: 1150px)")) {
                    byNoItems = 5;
                }

                // Item Offset Count
                if (isScrollRight) {
                    byNoItems = byNoItems * -1;
                }
                var newItemOffset = byNoItems + currentItemOffset;
                if (newItemOffset > 0) {
                    newItemOffset = 0;
                }

                // Item Offset Pixels
                var currentPixelOffset = (currentItemOffset * 183) - 1;
                var changePixelOffset = byNoItems * 183;
                var newPixelOffset = changePixelOffset + currentPixelOffset;
                newPixelOffset = (newItemOffset * 183) - 1;

                // Scroller Left enable/disable
                if (newItemOffset === 0) {
                    this.$scrollerLeft.addClass('disabled');
                } else {
                    this.$scrollerLeft.removeClass('disabled');
                }

                var totalNewDistance = Math.abs(newItemOffset) + Math.abs(byNoItems);
                // Scroller Right enable/disable
                if (totalNewDistance >= this.totalItems) {
                    this.$scrollerRight.addClass('disabled');

                    //only move enough to get the last ones in view
                    byNoItems += (totalNewDistance - this.totalItems);
                    newItemOffset = byNoItems + currentItemOffset;
                    changePixelOffset = byNoItems * 183;
                    newPixelOffset = changePixelOffset + currentPixelOffset;
                    newPixelOffset = (newItemOffset * 183) - 1;

                } else {
                    this.$scrollerRight.removeClass('disabled');
                }

                this.$moveMe.data("item-offset", newItemOffset);

                // Do the move.
                this.animate(this.$moveMe, 'left', newPixelOffset + 'px', 200, 'ease-in');
            }

        });

        /**
         * Return view class.
         */
        return BlogsView;
    }
);
