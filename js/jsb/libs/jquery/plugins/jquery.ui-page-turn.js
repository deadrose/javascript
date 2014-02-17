define([
    'jquery',
    'transformSupport'
], function($) {
    'use strict';
    var dataName = 'uiPageTurn';
    var defaults = {
        useTransforms: !!$.support.css.transform,
        fallback: 'crossfade', // or 'slide'
        pageSelector: '.ui-page-turn',
        placerSelector: '.ui-placer',
        transitionTiming: 'linear',
        turnDuration: 300,
        perspective: '2200px',
        slideDuration: 200,
        fadeDuration: 200,
        shadow: true,
        shadowOpacity: 0.7,

        onPageTurn: function($el){}
    };

    var methods = {
        init : function(options){
            return this.each(function(){
                var $this = $(this);
                var settings = $.extend({}, defaults, options);
                var $currentPage = $this.find(settings.pageSelector + '.active');
                if ($currentPage.length === 0){
                    $currentPage = $this.children(':first');
                }
                $currentPage.next(settings.pageSelector).addClass('preload');
                $this.data(dataName, {
                    currentPage: $currentPage,
                    busy: false,
                    settings: settings
                });
            });
        },
        option: function(key, value){
            var data = this.data(dataName);
            if (data && key){
                if (value){
                    if (typeof(value) === 'function' ||
                        key !== 'onPageTurn'
                        ){
                        data[key] = value;
                    }
                }else{
                    return data[key];
                }
            }
        },
        nextPage: function(immediate, fallback) {
            var data = this.data(dataName),
                settings = data.settings,
                $currentPage = data.currentPage,
                $nextPage = $currentPage.next(settings.pageSelector);
            return privateMethods.transition(this, $currentPage, $nextPage, false, settings, data, immediate, fallback);
        },
        prevPage: function(immediate, fallback) {
            var data = this.data(dataName),
                settings = data.settings,
                $currentPage = data.currentPage,
                $prevPage = $currentPage.prev(settings.pageSelector);
            return privateMethods.transition(this, $currentPage, $prevPage, true, settings, data, immediate, fallback);
        },
        goToPage: function(index, immediate, fallback){
            var data = this.data(dataName),
                settings = data.settings,
                $currentPage = data.currentPage,
                $nextPage = this.children(settings.pageSelector).eq(index),
                currentIndex = $currentPage.index(settings.pageSelector);
            if (currentIndex === index){ return $.Deferred().reject(); }
            return privateMethods.transition(this, $currentPage, $nextPage, currentIndex > index, settings, data, immediate, fallback);
        },
        getCurrentPage: function(){
            var data = this.data(dataName);
            return data.currentPage;
        }
    };

    var privateMethods = {
        transition: function($el, $currentPage, $nextPage, leftToRight, settings, data, immediate, fallback){
            var promise;
            if (!$nextPage.length || data.busy) {return $.Deferred().reject();}

            if (immediate) {
                privateMethods.finishTransition($currentPage, $nextPage, leftToRight, settings, data);
                return $.Deferred().resolve();
            }
            data.busy = true;

            $nextPage.removeClass('preload');

            if (!fallback && settings.useTransforms){
                promise = privateMethods.flipTransform($el, $currentPage, $nextPage, leftToRight, settings);
            }else if (settings.fallback === 'slide'){
                promise = privateMethods.slideTransition($currentPage, $nextPage, leftToRight, settings);
            }else{
                promise = privateMethods.fadeTransition($currentPage, $nextPage, settings);
            }
            promise.done(function(){
                privateMethods.finishTransition($currentPage, $nextPage, leftToRight, settings, data);
            });
            return promise;
        },
        finishTransition: function($currentPage, $nextPage, leftToRight, settings, data) {
            settings.onPageTurn($nextPage);
            data.busy = false;
            $currentPage.removeClass('active');
            $nextPage.addClass('active');
            if (leftToRight) {
                $nextPage.prev(settings.pageSelector).addClass('preload');
            } else {
                $nextPage.next(settings.pageSelector).addClass('preload');
            }
            data.currentPage = $nextPage;
        },
        flipTransform: function($el, $currentPage, $nextPage, leftToRight, settings){
            $currentPage.removeClass('active');

            var $currentAnimator = $currentPage.clone(),
                $nextAnimator = $nextPage.clone(),
                $beforeShadow = $('<div class="ui-shadow"></div>'),
                $afterShadow = $('<div class="ui-shadow"></div>'),
                $animatorWrap = $('<div class="ui-page-turn-animator"></div>');

            if (settings.shadow) {
                $nextPage.append($beforeShadow);
                $currentPage.append($afterShadow);
                $beforeShadow.css({opacity: settings.shadowOpacity});
                $afterShadow.css({opacity: 0});
            }

            $animatorWrap.append($currentAnimator);
            $animatorWrap.append($nextAnimator);
            $el.append($animatorWrap);
            if (leftToRight){
                $currentPage.addClass('right');
                $nextPage.addClass('left');
                $nextAnimator.addClass('right');
                $currentAnimator.addClass('left');
            } else {
                $currentPage.addClass('left');
                $nextPage.addClass('right');
                $nextAnimator.addClass('left');
                $currentAnimator.addClass('right');
            }

            // clones animate
            privateMethods.setupTransition($el[0], $animatorWrap[0], $currentAnimator[0], $nextAnimator[0], leftToRight, settings);

            var deferred = $.Deferred();
            $.support.css.transition.registerTransitionEndListener($animatorWrap[0], deferred).done(function(){
                // cleanup
                $afterShadow.remove();
                $beforeShadow.remove();
                $animatorWrap.remove();
                $nextPage.removeClass('left right');
                $currentPage.removeClass('left right');
                $el[0].style[$.support.css.transform.perspectiveCssName] = '';
                $el[0].style[$.support.css.transform.styleCssName] = '';
            });

            // Start transition.
            setTimeout(function(){
                var rotation = leftToRight ? 'rotateY(180deg)' : 'rotateY(-180deg)';
                $animatorWrap[0].style[$.support.css.transform.cssName] = rotation;
                if (settings.shadow) {                
                    $beforeShadow[0].style[$.support.css.transition.cssName] = privateMethods.getTransitionStyle('opacity', settings.turnDuration / 2, settings.transitionTiming);
                    $afterShadow[0].style[$.support.css.transition.cssName] = privateMethods.getTransitionStyle('opacity', settings.turnDuration / 2, settings.transitionTiming, settings.turnDuration / 2);
                    $beforeShadow.css({opacity: 0});
                    $afterShadow.css({opacity: settings.shadowOpacity});
                }
            }, 20);
            return deferred.promise();
        },
        slideTransition: function($currentPage, $nextPage, leftToRight, settings){
            $nextPage.addClass('active');
            $currentPage.css({left: '0%'});
            if (leftToRight){
                $nextPage.css({left: '-100%'});
            }else{
                $nextPage.css({left: '100%'});
            }
            if ($.support.css.transition){
                var transitionStyle = privateMethods.getTransitionStyle('left', settings.slideDuration, settings.transitionTiming);
                $nextPage[0].style[$.support.css.transition.cssName] = transitionStyle;
                $currentPage[0].style[$.support.css.transition.cssName] = transitionStyle;
                setTimeout(function(){
                    $nextPage.css({left: '0%'});
                    $currentPage.css({left: (leftToRight ? '100%': '-100%')});
                }, 20);
                return $.support.css.transition.registerTransitionEndListener($nextPage[0]);
            }else{
                $currentPage.animate({left: (leftToRight ? '100%': '-100%')}, settings.slideDuration, settings.transitionTiming);
                return $nextPage.animate({left: '0%'}, settings.slideDuration, settings.transitionTiming).promise();
            }
        },
        fadeTransition: function($currentPage, $nextPage, settings){
            $currentPage.css({opacity: 1, 'z-index': 11}).show();
            $nextPage.css({opacity: 1, 'z-index': 10}).show();
            var promise = $currentPage.fadeOut(settings.fadeDuration).promise();
            promise.done(function(){
                $currentPage.css({'z-index': ''});
                $nextPage.css({'z-index': ''});
            });
            return promise;
        },
        getTransitionStyle: function(property, duration, timing, delay){
            var style = property + ' ' + duration + 'ms ' + timing;
            if (delay){
                style += ' ' + delay + 'ms';
            }
            return style;
        },
        setupTransition: function(el, animatorWrap, currentPane, nextPane, leftToRight, settings){
            el.style[$.support.css.transform.perspectiveCssName] = settings.perspective;
            el.style[$.support.css.transform.styleCssName] = 'preserve-3d';
            animatorWrap.style[$.support.css.transform.styleCssName] = 'preserve-3d';
            animatorWrap.style[$.support.css.transform.perspectiveCssName] = settings.perspective;
            animatorWrap.style[$.support.css.transition.cssName] = privateMethods.getTransitionStyle($.support.css.transform.cssHyphenName, settings.turnDuration, settings.transitionTiming);
            currentPane.style[$.support.css.transform.styleCssName] = 'preserve-3d';
            currentPane.style[$.support.css.transform.cssName] = 'rotateY(0deg)';
            currentPane.style[$.support.css.transform.backfaceVisibilityCssName] = 'hidden';
            nextPane.style[$.support.css.transform.styleCssName] = 'preserve-3d';
            if (leftToRight){
                currentPane.style[$.support.css.transform.originCssName] = 'right center';
                nextPane.style[$.support.css.transform.originCssName] = 'left center';
                nextPane.style[$.support.css.transform.cssName] = 'rotateY(-180deg) translateZ(1px)';
            }else{
                currentPane.style[$.support.css.transform.originCssName] = 'left center';
                nextPane.style[$.support.css.transform.originCssName] = 'right center';
                nextPane.style[$.support.css.transform.cssName] = 'rotateY(180deg) translateZ(1px)';
            }
        }
    };

    $.fn.uiPageTurn = function(method){
        if (methods[method]){
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        }else if (typeof method === 'object' || !method){
            return methods.init.apply(this, arguments);
        }else{
            $.error('Method ' +  method + ' does not exist on jQuery.uiPageTurn' );
        }
    };
});