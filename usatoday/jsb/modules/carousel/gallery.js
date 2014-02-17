/**
 * @fileoverview Gallery subview of carousel. In charge of the the stacked images and endslate
 * @author jmerrifiel@gannett.com (Jay Merrifield)
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'baseview',
    'pubsub',
    'utils',
    'modules/global/taboola',
    'meteredAdPosition',
    'directAdPosition',
    'adLogger',
    'cookie'
],
    function(
        $,
        _,
        Backbone,
        BaseView,
        PubSub,
        Utils,
        Taboola,
        MeteredAdPosition,
        DirectAdPosition,
        AdLogger
    ) {

        /**
         * View class.
         */
        var CarouselGallery = BaseView.extend({

            events: {
                'click .gallery-actions-replay, .gallery-photo': 'nextSlide',
                'click .gallery-related-link': 'taboolaClick'
            },

            selectors: {
                endSlate: '.endslate',
                slides: '.slide:not(.partner-placement)',
                hiddenWhileSurvey : '.p402_hide'
            },

            endSlateTemplate: '<% _.each(data, function(item) { %>' +
                '<li class="gallery-related-item">' +
                '<a class="gallery-related-link" data-taboola-type="<%= item.type %>" ' +
                    'data-taboola-id="<%= item.id %>" data-taboola-response-id="<%=response_id%>"' +
                    'href="<%= item.url %>">' +
                    '<span class="taboola-image-crop">' +
                    '<img src="<%= item.thumbnail[0].url %>" class="taboola-related-img" alt="" />' +
                    '</span>'+
                    '<%= item.name %>' +
                '</a>' +
                '<span class="gallery-related-date"><%= item.created %></span>' +
                '</li>' +
                '<% }); %>',


            /**
             * Initialize view.
             * @param {Object} options View options passed in during init.
             */
            initialize: function(options) {
                _.bindAll(this, '_showEndslate', 'setAdSize', 'beforeAdRender');

                options = $.extend({
                    // transition set to 0 to resolve "flash" - Reinstate to 200 to add transition effect
                    ads: true,
                    slideTransition: 0,
                    imageLazySrcAttr: 'data-src',
                    lookAheadAmount: 2 // how many additional photos to fetch
                }, options);

                this.index = options.index;

                // Call base class initialize
                BaseView.prototype.initialize.call(this, options);

                this.adCount = 0;
                this.googleSurveyNeeded = false;
                //handle google surveys for cinematic page types only
                if(window.site_config.ADS.GALLERY && window.site_config.ADS.GALLERY.SURVEY) {
                    this.googleSurveyNeeded = true;
                }

                this._initializeAds();
                this.endSlateBuilt = false;
                this.isRotating = false;
            },

            destroy : function(){
                //if google dropped a survey, remove survey code
                if($.cookie("GoogleSurveyDropped")){
                    //if google dropped a survey but it never rendered, remove dropped cookie
                    if($.cookie("GoogleSurveyDropped")){
                        $.cookie("GoogleSurveyDropped", null);
                    }
                    if(this.$el.parent('.p402_premium').length !== 0){
                        this.$el.unwrap();
                    }
                    $('#contain-402').remove();
                }
                this._destroySurveyCallback();
                BaseView.prototype.destroy.call(this);
            },

            _initializeAds: function() {
                if (!this.options.ads) {
                    return;
                }
                this.galleryData = this.$el.data() || {};
                this.setAdCount();
                var targeting = this.getAdTargeting();

                this.$sponsorshipAd = this.$('.snapshot-sponsor');
                if (this.$sponsorshipAd.length) {
                    var currentSlideId = this._getSlideIn(this.index).data('qqid');
                    targeting.snapshotid = currentSlideId;
                    this.subviews.sponsorshipAd = new DirectAdPosition({
                        el: this.$sponsorshipAd,
                        adPlacement: 'sponsor_logo/snapshots',
                        adSizes: ['sponsor_logo'],
                        targeting: targeting
                    });
                }
                this.$viewport = this.$('.viewport');
                var viewportWidth = this.$viewport.width(), viewportHeight = this.$viewport.height();
                if (viewportHeight < 450 || viewportWidth < 600) {
                    AdLogger.logWarn('Advertisement viewport is too small: ' + viewportWidth + 'x' + viewportHeight);
                } else {
                    this.$adSlide = this.$('.partner-slide-ad');
                    this.$adContents = this.$('.partner-slide-ad .gallery-photo-border');
                    var meterThreshold = null;
                    if (this.galleryData.galleryId === 'snapshot') {
                        meterThreshold = 'transition_snapshot';
                    }
                    this.subviews.ad = new MeteredAdPosition({
                        el: this.$adContents,
                        adPlacement: 'transition_gallery/' + this.galleryData.cst,
                        adSizes: ['elastic'],
                        beforeAdRender: this.beforeAdRender,
                        meterThreshold: meterThreshold,
                        rateMeterId: 'gallery_' + this.galleryData.galleryId,
                        targeting: targeting
                    });
                }
            },

            setAdCount : function(){
                this.adCount++;
            },

            getAdTargeting: function(){
                return {
                    pageType: this.galleryData.basePageType,
                    title: this.galleryData.seoTitle,
                    sitePage: 'usat/' + (this.galleryData.ssts || '').replace(/\/\/*$/, ''),
                    series: this.galleryData.series,
                    topic: this.galleryData.topic,
                    count: this.adCount,
                    surveyCookie: '' + ($.cookie('GoogleSurveyTaken') || false), //converting Bool to string for DFP (which doesn't like the Bool)
                    surveyOn: this.googleSurveyNeeded.toString() //converting Bool to string for DFP (which doesn't like the Bool)
                };
            },

            /**
             * Google Survey callback that will set a cookie, advance to the next slide,
             * unhide any contents hidden by survey event, and destory the global USATGoogleSurvey
             *
             */
            completedSurvey: function () {
                //set cookie indicating survey has been taken - survey is to appear once per user per 24 hours
                $.cookie('GoogleSurveyTaken', 'true', {
                    expires: 1
                });
                //remove cookie that survey dropped to indicate a survey is present
                $.cookie("GoogleSurveyDropped", null);
                //check if was autorotating when survey displayed and restart autoplay
                if (this.isRotating) {
                    this.options.carousel.autoplay();
                } else {
                    //determine which direction in the gallery the user was going when user received survey so we can advance the user the same direction
                    var selectors = this.options.carousel.subviews.controls.selectors,
                        nextIsActive = !! $(selectors.nextArrow).attr('data-lastClicked'),
                        isFirstSlide = ($(selectors.prevArrow).css('display') == 'none'),
                        incrementor = -1;
                    if (nextIsActive || isFirstSlide) {
                        incrementor = 1;
                    }
                    //simulate click event
                    this.options.carousel.switchSlide(null, incrementor);
                }
                //unhide any content hidden by the survey
                var $controls = this.options.carousel.subviews.controls.$el;
                $controls.find(this.selectors.hiddenWhileSurvey).css('display', 'block');
                this._destroySurveyCallback();
            },

            /**
             * functionality to remove the global callback that gets created for Google Survey ads
             * @private
             */
            _destroySurveyCallback : function(){
                if(window.USATGoogleSurvey){
                    window.USATGoogleSurvey = undefined;
                    try {
                        delete window.USATGoogleSurvey;
                    } catch(e) {} // guard against IE throwing exceptions
                }
            },

            /**
             * post initialize render function that will check to see if a higher rez image needs to be loaded
             */
            render: function(){
                // load the larger sized image if needed
                this._loadImage(this.$$(this.selectors.slides).eq(this.index));
            },

            /**
             * Event callback
             * @param {Event} e
             */
            taboolaClick: function(e){
                var img = $(e.currentTarget);

                Taboola.prototype.registerTaboolaClick(img.attr('data-taboola-id'),
                                                        img.attr('data-taboola-type'),
                                                        img.attr('data-taboola-response-id'),
                                                        'end-slate');
            },

            /**
             * Event callback to navigate to the next slide
             * @param {Event} e click event
             */
            nextSlide: function(e){
                e.preventDefault();
                this.options.carousel.switchSlide(null, 1);
            },

            /**
             * Make call to Taboola to build the end slate, add loading class
             * Will register the _showEndSlate callback with Taboola to render and cleanup
             * @private
             */
            _buildEndslate: function() {
                this.endSlateBuilt = true;

                // Make request to taboola to get recommended videos.
                var url = window.location.href;
                if (this.$el.hasClass('hasendslate') && this.$el.data('gallery-id')) {
                    url = window.location.protocol + '//' + window.location.host + '/picture-gallery/' + this.$el.data('gallery-id') + '/';
                }
                var taboola = new Taboola();
                this.$$(this.selectors.endSlate).addClass('loading');
                taboola.getRelated(this._showEndslate, 'photo', 'photo', 4, url, this.$el.data('gallery-id'));
            },

            /**
             * Taboola callback that will render the related items list for the end slate and remove the loading class
             * @param {Object} data Taboola data
             * @private
             */
            _showEndslate: function(data) {
                var endslate = this.$$(this.selectors.endSlate).removeClass('loading'),
                    media_url = endslate.find('.gallery-endslate-related').attr("data-media-url") || "";
                 _.each(data.list, function(item) {
                     if(item.thumbnail[0].url.indexOf('images.taboola.com') > -1) {
                            item.thumbnail[0].url = decodeURIComponent((item.thumbnail[0].url+'').replace(/\+/g, '%20'));
                            item.thumbnail[0].url = item.thumbnail[0].url.replace("http://images.taboola.com/taboola/image/fetch/f_jpg,q_80,c_fill,g_face,e_sharpen/","");
                        }
                });
                if (endslate.length === 1) {
                    var compiled = _.template(this.endSlateTemplate, {data: data.list, response_id: data.id});
                    endslate.find('.gallery-endslate-related').html(compiled);
                }
            },

            /**
             * Event listener that will transition from the current index to the next index
             * @param {Number} index slide index to go to
             * @return {Deferred}
             */
            goToSlide: function(index){
                // must happen before slideIn, cause slideIn might pick an ad
                var slideOut = this._getSlideOut();
                var slideIn = this._getSlideIn(index);


                if (!slideIn.length){
                    // guard to prevent a crash in switchSlides
                    return $.Deferred().reject();
                }

                this.index = index;

                PubSub.trigger('carousel:switchSlide');

                return this._switchSlides(slideIn, slideOut, this.options.slideTransition);
            },

            /**
             * Asks the gallery whether the next slide should be an ad
             * @return {Boolean}
             */
            shouldShowAd: function(){
                if (!this.showingAd && this.options.ads && this.subviews.ad && this.subviews.ad.shouldShowAd()){
                    return true;
                }
                return false;
            },

            /**
             * Will fadeOut out the current slide and fadeIn the current ad
             * @return {Deferred}
             */
            showAd: function(){
                var slideOut = this._getSlideOut();
                this.showingAd = this.$adSlide;
                if (slideOut[0] !== this.showingAd[0]){
                    if (this.$sponsorshipAd) {
                        this.$sponsorshipAd.hide();
                    }
                    return this._switchSlides(this.showingAd, slideOut, this.options.slideTransition).done(_.bind(function(){
                        if(($.cookie('GoogleSurveyDropped') + '') === 'true') {
                            var $controls = this.options.carousel.subviews.controls.$el;
                            var hideClass = this.selectors.hiddenWhileSurvey.substr(1);
                            //adding a wrapped div (and not just a classname to the controls div) per google implementation documentation:
                            //https://gannett.jira.com/secure/attachment/46322/Google%20Consumer%20Surveys%20-%20Implementation%20Guide%20%2806-17-13%29.pdf
                            $controls.find('.media-playlist').wrap('<div class="' + hideClass + '"></div>');
                            if(this.options.carousel.playTimer){
                                this.isRotating = true;
                                this.options.carousel._stopCarouselRotate();
                            }
                        }
                        this.subviews.ad.playAd();
                    }, this));
                }else{
                    return $.Deferred().reject();
                }
            },

            /**
             * Takes a target slide and a current slide and cross fades them
             * @param {jQuery} slideIn slide to fade in
             * @param {jQuery} slideOut slide to fade out
             * @param {Integer} transitionTime time in ms to transition
             * @return {Deferred}
             * @private
             */
            _switchSlides: function(slideIn, slideOut, transitionTime){
                slideOut.css({opacity: 1});
                if (slideOut === this.showingAd){
                    this.subviews.ad.stopAd();
                }
                return this.animate(slideOut, 'opacity', 0, transitionTime, 'ease-in-out').then(_.bind(function(){
                    slideOut.removeClass('active');
                    if ((slideOut === this.showingAd)){
                        this.setAdCount();
                        var targeting = this.getAdTargeting();
                        this.subviews.ad.setTargeting(targeting);
                        this.subviews.ad.refreshPosition();
                        this.showingAd = null;
                    }
                    return this._fadeInSlide(slideIn, transitionTime).done(_.bind(function(){
                        if (slideIn !== this.showingAd && this.$sponsorshipAd && this.$sponsorshipAd.length) {
                            this.refreshSponsorshipAd(slideIn.data('qqid'));
                        }
                        slideOut.css({visibility: 'hidden', opacity: 0});
                    }, this));
                }, this));
            },

            /**
             * Given a snapshot id, will reset the targeting of the snapshot ad and refresh it
             * @param {Number} snapshotId the id of the current snapshot
            */
            refreshSponsorshipAd: function(snapshotId){
                var targeting = this.getAdTargeting();
                targeting.snapshotid = snapshotId;
                this.subviews.sponsorshipAd.setTargeting(targeting);
                this.subviews.sponsorshipAd.refreshPosition();
            },

            /**
             * Determines the active slide or ad that needs to fade out
             * @return {jQuery}
             * @private
             */
            _getSlideOut: function(){
                var slideOut;
                if (this.showingAd){
                    slideOut = this.showingAd;
                }else{
                    slideOut = this.$$(this.selectors.slides).eq(this.index);
                }
                return slideOut;
            },
            /**
             * Gets the slide to fade in, loads any images that need to be loaded
             * @param index index of the slide to load in, assumes it's a valid index
             * @return {jQuery}
             * @private
             */
            _getSlideIn: function(index){
                var slideIn;
                slideIn = this.$$(this.selectors.slides).eq(index);
                this._loadImage(slideIn, this.index > index);
                if (!this.endSlateBuilt && slideIn.hasClass('endslate')){
                    this._buildEndslate();
                }
                return slideIn;
            },
            /**
             * given a slide, will load it's image if needed,
             * and the next X images specified by this.options.lookAheadAmount
             * @param {jQuery} slide
             * @param {Boolean} backward specifying if we're traversing backwards or forward
             * @private
             */
            _loadImage: function(slide, backward){
                var i = this.options.lookAheadAmount;
                do{
                    this._fetchImage(slide.find("img"));
                    i--;
                    if (backward){
                        slide = slide.prev();
                    }else{
                        slide = slide.next();
                    }
                } while (i >= 0 && slide.length > 0);
            },
            /**
             * Fetches one lazy image, hides the image until loading,
             * adds a loading class, restores everything on load
             * @param {jQuery} img to load
             * @private
             */
            _fetchImage: function(img){
                if (img.length > 0) {
                    if (Utils.lazyLoadImage(img, this.options.imageLazySrcAttr)) {
                        // we're lazily loading, add loading class
                        var parent = img.parent();
                        // centers the loading gif vertically
                        parent.addClass("loading");
                        img.load(_.bind(function() {
                            parent.removeClass("loading");
                            this._resizeMeta(img);
                        }, this));
                    }
                }
            },

            /**
             * Takes a slide, makes it visible, gives it an active class, and animates in it's opacity
             * also resizes the meta tag to fit the image
             * @param {jQuery} slide to fade in
             * @param {Integer} transitionTime time in ms to animate
             * @return {Deferred}
             * @private
             */
            _fadeInSlide: function(slide, transitionTime){
                slide.css({visibility: 'visible', 'z-index': 1});
                slide.addClass('active');
                this._resizeMeta(slide.find('.gallery-photo'));
                return this.animate(slide, 'opacity', 1, transitionTime, 'ease-in-out');
            },

            /**
             * helper function to get the current image width and size the metadata to fix exactly
             * that size in width
             * @param {jQuery} img
             * @private
             */
            _resizeMeta: function(img){
                if (img.length){
                    var width = this._getImageWidth(img);
                    // hidden images return 0 width, it's better at that point to let the browser auto size
                    if (width){
                        img.parent().width(width);
                    }
                }
            },

            /**
             * Silly function to help unit test
             * @param {jQuery} img to be sized
             * @return {Number} width of the image
             * @private
             */
            _getImageWidth: function(img){
                return img.width();
            },

            /**
             * carousel callback that is triggered on viewport resize so we can resize the active image's meta width
             * @param {Number} width viewport width
             * @param {Number} height viewport height
             */
            viewportResize: function(width, height) {
                // resize the active photo
                this.$('.active .gallery-photo').each(_.bind(function(idx, img){
                    this._resizeMeta($(img));
                }, this));
                if (this.$adSlide && this.subviews.ad) {
                    this.setAdSize(width, height);
                    this.subviews.ad.resizeAd(width, height);
                }
            },

            /**
             * Called before the ad is rendered on the page, used to set the base ad size
             * @param {Object} ad data from DFP
             * @param {Stirng} type of ad
             */
            beforeAdRender: function(adData, adType) {
                if(adData.survey){
                    //add callback for Google Survey, to be destoryed on destory function
                    window.USATGoogleSurvey = {
                        completedSurvey : _.bind(this.completedSurvey, this)
                    };
                }
                this.setAdSize();
            },

            /**
             * sets the correct ad size. We need this since the photo border by default wraps the
             * contents, but ads are auto sizing, so someone needs to man up and define a size
             * @param {Number} width
             * @param {Number} height
             */
            setAdSize: function(width, height){
                width = width || this.$viewport.width();
                height = height || this.$viewport.height();
                var adSizing = this.findSizeForAd(width, height);
                this.$adContents.removeClass('size-s size-m size-l size-xl').addClass(adSizing.adSizeClass).css('margin-top', adSizing.marginTop);
            },

            /**
             * Magic number finder, given combinations of heights and widths figures out an appropriate ad size
             * @param {Number} ww viewport Width
             * @param {Number} wh viewport Height
             */
            findSizeForAd: function(ww, wh) {
                var obj = {
                    'adSizeClass' : 'size-s',
                    'marginTop' : '5px'
                };
                // check size
                var h = 450;
                if (ww > 1080 && wh > 810) {
                    obj.adSizeClass = 'size-xl';
                    h = 810;
                } else if (ww > 936 && wh > 700) {
                    obj.adSizeClass = 'size-l';
                    h = 700;
                } else if (ww > 768 && wh > 576) {
                    obj.adSizeClass = 'size-m';
                    h = 576;
                }

                obj.marginTop = ((wh - h) / 2) + 'px';

                // default to small
                return obj;
            }
        });
        return CarouselGallery;
    }
);
