/*
 * Sets up jquery
 */
define([
    'jquery'
], function($) {
    $.support.css = $.support.css || {};
    if (Modernizr.csstransitions){
        $.support.css.transition = {
            cssName: Modernizr.prefixed('transition'),
            endEventNames: {
                'WebkitTransition' : 'webkitTransitionEnd',
                'MozTransition'    : 'transitionend',
                'OTransition'      : 'oTransitionEnd',
                'msTransition'     : 'MSTransitionEnd',
                'transition'       : 'transitionend'
            }
        };
        $.support.css.transition.endName = $.support.css.transition.endEventNames[$.support.css.transition.cssName];
        $.support.css.transition.registerTransitionEndListener = function(el, deferred, propertyName){
            if (!deferred){
                deferred = $.Deferred();
            }
            var transitionEndName = $.support.css.transition.endName;
            var transitionEndFunc = function transitionEnd(e){
                // propertyName is optional
                if (e.target == el && (!propertyName || e.propertyName === propertyName)) {
                    this.removeEventListener(transitionEndName, transitionEndFunc);
                    deferred.resolve();
                    transitionEndFunc = null;
                }
            };
            el.addEventListener(transitionEndName, transitionEndFunc);
            return deferred.promise();
        };
    }
    if (Modernizr.csstransforms3d &&
        // and not safari 5
        !(navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') === -1 &&
        navigator.userAgent.indexOf('Version/5') !== -1)){

        $.support.css.transform = {
            cssName: Modernizr.prefixed('transform'),
            originCssName: Modernizr.prefixed('transformOrigin'),
            styleCssName: Modernizr.prefixed('transformStyle'),
            backfaceVisibilityCssName: Modernizr.prefixed('backfaceVisibility'),
            perspectiveCssName: Modernizr.prefixed('perspective'),
            perspectiveOriginCssName: Modernizr.prefixed('perspectiveOrigin')
        };
        $.support.css.transform.cssHyphenName = $.support.css.transform.cssName.replace(/([A-Z])/g,
            function(str,m1){
                return '-' + m1.toLowerCase();
            }).replace(/^ms-/,'-ms-');
    }
});