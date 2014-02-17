define([
    'jquery', 
    'underscore', 
    'modules/scroller/vertical-scroll'
],
function(
    $, 
    _, 
    VerticalScroll
)
    {
        var SidebarScroll = VerticalScroll.extend(
        /**
         * @lends modules/scroller/sidebar-scroll.prototype
         */
        {
            /**
             * @classdesc Extended Vertical Scrollbar that provides iOS like scrolling with fade in and fade out scrollers.
             * Also provides top and bottom shadows to give the illusion of depth. This functionality is turned off
             * for iOS devices where we fall back to default behavior
             * @author Jay Merrifield <jmerrifiel@gannett.com>
             * @constructs modules/scroller/sidebar-scroll
             * @extends modules/scroller/vertical-scroll
             * @param {Object} options backbone options object
             *     @param {jQuery|Element|String} options.el - element or string selector to attach to
             *     @param {Number} [options.removeActiveDelay=700] - Amount of time before scroller fades away
             */

            initialize: function(options) {
                _.bindAll(this,
                    'onScrollUpdated',
                    'removeActiveClass');

                options = $.extend({
                    removeActiveDelay: 700 // ms until scrollbar fades away
                }, options);

                if (Modernizr.touch) {
                    this.$el.css({'-webkit-overflow-scrolling': 'touch'});
                    if (this.$el.css('-webkit-overflow-scrolling') === 'touch'){
                        // if the device supports touch, and -webkit-overflow-scrolling, use the native scroller
                        this.$el.css({'overflow': 'scroll'});
                        options.disabled = true;
                    }
                }
                this._addBottomShadow();
                this._addTopShadow();

                VerticalScroll.prototype.initialize.call(this, options);

                // by default hide the bar
                this.bar.addClass('hide');
            },

            /**
             * Bind scrollBarUpdate event that listens for movement of the content to trigger the fading of the scrollbar
             */
            bindEvents: function() {
                if (!this.options.disabled){
                    this.$el.on('scrollBarUpdate.' + this.cid, this.onScrollUpdated);
                    VerticalScroll.prototype.bindEvents.apply(this, arguments);
                }
            },

            /**
             * Removes the top and bottom shadows, clears all timers and events
             * @param {Boolean} [removeEl]
             */
            destroy: function(removeEl){
                this.$el.off('.' + this.cid);
                this.topShadow.remove();
                this.bottomShadow.remove();
                clearTimeout(this.removeActiveClassDelay);
                clearTimeout(this.hideClassDelay);
                VerticalScroll.prototype.destroy.apply(this, arguments);
            },

            /**
             * Add shadow to top of scroll content
             * @private
             */
            _addTopShadow: function() {
                this.topShadow = $('<div class="shadow top-shadow"></div>').hide();
                this.$el.append(this.topShadow);
            },

            /**
             * Add shadow to bottom of scroll content
             * @private
             */
            _addBottomShadow: function() {
                this.bottomShadow = $('<div class="shadow bottom-shadow"></div>').hide();
                this.$el.append(this.bottomShadow);
            },

            /**
             * Remove active class.
             * @private
             */
            removeActiveClass: function() {
                if(this.isMouseDown || this.isMouseOver){
                    return;
                }
                this.bar.removeClass('active');
                clearTimeout(this.removeActiveClassDelay);
                this.hideClassDelay = setTimeout(_.bind(function() {
                    this.bar.addClass('hide');
                }, this), 1000);
            },

            /**
             * Add active class.
             * @private
             */
            addActiveClass: function(delay) {
                this.bar.addClass('active');
                this.bar.removeClass('hide');
                this.startTimeout(delay || this.options.removeActiveDelay);
            },

            /**
             * Starts timer to remove the active class for the scrollbar
             * @private
             */
            startTimeout: function(delay) {
                clearTimeout(this.removeActiveClassDelay);
                this.removeActiveClassDelay = setTimeout(this.removeActiveClass, delay);
            },

            /**
             * Starts timer to remove the active class for the scrollbar
             * @augments modules/scroller/base-scroll#onMouseOut
             * @private
             */
            onMouseOut: function(){
                VerticalScroll.prototype.onMouseOut.apply(this, arguments);
                if(!this.isMouseDown) {
                    this.startTimeout(this.options.removeActiveDelay);
                }
            },

            /**
             * Starts timer to remove the active class for the scrollbar
             * @augments modules/scroller/base-scroll#onMouseEnter
             * @private
             */
            onMouseEnter: function(){
                VerticalScroll.prototype.onMouseEnter.apply(this, arguments);
                this.addActiveClass(this.options.removeActiveDelay);
            },

            /**
             * When the scrollbar position is updated.
             */
            onScrollUpdated: function(e, percent) {
                if (percent === 0) {
                    this.topShadow.hide();
                } else {
                    this.topShadow.show();
                }

                if(percent === 1) {
                    this.bottomShadow.hide();
                } else {
                    this.bottomShadow.show();
                }

                this.addActiveClass();
            }

        });


        /**
         * Return view class.
         */
        return SidebarScroll;
    }
);