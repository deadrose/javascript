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
        "use strict";
        var UIButtonToggle = BaseView.extend(
        /**
         * @lends ui/button-toggle.prototype
         */
        {
            /**
             * This callback is called on select of a dropdown item
             * @callback ui/button-toggle~onSelect
             * @param {jQuery} selectedItem - the jQuery element of the selected item
             */
            /**
             * @classdesc UI Button Toggler modules.
             * @author Mark Kennedy <mdkennedy@gannett.com>
             * @constructs ui/button-toggle
             * @param {Object} options backbone options object
             *     @param {jQuery|Element|String} options.el - element or string selector to attach to
             *     @param {ui/button-toggle~onSelect} options.onSelect - callback when button is selected
             */
            initialize: function(options) {
                options = $.extend({
                    onSelect: null
                }, options);
                BaseView.prototype.initialize.call(this, options);

                this.toggleItems = this.$el.find('.ui-button-toggle-item');
                this.toggleItems.on('click.' + this.cid, _.bind(function(e){
                    this.onClick($(e.currentTarget));
                }, this));
            },

            /**
             * When a toggle item is clicked
             * @param {jQuery} clickedItem
             */
            onClick: function(clickedItem) {
                if (!clickedItem.hasClass('active')){
                    this.toggleItems.removeClass('active');
                    clickedItem.addClass('active');
                    if (this.options.onSelect) {
                        this.options.onSelect(clickedItem);
                    }
                }
            },

            destroy: function(removeEl) {
                this.toggleItems.off('.' + this.cid);
                BaseView.prototype.destroy.call(this, removeEl);
            }

        });

        /**
         * Return view class.
         */
        return UIButtonToggle;
    }
);