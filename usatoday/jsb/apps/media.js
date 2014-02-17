/**
 * @fileoverview Media Gallery.
 * @author jmerrifiel@gannett.com (Jay Merrifield)
 */
define([
    'jquery',
    'underscore',
    'pubsub',
    'utils',
    'state',
    'site-manager',
    'base-app',
    'sharedAdPosition',
    'modules/carousel/carousel-autosize',
    'modules/global/brightcove-video',
    'modules/global/taboola',
    'ui/dropdown'
],
function(
    $,
    _,
    PubSub,
    Utils,
    StateManager,
    SiteManager,
    BaseApp,
    SharedAdPosition,
    CarouselAutosizeGallery,
    Video,
    Taboola,
    Dropdown
)
    {
        'use strict';
        /**
         * View class.
         */
        var MediaApp = BaseApp.extend({
            el: '#media-view',
            events: {
                'click .recommended, .more-from, .expando': 'mediaTabClick',
                'mouseout .media-playlist': 'mediaPlaylistMouseOut',
                'mouseover .media-playlist': 'mediaPlaylistMouseIn',
                'click .media-playlist a': 'changeMediaClick',
                'click .media-sidebar-list li.sub': 'sectionHighlight',
                'click': 'userInteraction'
            },
            initialize: function(options){
                options = $.extend(true, {
                        delay: {
                            playlistAutoClose: 250
                        },
                        animations: {
                            slide: {
                                duration: 350,
                                easing: 'ease-in-out'
                            },
                            cinematic: {
                                change: {
                                    fadeOut: {
                                        duration: 300,
                                        easing: 'ease-in-out'
                                    },
                                    fadeIn: {
                                        duration: 300,
                                        easing: 'ease-in-out'
                                    }
                                }
                            }
                        }
                    }, options);

                _.bindAll(this, 'switchToNextVideo', 'handleResizeWindow');
                this.win = Utils.get('win');
                this.scrollEl = Utils.get('scrollEl');
                this.win.on('resize.' + this.cid, _.throttle(this.handleResizeWindow, 50));

                this.playlistTimer = null;
                this.init = false;

                this.subviews = {};

                // call base class initialize
                BaseApp.prototype.initialize.call(this, options);

                var section = $('.sidenav > li.sub-active');
                this.lastSectionName = section.attr('data-section');

            },
            getAd: function() {
                this.subviews.skinad = new SharedAdPosition({
                    el: this.$('.partner-media-ad'),
                    adSizes: ['cinematicvideoskin'],
                    adPlacement: 'skin_media',
                    adType: 'skinmedia',
                    defaultPosition: true
                });
            },
            handleResizeWindow: function(){
                if(this.browse) this.columnize(this.$el);
            },
            beforePageReveal: function(fromUrl, toUrl, htmlFrag){
                if (!this.isCinematicPath(toUrl)){
                    this.columnize(htmlFrag);
                }
            },
            afterPageReveal: function(fromUrl, toUrl){
                if (this.isCinematicPath(toUrl)){
                    // hack to restore fixed position in webkit browsers
                    this.$el.css({'-webkit-transform':'none',
                                '-webkit-perspective': 0});
                    this.asset_type = null;
                    if (toUrl.indexOf('/gallery') !== -1){
                        this.asset_type = 'gallery';
                        this._initializeGallery();
                    }else if (toUrl.indexOf('/photo') !== -1){
                        this.asset_type = 'photo';
                        this._initializeImage(this.$el);
                    }else if (toUrl.indexOf('/video') !== -1){
                        this.asset_type = 'video';
                        this._initializeVideo(this.$el);

                        // Get the ad on cinematic view for video assets
                        this.getAd();
                    }
                    this.browse = false;
                    if (!this.isCinematicPath(fromUrl)){
                        this.playlistStuckOpen = false;
                        this.delayClosePlaylist();
                        if (fromUrl){
                            // set the back url if we have one, otherwise it defaults to '/media'
                            // fromUrl doesn't start with '/'
                            this.$('.back-to-media').attr('href', '/' + fromUrl);
                        }
                    }

                } else {
                    // Browse view.
                    this._initializeBrowse();
                }
                this.handleResizeWindow();

                if (!this.subviews.filterDropdown) {
                    this.subviews.filterDropdown = new Dropdown({
                        el: this.$('.media-view-sort-by-dropdown')
                    });
                }
                Utils.lazyLoadImage(this.$('.more-from').find('img'), 'data-src', true);
            },

            animateRevealApp: function(fromUrl, toUrl) {
                SiteManager.getHeader().setClosedFixed();
                return BaseApp.prototype.animateRevealApp.apply(this, arguments);
            },

            afterAppRemove: function(fromUrl, toUrl){
                SiteManager.getHeader().restoreDefaultState();
            },

            // this needs to be here to prevent default behavior until we can provide a temporary loader for sliding animations
            animateChangePagePostData: function(fromUrl, toUrl, htmlFrag, paused){
                if (this.isCinematicPath(toUrl)){
                    if (!this.isCinematicPath(fromUrl)){
                        // transition left to cinematic view
                        return this.slide(htmlFrag, 'left', this.options.animations.slide.duration,
                            this.options.animations.slide.easing);
                    }else{
                        // cinematic to cinematic!
                        return this._fadeInNewCinematicContent(toUrl, htmlFrag);
                    }
                }else{ // this isn't a cinematic path
                    if (this.isCinematicPath(fromUrl)){
                        // but we're on cinematic mode, slide out cinematic to the right
                        return this.slide(htmlFrag, 'right', this.options.animations.slide.duration,
                            this.options.animations.slide.easing);
                    }else{
                        return BaseApp.prototype.animateChangePagePostData.apply(this, arguments);
                    }
                }
            },

            animateChangePagePreData: function(fromUrl, toUrl){
                if (!this.isCinematicPath(fromUrl) && !this.isCinematicPath(toUrl)) {
                    // only switching from browse to browse has a preData animation
                    return this.changeBrowseSection(fromUrl, toUrl);
                }
            },
            changeBrowseSection: function(fromUrl, toUrl){
                var navItems = this.$('.media-sidebar-list');
                var fromSectionPath = this._getSubSectionPath(fromUrl);
                var toSectionPath = this._getSubSectionPath(toUrl);
                if (fromSectionPath === toSectionPath){
                    return;
                }
                var upPromise, downPromise;
                navItems.children().each(function(idx, item){
                    item = $(item);
                    var dataSection = item.attr('data-section') || '';
                    if (dataSection === fromSectionPath){
                        upPromise = item.find('.media-sidenav-sublist').slideUp(250).promise();
                        upPromise.done(function() {
                            item.removeClass('active');
                        });
                    }else if (dataSection === toSectionPath){
                        downPromise = item.find('.media-sidenav-sublist').slideDown(250).promise();
                        downPromise.done(function() {
                            item.addClass('active');
                        });
                    }
                });
                if (upPromise){
                    this.registerAnimation(upPromise);
                }
                if (downPromise){
                    this.registerAnimation(downPromise);
                }
                return $.when(upPromise, downPromise);
            },
            _getSubSectionPath: function(path){
                path = path.replace(/^media\/((latest|popular)\/)?/, '');
                if (path){
                    var slashIndex = path.indexOf('/');
                    if (slashIndex === -1){
                        return path;
                    }else{
                        return path.substring(0, slashIndex);
                    }
                }else{
                    return '';
                }
            },
            isCinematicPath: function(path){
                return path && path.indexOf('/cinematic') !== -1;
            },
            _fadeInNewCinematicContent: function(toUrl, htmlFrag){
                return $.Deferred(_.bind(function(defer){
                    // we wait until the request finishes
                    this._swapRelatedMedia(htmlFrag);
                    this._swapNavBar(htmlFrag);
                    this._swapMainView(htmlFrag, defer);
                }, this)).promise();
            },
            _swapNavBar: function(htmlFrag){
                var fadeOutPromise = this.animate(this.$('.cinematic-side-nav-ul'), 'opacity', 0,
                    this.options.animations.cinematic.change.fadeOut.duration,
                    this.options.animations.cinematic.change.fadeOut.easing);
                fadeOutPromise.done(_.bind(function() {
                    var newNav = htmlFrag.find('.cinematic-side-nav-ul');
                    newNav.css('opacity', 0);
                    this.$('.cinematic-side-nav-ul').replaceWith(newNav);
                    this.animate(newNav, 'opacity', 1,
                        this.options.animations.cinematic.change.fadeIn.duration,
                        this.options.animations.cinematic.change.fadeIn.easing);
                }, this));
            },
            _swapMainView: function(htmlFrag, deferred){
                var fadeOutPromise = this.animate(this.$('.media-main-view'), 'opacity', 0,
                                this.options.animations.cinematic.change.fadeOut.duration,
                                this.options.animations.cinematic.change.fadeOut.easing);
                fadeOutPromise.done(_.bind(function() {
                        var newView = htmlFrag.find('.media-main-view');
                        newView.css('opacity', 0); // hide the new so it fades in
                        this.$('.media-main-view').replaceWith(newView);
                        if (!newView.length){
                            // something went wrong, resolve the animation cause fadeTo doesn't
                            // work on empty elements
                            deferred.resolve();
                        }else{
                            var fadeInPromise = this.animate(newView, 'opacity', 1,
                                    this.options.animations.cinematic.change.fadeIn.duration,
                                    this.options.animations.cinematic.change.fadeIn.easing);
                            fadeInPromise.done(_.bind(function(){
                                deferred.resolve();
                            }, this));
                        }
                    }, this)
                );
            },
            _swapRelatedMedia: function(htmlFrag){
                var fadeOutPromise = this.animate(this.$('.recommended'), 'opacity',
                                            this.options.animations.cinematic.change.fadeOut.duration,
                                            this.options.animations.cinematic.change.fadeOut.easing);
                fadeOutPromise.done(_.bind(function() {
                        var newView = htmlFrag.find('.recommended');
                        newView.css('opacity', 0); // hide the new so it fades in
                        this.$('.recommended').replaceWith(newView);
                        if (newView.length){
                            this.animate(newView, 'opacity', 1,
                                this.options.animations.cinematic.change.fadeIn.duration,
                                this.options.animations.cinematic.change.fadeIn.easing);
                        }
                    }, this)
                );
            },
            _initializeGallery: function(){
                var html = this.$('.galleries');
                var galleryId = html.data().galleryId || 0;
                this.subviews.carousel = new CarouselAutosizeGallery({
                    el: this.$el,
                    gallerySelector: html,
                    scrollerColor: 'dark',
                    horizontalAdjust: 126,
                    verticalAdjust: 117
                });

                // Make request to taboola to get recommended galleries.
                this.subviews.taboola = new Taboola();
                this.subviews.taboola.getRelated(this.showRecommended, 'photo', 'photo', 10, null, galleryId);
            },
            _initializeVideo: function(html){
                var videoId = this.$('.video .videoObject').attr('id');
                this.subviews.video = new Video({
                    el: html,
                    onVideoComplete: this.switchToNextVideo,
                    autostart: true
                });

                // Make request to taboola to get recommended videos.
                this.subviews.taboola = new Taboola();
                this.subviews.taboola.getRelated(this.showRecommended, 'video', 'video', 10, null, videoId);
            },
            userInteraction: function(){
                if (this.switchVideoTimer){
                    clearTimeout(this.switchVideoTimer);
                }
            },
            switchToNextVideo: function(){
                var nextItem = this.$('.more-from .active').next();
                if (nextItem.length){
                    this.switchVideoTimer = setTimeout(function(){
                        nextItem.find('a').click();
                    }, 5000); // 5 seconds (5 * 1000)
                }
            },
            _initializeImage: function(html){
                Utils.lazyLoadImage($(html).find('.viewport img'), 'data-large-src');
            },

            destroyModules: function() {
                clearTimeout(this.switchVideoTimer);
                BaseApp.prototype.destroyModules.apply(this, arguments);
            },

            destroy: function(removeEl){
                this.win.off('.' + this.cid);
                // call base class destroy
                BaseApp.prototype.destroy.call(this, removeEl);
            },
            changeMediaClick: function(e){
                // this function only changes the highlight state
                // actual navigation is handled by the routes

                var $ele = $(e.target);

                this.$('.playlist li.active').removeClass('active');
                $ele.closest('li').addClass('active');

                if ($ele.closest('nav').hasClass('recommended')) {
                    var $img = $ele.closest('img');
                    var response_id = Utils.get('taboolaResponseID');
                    var item_type = $img.attr('data-type');
                    var item_id = $img.attr('data-id');
                    Taboola.prototype.registerTaboolaClick(item_id, item_type, response_id);
                }
            },

            mediaTabClick: function(e){
                var $playlist = this.$('.media-playlist');
                var $target = $(e.target).closest('li');
                if ($target.hasClass('expando')){
                    if ($playlist.hasClass('open')){
                        this.playlistStuckOpen = false;
                        $playlist.removeClass('open');
                    }else{
                        this.playlistStuckOpen = true;
                        $playlist.addClass('open');
                    }
                }else if ($target.hasClass('tab')){
                    $playlist.addClass('open');
                    if (!$target.hasClass('active')){
                        $playlist.find('.media-tabs .active').removeClass('active');
                        $target.addClass('active');
                        $playlist.find('.playlist').addClass('hidden');
                        $playlist.find('.' + $target.attr('for')).removeClass('hidden');
                    }
                }
            },
            mediaPlaylistMouseOut: function(){
                if (!this.playlistStuckOpen){
                    this.delayClosePlaylist();
                }
            },
            mediaPlaylistMouseIn: function(){
                clearTimeout(this.playlistTimer);
            },
            delayClosePlaylist: function(){
                this.$('.media-playlist').removeClass('initial');
            },

            /**
             * Initialize browse / overview page.
             */
            _initializeBrowse: function() {
                this.gridWrapper = this.$('.grid-wrapper');
                this.browse = true;
            },

            /**
             * Create columns for the browse view, based on page width.
             */
            columnize: function(htmlFrag) {
                var columnSize = 360;
                var gridItems = htmlFrag.find('.medialistitems');
                var pageWidth = $(window).width();
                var containerWidth = pageWidth - 130 - 31;
                var columns = Math.floor(containerWidth / columnSize);
                if (columns < 1){
                    columns = 1;
                }
                htmlFrag.find('.media-content').width(columns * columnSize);
                gridItems.removeClass('mediaview-featured');
                gridItems.slice(0, columns).addClass('mediaview-featured');
                Utils.lazyLoadImage(this.$('.mediaview-featured').find('img'), 'data-large-src', true);
            },

            /**
             * Toggle subsections.
             * @param {Event} e Click event
             */
            sectionHighlight: function(e) {
                var target = $(e.currentTarget);
                if (target.hasClass('active') && !$(e.target).attr('href')) {
                    var activeSub = target.children('ul');
                    if (target.hasClass('collapsed')) {
                        this.registerAnimation(activeSub.slideDown(250).promise());
                        target.removeClass('collapsed');
                    } else {
                        this.registerAnimation(activeSub.slideUp(250).promise());
                        target.addClass('collapsed');
                    }
                }
            },

            slide: function(newContent, direction, timeMs, easing){
                var attribute = null;
                var endPosition = null;
                if (direction === 'left'){
                    attribute = 'left';
                    endPosition = -100;
                }else if (direction === 'right'){
                    attribute = 'left';
                    endPosition = 100;
                } //TODO 'up' and 'down'

                var currentOffset = Utils.getScrollPosition(),
                    scrollTopOffset = this.$el.offset().top;
                SiteManager.scrollTop(0);
                currentOffset -= scrollTopOffset;
                this.$el.css(attribute, '0%');
                this.$el.css({position: 'absolute', top: -1 * currentOffset});
                newContent = $(newContent);
                newContent.css(attribute, (endPosition * -1) + '%');
                newContent.css({position: 'absolute', top: scrollTopOffset});
                newContent.insertAfter(this.$el);
                var deferred = $.Deferred();

                // we defer to give the browser a minute to render everything so the animation is timed better.
                _.defer(_.bind(function(){
                    // if we have no element, assume someone else is handling the slide out
                    if (this.$el.length !== 0){
                        this.animate(this.$el, attribute, endPosition + '%', timeMs, easing);
                    }
                    var promise = this.animate(newContent, attribute, '0%', timeMs, easing);
                    promise.done(_.bind(function(){
                        this.$el.remove();
                        newContent.css({position: '', top: ''});
                        this.setElement(newContent);
                        deferred.resolve();
                    }, this));
                }, this));
                return deferred.promise();
            },

            /*
             * Find taboola template for recommended galleries and populate it.
             */
            showRecommended: function(data) {
                var more = $('#mediaview-recommended-template');
                if (more.length === 1) {
                    var compiled = _.template(more.html(), {data: data.list});
                    $('#mediaview-cinematic-recommended').append(compiled);
                }
            }
        });

        /**
         * Return view class.
         */
        return MediaApp;
    }
);
