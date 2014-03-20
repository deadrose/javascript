/**
 * @fileoverview Sports Gallery Carousel module view.
 * @author ikenticus (extends front-galleries)
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'pubsub',
    'modules/stories/share-facebook',
    'modules/fronts/front-galleries',
    'modules/sports/sports-front-carousel',
    'ui/loader',
    'directAdPosition'
],
function(
    $,
    _,
    BaseView,
    PubSub,
    ShareFacebook,
    FrontGallery,
    SportsFrontCarousel,
    Loader,
    DirectAdPosition
) {
    'use strict';

    var SportsFrontGalleryView = FrontGallery.extend({

        events: function() {
            var parentEvents = FrontGallery.prototype.events;
            if (_.isFunction(parentEvents)) {
                parentEvents = parentEvents();
            }
            return _.extend({},parentEvents,{
                'click .util-bar-flyout-nav-btn': 'onClickFlyoutNavBtn',
                'click .gallery-sidebar-close': 'sidebarClose',
                'click .fullscreen': 'launchFullscreen',
                mouseleave: 'mouseLeave'
            });
        },

        initialize: function(options) {
            this.$primary = $('.sports-front-galleries-primary');
            this.$module = $('.sports-front-galleries-modules');
            this.$closer = this.$('.gallery-sidebar-close');
            this.$sidebar = this.$('.gallery-sidebar-ad');
            this.$counter = $('.gallery-count');
            this.$toolbox = this.$('.gallery-sidebar-toolbox');
            this.$cardfilm = $('.card-film');
            this.$cardcolor = $('.card-suspender-color');
            this.$suspender = $('.sports-front-galleries-suspender');

            this.$galleries = this.$('.front-gallery');
            this.$navItems = this.$('.front-gallery-item');
            this.$titles = this.$('.gallery-sidebar-title');
            this.$partnerSlot = $('.sp-galleries-partner-slot');

            _.bindAll(this, 'switchGallery', 'setupAd', 'refreshAd', 'sidebarAds', 'resetGallery');

            // call base class initialize
            BaseView.prototype.initialize.call(this, {});

            PubSub.on('carousel:switchSlide', _.bind(function() {
                this.refreshAd();
            },this));

            this.subviews.loader = new Loader({
                el: this.$galleries.parent()
            });

            if (this.$galleries.find(".slide.active").length) {
                var $gallery = this.$(".front-gallery.selected");
                this.subviews['gallery' + $gallery.index()] = new SportsFrontCarousel({
                    ads: true,
                    linkPath: this.$navItems.filter('.selected').find('a').attr('href'),
                    el: $gallery.find('.galleries'),
                    fullScreen: true,
                    onSidebarAfterReveal: this.setupAd,
                    sidebarAds: this.sidebarAds
                });
                this.empty= false;
            } else {
                var href = this.$navItems.first().find("a").attr("href");
                if (typeof href !== 'undefined' && href.length > 1) {
                    this.fetchData(href, 0, this.switchGallery);
                }
            }

            this.$('.util-bar-flyout-section').hide();
            this.subviews.facebook = new ShareFacebook({
                el: this.$('.util-bar-flyout-share')
            });
        },

        _initializeAds: function() {
            if (this.$sponsorshipAd) {
                return;
            }
            this.$sponsorshipAd  = $('<div class="partner-placement poster" data-monetization-id="sp-gallery" data-monetization-sizes="mediumrectangle"></div>');
            this.$partnerSlot.append(this.$sponsorshipAd);
        },

        renderCardInfo: function(currentCardInfo) {
            this.currentCardInfo = currentCardInfo;
        },

        onCardWidthChange: function(newCardInfo) {
            this.currentCardInfo = newCardInfo;
            if (this.sidebarAds()) {
                this.setupAd();
                if (this.$sidebar.hasClass('active')) {
                    PubSub.trigger('carousel:cardfilmActive');
                }
            } else {
                this.teardownAd();
                if (this.$sidebar.hasClass('active')) {
                    PubSub.trigger('carousel:sidebarClosed');
                }
            }
        },

        sidebarAds: function() {
            if (!this.currentCardInfo) {
                return false;
            } else {
                return this.currentCardInfo.sidebarAds;
            }
        },

        switchGallery: function(html, index, path) {
            // Show chosen gallery
            var $gallery = this.$galleries.eq(index);
            this.$galleries.removeClass('selected');
            $gallery.addClass('selected');

            // Show chosen gallery toolbar
            var $toolbar = this.$toolbox.eq(index);
            this.$toolbox.removeClass('selected');
            $toolbar.addClass('selected');
            // deactivate all social-media items when switching
            this.$('.util-bar-flyout-nav-btn').removeClass('active');

            // Show chosen gallery title
            var $title = this.$titles.eq(index);
            this.$titles.removeClass('selected');
            $title.addClass('selected');

            // Show chosen gallery selected caption
            var sidebar = this.$('.gallery-sidebar-ad .caption');
            var caption = $gallery.find('.active .gallery-viewport-caption').html();
            this.resetSections();
            sidebar.html(caption);

            if (html) {
                $gallery.html(html);
                var counter = '<div class="gallery-count"><div>' +
                    $gallery.find('.thumb-item').length +
                    '</div><div class="line">Photos</div></div>';
                $gallery.append(counter);
                this.$counter = $('.gallery-count');
            }
            if (!this.subviews['gallery' + index]) {
                var carousel = this.subviews['gallery' + index] = new SportsFrontCarousel({
                    ads: true,
                    el: $gallery.find('.galleries'),
                    fullScreen: true,
                    linkPath: path,
                    onSidebarAfterReveal: this.setupAd,
                    sidebarAds: this.sidebarAds
                });
                if (!this.empty) {
                    this.trackGalleryChange(carousel);
                    this.empty = false;
                }
            } else {
                this.trackGalleryChange(this.subviews['gallery' + index]);
                if (this.subviews['gallery' + index].subviews.gallery && this.subviews['gallery' + index].subviews.gallery.refreshSportsSponsorshipAd){
                    this.subviews['gallery' + index].subviews.gallery.refreshSportsSponsorshipAd();
                }
                this.teardownAd();
                this.setupAd();
            }
            $gallery.css({opacity: 0});
            this.animate($gallery, 'opacity', 1, 200);
        },

        launchFullscreen: function() {
            // invoke the fullscreen button on the carousel/controls view
            $('.front-gallery.selected .fullscreen').click();
        },

        mouseLeave: function(e) {
            var parentGroup = $(e.relatedTarget).parents();
            var searchValue = this.$el[0];
            var elementFound = parentGroup.filter(function() { return this == searchValue; }).length;
            if (!elementFound) {
                this.$counter.css('opacity', 1);
                this.$counter.css('visibility', 'visible');
                if (!this.$closer.hasClass('active'))
                    this.$closer.click();
            }
        },

        setupAd: function() {
            var index = this.$(".front-gallery.selected").index();
            if (this.sidebarAds()) {
                this.adSetup = true;
                this._initializeAds();

                // set up ad
                var targeting = {};
                if (this.subviews['gallery' + index].subviews.gallery && this.subviews['gallery' + index].subviews.gallery.getAdTargeting) {
                    targeting = this.subviews['gallery' + index].subviews.gallery.getAdTargeting();
                }
                var galleryData = this.$(".front-gallery.selected .galleries").data();

                this.subviews.sponsorshipAd = new DirectAdPosition({
                    el: this.$sponsorshipAd,
                    adPlacement: 'poster_gallery_companion/' + galleryData.cst,
                    adSizes: ['mediumrectangle'],
                    targeting: targeting
                });
            }
        },

        // the following 2 functions mimic web-standard-apps.git: utility-bar-modules-share.js
        onClickFlyoutNavBtn: function(e) {
            var $btn = $(e.currentTarget);
            var moduleSection = $(e.currentTarget).data('share-method'),
                galleryTitle = $(e.currentTarget).data('share-title'),
                galleryLink = $(e.currentTarget).data('share-link'),
                shareTrack = 'SportsGallery' + moduleSection;

            PubSub.trigger('uotrack', shareTrack);
            if (moduleSection) {
                this.showSection($btn.parent().parent(), moduleSection);
            }
            if (!this.$closer.hasClass('active')) {
                this.$closer.addClass('active');
                this.$cardfilm.removeClass('inactive');
                this.$module.css('z-index', 501);
                this.$suspender.css('background-color', this.$cardcolor.css('background-color'));
            }
            if (moduleSection == 'facebook') {
                this.$('.util-bar-share-message-facebook').data('link', galleryLink);
                this.$('.util-bar-share-message-facebook').data('title', galleryTitle);
                this.resetSections();
                this.$('.gallery-sidebar-ad .caption').empty();
                this.subviews.facebook.onClickPostBtn(e);
                e.preventDefault();
            }
        },

        showSection: function(toolbox, sectionName) {
            this.resetSections();
            this.activeSection = sectionName;
            this.$('.util-bar-flyout-nav-btn-' + sectionName).addClass('active');
            //this.$('.util-bar-flyout-section-' + sectionName).show();
        },

        resetSections: function() {
            this.$('.util-bar-flyout-nav-btn').removeClass('active');
            this.$('.util-bar-flyout-pane-success').hide();
        },

        resetGallery: function() {
            this.resetSections();
            this.$primary.removeClass('active');
            this.$closer.removeClass('active');
            this.$cardfilm.addClass('inactive');
            this.$sidebar.removeClass('active');
            this.$module.css('z-index', 'auto');
        },

        sidebarClose: function(e) {
            if (e){
                e.preventDefault();
                e.stopPropagation();
            }
            var w = parseInt(this.$sidebar.outerWidth() + 1, 10);
            var slideAnimation = null;
            if (this.$sidebar.hasClass('active')) {
                PubSub.trigger('carousel:sidebarClosed');
                // deactivate all social-media items when closing
                this.$('.util-bar-flyout-nav-btn').removeClass('active');
                slideAnimation = this.animate(this.$sidebar, 'right', 0, 250, 'ease-in-out');
                slideAnimation.done(_.bind(function() {
                    this.resetGallery();
                }, this));
                this.teardownAd();
            }
        },

        refreshAd: function() {
            if (this.subviews.sponsorshipAd && this.subviews.sponsorshipAd.refreshPosition) {
                this.subviews.sponsorshipAd.refreshPosition();
            }
        },

        teardownAd: function() {
            if (this.subviews.sponsorshipAd && this.adSetup) {
                delete this.adSetup;
                this.$sponsorshipAd.empty();
                this.subviews.sponsorshipAd.destroy();
                delete this.subviews.sponsorshipAd;
            }
        },

        destroy: function(removeEl) {
            PubSub.off('carousel:switchSlide');
            FrontGallery.prototype.destroy.call(this, removeEl);
        }

    });

    return SportsFrontGalleryView;

});
