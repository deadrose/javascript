/**
 * @fileoverview Simple Extendable Overlay.
 * @author Jay Merrifield
 */
define([
    'jquery', 
    'underscore', 
    'backbone', 
    'base-app', 
    'state', 
    'utils', 
    'site-manager',
    'pubsub'
],
function(
    $, 
    _, 
    Backbone, 
    BaseApp, 
    StateManager, 
    Utils, 
    SiteManager,
    PubSub
) {
    "use strict";

        /**
         * View class.
         */
        var SimpleOverlay = BaseApp.extend({
            // View element.
            el: '#overlay',

            // general overlay events.
            events: {
                'click .transition-wrap': 'close',
                'click .close-overlay': 'close'
            },

            /**
             * Initialize view.
             * @param {Object} options View options passed during init.
             */
            initialize: function(options) {
                options = $.extend(true, {
                    template: '<div id="overlay" class="no-transition">' +
                        '<div class="transition-wrap">' +
                        '<article class="asset clearfix story ui-loading light-medium">' +
                        '</article>' +
                        '</div>' +
                        '</div>'
                }, options);

                _.bindAll(this, 'resizeHandler');

                this.preloadUrl = options.preloadedUrl || '';
                this.win = Utils.get('win');
                this.scrollEl = Utils.get('scrollEl');

                this.header = SiteManager.getHeader();

                this.pubSub = {
                    'header:fixed': this.onHeaderFixed,
                    'header:unfixed': this.onHeaderUnfixed
                };

                var throttledResize = _.throttle(this.resizeHandler, 50);
                this.win.on('resize.' + this.cid, throttledResize);
                this.resizeHandler();

                // call base class initialize
                BaseApp.prototype.initialize.call(this, options);
            },

            resizeHandler: function() {
                this.winSize = {
                    width: this.win.width(),
                    height: this.win.height()
                };
                if (this.header) {
                    this.winSize.height -= this.header.getCollapsedHeight();
                }
                this.setArticleMinHeight(this.$('.transition-wrap:first .asset'));
            },

            setArticleMinHeight: function(storyArticle) {
                if (storyArticle.length && storyArticle.outerHeight() < this.winSize.height) {
                    storyArticle.css('min-height', this.winSize.height);
                }
            },

            onHeaderFixed: function() {
                this.positionCloseButton('fixed');
            },

            onHeaderUnfixed: function() {
                this.positionCloseButton('absolute');
            },

            beforeAppRemove: function(fromUrl, toUrl){
                this.positionCloseButton('absolute', Utils.getScrollPosition());
            },

            animateRemoveApp: function(fromUrl, toUrl) {
                if (this.isSafari5){
                    return this.hide();
                }
                if (this.header) {
                    this.header.updateNavigation(toUrl);
                }
                this.$el.css({position: 'relative', opacity: 1});
                return this.animate(this.$el, 'opacity', 0, 250);
            },

            beforePageReveal: function(fromUrl, toUrl, htmlFrag, paused) {
                htmlFrag.find('.asset').css('min-height', this.winSize.height);
            },

            animateRevealApp: function(fromUrl, toUrl, preload) {
                var transitionWrap = this.$('.transition-wrap');
                var height = this.winSize.height;
                if (this.isSafari5 || !this.useCSSTransforms){
                    transitionWrap.css('height', height);
                    return this.show();
                }
                transitionWrap.css({'height': height, overflow: 'hidden', opacity: 0});
                transitionWrap[0].style[this.transformCssName] = 'scale(0.4)';
                transitionWrap[0].style[this.transformOriginCssName] = '50% ' + (height * 0.25) + 'px';
                transitionWrap[0].style[this.transitionCssName] = this.transformCssHyphenName + ' 300ms linear, opacity 300ms linear';
                this.$el.show().css({opacity: 1, display: 'block'});

                // need to let the browser render the non-zoomed-in version before triggering the animation
                _.delay(_.bind(function(){
                    transitionWrap[0].style[this.transformCssName] = 'scale(1.0)';
                    transitionWrap[0].style.opacity = 1;
                }, this));

                var deferred = $.support.css.transition.registerTransitionEndListener(transitionWrap[0]);
                deferred.done(_.bind(function(){
                    transitionWrap[0].style[this.transformCssName] = '';
                    transitionWrap[0].style[this.transitionCssName] = '';
                    transitionWrap[0].style[this.transformOriginCssName] = '';
                    // transitionWrap.css({height: '', overflow: 'visible'});
                }, this));
                return deferred.promise();
            },

            getRevealAppLoader: function(toUrl){
                return this.options.template;
            },

            animateChangePagePreData: function(fromUrl, toUrl) {
                var winHeight = this.winSize.height,
                    scrollPosition = Utils.getScrollPosition(),
                    activeTransitionWrap = this.$('.transition-wrap:first');
                this.prepareContentForTransition(activeTransitionWrap, scrollPosition, winHeight);

                var htmlFrag = $(this.options.template);
                var stagedTransitionWrap = htmlFrag.find('.transition-wrap');
                this.prepareContentForTransition(stagedTransitionWrap, 0, winHeight);

                this.$el.prepend(stagedTransitionWrap);

                SiteManager.scrollTop(0);

                // Unfix close button so it can slide with card.
                this.positionCloseButton('absolute', scrollPosition, activeTransitionWrap);

                return this.swapContent(activeTransitionWrap, stagedTransitionWrap);
            },

            prepareContentForTransition: function(transitionWrap, scrollPosition, winHeight){
                transitionWrap.css({height:winHeight});
                transitionWrap.children().css({'top': -1 * scrollPosition});
            },

            animateChangePagePostData: function(fromUrl, toUrl, htmlFrag, paused) {
                var transition = htmlFrag.find('.transition-wrap');
                transition.css('height', this.winSize.height);
                this.setArticleMinHeight(transition.find('.asset'));
                return this.swapContent(this.$('.transition-wrap:first'), transition, this.getHash(toUrl)).done(_.bind(function(){
                    transition.css('height', '');
                }, this));
            },

            afterPageReveal: function(fromUrl, toUrl, paused, ViewClass){
                this.currentSection = this.getSectionName();
                if (this.header) {
                    this.header.updateNavigation(this.currentSection);
                }
                if (fromUrl === null){
                    this.preloadPath();
                }

                if (ViewClass){
                    this.subviews.view = new ViewClass({
                        el: this.$('.transition-wrap:first'),
                        path: toUrl
                    });
                }

                if (this.header && this.header.isFixed()) {
                    this.positionCloseButton('fixed');
                }
            },

            preloadPath: function(){
                StateManager.preloadPath(this.preloadUrl);
            },

            /**
             * This function sets the close button to either fixed or absolute positioning.
             * @param {String} positionType Either 'fixed' or 'absolute'.
             * @param {Number} [scrollPosition] position of where the close button should be placed, defaults to 0
             * @param {jQuery} [closeStoryWrap] The story wrap parent of the close button to position, defaults to this.$('.close-wrap').
             */
            positionCloseButton: function(positionType, scrollPosition, closeStoryWrap) {
                var closeWrap = closeStoryWrap ? closeStoryWrap.find('.close-wrap') : this.$('.close-wrap');
                if (positionType === 'absolute') {
                    closeWrap.css({ 'position': positionType, 'margin-top': '', 'top': scrollPosition || 0 });
                } else {
                    closeWrap.css({ 'position': positionType, 'margin-top': -80, 'top': '' });
                }
            },

            getSectionName: function() {
                var section = '',
                    pageInfoObj = this.pageInfo || {},
                    path;
                if (pageInfoObj && (pageInfoObj.ss || pageInfoObj.ssts)) {
                    path = pageInfoObj.ss;
                    if (!path){
                        path = pageInfoObj.ssts;
                        var split = path.indexOf('/');
                        if (split > 0){
                            path = path.substring(0, split);
                        }
                        if (_.indexOf(Utils.getSiteSections(), path) === -1){
                            path = '';
                        }
                    }
                    Utils.set('ss', path);
                    section = path;
                    if (path.indexOf('/') > 0) {
                        section = path.substring(0, path.indexOf('/'));
                    }

                    if (section === 'home') {
                        section = '';
                    } else {
                        section = section + '/';
                    }
                }
                return section;
            },

            /**
             * Close page.
             * @param {Event} e Click event to close overlay.
             */
            close: function(e) {
                if (e && e.target !== e.currentTarget){
                    // trap clicks inside the transition wrap to prevent them from closing the overlay
                    return;
                }
                var utvalue = $(e.currentTarget).attr("data-ht") || 'modalclose';
                PubSub.trigger('heattrack', utvalue);
                StateManager.navigateToPreloadedUrl();
                if (e) return false;
            }

        });


        /**
         * Return view class.
         */
        return SimpleOverlay;
    }
);
