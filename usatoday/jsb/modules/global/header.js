/**
 * @fileoverview Top nav module.
 * @author ekallevig@gannett.com (Erik Kallevig)
 */
 
define([
    'jquery',
    'underscore',
    'baseview',
    'pubsub',
    'utils',
    'state',
    'modules/global/breaking-news',
    'easing',
    'animatecolors'
],
function(
    $,
    _,
    BaseView,
    PubSub,
    Utils,
    StateManager,
    BreakingNews
) {
    'use strict';

    /**
     * View class.
     */
    var Header = BaseView.extend({

        // View element.
        el: '.site-header',

        // Events.
        events: {
            'click .site-nav-search-link': 'onClickNavSearchIcon',
            'click .site-masthead-search-close-btn': 'onClickSearchCloseBtn',
            'click .site-masthead-search-btn-div': 'onClickSearchBtnDiv'
        },

        // Constants.
        navHeaderHeight: 40,
        mastheadHeight: 80,
        fixedHeaderThreshold: 80,
        hoverDropdownDelay: 120,

        /**
         * Initialize the view.
         */
        initialize: function() {

            // Cache references to common elements/calculations.
            this.$win = Utils.get('win');
            this.$body = Utils.get('body');
            this.$siteHeaderInnerWrap = this.$('.site-header-inner-wrap');
            this.$searchWrap = this.$('.site-masthead-search-wrap');
            this.$navLogo = this.$('.site-nav-logo-item');
            this.$navLogoImg = this.$navLogo.find('.site-nav-logo-img');
            this.$searchCancelBtn = this.$('.site-masthead-search-close-btn');
            this.navLogoImgWidth = this.$navLogoImg.outerWidth();
            this.$top = Utils.get('scrollEl');

            // We use the fixedWrap here so we get a good snapshot of either header
            // height with masthead before the breaking news bar comes in.
            this.navHeight = this.$siteHeaderInnerWrap.outerHeight();
            this.minHeight = this.$el.outerHeight();

            // Keep 'this' reference to view in scroll.
            _.bindAll(this, 'onBreakingNewsChange', 'onFixingScroll', 'onClosingScroll');

            // Show/hide masthead speeds.
            this.slideSpeed = 200;
            Utils.set('headerHeight', this.navHeight);
            this.slideEasing = 'ease-out';

            // Publish events.
            this.pubSub = {
                'user:statuschange': this._loginStatus,
                'page:load': this.loadHeaderModules
            };
            var open = this.$el.data('open'),
                fixed = this.$el.data('fixed'),
                defaultOpen = this.$el.data('default-open') || false,
                defaultFixed = this.$el.data('default-fixed') || false;

            if (open === undefined) {
                open = defaultOpen;
            }
            if (fixed === undefined) {
                fixed = defaultFixed;
            }

            // this is the default state set by the html
            this.state = {
                open: open,
                defaultOpen: defaultOpen,
                fixed: fixed,
                defaultFixed: defaultFixed,
                hasFixingScroller: false,
                hasClosingScroller: false
            };

            BaseView.prototype.initialize.apply(this, arguments);

            this.$subscribeWrap = this.$('.site-masthead-subscribe-wrap');

            this.subviews.breakingbar = new BreakingNews({
                el: this.$('#breaking-bar'),
                slideSpeed: this.slideSpeed,
                onBreakingNewsChange: this.onBreakingNewsChange
            });

            // set js event handlers
            if (!fixed) {
                this._setState({
                    hasFixingScroller: true
                });
                if (Utils.getScrollPosition()) {
                    // we're already scrolled down before we were inited, make certain the header is correct
                    this.onFixingScroll();
                }
            }
        },

        _loginStatus: function(accountName, loginStatus, userData) {
            if (accountName !== 'firefly') {
                return;
            }
            if (loginStatus === 'loggedIn' && userData && userData.hasMarketAccess) {
                this.$subscribeWrap.removeClass('site-masthead-subscribe-wrap-visible');
            } else if (loginStatus !== 'loggingIn') {
                this.$subscribeWrap.addClass('site-masthead-subscribe-wrap-visible');
            }
        },

        isFixedAndClosed: function(stateObj) {
            return !stateObj.open && !!stateObj.fixed && !stateObj.hasFixingScroller && !stateObj.hasClosingScroller;
        },

        _setState: function(stateObj){
            var pubSubEvent = null, animate;
            _.each(stateObj, function(val, key){
                if (this.state[key] !== val) {
                    if (key === 'fixed') {
                        if (val) {
                            this.$siteHeaderInnerWrap.addClass('site-header-inner-wrap-fixed');
                            pubSubEvent = 'header:fixed';
                        } else {
                            this.$siteHeaderInnerWrap.removeClass('site-header-inner-wrap-fixed');
                            pubSubEvent = 'header:unfixed';
                        }
                    } else if (key === 'open') {
                        // we animate if the header is currently fixed and is staying fixed
                        // or the fixed scroller is changing (ie, we've hit the fixed threshold
                        animate =   (this.state.fixed === true && (stateObj.fixed === undefined || stateObj.fixed === true)) ||
                                    (stateObj.hasFixingScroller !== undefined && this.state.hasFixingScroller !== stateObj.hasFixingScroller);
                        this._setMasthead(val, animate);
                    } else if (key === 'hasFixingScroller') {
                        if (val) {
                            this._registerFixingScroller();
                        } else {
                            this._unregisterFixingScroller();
                        }
                    } else if (key === 'hasClosingScroller') {
                        if (val) {
                            this._registerClosingScroller();
                        } else {
                            this._unregisterClosingScroller();
                        }
                    } else {
                        console.warn('Unknown state key: ' + key);
                    }
                }
            }, this);
            this._checkTransition(this.state, stateObj);
            _.extend(this.state, stateObj);
            if (pubSubEvent) {
                PubSub.trigger(pubSubEvent);
            }
        },

        _checkTransition: function(fromState, toState){
            // fill in any gaps in to toState with what's in the fromState
            toState = $.extend({}, fromState, toState);
            var fromFixedAndClosed = this.isFixedAndClosed(fromState),
                toFixedAndClosed = this.isFixedAndClosed(toState),
                animate = fromState.open !== toState.open;
            if (fromFixedAndClosed !== toFixedAndClosed) {
                if (toFixedAndClosed) {
                    this._transitionToCloseFixed(animate);
                } else {
                    this._transitionFromCloseFixed(animate);
                }
            }
        },

        _transitionToCloseFixed: function(animate) {
            this.navHeight = this.navHeaderHeight;
            this.updateHeaderMinHeight(animate);
        },

        _transitionFromCloseFixed: function(animate) {
            this.navHeight = this.navHeaderHeight + this.mastheadHeight;
            this.updateHeaderMinHeight(animate);
        },

        /*************************************************
         * Begin Fixing Scrollers
         *************************************************/

        _registerFixingScroller: function() {
            if (!this.hasFixingScroller) {
                this.hasFixingScroller = true;
                this.$win.on('scroll.headerFixingScroller', _.throttle(this.onFixingScroll, 20));
            } else {
                console.warn('Attempting to register headerFixingScroller twice');
            }
        },
        _unregisterFixingScroller: function() {
            this.hasFixingScroller = false;
            this.$win.off('.headerFixingScroller');
        },

        onFixingScroll: function() {
            var fixed = Utils.getScrollPosition() >= this.mastheadHeight;
            if (fixed !== this.state.fixed) {
                if (fixed) {
                    this._setState({
                        "open": false,
                        "fixed": true
                    });
                } else {
                    this._setState({
                        "open": true,
                        "fixed": false
                    });
                }
            }
        },

        /*************************************************
         * Begin Closing Scrollers
         *************************************************/

        _registerClosingScroller: function() {
            if (this.isApple) {
                return;
            }
            if (!this.hasClosingScroller) {
                this.hasClosingScroller = true;
                this.$win.on('scroll.headerClosingScroller', _.throttle(this.onClosingScroll, 20));
            } else {
                console.warn('Attempting to register headerFixingScroller twice');
            }
        },
        _unregisterClosingScroller: function() {
            this.hasClosingScroller = false;
            this.$win.off('.headerClosingScroller');
        },

        onClosingScroll: function(){
            this._setState({
                open: false,
                fixed: true,
                hasClosingScroller: false
            });
        },

        /**
         * Initialize header modules via the js_modules array from django's
         * nav service parsing.
         */ 
        loadHeaderModules: function() {
            if (this.headerLoaded){
                return;
            }
            this.headerLoaded = true;

            // Load primary and secondary nav modules
            this.$('.headermodules').each(_.bind(function(i, el) {
                try {
                    var jsModules = JSON.parse($(el).html()).js_modules || [];
                    this.buildModules(jsModules);
                } catch (e) {
                    console.error("Failure loading header modules", e);
                }
            }, this));
        },

        /**
         * Click handler for nav search button (not the masthead search form input button).
         * @param {Event} e Click event.
         */
        onClickNavSearchIcon: function(e) {
            e.preventDefault();
            this.$searchInput = this.$$('.site-masthead-search-form-input');
            this.$searchInput.focus();
            if (!this.state.open) {
                this._setState({
                    open: true,
                    fixed: true,
                    hasClosingScroller: true
                });
                this.$searchCancelBtn.addClass('site-masthead-search-close-btn-visible');
            }
        },

        scrollTop: function(topValue, force) {
            if (!force) {
                if (!this.state.open) {
                    if (this.state.hasFixingScroller && topValue < this.fixedHeaderThreshold) {
                        topValue = this.fixedHeaderThreshold;
                    }
                } else {
                    var currentScrollTop = Utils.getScrollPosition();
                    if (topValue < this.fixedHeaderThreshold && currentScrollTop < this.fixedHeaderThreshold) {
                        // skip scroll top when we're open, but not completely scrolled top
                        return currentScrollTop;
                    }
                }
            }
            this.$top.scrollTop(topValue);
            return topValue;
        },

        isFixed: function() {
            return this.state.fixed;
        },

        setOpenFixed: function(saveState) {
            if (saveState) {
                this.lastState = $.extend({}, this.state);
            }
            this._setState({
                open: true,
                fixed: true,
                hasFixingScroller: false,
                hasClosingScroller: false
            });
        },

        getFixedHeight: function() {
            return this.minHeight - this.mastheadHeight;
        },

        /**
         * We want to keep the current state, but enable or disable the fixing scroll handler
         * @param {Boolean} enabled
         */
        setFixingScroller: function(enabled) {
            if (enabled) {
                this._setState({
                    hasFixingScroller: true,
                    hasClosingScroller: false
                });
            } else {
                this._setState({
                    hasFixingScroller: false,
                    hasClosingScroller: false
                });
            }
        },
        setClosedFixed: function(saveState) {
            if (saveState) {
                this.lastState = $.extend({}, this.state);
            }
            this._setState({
                open: false,
                fixed: true,
                hasFixingScroller: false,
                hasClosingScroller: false
            });
        },

        restoreLastState: function() {
            if (this.lastState) {
                this._setState(this.lastState);
                this.lastState = null;
            }
        },

        restoreDefaultState: function() {
            this._setState({
                open: this.state.defaultOpen,
                fixed: this.state.defaultFixed,
                hasFixingScroller: !this.state.defaultFixed,
                hasClosingScroller: false
            });
        },

        onClickSearchBtnDiv: function(e) {
            $(e.currentTarget).parents('form').trigger('submit');
        },

        /**
         * Close search results view
         */
        onClickSearchCloseBtn: function() {
            if (StateManager.getActiveApp().isSearchPage) {
                StateManager.navigateToPreloadedUrl(this.originalPath);
            } else {
                this._setState({
                    open: false,
                    fixed: true
                });
            }
        },

        _collapseMasthead: function(animate){
            if (animate) {
                this.animate(this.$searchWrap, 'height', 0, this.slideSpeed, this.slideEasing).always(_.bind(function(){
                    if (this.$searchCancelBtn.length) {
                        this.$searchCancelBtn.removeClass('site-masthead-search-close-btn-visible');
                    }
                }, this));
            } else {
                this.$searchWrap.css('height', 0);
            }
            this.toggleNavLogo(true, true);
        },

        _expandMasthead: function(animate){
            if (animate) {
                this.animate(this.$searchWrap, 'height', this.mastheadHeight + 'px', this.slideSpeed, this.slideEasing)
                    .done(_.bind(function() {
                        this.$searchInput.focus();
                    }, this));
            } else {
                this.$searchWrap.css('height', this.mastheadHeight);
            }
            this.toggleNavLogo(true, false);
        },

        _setMasthead: function(open, animate){
            if (open) {
                this._expandMasthead(animate);
            } else {
                this._collapseMasthead(animate);
            }
        },

        getExpandedHeight: function() {
            return this.minHeight;
        },

        getScrollOffset: function() {
            if (this.isFixed()) {
                if (this.minHeight != this.navHeaderHeight) {
                    return this.minHeight - this.navHeaderHeight;
                } else {
                    return this.minHeight;
                }
            } else {
                return 0;
            }
        },

        getCollapsedHeight: function(){
            return this.navHeaderHeight;
        },

        /**
         * Toggle logo (with slide animation).
         * @param {Boolean} animate Whether to animate closing.
         * @param {Boolean} largeLogo Whether to force a logo to be collapsed.
         */
        toggleNavLogo: function(animate, visible) {
            var targetOpacity = visible ? 1 : 0;
            var targetWidth = visible ? this.navLogoImgWidth : 0;
            // if (animate) {
                this.animate(this.$navLogoImg, 'opacity', targetOpacity, 150);
                this.animate(this.$navLogo, 'width', targetWidth, 150, 'ease-in-out');
            // } else {
            //     this.$navLogoImg.css('opacity', targetOpacity);
            //     this.$navLogoImg.css('width', this.navLogoImgWidth);
            // }
        },

        /**
         * Set header min-height.
         * @param {boolean=} animate Whether to animate height change.
         */
        updateHeaderMinHeight: function(animate) {
            this.minHeight = this.navHeight + this.subviews.breakingbar.getHeight();
            if (animate) {
                this.animate(this.$el, 'min-height', this.minHeight, this.slideSpeed);
            } else {
                this.$el.css('min-height', this.minHeight);
            }
        },

        onBreakingNewsChange: function(open){
            this.updateHeaderMinHeight();
            if (open) {
                PubSub.trigger('breakingbar:before:open', this.minHeight, this.options.slideSpeed);
            } else {
                PubSub.trigger('breakingbar:before:close', this.minHeight, this.options.slideSpeed);
            }
        },

        /**
         * Update the top navigation active item.
         * @param {String} path Path of the currently active section.
         */
        updateNavigation: function(path) {
            var pathSegments, navItem, query,
                activeSpanSel = 'site-nav-active-span',
                activeItemSel = 'site-nav-active-item';

            // Remove current active class.
            this.$('.' + activeSpanSel).removeClass(activeSpanSel);
            this.$('.' + activeItemSel).removeClass(activeItemSel);

            path = path || 'home';
            query = path.indexOf('?');
            if (query !== -1){
                path = path.substring(0, query);
            }
            if (path[0] === '/') {
                path = path.substring(1);
            }
            if (path[path.length - 1] === '/') {
                path = path.substring(0, path.length - 1);
            }
            pathSegments = (path ? path.split('/') : ['home']);
            while (pathSegments.length) {
                navItem = this.$('.site-nav-' + pathSegments.join('-') + '-item');
                if (navItem.length) {
                    break;
                }
                pathSegments = pathSegments.splice(0, pathSegments.length - 1);
            }
            if (navItem && navItem.length) {
                this.$('.site-nav-' + pathSegments.join('-') + '-span').addClass(activeSpanSel);
                navItem.addClass(activeItemSel);
            }
        }
    });

    /**
     * Return view class.
     */
    return Header;

});
