 define([
    'jquery', 
    'underscore', 
    'modules/scroller/base-scroll'
],
function(
    $, 
    _, 
    BaseScroll
)
    {
        var HorizontalScrollView = BaseScroll.extend(
        /**
         * @lends modules/scroller/horizontal-scroll.prototype
         */
        {
            /**
             * @classdesc Horizontal Scrollbar, a subclass of {@link modules/scroller/base-scroll}
             * @author Jay Merrifield <jmerrifiel@gannett.com>
             * @constructs modules/scroller/horizontal-scroll
             * @extends modules/scroller/base-scroll
             * @param {Object} options backbone options object
             *     @param {jQuery|Element|String} options.el - element or string selector to attach to
             *     @param {String} [options.color=light] - ui-xxx class to add to the scrollbar
             *     @param {Number} [options.draggerPaddingLeft=0] - Amount of empty space to give to the left side of the dragger
             *     @param {Number} [options.draggerPaddingRight=2] - Amount of empty space to give to the right side of the dragger
             *     @param {Number} [options.delaySroll=true] - Turns on the mousewheel scroller delay, see {@link modules/scroller/base-scroll} for more details
             */
            initialize: function(options) {
                options = $.extend({
                    color: 'light', // light or dark
                    draggerPaddingLeft: 0,
                    draggerPaddingRight: 2,
                    delayScroll: true
                }, options);

                // Set up html template based on color.
                var compiled = _.template('<div class="horizontal-scroll ui-<%= color %>"><div class="scrolldragger"><div class="over-icon"></div></div></div>');
                options.template = compiled({color: options.color});

                // Remove any pre-existing instances just in case.
                this.$('.horizontal-scroll').remove();

                BaseScroll.prototype.initialize.call(this, options);
            },

            /**
             * gets viewport width
             * @returns {Number}
             */
            getViewportSize: function(){
                return this.$el.width();
            },
            /**
             * gets content width
             * @returns {Number}
             */
            getContentSize: function(){
                return this.content.width();
            },
            _setDraggerSize: function(draggerSize){
                draggerSize -= (this.options.draggerPaddingLeft + this.options.draggerPaddingRight);
                this.dragger.css({width: draggerSize});
                return draggerSize;
            },

            /**
             * Triggers a horizontal scrolling animation
             * @param {Number} locationX
             * @param {Number} locationY
             * @param {Number} duration
             * @param {String} easing
             * @returns {Deferred}
             */
            animateContentToPosition: function(locationX, locationY, duration, easing){
                var minPosition = this.viewportSize - this.contentSize,
                    actualLocationX = Math.max(minPosition, Math.min(locationX, 0));
                easing = easing || 'ease-out';
                return $.when(this.animate(this.dragger, 'left', (-1 * actualLocationX * this.contentViewportRatio) + 'px', duration || 0, easing),
                        this.animate(this.content, 'left', actualLocationX + 'px', duration, easing))
                    .done(_.bind(function(){
                        this.$el.trigger('scrollBarUpdate', [actualLocationX / minPosition]);
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
                var shift, itemWidth = item.outerWidth(),
                    itemLeftPosition = item.position().left + item.parent().position().left,
                    itemRightPosition = itemLeftPosition + itemWidth;
                if (itemLeftPosition < 0) {
                    var viewportSize = this.getViewportSize();
                    if (pageJump) {
                        shift = itemLeftPosition + (itemWidth - viewportSize);
                    } else {
                        shift = itemLeftPosition;
                    }
                } else if (itemRightPosition > this.getViewportSize()) {
                    if (pageJump) {
                        shift = itemLeftPosition;
                    } else {
                        shift = itemLeftPosition + (itemWidth - this.getViewportSize());
                    }
                }
                if (shift) {
                    var finalPosition = this.content.position().left - shift;
                    this.animateContentToPosition(finalPosition, 0, duration, easing);
                }
            },

            moveContentToPosition: function(locationX, locationY){
                if (!this.active){
                    return false;
                }
                var minPosition = this.viewportSize - this.contentSize,
                    actualLocationX = Math.max(minPosition, Math.min(locationX, 0));
                this._positionDragger(-1 * actualLocationX * this.contentViewportRatio);
                this._positionContent(actualLocationX);
                this.$el.trigger('scrollBarUpdate', [actualLocationX / minPosition]);
                return actualLocationX === locationX;
            },

            moveDraggerToPosition: function(locationX, locationY){
                if (!this.active){
                    return false;
                }
                var maxPosition = this.viewportSize - (this.draggerSize + this.options.draggerPaddingRight + this.options.draggerPaddingLeft),
                    actualLocationX = Math.max(0, Math.min(locationX, maxPosition));
                this._positionDragger(actualLocationX);
                this._positionContent(-1 * actualLocationX / this.contentViewportRatio);
                this.$el.trigger('scrollBarUpdate', actualLocationX / maxPosition);
                return actualLocationX === locationX;
            },
            _positionDragger: function(x){
                x += this.options.draggerPaddingLeft;
                x = Math.round(x);
                if (this.useCSSTransforms){
                    this.dragger.css({left: '0'});
                    this.dragger[0].style[this.transformCssName] = 'translate(' + x + 'px,0)';
                }else{
                    this.dragger.css({left: x});
                }
            },
            _positionContent: function(x){
                x = Math.round(x);
                if (this.useCSSTransforms){
                    this.content.css({left: '0'});
                    this.content[0].style[this.transformCssName] = 'translate(' + x + 'px,0)';
                }else{
                    this.content.css({left: x});
                }
            }

        });


        /**
         * Return view class.
         */
        return HorizontalScrollView;
    }
);
