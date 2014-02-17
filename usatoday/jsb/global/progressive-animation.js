define([
    'jquery',
    'underscore',
    'utils',
    'managers/trafficcop',
    'transformSupport',
    'animatecolors'
], function (
    $,
    _,
    Utils,
    TrafficCop
) {
    'use strict';
    var Animations = function () {
    };
    Animations.prototype = {
        transitionCssName: $.support.css.transition && $.support.css.transition.cssName,
        transformCssHyphenName: $.support.css.transform && $.support.css.transform.cssHyphenName,
        transformCssName: $.support.css.transform && $.support.css.transform.cssName,
        /**
         * Utility function that will animate an element using css transitions or transform animation
         * based on the capabilities of the browser
         * @param {Boolean} useTransforms - specifies whether we can upgrade certain transitions to 3d transforms
         * @param {jQuery} el element to animate
         * @param {String} property property name to animate
         * @param {String} value property value to animate to
         * @param {Number} timeMs time in milliseconds the animation should take
         * @param {String} easing the easing algorithm to use, defaults to 'linear' if absent
         * @param {String|Number} [delay=0] time in milliseconds (no units) the animation should delay for
         * @return {Deferred} promise that will resolve when the animation finishes
         */
        cssTransition: function (useTransforms, el, property, value, timeMs, easing, delay) {
            var animationPromise, camelProperty;
            if (property === 'opacity' && el.css('display') === 'none') {
                // we can't/don't animate opacity on hidden elements
                timeMs = 0;
            }
            if (Utils.isDocumentHidden()) {
                el.css(property, value);
                return $.Deferred().resolve();
            } else {
                if (timeMs !== 0 && timeMs < 40) {
                    // animations with timing less than 40, 0 is a magic number, causes serious issues with firefox
                    timeMs = 40;
                }
                easing = this._normalizeEasing(easing, false);
                value = this._getCssNumber($.camelCase(property), value);
                camelProperty = $.camelCase(property);
                if (delay) {
                    delay = ' ' + delay + 'ms';
                } else {
                    delay = '';
                }
                if (useTransforms && this._canDo3dTransform(el, camelProperty)) {
                    animationPromise = this._transform(el, property, camelProperty, value, timeMs, easing, delay);
                } else {
                    animationPromise = this._transition(el, property, camelProperty, value, timeMs, easing, delay);
                }
            }
            TrafficCop.addAnimation(animationPromise, el, property, value, timeMs);
            return animationPromise;
        },
        /**
         * Stops the current animation on el at a specific property
         * @param {jQuery} el element animating
         * @param {String} property css property we're animating
         * @returns {String} the current value for that property
         */
        stop: function(el, property) {
            var camelProperty = $.camelCase(property),
                currentValue = window.getComputedStyle(el[0]).getPropertyValue(property);
            el.stop('proganimate' + property, true);
            if (this._failPreviousTransition(el, camelProperty)) {
                el[0].style[camelProperty] = currentValue;
            }
            return currentValue;
        },
        /**
         * Tests if we can successfully promote this property animation to 3d. The options at the moment are as follows.
         * Only top and left properties can be promoted. But only if there's no conflicting 3d transform on the "other" property
         * @param {jQuery} el element to animate
         * @param {String} camelProperty - javascript style camel case property name
         * @returns {Boolean} whether or not we can upgrade to 3d transform
         * @private
         */
        _canDo3dTransform: function(el, camelProperty) {
            var existingAnimationData = el.data('transition-animate-' + camelProperty + '-defer');
            // scenario 1, there's already a 3d animation going on this property, chances are we can still animate on that property
            if (existingAnimationData && existingAnimationData.animationType === '3d') {
                return true;
            } else if (camelProperty === 'left' || camelProperty === 'top') {
                if (camelProperty === 'left') {
                    // scenario 2, there's a top 3d animation and we want to animation left, can't do that
                    existingAnimationData = el.data('transition-animate-top-defer');
                    if (existingAnimationData && existingAnimationData.animationType === '3d') {
                        return false;
                    } else {
                        return true;
                    }
                } else if (camelProperty === 'top') {
                    // scenario 3, there's a left 3d animation and we want to animation top, can't do that
                    existingAnimationData = el.data('transition-animate-left-defer');
                    if (existingAnimationData && existingAnimationData.animationType === '3d') {
                        return false;
                    } else {
                        return true;
                    }
                }
            }
            return false;
        },
        jQuery: function (el, property, value, timeMs, easing, delay) {
            if (Utils.isDocumentHidden()) {
                el.css(property, value);
                return $.Deferred().resolve();
            } else {
                var animationPromise, properties = {};
                easing = this._normalizeEasing(easing, true);
                properties[property] = value;
                animationPromise = $.Deferred(function(defer) {
                    var queueName = 'proganimate' + property;
                    el.stop(queueName, true);
                    if (timeMs === 0) { // special case 0, we don't want the delay the change
                        el.css(property, value);
                        _.defer(function(){
                            defer.resolve();
                        });
                    } else {
                        el.animate(properties, {duration: timeMs, easing: easing, queue: queueName,
                            done: function () {
                                defer.resolve();
                            },
                            fail: function () {
                                defer.reject();
                            }
                        }).dequeue(queueName);
                    }
                }).promise();
                TrafficCop.addAnimation(animationPromise, el, property, value, timeMs);
                return animationPromise;
            }
        },
        _easingMap: {
            'easeInQuad': 'ease-in',
            'easeInSine': 'ease-in',
            'easeInCubic': 'ease-in',
            'easeInQuart': 'ease-in',
            'easeInQuint': 'ease-in',
            'easeInExpo': 'ease-in',
            'easeInCirc': 'ease-in',
            'easeInBack': 'ease-in',
            'easeInElastic': 'ease-in',
            'easeInBounce': 'ease-in',
            'easeOutQuad': 'ease-out',
            'easeOutSine': 'ease-out',
            'easeOutCubic': 'ease-out',
            'easeOutQuart': 'ease-out',
            'easeOutQuint': 'ease-out',
            'easeOutExpo': 'ease-out',
            'easeOutCirc': 'ease-out',
            'easeOutBack': 'ease-out',
            'easeOutElastic': 'ease-out',
            'easeOutBounce': 'ease-out',
            'easeInOutQuad': 'ease-in-out',
            'easeInOutSine': 'ease-in-out',
            'easeInOutCubic': 'ease-in-out',
            'easeInOutQuart': 'ease-in-out',
            'easeInOutQuint': 'ease-in-out',
            'easeInOutExpo': 'ease-in-out',
            'easeInOutCirc': 'ease-in-out',
            'easeInOutBack': 'ease-in-out',
            'easeInOutElastic': 'ease-in-out',
            'easeInOutBounce': 'ease-in-out',
            'swing': 'ease-in-out'
        },
        /**
         * Given either jquery easing or css easing, will convert to the correct value needed, or 'linear' if it can't figure it out
         * @param {String} easing - easing value, either jquery or css easing
         * @param {Boolean} tojQuery - whether we convert to jquery easing, or css easing
         * @returns {String}
         * @private
         */
        _normalizeEasing: function (easing, tojQuery) {
            var entry, easingMap = this._easingMap;
            easing = easing || 'linear';
            if (tojQuery) {
                easingMap = _.invert(easingMap);
            }
            entry = easingMap[easing];
            if (entry) {
                // jQuery turned into CSS Easing
                easing = entry;
            } else if (easing.indexOf('cubic-bezier') !== -1) {
                if (tojQuery) {
                    easing = 'swing';
                }
            } else if (!_.find(easingMap, function(value){ return value === easing; })) {
                // don't know wtf this is
                easing = 'linear';
            }
            return easing;
        },
        /***************************
         * 2d Transition Code
         ***************************/
        _transition: function (el, property, camelProperty, toValue, timeMs, easing, delay) {
            var transitionProperty, transitionDeferred = $.Deferred(),
                fromValue = el[0].style[camelProperty] || el.css(property) || '0';
            if (!this._shouldDoTransition(el, camelProperty, property, fromValue, toValue, timeMs)) {
                _.defer(function(){
                    transitionDeferred.resolve();
                });
            } else {
                transitionProperty = property + ' ' + timeMs + 'ms ' + easing + ' ' + delay;
                transitionDeferred = this._doTransition(el, camelProperty, property, toValue, transitionProperty);
            }
            return transitionDeferred.promise();
        },
        /**
         * Begin the Transition
         * @param {jQuery} el - dom we're animation
         * @param {String} camelProperty - javascript style camel case property name
         * @param {String} property - property we're animating
         * @param {String} toValue - the value we're animating to
         * @param {String} transitionCss - transition css value we're using for the transform
         * @returns {Deferred}
         * @private
         */
        _doTransition: function (el, camelProperty, property, toValue, transitionCss) {
            var elStyle = el[0].style;
            return this._getAnimationDeferred(el, camelProperty, property, '2d', _.bind(function (defer) {
                    this._triggerTransition(defer, el, camelProperty, property, toValue, transitionCss);
                }, this)).then(function() {
                    // verify that we actually ended up where we wanted to end up so we don't accidentally call the wrong success handler
                    if (toValue.replace(/[ ]+/g, '') === elStyle[camelProperty].replace(/[ ]+/g, '')) {
                        return $.Deferred().resolve();
                    } else {
                        return $.Deferred().reject();
                    }
                });
        },
        /**
         * Will attempt to fail any previous transition and trigger the next animation.
         * Also does setup and cleanup of the previous defer
         * @param {jQuery} el - dom we're animation
         * @param {String} camelProperty - javascript style camel case property name
         * @param {String} animationType - 2d vs 3d animation
         * @param {Function} triggerFunction - function that actually triggers the animation
         * @returns {Deferred}
         * @private
         */
        _getAnimationDeferred: function(el, camelProperty, transitionProperty, animationType, triggerFunction) {
            return $.Deferred(_.bind(function (defer) {
                var failedTransition = this._failPreviousTransition(el, camelProperty, true);
                // We delay the trigger to give firefox a chance to prepare itself for animation.
                // Without this, the animation sometimes never happens.
                _.delay(_.bind(function () {
                    // if we've failed a transition here, we've specifically said don't remove the transition
                    // styles to prevent the animation from jumping while we set up the next animation
                    // so we need to remove the transform transition here
                    if (failedTransition) {
                        failedTransition.cleanup();
                    }
                    if (defer.state() === 'pending') {
                        triggerFunction(defer);
                    }
                }, this), 20);
                el.data('transition-animate-' + camelProperty + '-defer', {
                    promise: defer,
                    animationType: animationType,
                    // this is here incase we mix and match 2d and 3d
                    // we want to make certain the correct cleanup function is called
                    cleanup: _.bind(function(){
                        this._removeTransformTransition(el[0].style, transitionProperty);
                    }, this)
                });
            }, this)).always(function(){
                el.removeData('transition-animate-' + camelProperty + '-defer');
            });
        },
        _triggerTransition: function(defer, el, elProperty, transitionProperty, toValue, transitionCss) {
            var elStyle = el[0].style;
            this._registerTransitionEndListener(el, defer, transitionProperty);
            this._setupTransition(elStyle, transitionProperty, transitionCss);
            defer.always(_.bind(function(skipRemoveTransformTransition) {
                // cleanup transition style, needs to happen first to force the browser
                // to recompute the final destination when we examine it
                if (!skipRemoveTransformTransition) {
                    // we would skip the transition removal if we're changing values of the same property or changing it's timing
                    // the removal will happen later
                    this._removeTransformTransition(elStyle, transitionProperty);
                }
            }, this));
            elStyle[elProperty] = toValue;
        },
        /**
         * If a transition exists on the camelProperty passed in, it'll reject the promise for it
         * @param {jQuery} el - element we're transitioning
         * @param {String} camelProperty - property we're transitioning
         * @param {Boolean} [skipRemoveTransformTransition] - specifies if we should skip removing the transition css
         * @returns {{ promise: Deferred, reject: Function }} data object for the animation
         * @private
         */
        _failPreviousTransition: function(el, camelProperty, skipRemoveTransformTransition) {
            var previousDefer = el.data('transition-animate-' + camelProperty + '-defer');
            if (previousDefer) {
                previousDefer.promise.reject(skipRemoveTransformTransition);
                return previousDefer;
            }
        },
        _setupTransition: function(elStyle, transitionProperty, newTransitionCss) {
            // we need to remove any in progress transitions that we might have aborted
            var existingTransitionCss = elStyle[this.transitionCssName];
            if (existingTransitionCss) {
                existingTransitionCss += ',' + newTransitionCss;
            } else {
                existingTransitionCss = newTransitionCss;
            }
            elStyle[this.transitionCssName] = existingTransitionCss;
        },
        /***************************
         * 3d Transform Code
         ***************************/
        _transform: function (el, property, camelProperty, toValue, timeMs, easing, delay) {
            var transitionProperty, transitionDeferred = $.Deferred(),
                elStyle = el[0].style,
                fromValue = elStyle[camelProperty] || el.css(property) || '0';
            if (!this._shouldDoTransition(el, camelProperty, property, fromValue, toValue, timeMs)) {
                _.defer(function(){
                    transitionDeferred.resolve();
                });
            } else {
                transitionProperty = this.transformCssHyphenName + ' ' + timeMs + 'ms ' + easing + delay;
                this._convertToTransform(elStyle, camelProperty, fromValue);
                transitionDeferred = this._doTransform(el, camelProperty, toValue, transitionProperty);
                transitionDeferred.done(_.bind(function () {
                    // cleanup, remove the transform, restore the original css value
                    elStyle[this.transformCssName] = '';
                    elStyle[camelProperty] = toValue;
                }, this));
            }
            return transitionDeferred.promise();
        },
        _shouldDoTransition: function(el, camelProperty, property, fromValue, toValue, timeMs) {
            var elStyle = el[0].style;
            if (timeMs === 0) {
                this._failPreviousTransition(el, camelProperty);
                elStyle[camelProperty] = toValue;
                return false;
            } else {
                if (!this._canAnimate(fromValue, toValue)) {
                    // weird edge case if we're already animating, but we've somehow triggered another animation
                    // going to the same value we're currently at. We need to kill the old animation to keep the universe
                    // consistent and abort all animations cause we're at the target property
                    this._failPreviousTransition(el, camelProperty);
                    return false;
                }
            }
            return fromValue;
        },
        /**
         * Answers the question about whether we can actually animate from one value to another
         * @param {String} fromValue - from value
         * @param {String} toValue - to value
         * @returns {Boolean}
         * @private
         */
        _canAnimate: function(fromValue, toValue) {
            //check for fromValue 0 (unitless), toValue 0 (unitless)
            if (fromValue.replace(/[ a-z%]+/g, '') === '0' && toValue.replace(/[ a-z%]+/g, '') === '0') {
                return false;
            }
            return fromValue.replace(/[ ]/g, '') !== toValue.replace(/[ ]/g, '');
        },
        /**
         * sets up an element for transform by converting from a normal css property to a 3d transform property
         * @param {CSSStyleDeclaration} elStyle - CSS Style of the element we're animating
         * @param {String} camelProperty - property we're animating
         * @param {String} fromValue - value we're converting
         * @private
         */
        _convertToTransform: function(elStyle, camelProperty, fromValue) {
            // convert non-transform properties into a transform property
            elStyle[this.transformCssName] = this._buildTranslate3d(camelProperty, fromValue);
            elStyle[camelProperty] = 'auto';
        },
        /**
         * Begins the transform
         * @param {jQuery} el - dom we're animation
         * @param {String} camelProperty - javascript style camel case property name
         * @param {String} toValue - the value we're animating to
         * @param {String} transitionCss - transition css value we're using for the transform
         * @returns {Deferred}
         * @private
         */
        _doTransform: function(el, camelProperty, toValue, transitionCss) {
            var elStyle = el[0].style,
                toValueTranslate = this._buildTranslate3d(camelProperty, toValue);
            return this._getAnimationDeferred(el, camelProperty, this.transformCssHyphenName, '3d', _.bind(function(defer) {
                    this._triggerTransition(defer, el, this.transformCssName, this.transformCssHyphenName, toValueTranslate, transitionCss);
                }, this)).then(_.bind(function() {
                    // verify that we actually ended up where we wanted to end up so we don't accidentally call the wrong success handler
                    if (elStyle[camelProperty] === 'auto' && elStyle[this.transformCssName].replace(/[ ]+/g, '') === toValueTranslate.replace(/[ ]+/g, '')) {
                        return $.Deferred().resolve();
                    } else {
                        return $.Deferred().reject();
                    }
                }, this));
        },
        /**
         * Remove the transition value from the inputed string
         * @param {String} originalTransition - the original css transition style
         * @param {String} property the property we're animating that we'd like to remove,
         *                              if none provided will assume it's a transform and remove that instead
         * @returns {String} the originalTransition without the property
         * @private
         */
        _removeTransformTransition: function(elStyle, property) {
            var originalTransition = elStyle[this.transitionCssName];
            originalTransition = originalTransition || '';
            if (property === this.transformCssHyphenName) {
                originalTransition = originalTransition.replace(new RegExp(this.transformCssHyphenName + '([^(,]*|\\([^\\)]*)+'), '');
            } else {
                originalTransition = originalTransition.replace(new RegExp(property + ' [\\d\\.]+ms ([\\w-]+|cubic-bezier[^)]+)[^,]*'), '');
            }
            elStyle[this.transitionCssName] = $.trim(originalTransition.replace(/^[ ,]+/, '').replace(/[ ,]+$/, '').replace(/,[ ]+,/, ''));
        },
        /**
         * Give either 'left' or 'top' as properties, will turn them into a translate3d value
         * @param [String] camelProperty - 'left' or 'top' property to turn into a translate3d
         * @param [String] value - value to translate to
         * @returns {String}
         * @private
         */
        _buildTranslate3d: function (camelProperty, value) {
            var translate = 'translate3d(';
            if (camelProperty === 'left') {
                translate += value;
            } else {
                translate += '0px';
            }
            translate += ',';
            if (camelProperty === 'top') {
                translate += value;
            } else {
                translate += '0px';
            }
            translate += ',0px)';
            return translate;
        },
        /***************************
         * Generic Transition Helpers
         ***************************/
        /**
         * Given a number or string, will return a string version with units
         * @param {String} camelProperty - javascript style camel case property name
         * @param {String|Number} toValue - value that might need units added
         * @returns {String} toValue with units
         * @private
         */
        _getCssNumber: function (camelPropertyName, toValue) {
            if (!$.cssNumber[camelPropertyName]) {
                // check for raw numbers, or strings lacking units to auto add pixels
                if (_.isNumber(toValue) || !toValue.match(/[a-z%]/)) {
                    return toValue + 'px';
                }
            }
            return toValue + '';
        },
        _registerTransitionEndListener: function ($el, deferred, propertyName) {
            if ($.support.css.transition) {
                return $.support.css.transition.registerTransitionEndListener($el[0], deferred, propertyName);
            } else {
                return $.Deferred.reject();
            }
        }
    };
    return new Animations();
});
