/**
 * @fileoverview Expandable photo module view.
 * @author Jonathan Hensley
 */
define([
    'jquery',
    'underscore',
    'baseview'
],
function(
    $,
    _,
    BaseView
) {
        /**
         * View class.
         */
        var ExpandablePhotoView = BaseView.extend({

            events: {
                'click .expandable-collapsed': 'expandPhoto',
                'click .expandable-open': 'collapsePhoto'
            },

            sized: false,

            /**
             * Expand the lead photo
             * Param {object} e is the object cliked
             */
            expandPhoto: function(e) {
                var $expandable = this.$('.single-photo'),
                    $caption = this.$('.image-credit-wrap');

                if (!this.sized) {
                    var next = this.$el.next();
                    if (next.length) {
                        next.css('padding-top', this.$el.outerHeight() + 20);
                    } else {
                        this.$el.parent().height(this.$el.outerHeight());
                    }
                    this.$el.css('position', 'absolute');
                    this.sized = true;
                }
                $caption.hide();

                $expandable.animate({
                    'width' : '540px'
                }, 350, function(){
                    $caption.fadeIn(250);
                });

                $expandable.removeClass('expandable-collapsed').addClass('expandable-open');
            },

            /**
             * collapse the lead photo
             * Param {object} e is the object cliked
             */
            collapsePhoto: function(e) {
                var $expandable = this.$('.single-photo'),
                    $caption = this.$('.image-credit-wrap');

                $caption.hide();
                $expandable.removeClass('expandable-open');

                $expandable.animate({
                    'width' : '180px'
                }, 350, _.bind(function(){
                    $caption.fadeIn();
                }, this));
                $expandable.removeClass('expandable-open').addClass('expandable-collapsed');
            }
        });

        /**
         * Return view class.
         */
        return ExpandablePhotoView;
    }
);
