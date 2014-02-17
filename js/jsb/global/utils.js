/*global Modernizr:true*/
define([
    'jquery',
    'underscore',
    'backbone',
    'pubsub'
],
function(
    $,
    _,
    Backbone,
    PubSub
){
    'use strict';
    /**
     * Global Utils to be used for any globally required
     * references -- cached DOM lookups, global properties, utility functions etc.
     * @exports utils
     * @author Erik Kallevig <ekallevig@gannett.com>
     */
    var Utils = function(){
        this.storage = {};
        this.set('DEBUG', true);

        // Set global properties/lookups.
        this.set('document', $(document));
        this.set('win', $(window));
        this.set('body', $('body'));
        this.$top = this.set('scrollEl', $('html,body'));
        this.set('doc', $(document));
        this.baseUrl = window.location.protocol + '//' + window.location.host + '/';
        this.usatBetaDomain = 'http://beta.usatoday.com/';
    };
    Utils.prototype = {
        /**
         * Sets a value into the Utils key/value storage
         * @param {String} key
         * @param {*} value
         */
        set: function(key, value){
            this.storage[key] = value;
        },

        /**
         * Gets a value out of the Utils key/value storage
         * @param {String} key
         * @returns {*}
         */
        get: function(key){
            return this.storage[key];
        },

        /**
         * the page's url, without any query string or hashtags
         * this should always be valid (or the app is broken)
         */
        getPageUrl: function() {
            return document.location.protocol+'//'+document.location.host+document.location.pathname;
        },

        /**
         * Get element and call heattracking with it.
         * @param {jQuery} $sel Selector to heattrack.
         */
        setTrack: function($sel, ht, uotrack) {
            if ($sel && $sel.length) {
                ht = $sel.data('ht');
                uotrack = $sel.data('uotrack');
            }
            if (ht) PubSub.trigger('heattrack', ht);
            if (uotrack) PubSub.trigger('uotrack', uotrack);
        },

        /**
         * Gets the current scroll position, supports caching for multiple calls within one animation frame
         * @returns {Number}
         */
        getScrollPosition: function(){
            if (this.cachedScrollPosition === undefined && window.requestAnimationFrame) {
                // we only cache the scroll position if the browser supports requestAnimationFrame to
                // guarentee the user hasn't scrolled since we calculated it last
                this.cachedScrollPosition = this._getActualScrollPosition();
                window.requestAnimationFrame(_.bind(function() {
                    this.cachedScrollPosition = undefined;
                }, this));
            }
            return this.cachedScrollPosition || this._getActualScrollPosition();
        },
        _getActualScrollPosition: function(){
            return window.pageYOffset || document.documentElement.scrollTop;
        },

        /**
         * Load externally hosted script (SDK, library, etc) on-demand.
         * @param {String} scriptUrl URL of script file.
         * @param {String} symbol Unique window property from external
         *     script to validate the script has been successfully loaded.
         * @param {Function} [callback] Function to call when script has loaded.
         */
        loadScript: function(scriptUrl, symbol, callback) {
            var obj = window[symbol];
            if (obj) {
                if (callback) {
                    callback(obj);
                }
            } else {
                require([scriptUrl], function(){
                    obj = window[symbol];
                    if (!obj) {
                        console.error('Error loading ' + scriptUrl);
                    } else if (callback) {
                        callback(obj);
                    }
                });
            }
        },

        /**
         * Open a centered popup window.
         * @param {String} url URL to load in the popup.
         * @param {Number} [width=600] Width of popup.
         * @param {Number} [height=400] Height of popup.
         */
        openPopup: function(url, width, height) {
            width = width || 600;
            height = height || 400;
            var winCoords = this.popupCoords(width, height);
            window.open(
                url,
                '',
                'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,' +
                    'height='+ height +',width='+ width +',top='+ winCoords.top +
                    ',left='+ winCoords.left
            );
        },

        /**
         * mirroring the functionality of python's get_nested() function which will deep dive into an object with
         * crashing on null values
         * @param {Object} obj - object to retrieve a nested value from
         * @param {...String|Number} arguments - comma seperated list of keys to retrieve
         */
        getNested: function(obj){
            var pointer = obj;
            if (pointer) {
                for (var i = 1; i < arguments.length; i++) {
                    pointer = pointer[arguments[i]];
                    if (!pointer) {
                        break;
                    }
                }
            }
            return pointer;
        },

        /**
         * Reads from the window object site_vars.sections which should contain the site's home sections | separated.
         * @returns {Array}
         */
        getSiteSections: function(){
            var sectionStr = this.getNested(window, 'site_vars', 'sections') || '';
            if (sectionStr) {
                return sectionStr.split('|');
            } else {
                return [];
            }
        },

        /**
         * Calculate and return coordinates for centering a popup window to
         *     the outerWidth/outerHeight of the browser window.
         * @param {Number} w Width of popup window.
         * @param {Number} h Height of popup window.
         */
        popupCoords: function(w, h) {
            var wLeft = window.screenLeft ? window.screenLeft : window.screenX;
            var wTop = window.screenTop ? window.screenTop : window.screenY;
            var wWidth = window.outerWidth ? window.outerWidth : document.documentElement.clientWidth;
            var wHeight = window.outerHeight ? window.outerHeight : document.documentElement.clientHeight;

            // Subtract 25 pixels to top to approximately compensate for chrome
            // on top of popup window, since we can't calculate that before
            // opening it.
            return {
                left: wLeft + (wWidth / 2) - (w / 2),
                top: wTop + (wHeight / 2) - (h / 2) - 25
            };
        },

        /**
         * Check if fragment matches defined 'Router' routes.
         * NOTE: using internal Backbone.history functions -- when upgrading
         * Backbone, must ensure these functions stil exist.
         * @param {String} fragment Url fragment to test.
         * @return {String} of the fragment that matched, or null if no match is found
         */
        getDefinedRoute: function(fragment) {
            if (!fragment || fragment === '#') return null;
            // strip out usatDomain
            fragment = fragment.replace(this.usatDomainRegex, '');
            if (!fragment.indexOf(this.baseUrl)){
                fragment = fragment.substring(this.baseUrl.length);
            } else if (!fragment.indexOf(this.usatBetaDomain)) {
                fragment = fragment.substring(this.usatBetaDomain.length);
            } else if (fragment.indexOf('://') !== -1){
                return null;
            }
            // this trims off the root of the fragment if one exists
            fragment = Backbone.history.getFragment(fragment);
            var matched = _.any(Backbone.history.handlers, function(handler) {
                return handler.route.test(fragment);
            });
            if (matched){
                return fragment;
            } else{
                return null;
            }
        },

        /**
         * Given a targetLink, either being a string, a jquery element, or a dom element,
         * will trigger either an ajax navigation to the link or a window.location change
         * @param {jQuery|Element|String} targetLink string url, or element with href attribute specifying a url
         * @param {Object} [ht] heattrack value to send for analytics
         * @param {Object} [uotrack] uotrack value to send for analytics
         * @param {Boolean} [skipTrigger] whether backbone should trigger the javascript for the target link
         * @returns {Boolean} whether or not the url was valid
         */
        triggerRoute: function(targetLink, ht, uotrack, skipTrigger){
            var href;
            if (targetLink instanceof $ || _.isElement(targetLink)) {
                var $targetLink = $(targetLink);
                href = $targetLink.attr('href');
                this.setTrack($targetLink);
            } else if (_.isString(targetLink)) {
                href = targetLink;
                this.setTrack(undefined, ht, uotrack);
            }
            href = $.trim(href);
            if (this.isValidUrl(href)){
                if (href[0] === '#'){
                    var offset = $('a[name=' + href.substring(1) + ']').offset();
                    if (offset && offset.top) { // why scrollTop(0) twice?
                        this.$top.scrollTop(offset.top - 40);
                    }
                    return false;
                }
                if (Modernizr.history){
                    var fragment = this.getDefinedRoute(href);
                    if (fragment !== null){
                        Backbone.history.navigate(fragment, {trigger: skipTrigger ? false : true});
                        return true;
                    }
                }
                if (!skipTrigger){
                    window.location = href;
                    return true;
                }
            }
            return false;
        },

        isValidUrl: function(href){
            /*jshint scripturl:true*/
            if (!href){
                return false;
            } else if (href.indexOf('mailto:') !== -1) {
                return true;
            } else if (href.indexOf('javascript:') !== -1){
                return false;
            } else if (href[0] === '#'){
                if (href.length === 1) {
                    return false;
                }
            } else if (href.indexOf('../') !== -1){
                console.error('Attempting to load a relative url, bad code monkey! (' + href + ')');
                return false;
            } else if (href[0] !== '/' && href.indexOf('://') === -1){
                console.error('Attempting to load a relative url, bad code monkey! (' + href + ')');
                return false;
            }
            return true;
        },

        /**
         * Format number (or string version of number) to use commas.
         * 40532 -> 40,532
         *
         * @param {Number} nStr Number to format
         */
        addCommas: function(nStr) {
            nStr += '';
            var x = nStr.split('.');
            var x1 = x[0];
            var x2 = x.length > 1 ? '.' + x[1] : '';
            var rgx = /(\d+)(\d{3})/;
            while (rgx.test(x1)) {
                x1 = x1.replace(rgx, '$1' + ',' + '$2');
            }
            return x1 + x2;
        },

        /**
         * Lazy load an image. Moves data-src attribute to src.
         * @param {jQuery} $img jQuery object e.g. $('img')
         * @param {String} [dataSrcAttr="data-src"] optional parameter to specify which dataSrcAttr to retrieve
         * @param {Boolean} [keepAttr=false] optional parameter that will keep the attribute instead of deleting it
         * @param {Function} [onError] optional function to call when an image fails to load
         * @returns {Boolean} true if a lazy image was found and triggered to load
         */
        lazyLoadImage: function($img, dataSrcAttr, keepAttr, onError) {
            var hasLazyImage = false;
            dataSrcAttr = dataSrcAttr || 'data-src';
            $img.each(_.bind(function(index, el){
                var dataSrc = $(el).attr(dataSrcAttr), src = $(el).attr('src');
                if (dataSrc && src !== dataSrc) {
                    $(el).attr('src', dataSrc);
                    if (!keepAttr){
                        $(el).removeAttr(dataSrcAttr);
                    }
                    $(el).on('error', _.bind(this.lazyLoadError, $(el), onError));
                    hasLazyImage = true;
                }
            }, this));
            return hasLazyImage;
        },

        /**
         * get section path function
         * returns the section name without the slash
         * @param {String} [path] story folder path.
         */
        getSectionPath: function(path) {
            if (path) {
                var query = path.indexOf('?');
                if (query !== -1) {
                    path = path.substring(0, query);
                }
            }
            if (path && path !== '/'){
                if (path[0] === '/') {
                    path = path.substring(1);
                }
                var slashIndex = path.indexOf('/');
                if (slashIndex === -1){
                    return path;
                }else{
                    return path.substring(0, slashIndex);
                }
            }else{
                return 'home';
            }
        },

        /**
         * gets the sub section name from the path
         * @param {String} [path] story folder path.
         */
        getSubSection: function(path) {
            if (path) {
                var query = path.indexOf('?');
                if (query !== -1) {
                    path = path.substring(0, query);
                }
                if (path[path.length - 1] !== '/') {
                    path = path + '/';
                }
                var startIndex = path.indexOf('/', 1),
                    endIndex = path.indexOf('/', startIndex + 1);
                if (startIndex !== -1 && endIndex !== -1) {
                    return path.substring(startIndex + 1, endIndex);
                }
            }
            return '';
        },

        /**
         * Lazy load error function
         * hides the image that threw the error, optionally calls an error function
         * @param {Function} [onError] optional function to call when an image fails to load.
         */
        lazyLoadError: function(onError) {
            $(this).hide();
            if (onError) {
                onError($(this));
            }
        },

        /**
         * Given a url to require, will load once and immediately clean up
         * @return {Deferred}
         */
        requireSingleUseScript: function(script) {
            return $.Deferred(function(defer) {
                require([script], function(view) {
                    defer.resolveWith(this, [view]);
                }, function (err) {
                    console.error('failed loading scripts', err);
                    defer.rejectWith(this, err);
                });
            }).always(_.bind(function() {
                    // cleanup
                    this.removeRequireModule(script);
                }, this)).promise();
        },

        removeRequireModule: function(url){
            require.undef(url);
            $('script[data-requiremodule="' + url + '"]').remove();
        },

        getUrlParam : function(key) {
            var s = decodeURI((new RegExp(key + '=' + '(.+?)(&|$)').exec(window.location.search)||[0,false])[1]);
            if (s === 'false') {
                return false;
            } else if (s === 'true') {
                return true;
            }
            return s;
        },

        getSessionData: function(key, defaultValue) {
            var value = sessionStorage[key];
            return (value && JSON.parse(value)) || defaultValue;
        },

        setSessionData: function(key, value) {
            if (!_.isString(value)) {
                value = JSON.stringify(value);
            }
            sessionStorage.setItem(key, value);
        },

        clearSessionData: function(key) {
            sessionStorage.removeItem(key);
        },

        /**
         * Answers the question of whether or not the document is hidden (tabbed away, backgrounded, etc
         * @returns {Boolean}
         */
        isDocumentHidden: function() {
            return document.hidden || document.webkitHidden || document.mozHidden || document.msHidden || document.oHidden;
        }
    };

    /**
     * Extend Backbone.Model to a global object.
     */
    return new Utils();
});
