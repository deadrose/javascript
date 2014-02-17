 define([
    'jquery',
    'underscore',
    'utils',
    'modules/scroller/base-scroll'
],
function(
    $,
    _,
    Utils,
    BaseScroll
)
    {
        var VerticalScrollView = BaseScroll.extend(
        /**
         * @lends modules/scroller/vertical-scroll.prototype
         */
        {
            /**
             * @classdesc Vertical Scrollbar, a subclass of {@link modules/scroller/base-scroll}
             * @author Jay Merrifield <jmerrifiel@gannett.com>
             * @constructs modules/scroller/vertical-scroll
             * @extends modules/scroller/base-scroll
             * @param {Object} options backbone options object
             *     @param {jQuery|Element|String} options.el - element or string selector to attach to
             *     @param {String} [options.color=light] - ui-xxx class to add to the scrollbar
             *     @param {Boolean} [options.fadeout=false] - Specifies whether to add a 'fadeout' class to the scrollbar
             *     @param {Number} [options.draggerPaddingTop=3] - Amount of empty space to give to the top side of the dragger
             *     @param {Number} [options.draggerPaddingBottom=3] - Amount of empty space to give to the bottom side of the dragger
             */
            initialize: function(options) {

                options = $.extend({
                    color: 'light', // light or dark
                    fadeout: false,
                    draggerPaddingTop: 3, // how much padding should we give around the dragger
                    draggerPaddingBottom: 3
                }, options);

                var fade = (this.options.fadeout) ? 'fadeout' : '';

                // Set up html template based on color.
                var compiled = _.template('<div class="vertical-scroll ui-<%= color %> <%= fade %>"><div class="scrolldragger"><div class="over-icon"></div></div></div>');
                options.template = compiled({color: options.color, fade: fade});

                // Remove any pre-existing instances just in case.
                this.$('.vertical-scroll').remove();

                BaseScroll.prototype.initialize.call(this, options);
            },
            /**
             * gets viewport height
             * @returns {Number}
             */
            getViewportSize: function(){
                return this.$el.height();
            },
            /**
             * gets content height
             * @returns {Number}
             */
            getContentSize: function(){
                return this.content.height();
            },
            _setDraggerSize: function(draggerSize){
                draggerSize -= (this.options.draggerPaddingTop + this.options.draggerPaddingBottom);
                this.dragger.css({height: draggerSize});
                return draggerSize;
            },

            /**
             * Triggers a vertical scrolling animation
             * @param {Number} locationX
             * @param {Number} locationY
             * @param {Number} duration
             * @param {String} easing
             * @returns {Deferred}
             */
            animateContentToPosition: function(locationX, locationY, duration, easing){
                var minPosition = this.viewportSize - this.contentSize,
                    actualLocationY = Math.max(minPosition, Math.min(locationY, 0));
                easing = easing || 'ease-out';
                return $.when(this.animate(this.dragger, 'top', (-1 * actualLocationY * this.contentViewportRatio) + 'px', duration || 0, easing),
                        this.animate(this.content, 'top', actualLocationY + 'px', duration, easing))
                    .done(_.bind(function(){
                        this.$el.trigger('scrollBarUpdate', [actualLocationY / minPosition]);
                    }, this));
            },

            /**
             * will scroll to make the element visible
             * @param {jQuery} item html element that we want to be visible
             * @param {Boolean} pageJump specifies if we're moving the viewport a full page, or just one line
             * @param {Number} duration time for animation
             * @param {String} [easing] easing formula
             */
            scrollToElement: function(item, pageJump, duration, easing) {
                var shift, itemHeight = item.outerHeight(),
                    itemTopPosition = item.position().top + item.parent().position().top,
                    itemBottomPosition = itemTopPosition + itemHeight;
                if (itemTopPosition < 0) {
                    var viewportSize = this.getViewportSize();
                    if (pageJump) {
                        shift = itemTopPosition + (itemHeight - viewportSize);
                    } else {
                        shift = itemTopPosition;
                    }
                } else if (itemBottomPosition > this.getViewportSize()) {
                    if (pageJump) {
                        shift = itemTopPosition;
                    } else {
                        shift = itemTopPosition + (itemHeight - this.getViewportSize());
                    }
                }
                if (shift) {
                    var finalPosition = this.content.position().top - shift;
                    this.animateContentToPosition(0, finalPosition, duration, easing);
                }
            },

            /**
             * Moves the content in a vertical direction to the location provided, returning whether it succeeded or not
             * @param {Number} locationX *ignored*
             * @param {Number} locationY
             * @returns {Boolean} whether the content successfully made it the vertical location
             */
            moveContentToPosition: function(locationX, locationY){
                if (!this.active){
                    return false;
                }
                var minPosition = this.viewportSize - this.contentSize,
                    actualLocationY = Math.max(minPosition, Math.min(locationY, 0));
                this._positionDragger(-1 * actualLocationY * this.contentViewportRatio);
                this._positionContent(actualLocationY);
                this.$el.trigger('scrollBarUpdate', [actualLocationY / minPosition]);
                return actualLocationY === locationY;
            },
            moveDraggerToPosition: function(locationX, locationY){
                if (!this.active){
                    return false;
                }
                var maxPosition = this.viewportSize - (this.draggerSize + this.options.draggerPaddingBottom + this.options.draggerPaddingTop),
                    actualLocationY = Math.max(0, Math.min(locationY, maxPosition));
                this._positionDragger(actualLocationY);
                this._positionContent(-1 * actualLocationY / this.contentViewportRatio);
                this.$el.trigger('scrollBarUpdate', actualLocationY / maxPosition);
                return actualLocationY === locationY;
            },
            _positionDragger: function(y){
                y += this.options.draggerPaddingTop;
                y = Math.round(y);
                if (this.useCSSTransforms){
                    this.dragger.css({top: '0'});
                    this.dragger[0].style[this.transformCssName] = 'translate(0,' + y + 'px)';
                } else{
                    this.dragger.css({top: y});
                }
            },
            _positionContent: function(y){
                y = Math.round(y);
                if (this.useCSSTransforms){
                    this.content.css({top: '0'});
                    this.content[0].style[this.transformCssName] = 'translate(0,' + y + 'px)';
                } else{
                    this.content.css({top: y});
                }
                // call on scroll, pass y position
                if (typeof this.options.onScroll === 'function') {
                    this.options.onScroll(y);
                }
            }
        });


        /**
         * Return view class.
         */
        return VerticalScrollView;
    }
);
