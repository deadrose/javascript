 define([
    'jquery',
    'underscore',
    'backbone',
    'baseview',
    'pubsub',
    'utils',
    'mousewheel'
],
function(
    $,
    _,
    Backbone,
    BaseView,
    PubSub,
    Utils
)
    {
        var BaseScrollView = BaseView.extend(
        /**
         * @lends modules/scroller/base-scroll.prototype
         */
        {

            // Events.
            events: {
                'mousewheel': 'handleMouseWheel',
                'mouseenter': 'onMouseEnter',
                'mouseleave': 'onMouseLeave',
                'touchstart': 'onTouchStart',
                'mousedown .scrolldragger': 'onDraggerMouseDown',
                'mouseenter .scrolldragger': 'onDraggerMouseOver',
                'mouseleave .scrolldragger': 'onDraggerMouseOut',
                'mousedown .scrollbar': 'onBarClick'
            },

            removeActiveDelay: 300,

            /**
             * @classdesc Base class that managers dragger, mousewheel, and touch events and provides interfaces for
             * subclasses to respond to. The basic structure of the scroller is an el is the viewport which has
             * a confined height and width, and then a div inside the viewport that contains the content which is allowed
             * to be larger than the viewport. A template for the scrollbar is required, with a div of class "scrolldragger"
             * that represents the part you can drag. This will automatically get added to the viewport.
             * @author Jay Merrifield <jmerrifiel@gannett.com>
             * @constructs modules/scroller/base-scroll
             * @param {Object} options backbone options object
             *     @param {jQuery|Element|String} options.el - element or string selector to attach to
             *     @param {jQuery|Element|String} options.template - the html of the dragger
             *     @param {String} [options.contentClass=.scrollable-content] - the class identifying the div that contains the content to be scrolled
             *     @param {Number} [options.minDraggerSize=40] - the minimum size of the dragger
             *     @param {Boolean} [options.lockPageScroll=true] - specifies whether we want to prevent page scrolling when hit the end of the content area
             *     @param {Boolean} [options.delayScroll=false] - specifies whether mousewheel scrolling should delay 300ms
             *                                                  when the mouse enters the content area before taking over to allow users to scroll past
             *                                                  the content area (mainly used for horizontal scrollers)
             */
            initialize: function(options) {
                options = $.extend({
                    disabled: false,
                    contentClass: '.scrollable-content',
                    lockPageScroll: true,
                    delayScroll: false,
                    minDraggerSize: 40,
                    template: null
                }, options);

                _.bindAll(this,
                    'onDraggerMouseUp',
                    'onDraggerMouseMove',
                    'onTouchMove',
                    'onTouchStop',
                    '_setMouseInHouse',
                    '_clearMouseInHouse'
                );

                this.content = this.$(options.contentClass);
                this.bar = $(options.template).hide();
                this.bar.addClass('scrollbar');
                this.dragger = this.bar.find('.scrolldragger');
                this.body = Utils.get('body');
                this.$el.append(this.bar);

                //vars
                this.isMouseDown = false;
                this.isMouseOver = false;
                this.draggerOffset = 0;

                BaseView.prototype.initialize.call(this, options);

                this.refresh();
            },

            /**
             * Bind events.
             */
            bindEvents: function() {
                this.delegateEvents();
            },

            /**
             * Unbind all the events and timers
             * @param {Boolean} [skipUndelegateEvents] optional parameter to skip unbinding backbone events
             */
            unbindEvents: function(skipUndelegateEvents) {
                if (!skipUndelegateEvents) {
                    this.undelegateEvents();
                }
                // clear any drag/etc handlers we put on the body that might still be in effect
                this.body.off('.' + this.cid);
                clearInterval(this.accelerationTimer);
                clearTimeout(this.enterDelay);
                clearTimeout(this.leaveDelay);
            },

            /**
             * Refresh / setup the scrollbar
             */
            refresh: function() {
                this.content = this.$(this.options.contentClass);
                if(this.options.disabled || this.content.length === 0) {
                    //there is no content for the scroller return and do nothing
                    return;
                }

                this.viewportSize = this.getViewportSize();
                this.contentSize = this.getContentSize();
                this.contentViewportRatio = this.viewportSize / this.contentSize;

                if(this.contentViewportRatio < 1) {
                    var draggerSize = this._calculateDraggerSize(this.viewportSize, this.contentViewportRatio, this.contentSize);
                    this.draggerSize = this._setDraggerSize(draggerSize);
                    if (!this.active){
                        this.bar.show();
                        this.bindEvents();
                        this.active = true;
                    }
                    // must call after this.active = true
                    this.shiftContent(0, 0);
                } else {
                    if (this.active){
                        this.bar.hide();
                        this.unbindEvents();
                        this.active = false;
                    }
                }
            },
            _calculateDraggerSize: function(viewportSize, contentViewportRatio, contentSize){
                var draggerSize = Math.round(viewportSize * contentViewportRatio);
                if (draggerSize < this.options.minDraggerSize){
                    // recalculate viewport to content ratio given the max position of both
                    var maxContentPosition = contentSize - viewportSize;
                    var maxViewportPosition = viewportSize - this.options.minDraggerSize;
                    this.contentViewportRatio = maxViewportPosition / maxContentPosition;
                    // set minimum dragger size
                    draggerSize = this.options.minDraggerSize;
                }
                return draggerSize;
            },

            /**
             * Touch Start Event, triggers listeners of touchmove, touchend, and touchcancel events.
             * Also stops scrolling deceleration if any is happening
             * @param event
             * @private
             */
            onTouchStart: function(event){
                var touches = event.originalEvent.touches;
                if (touches.length > 1 || this.options.disabled || !this.active){
                    return;
                }
                clearInterval(this.accelerationTimer);
                this.touchX = touches[0].pageX;
                this.touchY = touches[0].pageY;
                this.touchVectorX = 0;
                this.touchVectorY = 0;
                this.touchDragStarted = false;
                this.touchLastMove = (new Date()).getTime();
                this.body.on('touchend.' + this.cid, this.onTouchStop);
                this.body.on('touchcancel.' + this.cid, this.onTouchStop);
                this.body.on('touchmove.' + this.cid, this.onTouchMove);
            },

            /**
             * Touch Stop Event, triggers scrolling deceleration
             * @param event
             * @private
             */
            onTouchStop: function(event){
                if (event.originalEvent.touches.length !== 0){
                    return;
                }
                this.body.off('.' + this.cid);
                if (this.touchDragStarted){
                    var currentTime = (new Date()).getTime();
                    var timeDelta = currentTime - this.touchLastMove;
                    event.preventDefault();
                    // time between last move and now is soon enough that it should trigger momentum scrolling
                    if (timeDelta < 100){
                        this._triggerScrollingDecelerate(this.touchVectorX, this.touchVectorY, 1500);
                    }
                    return false;
                }
            },

            _triggerScrollingDecelerate: function(initialVectorX, initialVectorY, decelerationTime){
                var startTime = (new Date()).getTime();
                var finalTime = startTime + decelerationTime;
                var touchLastMove = startTime;
                this.accelerationTimer = setInterval(_.bind(function(){
                    var currentTime = (new Date()).getTime();
                    var timeDelta = currentTime - touchLastMove;
                    touchLastMove = currentTime;

                    if (currentTime > finalTime){
                        clearInterval(this.accelerationTimer);
                        return;
                    }
                    currentTime -= startTime;
                    var currentVelocityX = this._adjustVelocityVector(initialVectorX, currentTime, decelerationTime);
                    var currentVelocityY = this._adjustVelocityVector(initialVectorY, currentTime, decelerationTime);
                    this.shiftContent(currentVelocityX * timeDelta, currentVelocityY * timeDelta);
                }, this), 20);
            },

            _adjustVelocityVector: function(initialVector, currentTime, stopTime){
                return initialVector * Math.pow(1 - (currentTime / stopTime), 3);
            },

            /**
             * Touch move callback, translates touch event into shiftContent event
             * @private
             * @param event
             */
            onTouchMove: function(event){
                if (event.originalEvent.touches.length !== 1){
                    return;
                }
                var touches = event.originalEvent.touches;
                var deltaX = (touches[0].pageX - this.touchX);
                var deltaY = (touches[0].pageY - this.touchY);
                if (this.touchDragStarted || Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10){
                    // must travel at least 2 pixels to start drags
                    var currentTime = (new Date()).getTime();
                    this.touchDragStarted = true;
                    this.touchX = touches[0].pageX;
                    // vector is in pixels per ms
                    this.touchVectorX = deltaX / (currentTime - this.touchLastMove);
                    this.touchY = touches[0].pageY;
                    // vector is in pixels per ms
                    this.touchVectorY = deltaY / (currentTime - this.touchLastMove);
                    this.touchLastMove = (new Date()).getTime();
                    if (this.shiftContent(deltaX, deltaY) === false){
                        event.preventDefault();
                    }
                }
            },

            /**
             * Handles scrollbar (not dragger) being clicked. Triggers a page up/down effect
             * @private
             * @param e
             */
            onBarClick: function(e) {
                if (e.which !== 1 || e.isDefaultPrevented()){
                    return;
                }
                e.preventDefault();
                var barOffset = this.bar.offset(),
                    mouseX = e.pageX - barOffset.left - this.draggerSize / 2,
                    mouseY = e.pageY - barOffset.top - this.draggerSize / 2;

                //position center of dragger to where the bar was clicked
                this.moveDraggerToPosition(mouseX, mouseY);
                this.onDraggerMouseOver(e);
                this.onDraggerMouseDown(e);
            },

            /**
             * Handles dragger mouse down event. Registers mousemove and mouseup listeners
             * @private
             * @param e
             */
            onDraggerMouseDown: function(e) {
                if (e.which !== 1){
                    return;
                }
                this.isMouseDown = true;
                e.preventDefault();
                // prevent user text selection while moving the dragger
                this.body.on('mousemove.' + this.cid, this.onDraggerMouseMove);
                this.body.on('mouseup.' + this.cid, this.onDraggerMouseUp);

                //calculate the offset from where the dragger was clicked
                var draggerOffset = this.dragger.offset();
                this.draggerClickOffset = {
                    left: e.pageX - draggerOffset.left,
                    top: e.pageY - draggerOffset.top
                };
            },

            /**
             * Handles dragger mouse up event. Clears mousemove and mouseup listeners
             * @private
             * @param e
             */
            onDraggerMouseUp: function(e) {
                if (e.which !== 1){
                    return;
                }
                e.preventDefault();
                this.isMouseDown = false;
                this.body.off('.' + this.cid);
                if(!this.isMouseOver) {
                    // if we're still over the dragger, don't remove the hover
                    this.dragger.removeClass('hover');
                }
            },

            /**
             * Handles dragger mouse move event, turns it into moveDraggerToPosition()
             * @private
             * @param e
             */
            onDraggerMouseMove: function(event){
                if(!this.isMouseDown){
                    return;
                }

                var offset = this.bar.offset();
                var barMouseX = event.pageX - offset.left - this.draggerClickOffset.left,
                    barMouseY = event.pageY - offset.top - this.draggerClickOffset.top;

                this.moveDraggerToPosition(barMouseX, barMouseY);
            },

            /**
             * When the dragger is moused over, will add a hover class to prevent it from fading out (if applicable)
             * @private
             * @param e
             */
            onDraggerMouseOver: function(event) {
                this.isMouseOver = true;
                this.dragger.addClass('hover');
            },

            /**
             * When the dragger is moused left, will remove a hover class
             * @private
             * @param e
             */
            onDraggerMouseOut: function(event) {
                this.isMouseOver = false;
                if(!this.isMouseDown) {
                    this.dragger.removeClass('hover');
                }
            },

            /**
             * Mouse enter event. This is in charge of setting the isMouseInTheHouse setting to
             * delay the mousewheel handler if that option is turned on
             * @private
             * @param {MouseEvent} e
             */
            onMouseEnter: function(e) {
                clearTimeout(this.leaveDelay);
                this.enterDelay = setTimeout(this._setMouseInHouse, 300);
            },

            /**
             * Mouse leave event. This is in charge of clearing the isMouseInTheHouse used by the mousewheel function
             * @private
             * @param {MouseEvent} e
             */
            onMouseLeave: function(e) {
                clearTimeout(this.enterDelay);
                this.leaveDelay = setTimeout(this._clearMouseInHouse, 300);
            },

            _setMouseInHouse: function(){
                this.isMouseInTheHouse = true;
            },

            _clearMouseInHouse: function(){
                this.isMouseInTheHouse = false;
            },


            /**
             * Handles mousewheel events and turns them into shiftContent requests
             * Also checks the isMouseInTheHouse variable, if enabled, to see if we want to delay the scroll handler
             * @param {MouseWheelEvent|MouseScrollEvent|WheelEvent} event
             * @param {Number} delta amount being moved
             * @param {Number} deltaX amount being moved in x direction
             * @param {Number} deltaY amount being moved in the y direction
             * @private
             */
            handleMouseWheel: function(event, delta, deltaX, deltaY){
                if(this.isMouseDown || !this.active || (this.options.delayScroll && !this.isMouseInTheHouse)){
                    return;
                }

                deltaY = deltaY * 20;
                deltaX = -1 * deltaX * 20 || deltaY;

                if (this.shiftContent(deltaX, deltaY) === false){
                    event.preventDefault();
                }
            },

            /**
             * Shifting content by certain number of pixels
             * @private
             */
            shiftContent: function(deltaX, deltaY) {
                var contentPosition = this.content.position(),
                    contentParent = this.content.parent(),
                    contentX = contentPosition.left + deltaX - (parseInt(contentParent.css('padding-left'), 10) || 0) - (parseInt(contentParent.css('margin-left'), 10) || 0),
                    contentY = contentPosition.top + deltaY - (parseInt(contentParent.css('padding-top'), 10) || 0) - (parseInt(contentParent.css('margin-top'), 10) || 0);

                if (this.moveContentToPosition(contentX, contentY)){
                    // move succeeded, stop bubbling
                    return false;
                }else{
                    // if we tried to move the content and it didn't move as much as we wanted
                    // it means we hit the end of the content, should we block the event from bubbling?
                    if (this.options.lockPageScroll){
                        return false;
                    }
                }
            },

            /**
             * Removes scrollbar, and unbinds events
             */
            destroy: function() {
                this.unbindEvents(true);
                this.bar.remove();
                BaseView.prototype.destroy.apply(this, arguments);
            },

            /*********************************************************
             * Abstract functions, required implementing by subclasses
             *********************************************************/

            /**
             * Function that gets called when the dragger is moved to a specific location
             * @abstract
             * @param {Number} locationX
             * @param {Number} locationY
             */
            moveDraggerToPosition: function(locationX, locationY){

            },

            /**
             * Function that gets called when the content (ex: mousewheel) is moved to a specific location
             * @abstract
             * @param {Number} locationX
             * @param {Number} locationY
             */
            moveContentToPosition: function(locationX, locationY){

            },

            /**
             * Function to trigger scrolling to a make a specific element visible
             * @abstract
             * @param {jQuery} item html element that we want to be visible
             * @param {Boolean} pageJump specifies if we're moving the viewport a full page, or just one line
             * @param {Number} duration time for animation
             * @param {String} [easing] easing formula
             */
            scrollToElement: function(item, pageJump, duration, easing) {

            },

            /**
             * Triggers an animation to a specific location
             * @abstract
             * @param {Number} locationX
             * @param {Number} locationY
             * @param {Number} duration
             * @param {String} easing
             */
            animateContentToPosition: function(locationX, locationY, duration, easing){

            },

            /**
             * Gets the viewport size
             * @abstract
             * @returns {Number}
             */
            getViewportSize: function(){
                return 0;
            },

            /**
             * Gets the content size
             * @abstract
             * @returns {Number}
             */
            getContentSize: function(){
                return 0;
            },

            /**
             * sets the dragger size
             * @abstract
             * @returns {Number}
             */
            _setDraggerSize: function(draggerSize){
                return draggerSize;
            }

        });


        /**
         * Return view class.
         */
        return BaseScrollView;
    }
);