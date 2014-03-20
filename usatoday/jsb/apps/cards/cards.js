/**
 * @fileoverview Cards View.
 * @author jmerrifiel@gannett.com (Jay Merrifield)
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'pubsub',
    'utils',
    'site-manager',
    'base-app',
    'partner/pushdown-ad',
    'partner/overlay-ad-fronts',
    'state',
    'modules/scroller/sidebar-scroll',
    'sharedAdPosition'
],
function(
    $,
    _,
    Backbone,
    PubSub,
    Utils,
    SiteManager,
    BaseApp,
    PushdownAd,
    OverlayAdFront,
    StateManager,
    SidebarScroll,
    SharedAdPosition
){
    'use strict';

    /**
     * App class.
     */
    var CardsApp = BaseApp.extend({
        // View element.
        el: '#cards',

        events: {
            'click .open-sidebar': 'openSidebar',
            'click .close-sidebar': 'closeSidebar'
        },

        // Instance variables
        cards: (window.section_arrows || 'home').split('|'),

        cardSizes : [
            {
                name: 'large',
                adClass: 'size-l',
                sidebarOpen: true,
                sidebarAds: true,
                belowHeroAd: false,
                cardWidth: 1180,
                windowWidth: 1250
            },
            {
                name: 'medium',
                adClass: 'size-m',
                sidebarOpen: true,
                sidebarAds: false,
                belowHeroAd: false,
                cardWidth: 1080,
                windowWidth: 1150
            },
            {
                name: 'small',
                adClass: 'size-s',
                sidebarOpen: false,
                sidebarAds: false,
                belowHeroAd: true,
                cardWidth: 840,
                windowWidth: 980
            }
        ],

        initialize: function(options){
            options = $.extend(true, {
                animations: {
                    horizontal: {
                        duration: 350,
                        easing: 'cubic-bezier(0.645, 0.045, 0.355, 1.000)'
                    },
                    fadeIn: {
                        duration: 200
                    },
                    sidebar: {
                        button: {
                            fadeIn: 200,
                            fadeOut: 200
                        },
                        slide: 250
                    }
                },
                UPDATE_FREQUENCY: 900000, // Time in ms before checking for new data.
                keyboard: false,
                peekWidth: -100,
                minCardWrapWidth: 1024 - 120,
                template:
                    '<div class="card-wrap">' +
                        '<section class="card <%= section %> card-loading" id="section_<%= section %>">' +
                            '<div class="card-suspender-color <%= section %>"></div>' +
                            '<div class="left-suspender size-suspender">' +
                                '<div class="mod clst sections navigation" id="CList-sections"><h1 class="clst-section-name"><%= section %></h1></div>' +
                            '</div>' +
                            '<div class="border">' +
                                '<div class="punchout-cover"></div>' +
                            '</div>' +
                        '</section>' +
                    '</div>',
                overlayTemplate:
                    '<div class="card-wrap card-wrap-behind-overlay">' +
                        '<section class="card <%= section %> card-loading" id="section_<%= section %>">' +
                            '<div class="card-suspender-color <%= section %>"></div>' +
                            '<div class="border"></div>' +
                            '<div class="sidebar"></div>' +
                        '</section>' +
                    '</div>'
            }, options);

            _.bindAll(this, 'handleResizeWindow', 'showSidebarOpenButton', 'showSidebarCloseButton',
                '_setSideBarTitles', 'onSideBarScroll', 'refreshSidebarScroll');

            this.$top = Utils.get('scrollEl');
            this.$doc = Utils.get('doc');
            this.$body = Utils.get('body');
            this.$window = Utils.get('win');
            this.template = _.template(options.template);
            this.overlayTemplate = _.template(options.overlayTemplate);
            this.containerOffset = 0;
            this.header = SiteManager.getHeader();

            this.pubSub = {
                'hero:ad:open': this.onHeroAdOpen,
                'hero:ad:close': this.onHeroAdClose,
                'sidebar:hide': this.closeSidebar,
                'sidebar:show': this.openSidebar,
                'showmore:headlines': this.onHeadlinesUpdated,
                'header:fixed': this.onHeaderFixed,
                'header:unfixed': this.onHeaderUnfixed
            };
            var throttledResize = _.throttle(this.handleResizeWindow, 50);
            this.$window.on('resize.' + this.cid, throttledResize);
            if (this.options.keyboard){
                // Keyboard navigation.
                this.$doc.on('keydown.' + this.cid, this.keyNavigation);
            }
            this.topAdjusted = false;
            this.domInitialized = false;

            // call base class initialize
            BaseApp.prototype.initialize.call(this, options);

            this.calculateCardDimensions(this.$window.width());
            this.isSidebarOpen = this.currentCardInfo.sidebarOpen;
        },

        destroy: function(removeEl){
            this.$window.off('.' + this.cid);
            this.$doc.off('.' + this.cid);

            // call base class destroy
            BaseApp.prototype.destroy.call(this, removeEl);
        },

        animateChangePagePreData: function(fromUrl, toUrl){
            var sectionName = Utils.getSectionPath(toUrl);
            var promise = this.goTo(sectionName);
            this._updateNav(toUrl, sectionName);
            if (!promise && this.currentPath !== toUrl) {
                var $blankCard = this.createAndInitializeEmptyCard(sectionName, this.$window.height()),
                    scrollPosition = Utils.getScrollPosition();

                scrollPosition -= SiteManager.scrollTop(0);

                // non-iOS devices can do our scrolling trick by faking the top of the current card after a scrollTop(0)
                this.$currentCard.children('.card').css({top: -1 * scrollPosition });
                $blankCard.css({position: 'relative', margin: '', left: this.containerOffset * -1});
                this.$currentCard.css({left: this.leftMargin + this.containerOffset * -1});
                promise = this.swapContent(this.$currentCard, $blankCard);
                this.$currentCard = $blankCard;
            }
            return promise;
        },
        animateChangePagePostData: function(fromUrl, toUrl, htmlFrag, paused) {
            // current card should be the loader we want to swap out
            var currentCard = this.$currentCard,
                newCard = htmlFrag.find('.card-wrap');
            newCard.css({left: this.containerOffset * -1});
            if (newCard.find('.front-bump-shadow').length) {
                currentCard.find('.punchout-cover').addClass('show');
            }
            currentCard.css({height: '', overflow: '', 'padding-right': '', left: this.leftMargin + this.containerOffset * -1});
            // move the current card pointer incase someone navigates while swapContent is happening
            this.$currentCard = newCard;
            return this.swapContent(currentCard, newCard, false, this.getHash(toUrl));
        },
        animateRevealApp: function(fromUrl, toUrl, preload){
            if (preload) {
                this.afterOverlayReveal(this.header.getExpandedHeight());
                return $.Deferred().resolve();
            } else {
                return BaseApp.prototype.animateRevealApp.apply(this, arguments);
            }
        },
        beforePageReveal: function(fromUrl, toUrl, htmlFrag, preload){
            if (preload){
                // hide the preload, we have our own temporary cards shown
                htmlFrag.css('display', 'none');
            }
        },
        afterPageReveal: function(fromUrl, toUrl, paused, ViewClass){
            var sectionName = Utils.getSectionPath(toUrl);
            if (!this.domInitialized){
                this.initializeDom();
            }
            this._updateNav(toUrl, sectionName);
            this.$currentCard = this.$container.children('.card-wrap');
            this.currentIndex = _.indexOf(this.cards, sectionName);

            // Add sidebar to new card.
            this.addSidebar();

            if (!paused){
                if (ViewClass){
                    this.subviews.view = new ViewClass({el: this.$currentCard, path: toUrl, section: sectionName});
                }
                if (this.isSidebarOpen){
                    this.onSidebarOpen();
                }
                this.setupAds();
                this.triggerEvent('renderCardInfo', this.currentCardInfo, this.isCurrentCardBumped());
            }

            PubSub.trigger('cards:loaded');
        },
        setupAds: function(){
            this.subviews.pushdownAd = new PushdownAd({
                el: this.$currentCard,
                adClasses: _.pluck(this.cardSizes, 'adClass').join(' ')
            });
            this.subviews.overlayAd = new OverlayAdFront({
                el: this.$('.partner-overlay'),
                leaveBehindEl: this.$('.partner-leavebehind'),
                isCardBumped: this.isCurrentCardBumped(),
                getHeaderOffset: _.bind(function(){
                    return this.header.getExpandedHeight();
                }, this)
            });
            // Generic Ad Call for PointRoll
            this.subviews.genericad = new SharedAdPosition({
                el: '#ad-staging',
                adSizes: ['generic'],
                adPlacement: 'high_impact',
                adType: 'generic'
            });
        },
        isCurrentCardBumped: function() {
            return this.$currentCard.children('.card-bumped').length;
        },
        beforeAppRemove: function(fromUrl, toUrl){
            $('.site-nav span.site-nav-span').removeClass('site-nav-active-span');
        },
        getRevealAppLoader: function(toUrl){
            var sectionName = Utils.getSectionPath(toUrl);
            var temp = this.createAndInitializeEmptyCard(sectionName, this.$window.height());
            temp.css({position: 'relative', margin: ''});
            temp = $('<div class="card-container"></div>').append(temp);
            temp = $('<article id="cards" class="cards"></article>').append(temp);
            return temp;
        },
        activateLoader: function(){
            // we have our own custom loader, no need for the system loader
        },

        initializeDom: function(){
            // Cache selectors
            this.$container = this.$('.card-container');
            this.$prevBtn = this.$('#cards-prev-link');
            this.$nextBtn = this.$('#cards-next-link');

            this.domInitialized = true;
        },

        handleResizeWindow: function(){
            if (this.domInitialized){
                var windowWidth = this.$window.width();
                if (this.windowWidth === windowWidth){
                    return false;
                }
                var oldCardInfo = this.currentCardInfo;
                this.calculateCardDimensions(windowWidth);
                if (this.currentCardInfo !== oldCardInfo) {
                    // card sizing has changed
                    // so pass in whether we're destroying sidebar, or creating the sidebar
                    // (ie, going to min card width, or going from min card width
                    this.resetSidebar(this.currentCardInfo.sidebarOpen !== oldCardInfo.sidebarOpen || this.sidebarOpen !== this.currentCardInfo.sidebarOpen);
                    this.triggerEvent('onCardWidthChange', this.currentCardInfo);
                }
            }
        },

        calculateCardDimensions: function(windowWidth){
            var minSize = this.getMinCardInfo();
            if (windowWidth < minSize.windowWidth){
                windowWidth = minSize.windowWidth;
            }
            this.windowWidth = windowWidth;
            var cardInfo = minSize;
            // IE is a bastard, I hate it. IE8 reports media query, but it doesn't work for min-width
            var mediaQuery = (window.matchMedia || Modernizr.mq('only all')) && !this.$top.hasClass('lt-ie9');

            _.find(this.cardSizes, function(item) {
                if (mediaQuery){
                    // media query standard browsers report the width including the scrollbar
                    // but $window.width() reports minus scrollbar, so this makes certain our cardWidth
                    // is accurate
                    if (Modernizr.mq('only screen and (min-width: ' + item.windowWidth + 'px)')) {
                        cardInfo = item;
                        return true;
                    }
                }else{
                    if (windowWidth >= item.windowWidth) {
                        cardInfo = item;
                        return true;
                    }
                }
            });
            this.cardWrapWidth = cardInfo.cardWidth + ((windowWidth - 2 * this.options.peekWidth - cardInfo.cardWidth) / 2 + 0.5) >> 0;
            if (this.cardWrapWidth < this.options.minCardWrapWidth){
                this.cardWrapWidth = this.options.minCardWrapWidth;
            }
            this.leftMargin = (((windowWidth - cardInfo.cardWidth - 2 * this.options.peekWidth) / 2) +
                this.options.peekWidth + 0.5) >> 0; // round up
            this.currentCardInfo = cardInfo;
            return cardInfo;
        },

        updateNavLinks: function(btn, href) {
            href = (href === 'home') ? '/' : '/' + href + '/';
            btn.attr('href', href);
        },

        /**
         * Keyboard navigation (left / right arrows).
         * @param {Event} e Keyboard event.
         */
        keyNavigation: function(e) {
            switch(e.keyCode) {
                // Left arrow.
                case 37:
                    this.previous();
                    break;
                // Right arrow.
                case 39:
                    this.next();
                    break;
                default:
                    break;
            }
        },

        /**
         * Check if index is a) numeric and b) within bounds.
         * @param {Number} n Number to compare.
         * @param {Number} l Max length.
         */
        inBounds: function(n, l) {
            return (!isNaN(parseFloat(n, 10)) &&
                isFinite(n) && n >= 0 && n <= (l - 1));
        },

        /**
         * Animate to a card.
         * @param {String} targetId The id of the target card.
         */
        goTo: function(targetId) {
            // Target index.
            var targetIndex = _.indexOf(this.cards, targetId);

            // Check the bounds.
            if(targetIndex === -1 || targetIndex === this.currentIndex) {
                return;
            }

            var scrollPosition = Utils.getScrollPosition();

            if (this.isApple && scrollPosition > 0){
                // iOS devices can't do the fancy scroll trick we do to trick the user
                // into not believing they aren't scrolling to the top of the window when they
                // actually are. So we need to animate the scroll to the top
                return $.Deferred(_.bind(function(defer){
                    this.$top.animate({scrollTop: 0}, 200).promise().done(_.bind(function(){
                        this._animateCards(targetIndex, scrollPosition).done(function(){
                            defer.resolve();
                        });
                    }, this));
                })).promise();
            }else{
                return this._animateCards(targetIndex, scrollPosition);
            }
        },

        _animateCards: function(targetIndex, scrollPosition) {
            // Ready to animate.
            var nextCard, distance = 0, tempCardList = $([]),
                height = this.$window.height(),
                currentCard = this.$currentCard,
                currentCardHeight = this.$currentCard.height(),
                currentCardOffsetTop = currentCard.offset().top,
                direction = 0;

            // pick a direction
            if (Math.abs(targetIndex - this.currentIndex) > (this.cards.length / 2)) {
                // flip around
                direction = targetIndex > this.currentIndex ? -1 : 1;
            } else {
                direction = targetIndex > this.currentIndex ? 1 : -1;
            }
            // create temporary cards
            do {
                this.currentIndex = this._incrementIndex(this.currentIndex, direction);
                nextCard = this.createAndInitializeEmptyCard(this.cards[this.currentIndex], height);
                if (this.currentIndex !== targetIndex) {
                    tempCardList.push(nextCard[0]);
                }
                this._positionCard(nextCard, (++distance) * direction);
                this.$container.append(nextCard);
            } while (this.currentIndex !== targetIndex);
            // reset internal variables
            this.$currentCard = nextCard;
            this.containerOffset -= distance * direction * this.cardWrapWidth;

            if (scrollPosition > currentCardHeight + currentCardOffsetTop - height){
                currentCard.css({height: height, overflow: 'hidden'});
            }

            scrollPosition -= SiteManager.scrollTop(0);

            // fake scroll to top
            if (!this.isApple) {
                // non-iOS devices can do our scrolling trick by faking the top of the current card after a scrollTop(0)
                currentCard.children('.card').css({top: -1 * scrollPosition });
            }

            var promise = this.animate(this.$container,
                                        'left',
                                        this.containerOffset + 'px',
                                        this.options.animations.horizontal.duration,
                                        this.options.animations.horizontal.easing);
            promise.done(function() {
                nextCard.css('position', 'relative');
            }).always(function() {
                currentCard.remove();
                tempCardList.remove(); // remove temp cards
            });
            return promise;
        },

        _incrementIndex: function(index, amount) {
            return (this.cards.length + index + amount) % this.cards.length;
        },

        createAndInitializeEmptyCard: function(section, height){
            var $blankCard = $(this.template({section: section}));
            $blankCard.css({'margin': 0, position: 'absolute', height: height, bottom: 0});
            return $blankCard;
        },

        _positionCard: function(targetDom, targetPosition){
            targetDom.css({left: (this.leftMargin - this.containerOffset + (targetPosition * this.cardWrapWidth))});
        },

        refreshSidebarScroll: function() {
            this._setSideBarTitles();
            var fixedContent = this.$('.sidebar-fixed-content'),
                fixedHeight = fixedContent.height(),
                cardHeight = this.$('#card_full_width_main').height(),
                scrollableHeight = Math.max(0, cardHeight - fixedHeight),
                sidebarScrollableWindow = this.$('.sidebar-scrollable-window');
            if (fixedHeight > cardHeight) {
                fixedHeight = cardHeight;
                fixedContent.css('height', cardHeight);
            }
            if (scrollableHeight !== parseInt(sidebarScrollableWindow[0].style.height, 10)) {
                sidebarScrollableWindow.css("height", scrollableHeight);
                this.triggerEvent('onSidebarScrollableHeightChange', fixedHeight, scrollableHeight);
            }
            if (this.subviews && this.subviews.vscrollbar) {
                this.subviews.vscrollbar.refresh();
            }
        },

        /**
         * Add sidebar
         */
        addSidebar: function() {
            this.initializeSidebarTitles();
            this.sidebar = this.$currentCard.find('.sidebar');
            this.sidebarOpenButton = this.$currentCard.find('.open-sidebar');
            this.sidebarCloseButton = this.$currentCard.find('.close-sidebar');
            this.subviews.vscrollbar = new SidebarScroll({
                el: this.$('.sidebar-scrollable-window'),
                contentClass: this.$('.sidebar-scrollable-content'),
                padding: 2,
                lockPageScroll: false,
                delayScroll: false,
                fadeout: true,
                onScroll: this.onSideBarScroll
            });
            // restore modules header
            if (window.Modernizr.touch) {
                this.revertStaticHeader();
            }
        },

        /*
            Remove static header and restore modules header
         */
        revertStaticHeader: function() {
            this.$('.sidebar-static-title-wrapper').hide();
            this.$('.card-sidebar:first-child .sidebar-title-wrapper').show();
        },

        /**
         * Slides the panel out from behind the page card.
         */
        openSidebar: function(event) {
            if (event){
                event.preventDefault();
                event.stopPropagation();
            }
            this.onSidebarOpen();
            this._slideSidebar(this.sidebarOpenButton, true);
        },

        /**
         * Called when the page height changes due to more stories loading.
         * 1 second is an arbitrary wait time to allow height transition to complete.
         */
        onHeadlinesUpdated: function() {
            this.headlinesUpdate = setTimeout(this.refreshSidebarScroll, 1000);
        },

        onSidebarOpen: function(){
            this.triggerEvent('openSideBar');
            this.isSidebarOpen = true;
        },

        initializeSidebarTitles: function() {
            this.$sidebarScrollableTitles = this.$('.sidebar-scrollable-content .sidebar-title-wrapper');
            this.$sidebarStaticTitle = this.$('.sidebar-static-title-wrapper');
            var firstTitle = this.$('.sidebar-scrollable-content .sidebar-title-wrapper:first');
            if (firstTitle.length) {
                firstTitle.hide();
                this.$sidebarStaticTitle.html(firstTitle.html()).show();
            }
        },

        // find all headers and their current positions
        _setSideBarTitles: function() {
            var self = this;
            // add top header to headers
            this.sideBarTitles = [];
            // get all sub header positions
            this.$sidebarScrollableTitles.each(function(index, target){
                // get sub header positions
                var $target = $(target),
                    hideAfter = false;
                // esnure we can get outer height
                if ($target.is(':hidden')) {
                    $target.show();
                    hideAfter = true;
                }
                var position = $target.position().top + $target.outerHeight();
                if (hideAfter) {
                    $target.hide();
                }
                // content scroll is a negative scroll
                position = position * -1;
                self.sideBarTitles.push({
                    position: position,
                    html: $target.html()
                });
            });
        },

        // on side bar scroll event
        onSideBarScroll: function(y) {
            // sub headers exist
            if (this.$sidebarScrollableTitles.length > 1 && y !== 0) {
                var $header = this.$sidebarStaticTitle;
                if (!this.sideBarTitles) {
                    this._setSideBarTitles();
                }
                // get header text
                var i = this.sideBarTitles.length - 1,
                    header,
                    // default text is header text
                    markup = $header.html();
                for (i; i >= 0; i--) {
                    header = this.sideBarTitles[i];
                    if (header.position > y) {
                        markup = header.html;
                        break;
                    }
                }
                // set header text
                if ($header.html() !== markup) {
                    $header.html(markup);
                }
            }
        },

        /**
         * Slides the sidebar behind the page card.
         */
        closeSidebar: function(event) {
            if (event){
                event.preventDefault();
                event.stopPropagation();
            }

            var animation = this._slideSidebar(this.sidebarCloseButton, false);
            this.onSidebarClose(animation);
        },

        onSidebarClose: function(animationPromise){
            this.isSidebarOpen = false;
            this.triggerEvent('closeSideBar');
            if (this.subviews.view && this.subviews.view.destroyExpanded) {
                if (animationPromise) {
                    animationPromise.done(_.bind(function(){
                        this.subviews.view.destroyExpanded(true);
                    }, this));
                } else {
                    this.subviews.view.destroyExpanded(true);
                }
            }
        },

        _slideSidebar: function(button, open){
            var slideSpeed = this.options.animations.sidebar.slide;
            var fadeSpeed = this.options.animations.sidebar.button.fadeOut;

            this.registerAnimation(button.fadeOut(fadeSpeed, 'easeInOutCubic').promise());

            var w = parseInt(this.sidebar.css('width'), 10);

            var slideAnimation = null;
            if (!this.currentCardInfo.sidebarOpen){
                slideAnimation = this.animate(this.sidebar, 'right', -(w)+'px', slideSpeed, 'ease-in-out');
            } else {
                var cardInfo = open ? this.currentCardInfo : this.getMinCardInfo();
                this.sidebar.removeClass('top');
                slideAnimation = this.animate(this.$currentCard.children('.card'), 'width', cardInfo.cardWidth, slideSpeed, 'ease-in-out');
            }
            var deferred = $.Deferred();
            slideAnimation.done(_.bind(function() {
                var slideAnimation = this.animate(this.sidebar, 'right', 0, slideSpeed, 'ease-in-out');
                if (open){
                    if (!this.currentCardInfo.sidebarOpen){
                        this.sidebar.addClass('top');
                        slideAnimation.done(this.showSidebarCloseButton);
                    }else{
                        this.sidebar.removeClass('top');
                        this.$currentCard.css('width', '');
                    }
                }else{
                    slideAnimation.done(this.showSidebarOpenButton);
                    this.sidebar.removeClass('top');
                }
                slideAnimation.done(function(){
                    deferred.resolve();
                });
            }, this));
            return deferred.promise();
        },

        getMinCardInfo: function() {
            return this.cardSizes[this.cardSizes.length - 1];
        },

        /**
         * Recalculate and reset screen width for sidebar
         */
        resetSidebar: function(sidebarStatusChange) {
            this.$currentCard.css('width', '');
            this.sidebar.removeClass('top');
            if (!this.currentCardInfo.sidebarOpen){
                if (!this.adVisible) {
                    this.sidebarOpenButton.show();
                } else {
                    this.sidebarOpenButton.hide();
                }
                this.sidebarCloseButton.hide();
                if (sidebarStatusChange) {
                    this.onSidebarClose();
                }
            }
            else {
                this.sidebarOpenButton.hide();
                this.sidebarCloseButton.show();
                if (sidebarStatusChange) {
                    this.onSidebarOpen();
                }
            }
            // set new postions to side bar titles
            this._setSideBarTitles();
        },
        /**
         * Show the sidebar open button.
         */
        showSidebarOpenButton: function() {
            if (!this.adVisible){
                this.sidebarOpenButton.css({'visibility': 'visible', display: 'none'});
                this.sidebarOpenButton.fadeIn(this.options.animations.sidebar.button.fadeIn, 'easeInOutCubic');
            }
        },

        /**
         * Show the sidebar close button.
         */
        showSidebarCloseButton: function() {
            this.sidebarCloseButton.fadeIn(this.options.animations.sidebar.button.fadeIn, 'easeInOutCubic');
        },

        onHeroAdClose: function() {
            this.adVisible = false;
            if (!this.isSidebarOpen) {
                this.showSidebarOpenButton();
            }
        },

        onHeroAdOpen: function() {
            this.adVisible = true;
            if (this.isSidebarOpen) {
                if (!this.currentCardInfo.sidebarOpen){
                    this.closeSidebar();
                }
            } else {
                this.sidebarOpenButton.fadeOut(this.options.animations.sidebar.button.fadeOut, 'easeInOutCubic');
            }
        },

        /**
         * Hide the fixed cards behind the overlay to improve scroll performance.
         */
        afterOverlayReveal: function(offset) {
            var height = this.$('.card-wrap > .card').position().top || 50;
            this.$el.hide();
            var currentSection = Utils.getSectionPath(this.currentPath);
            this.offsetPlaceholderHeight = height;
            this.offsetPlaceholderTop = offset;
            this.offsetPlaceholder = $('<div id="cards-offset-placeholder" style="height:' + height + 'px"></div>');
            if (this.header.isFixed()) {
                this.onHeaderFixed();
            } else {
                this.onHeaderUnfixed();
            }
            this.fakeCardPlaceholder = $(this.overlayTemplate({ section: currentSection }));
            this.$body.append(this.offsetPlaceholder).append(this.fakeCardPlaceholder);
        },

        onHeaderFixed: function() {
            if (this.offsetPlaceholder) {
                this.offsetPlaceholder.css({position: 'fixed', top: this.offsetPlaceholderTop - this.header.getScrollOffset()});
            }
        },

        onHeaderUnfixed: function() {
            if (this.offsetPlaceholder) {
                this.offsetPlaceholder.css({position: 'absolute', top: this.offsetPlaceholderTop});
            }
        },

        /**
         * Show the fixed cards again (and remove the temporary ones).
         */
        beforeOverlayRemove: function() {
            this.$el.show();
            if (this.offsetPlaceholder) {
                this.offsetPlaceholder.remove();
                this.offsetPlaceholder = null;
            }
            if (this.fakeCardPlaceholder) {
                this.fakeCardPlaceholder.remove();
                this.fakeCardPlaceholder = null;
            }
        },

        /**
         * Adds card size information to page ad requests
         * @override
         */
        getClientAdInfo: function() {
            return {cardsize: this.currentCardInfo.name};
        },

        _updateNav: function(toUrl, section) {
            var nextSection, prevSection, currentIndex = _.indexOf(this.cards, section);
            if (this.header) {
                this.header.updateNavigation(toUrl);
            }


            if (this.domInitialized){
                if (currentIndex === -1) {
                    // we're in no-man's land, next arrow should be home, prev should be home - 1
                    prevSection = this.cards[this._incrementIndex(_.indexOf(this.cards, 'home'), -1)];
                    nextSection = 'home';
                } else {
                    prevSection = this.cards[this._incrementIndex(currentIndex, -1)];
                    nextSection = this.cards[this._incrementIndex(currentIndex, 1)];
                }
                this.updateNavLinks(this.$prevBtn, prevSection);
                this.updateNavLinks(this.$nextBtn, nextSection);

                //update the inner content for arrow hovers
                this.$('.front-prev-arrow-label').html(prevSection);
                this.$('.front-next-arrow-label').html(nextSection);

                this.$('#cards-prev-link').removeClass().addClass("front-arrow-" + prevSection);
                this.$('#cards-next-link').removeClass().addClass("front-arrow-" + nextSection);
            }
        }
    });

    /**
     * Return app class.
     */
    return CardsApp;

});
