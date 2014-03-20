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
        var UIToolTip = BaseView.extend(
        /**
         * @lends ui/tooltip.prototype
         */
        {
             /**
             * This callback is called when the tooltip is shown
             * @callback ui/tooltip~onShow
             */
            /**
             * This callback is called when the tooltip is hidden
             * @callback ui/tooltip~onHide
             */

            /**
             * @classdesc UI Tooltip modules.
             * @author Mark Kennedy <mdkennedy@gannett.com>
             * @constructs ui/tooltip
             * @param {Object} options backbone options object
             *     @param {jQuery|Element|String} options.el - element or string selector to attach to
             *     @param {String} options.text - string to use as text for the tooltip
             *     @param {String} [options.customPanelClass] - class to be applied to the tooltip panel
             *     @param {String} [options.showEvent=mouseenter] - the name of the event type that should trigger showing the tooltip panel
             *     @param {String} [options.hideEvent=mouseenter] - the name of the event type that should trigger hiding the tooltip panel
             *     @param {ui/tooltip~onShow} options.onShow - callback when tooltip is shown
             *     @param {ui/tooltip~onHide} options.onHide - callback when tooltip is hidden
             *     @param {String} [options.position=right] - the position of where the tooltip should be shown in relation to the trigger element
             */
            initialize: function(options) {

                options = $.extend({
                    text: this.$el.data('tooltip-text'),
                    customPanelClass: '',
                    showEvent: 'mouseenter',
                    hideEvent: 'mouseleave',
                    onShow: null,
                    onHide: null,
                    position: 'right'
                }, options);
                BaseView.prototype.initialize.call(this, options);

                this.tooltipText = this.options.text;
                this.$tooltipPanel = this._buildHtml(this.$el);

                this.$tooltipPanel.addClass('ui-tooltip-panel-' + this.options.position);
                _.bindAll(this, 'show', 'hide');

                this._addTriggerEvent(this.options.showEvent, this.show);
                this._addTriggerEvent(this.options.hideEvent, this.hide);
            },

            /**
             * Registers events to the $el
             * @param {String} eventName event to bind to
             * @param {Function} method function to call
             * @private
             */
            _addTriggerEvent: function(eventName, method) {
                if (eventName) {
                    this.$el.on(eventName + '.' + this.cid, method);
                }
            },

            /**
             * Builds the html for the tooltip.
             * @private
             */
            _buildHtml: function($el) {
                var $container = $('<div class="ui-tooltip">');
                $el.wrap($container);
                var $panel = $('<div class="ui-tooltip-panel ' + this.options.customPanelClass + '">' + this.tooltipText + '</div>');
                $panel.insertAfter($el);
                return $panel;
            },

            /**
             * Shows the tooltip.
             */
            show: function() {
                this.$tooltipPanel.css(this._getPositionCss(this.options.position));
                this.$tooltipPanel.stop().fadeIn(400);
                if (this.options.onShow) {
                    this.options.onShow();
                }
            },

            /**
             * Hides the tooltip.
             */
            hide: function() {
                this.$tooltipPanel.stop().fadeOut(400);
                if (this.options.onHide) {
                    this.options.onHide();
                }
            },

            /**
             * Returns the css positioning given the position name
             * @returns {Object}
             * @private
             */
            _getPositionCss: function(position) {
                var offset = 10,
                    tooltipPanelHeight = this.$tooltipPanel.outerHeight(),
                    tooltipPanelWidth = this.$tooltipPanel.outerWidth(),
                    triggerElWidth = this.$el.outerWidth(),
                    triggerElHeight = this.$el.outerHeight();
                if (position === 'right') {
                    // to position the tooltop on the right, we use top and left css properties
                    return {
                        top: -(tooltipPanelHeight / 2) + (triggerElHeight / 2),
                        left: triggerElWidth + offset
                    };
                } else if (position === 'left') {
                    return {
                        top: -(tooltipPanelHeight / 2) + (triggerElHeight / 2),
                        right: triggerElWidth + offset
                    };
                } else if (position === 'top') {
                    // to position the tooltop on the top, we use bottom and left css properties
                    return {
                        bottom: triggerElHeight + offset,
                        left: -(tooltipPanelWidth / 2) + (triggerElWidth / 2)
                    };
                } else if (position === 'bottom') {
                    // to position the tooltop on the bottom, we use top and right css properties
                    return {
                        top: triggerElHeight + offset,
                        right: -(tooltipPanelWidth / 2) + (triggerElWidth / 2)
                    };
                } else {
                    // unknown position?
                    return {};
                }
            },

            /**
             * Gets the text of the tooltip.
             * @returns {String}
             */
            getText: function() {
                return this.tooltipText;
            },

            /**
             * Sets the text of the tooltip.
             * @param {String} value
             */
            setText: function(value) {
                this.$tooltipPanel.text(value);
                this.tooltipText = value;
            },

            /**
             * Destroys the tooltip.
             * @param {Boolean} removeEl
             */
            destroy: function(removeEl) {
                // remove events
                this.$el.off('.' + this.cid);
                // revert to original html markup
                this.$el.unwrap();
                this.$tooltipPanel.remove();
                BaseView.prototype.destroy.call(this, removeEl);
            }

        });

        /**
         * Return view class.
         */
        return UIToolTip;
    }
);