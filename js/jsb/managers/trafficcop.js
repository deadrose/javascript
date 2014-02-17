define(['jquery', 'underscore'],
    function($, _) {
        /**
         * Traffic Cop that will gate dom changing ajax events until animations are complete.
         * The advantage of this is that multiple animations could all be happening, and ajax requests will
         * stall until an appropriate window is available to render it's content
         * @exports managers/trafficcop
         * @author jmerrifiel@gannett.com (Jay Merrifield)
         */
        var TrafficCop = function(){
            this.DEBUG = true;
            this.defaultTimeout = 2000; // ms
            this.minTimeout = 500; // ms
            this.activeRequests = [];
            this.activeAnimations = [];
            this.animationCompletion = null;
        };
        TrafficCop.prototype = {
            /**
             * Adds an ajax request to the traffic manager. No ajax requests will complete (success or error)
             * until all animations have completed.
             * @param ajaxPromise {Deferred} promise object representing an ajax request
             * @return {Deferred} promise object that will fire when all animations are done
             */
            addRequest: function(ajaxPromise){
                var resultPromise = {
                    ajaxPromise: ajaxPromise,
                    gate: $.Deferred(),
                    requestResult: null
                };
                this.activeRequests.push(resultPromise);
                ajaxPromise.always(_.bind(function(requestResult){
                    resultPromise.requestResult = requestResult;
                    if (this.activeAnimations.length === 0){
                        if (ajaxPromise.state() === 'resolved'){
                            resultPromise.gate.resolve();
                        }else{
                            resultPromise.gate.reject();
                        }
                        this._clearFinishedRequests();
                    }
                }, this));
                // we need to filter the results, cause we're not returning the correct promise
                var gate = resultPromise.gate.promise();
                // copy the abort function pointer
                gate = gate.pipe(function(){
                    return resultPromise.requestResult;
                }, function(e){
                    return resultPromise.requestResult;
                });
                gate.original = ajaxPromise;
                gate.abort = ajaxPromise.abort;
                return gate;
            },
            /**
             * Adds an animation to the traffic cop. No requests will complete until all animations
             * finish. The function will return a global completion promise that will fire when
             * all animations are done
             * @param {Deferred} promise representing an animation that will eventually complete
             * @param {jQuery} [el] element that we are animating
             * @param {String} [property] property we are animating
             * @param {String|Number} [value] value we are animating to
             * @param {Number} [timeMs] time for animation
             * @return {Deferred} representing when all animations are done
             */
            addAnimation: function(promise, el, property, value, timeMs){
                // why are you wasting my time?
                if (!promise || promise.state() !== 'pending'){
                    return promise;
                }
                if (!this.animationCompletion){
                    this.animationCompletion = $.Deferred();
                }
                var animationInfo = {
                    promise: promise,
                    el: el && el[0],
                    property: property,
                    value: value
                }, waitTime = Math.max(timeMs * 2, this.minTimeout) || this.defaultTimeout;
                animationInfo.timeout = setTimeout(_.bind(function(){
                    console.warn('ANIMATION did NOT resolve within ' + waitTime + ' ms, releasing barrier ' + this._getAnimationPropertyDescription(property, value), animationInfo.el);
                    this.activeAnimations = _.without(this.activeAnimations, animationInfo);
                    this._resolveAnimation();
                }, this), waitTime);

                this.activeAnimations.push(animationInfo);
                promise.always(_.bind(function(){
                    clearTimeout(animationInfo.timeout);
                    var index = $.inArray(animationInfo, this.activeAnimations);
                    if (index !== -1){
                        this.activeAnimations.splice(index, 1);
                        this._resolveAnimation();
                    }else{
                        console.warn('animation finished after being released ' + this._getAnimationPropertyDescription(property, value), animationInfo.el);
                    }
                }, this));
                return this.animationCompletion.promise();
            },
            /**
             * Gets the current animation completion promise so we can delay destructive calls between animations
             * @return {Deferred} that will resolve when it's safe to make a destructive call
             */
            getAnimationCompletion: function() {
                if (this.animationCompletion) {
                    return this.animationCompletion.promise();
                } else {
                    return $.Deferred().resolve();
                }
            },
            _getAnimationPropertyDescription: function(property, value){
                if (property){
                    return 'on property ' + property + ':' + value;
                }else{
                    return 'on unregistered element';
                }
            },
            _resolveAnimation: function(){
                if (this.activeAnimations.length === 0){
                    // we do this because the animation completion and the triggerEvents()
                    // might register another animation which we want to generate a new animation
                    // completion deferred
                    var completion = this.animationCompletion;
                    this.animationCompletion = null;

                    // trigger completion events
                    this._triggerEvents();
                    completion.resolve();
                }
            },
            _triggerEvents: function(){
                _.each(this.activeRequests, function(itm){
                    var state = itm.ajaxPromise.state();
                    if (state === 'resolved'){
                        itm.gate.resolve();
                    }else if (state === 'rejected'){
                        itm.gate.reject();
                    }
                });
                this._clearFinishedRequests();
            },
            _clearFinishedRequests: function(){
                this.activeRequests = _.reject(this.activeRequests, function(itm){
                    return itm.gate.state() !== 'pending';
                });
            }
        };
        return new TrafficCop();
    }
);