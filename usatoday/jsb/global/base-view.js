define(['jquery', 'underscore', 'backbone', 'utils', 'pubsub', 'state', 'global/progressive-animation', 'easing', 'transformSupport'],
    function($, _, Backbone, Utils, PubSub, StateManager, ProgAnimations) {
        "use strict";
        var BaseView = Backbone.View.extend(
        /**
          * @lends baseview.prototype
          */
        {
            // css transitions constants
            useCSSTransitions: !!$.support.css.transition,
            transEndEventNames: $.support.css.transition && $.support.css.transition.endEventNames,
            transitionCssName: $.support.css.transition && $.support.css.transition.cssName,
            transitionEndName: $.support.css.transition && $.support.css.transition.endName,
            // css transform constants
            useCSSTransforms: !!$.support.css.transform,
            transformOriginCssName: $.support.css.transform && $.support.css.transform.originCssName,
            transformCssName: $.support.css.transform && $.support.css.transform.cssName,
            transformStyleCssName: $.support.css.transform && $.support.css.transform.styleCssName,
            backfaceVisibilityCssName: $.support.css.transform && $.support.css.transform.backfaceVisibilityCssName,
            transformCssHyphenName: $.support.css.transform && $.support.css.transform.cssHyphenName,
            perspectiveCssName: $.support.css.transform && $.support.css.transform.perspectiveCssName,
            perspectiveOriginCssName: $.support.css.transform && $.support.css.transform.perspectiveOriginCssName,
            // browser detection
            isSafari6: navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') === -1 &&
                                                                navigator.userAgent.indexOf('Version/6') !== -1,
            isSafari5: navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') === -1 &&
                                                                navigator.userAgent.indexOf('Version/5') !== -1,
            isApple: navigator.userAgent.indexOf('iPhone') > -1 || navigator.userAgent.indexOf('iPad') > -1,
            pubSub: null,
            options: {animations: {
                fadeIn: {
                    duration: 200,
                    easing: 'easeInQuad'
                },
                fadeOut: {
                    duration: 200,
                    easing: 'easeOutSine'
                },
                slide: {
                    duration: 350,
                    easing: 'ease-in-out'
                },
                useCSSTransitions: true,
                useCSSTransforms: true
            }},
            /**
             * @classdesc Backbone wrapper that provides basic destruction, subview, and animate helper functions
             * @author Jay Merrifield <jmerrifiel@gannett.com>
             * @constructs baseview
             * @param {Object} options backbone options object
             *     @param {jQuery|Element|String} options.el - element or string selector to attach to
             */
            initialize: function(options){
                this.options = $.extend(true, {}, BaseView.prototype.options, options);
                this.useCSSTransitions = (this.options.animations.useCSSTransitions && this.useCSSTransitions);
                if (!this.useCSSTransitions){
                    this.useCSSTransforms = false;
                } else {
                    this.useCSSTransforms = (this.options.animations.useCSSTransforms && this.useCSSTransforms);
                }
                this.seenModules = {};
                this.subviews = this.subviews || {};
                this.clear$$(); // initialize the object

                if (this.pubSub){
                    PubSub.attach(this.pubSub, this);
                }
            },

            /**
             * queries the $el for a selector and caches the result
             * @param {String} cssSelector selector to query
             * @return {jQuery}
             */
            $$: function(cssSelector){
                var dom = this.cachedSelectors[cssSelector];
                if (!dom){
                    dom = this.$(cssSelector);
                    this.cachedSelectors[cssSelector] = dom;
                }
                return dom;
            },

            /**
             * clears the cached selectors
             * @param {String} [cssSelector] optional css selector to provide, if not provided will clear all selectors
             */
            clear$$: function(cssSelector){
                if (cssSelector){
                    delete this.cachedSelectors[cssSelector];
                }else{
                    this.cachedSelectors = {};
                }
            },

            /**
             * Extra functionality added to backbone's setElement,
             * essentially clears all selectors related to the old $el
             */
            setElement: function(){
                this.clear$$();
                Backbone.View.prototype.setElement.apply(this, arguments);
            },

            /**
             * Clean up view.
             * Removes event handlers and element (optionally).
             * @param {Boolean} removeEl Option to also remove the html from the DOM.
             * @param {Boolean} paused Option to specify if the modules being destroyed are being
             *                          destroyed cause the view is being paused vs removed.
             */
            destroy: function(removeEl, paused) {
                this.destroyed = true;
                this.destroyModules(removeEl, paused);
                this.clear$$(); // detach all dom references
                if (this.pubSub) PubSub.unattach(this.pubSub, this);
                if (removeEl) this.$el.remove();
            },
            /**
             * Destroys the subviews of this view
             * @param {Boolean} removeEl Option to of whether to remove the subview from the DOM.
             * @param {Boolean} paused Option to specify if the modules being destroyed are being
             *                          destroyed cause the view is being paused vs removed.
             */
            destroyModules: function(removeEl, paused){
                this._callCollection(this.subviews, 'destroy', [removeEl, paused]);
                this.undelegateEvents();
                this.subviews = {};
            },

            /**
             * Triggers an event on the subviews.
             * @param {String} name - name of function to call on subviews
             * @param {...*} args - any arguments that should be passed to the subviews
             */
            triggerEvent: function(name){
                var args = Array.prototype.slice.call(arguments, 1);
                this._callCollection(this.subviews, name, args);
            },

            _callCollection: function(collection, name, args){
                _.each(collection, function(module) {
                    // if we get an array of instances, iterate and destroy
                    try{
                        if ($.isArray(module)) {
                            _.each(module, function(m) {
                                if ($.isFunction(m[name])){
                                    m[name].apply(m, args);
                                }
                            });
                        } else if (module && $.isFunction(module[name])){
                            module[name].apply(module, args);
                        }
                    }catch(ex){
                        console.error('subview threw exception on destruction: ',
                            (ex.stack || ex.stacktrace || ex.message));
                    }
                });
            },

            /**
             * Registers a navigation animation that should defer all incoming ajax requests
             * @param {Deferred} deferred jQuery promise object
             * @param {jQuery} [el] dom element
             * @param {String} [property] name
             * @param {String|Number} [value] being animated to
             * @param {Number} [timeMs] time for animation
             * @return {Deferred} representing when all animations are done
             */
            registerAnimation: function(deferred, el, property, value, timeMs){
                return StateManager.registerAnimation(deferred, el, property, value, timeMs);
            },

            /**************************************************************
             * Utility Transition & Animation Functions
             **************************************************************/

            /**
             * Utility function that will animate an element using css or jquery animation
             * based on the capabilities of the browser
             * @param {jQuery} el element to animate
             * @param {String} property property name to animate
             * @param {String} value property value to animate to
             * @param {Number} timeMs time in milliseconds the animation should take
             * @param {String} easing the easing algorithm to use, defaults to 'linear' if absent
             * @param {Number} [delay=0] time in milliseconds the animation should delay for
             * @return {Deferred} promise that will resolve when the animation finishes
             */
            animate: function(el, property, value, timeMs, easing, delay){
                if (!el || el.length === 0){
                    console.error('tried animating null or empty jquery object');
                    return $.Deferred().reject();
                }
                var results = [];
                // safari 5 and safari 6 have serious bugs with opacity transitions, turn them off
                if ((this.isSafari5 || this.isSafari6) && property === 'opacity') {
                    timeMs = 0;
                }
                el.each(_.bind(function(index, element){
                    if(this.useCSSTransitions && !this.isSafari5) {
                        results.push(ProgAnimations.cssTransition(this.useCSSTransforms, $(element), property, value, timeMs, easing, delay));
                    } else {
                        results.push(ProgAnimations.jQuery($(element), property, value, timeMs, easing, delay));
                    }
                }, this));
                return $.when.apply($,results);
            },

            /**
             * Show the 'el'. Optionally by fading them in.
             * @param {Boolean} transition Fade in the element.
             * @param {Function} legacyCallback deprecated callback function
             * @return {Deferred} that will resolve when the animation finishes
             */
            show: function(transition, legacyCallback) {
                var promise, fadeIn = this.options.animations.fadeIn;
                if(transition && !this.isSafari5 && !this.isSafari6) {
                    promise = this.$el.fadeTo(
                        fadeIn.duration,
                        1,
                        fadeIn.easing
                    ).promise();
                    this.registerAnimation(promise, this.$el, 'opacity', 1);
                } else {
                    //we set the css directly instead of calling jquery to avoid
                    // a css recalculation triggered by jquery
                    promise = $.Deferred();
                    _.defer(function(){
                        promise.resolve();
                    });
                    this.$el.css({display: 'block', opacity: 1});
                }
                promise.done(function(){
                    if (legacyCallback){
                        legacyCallback();
                    }
                });
                return promise;
            },

            /**
             * Hide the cards. Optionally by fading them out.
             * @param {Boolean} transition Fade out the element.
             * @param {Function} legacyCallback deprecated callback function
             * @return {Deferred} that will resolve when the animation finishes
             */
            hide: function(transition, legacyCallback) {
                var promise, fadeOut = this.options.animations.fadeOut;
                if(transition && !this.isSafari5 && !this.isSafari6) {
                    promise = this.$el.fadeTo(
                        fadeOut.duration,
                        0,
                        fadeOut.easing
                    ).promise();
                    // jquery sets display: block on anything it's fading, but we want the end result to be gone
                    promise.done(_.bind(function(){
                        this.$el.css({display: 'none'});
                    }, this));
                    this.registerAnimation(promise, this.$el, 'opacity', 0, fadeOut.duration);
                } else {
                    //we set the css directly instead of calling jquery to avoid
                    // a css recalculation triggered by jquery
                    promise = $.Deferred().resolve();
                    this.$el.css({display: 'none', opacity: 0});
                }
                promise.done(function(){
                    if (legacyCallback){
                        legacyCallback();
                    }
                });
                return promise;
            },

            /**
             * Helper to create subviews against jQuery selectors.
             * Loops over instances and adds to array for eventual destruction.
             *
             * @param {String} name. Name to give to subview object.
             * @param {String} selector. CSS selector to search against with jQuery.
             * @param {Object} View. Backbone View.
             * @param {Object} options. Options to pass to View.
             */
            setupSub: function(name, selector, View, options) {
                options = options || {};
                var subviews = this.subviews[name];
                if (!subviews) {
                    this.subviews[name] = subviews = [];
                }
                this.$(selector).each(function(i, el) {
                    options.el = el;
                    subviews.push(new View(options));
                });
            },

            /**
             * Given a list of modules which contain a module name, optional selector, position, layoutType, and options, will construct them
             * @param {Array} modules
             * @return {Deferred} resolves when the modules are fetched and inited
             */
            buildModules: function(modules) {
                return StateManager.fetchPageModules(modules).done(_.bind(this._initModules, this));
            },

            /**
             * Given a list of modules which contain the require ModuleClass, and options, will construct them
             * @param modules
             * @private
             */
            _initModules: function(modules) {
                if (this.destroyed) {
                    return;
                }
                _.each(modules, function(module) {
                    var selector = module.selector,
                        instance = this.seenModules[module.name] || 0;
                    if (module.position) {
                        selector = '#module-position-' + module.position + selector + ',#module-position-' + module.position + ' ' + selector;
                    }
                    this.$(selector).each(_.bind(function(idx, el) {
                        var options = $.extend(true, {}, module.options);
                        options.el = el;
                        options.layoutType = module.layoutType;
                        try {
                            this.subviews[module.name + instance] = new module.ModuleClass(options);
                        } catch (ex) {
                            console.error('failed loading module ' + module.name, (ex.stack || ex.stacktrace || ex.message));
                        }
                        instance = instance + 1;
                    }, this));
                    this.seenModules[module.name] = instance;
                }, this);
            }
        });
        return BaseView;
    }
);
