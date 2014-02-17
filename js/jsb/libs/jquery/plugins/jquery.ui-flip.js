define([
    'jquery',
    'transformSupport'
], function($) {
    'use strict';
    var dataName = 'uiPageFlip';
    var defaults = {
        useTransforms: !!$.support.css.transform,
        transitionTiming: 'linear',
        flipDuration: 300,
        flipFrontSelector: '.ui-flip-panel',
        flipBackSelector: '.ui-flip-panel',
        activePanelClass: 'active',
        perspective: '900px',
        fadeDuration: 200,

        onFlip: function($activePanel) {
        }
    };

    var methods = {
        init: function(options) {
            return this.each(function() {
                var $this = $(this);
                var settings = $.extend({}, defaults, options);
                $this.data(dataName, {
                    busy: false,
                    settings: settings
                });
            });
        },
        option: function(key, value) {
            var data = this.data(dataName);
            if (data && key) {
                if (value) {
                    if (typeof(value) === 'function' || key !== 'onFlip') {
                        data[key] = value;
                    }
                } else {
                    return data[key];
                }
            }
        },
        flipForward: function(immediate) {
            var data = this.data(dataName),
                settings = data.settings,
                panels = this.find(settings.flipFrontSelector);
            return privateMethods.transition(this, panels.filter('.active'), panels.filter(':not(.active)'), true, settings, data, immediate);
        },
        flipBackward: function(immediate) {
            var data = this.data(dataName),
                settings = data.settings,
                panels = this.find(settings.flipFrontSelector);
            return privateMethods.transition(this, panels.filter('.active'), panels.filter(':not(.active)'), false, settings, data, immediate);
        }
    };

    var privateMethods = {
        transition: function($wrapper, $front, $back, forward, settings, data, immediate) {
            var promise;

            if (data.busy) {
                return $.Deferred().reject();
            }
            if (immediate) {
                settings.onFlip($back);
                $back.addClass('active');
                $front.removeClass('active');
                return $.Deferred().resolve();
            }
            data.busy = true;

            $back.addClass('active');
            if (settings.useTransforms) {
                promise = privateMethods.flipTransform($wrapper[0], $front[0], $back[0], forward, settings);
            } else {
                promise = privateMethods.fadeTransition($front, $back, settings);
            }
            promise.done(function() {
                settings.onFlip($back);
                data.busy = false;
                $front.removeClass('active');
            });
            return promise;
        },
        flipTransform: function(wrapper, front, back, forward, settings) {
            privateMethods.setupTransition(wrapper, front, back, forward, settings);

            var deferred = $.Deferred();
            $.support.css.transition.registerTransitionEndListener(front, deferred).done(function() {
                // cleanup
                front.style[$.support.css.transform.backfaceVisibilityCssName] = '';
                front.style[$.support.css.transform.styleCssName] = '';
                front.style[$.support.css.transition.cssName] = '';
                front.style[$.support.css.transform.cssName] = '';
                back.style[$.support.css.transform.backfaceVisibilityCssName] = '';
                back.style[$.support.css.transform.styleCssName] = '';
                back.style[$.support.css.transition.cssName] = '';
                back.style[$.support.css.transform.cssName] = '';
                wrapper.style[$.support.css.transform.perspectiveCssName] = '';
                wrapper.style[$.support.css.transform.styleCssName] = '';
            });

            // Start transition.
            setTimeout(function() {
                var rotation = 'rotateX(' + (forward ? '' : '-') + '180deg)';
                front.style[$.support.css.transform.cssName] = rotation;
                back.style[$.support.css.transition.cssName] = privateMethods.getTransitionStyle($.support.css.transform.cssHyphenName, settings.flipDuration, settings.transitionTiming);
                back.style[$.support.css.transform.cssName] = 'rotateX(0deg)';
            }, 20);
            return deferred.promise();
        },
        fadeTransition: function($front, $back, settings) {
            $front.css({opacity: 1, 'z-index': 11}).show();
            $back.css({opacity: 1, 'z-index': 10}).show();
            var promise = $front.fadeOut(settings.fadeDuration).promise();
            promise.done(function() {
                $front.css({'z-index': ''});
                $back.css({'z-index': ''});
            });
            return promise;
        },
        getTransitionStyle: function(property, duration, timing, delay) {
            var style = property + ' ' + duration + 'ms ' + timing;
            if (delay) {
                style += ' ' + delay + 'ms';
            }
            return style;
        },
        setupTransition: function(wrapper, front, back, forward, settings) {
            var backRotation = 'rotateX(' + (forward ? '-' : '') + '180deg)';
            wrapper.style[$.support.css.transform.perspectiveCssName] = settings.perspective;
            wrapper.style[$.support.css.transform.styleCssName] = 'preserve-3d';

            front.style[$.support.css.transform.backfaceVisibilityCssName] = 'hidden';
            front.style[$.support.css.transform.styleCssName] = 'preserve-3d';
            front.style[$.support.css.transition.cssName] = privateMethods.getTransitionStyle($.support.css.transform.cssHyphenName, settings.flipDuration, settings.transitionTiming);
            front.style[$.support.css.transform.cssName] = 'rotateX(0deg)';

            back.style[$.support.css.transform.backfaceVisibilityCssName] = 'hidden';
            back.style[$.support.css.transform.styleCssName] = 'preserve-3d';
            back.style[$.support.css.transform.cssName] = backRotation;
        }
    };

    $.fn.uiFlip = function(method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.uiPageTurn');
        }
    };
});