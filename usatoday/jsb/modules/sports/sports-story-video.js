/**
 * @fileoverview Sports Story Related Video View
 */
define([
    'jquery',
    'underscore',
    'state',
    'pubsub',
    'backbone',
    'baseview',
    'modules/global/brightcove-video',
    'bxslider'
],
function(
    $,
    _,
    StateManager,
    PubSub,
    Backbone,
    BaseView,
    VideoView
) {
    'use strict';

    var SportsStoryRelatedVideo = VideoView.extend({

            events: function() {
                var parentEvents = VideoView.prototype.events;
                if(_.isFunction(parentEvents)){
                    parentEvents = parentEvents();
                }
                return _.extend({},parentEvents, {
                    'click .sports-video-promo-link': 'createPlayer'
                });
            },

            initialize: function(options) {
                
                VideoView.prototype.initialize.call(this, options);
                
                this.isPlaying = false;
                //Global Header Elements
                this.$globalHeaderEl = $('body header:first');
                this.$overlayCloseEl = $('.close-wrap');
                this.activeVideoId = '';
                this.modalHtml = '<div id="sp-videomodal-overlay" class="sp-videomodal-overlay"></div>';
                this.modalHtml += '<div id="sp-videomodal-container" class="sp-videomodal-container">';
                this.modalHtml += '<a id="sp-videomodal-close" class="sp-videomodal-close" title="Close"></a>';
                this.modalHtml += '<div id="sp-videomodal-wrapper" class="sp-videomodal-wrapper loading">';
                this.modalHtml += '</div></div>';
                this.$promoEl = '';
                this.videoType = '';
                this.cuedVideoId = '';
                _.bindAll(this, 'createPlayer', 'onBrightCoveLoad', 'onTemplateReady', 'onVideoComplete', 'onVideoStart', 'isPlayingHandler', 'determineCompletion');
     
                
            },
             

            _buildBrightCoveLoadCallback: function(){
                if ($('.sp-video-player-modal').length > 0) {
                    this.$brightcove = $('.sp-video-player-modal .BrightcoveExperience'); 
                    this.brightcoveId = $('.sp-video-player-modal .BrightcoveExperience').attr('id');
                }
                if (!window.BCCallbacks){
                    //console.log('no bc callbacks');
                    window.BCCallbacks = {};
                }
                //console.log(this.brightcoveId);
                window.BCCallbacks[this.brightcoveId] = this.onBrightCoveLoad;
                window.brightcove.createExperiences();
                
                if (!window.BCLoad) {
                    //console.log('windowbcload');
                    window.BCLoad = function(experienceId){
                        if (window.BCCallbacks[experienceId]){
                            window.BCCallbacks[experienceId](experienceId);
                        } else {
                            console.log('received brightcove callback for video that does not exist: ' + experienceId);
                        }
                    };
                } else {
                    console.log('BCLoad is already here');
                }
            },
            
            updateTrackingDataObj: function( el ) {
              this.$videoObj = el;  
            },

            createPlayer: function( e ) {
                if (this.$promoEl === '' ) {
                    e.preventDefault();
                    this.$promoEl = $(e.currentTarget);           
                }
                if (typeof window.brightcove !== 'undefined') {
                   this.fetchPlaylist(this.$promoEl);
                } else {
                    this.loadScripts(_.bind(this.createPlayer, this));
                } 
            },

            loadVideoById: function(newVideoId, e) {
                this.updateTrackingDataObj(e);
                this.closeShare();
                this.updateActiveItem(e);
                this.modVP.loadVideoByID(newVideoId);
                this.populateUtilityShare($(e).find('a'));
            },

            fetchPlaylist: function( el ) {      
                    this.showModal();
                    var playlistid = $(el).data('playlistid');
                    var playerid = $(el).data('playerid');
                    var playerkey = $(el).data('playerkey');
                    this.modifyGlobalElements();
                    var url = '/sports/services/sports-video/playlist/'+ playerid +'/' + playlistid + '/' + playerkey + '/';
                    var callback =  this.launchVideoPromo;
                    StateManager.fetchHtml(url).done(_.bind(callback, this));
            },

            launchVideoPromo: function( html ) {
                $('#sp-videomodal-wrapper').html(html);
                $('#sp-videomodal-wrapper').removeClass("loading");
                this.$videoObj = $('.sp-video-player-modal .player');
                
                this._buildBrightCoveLoadCallback();
                this.initPlaylistCarousel();
                this.initShareEvents();
            },

            initPlaylistCarousel: function() {
                this.$sliderEl = $(".sp-video-player-modal .bxslider");
                this.$sliderEl.bxSlider({
                    slideWidth: 128,
                    minSlides: 1,
                    maxSlides: 6,
                    pager: false,
                    slideMargin: 10,
                    onSliderLoad: _.bind(function() {
                        this.initPlaylistItems();
                    }, this),
                    onSlideAfter: _.bind(function($slideElement, oldIndex, newIndex) {
                        this.$sliderEl.find("a[data-id='" + this.activeVideoId + "']").parent().addClass('active');
                    }, this)
                });              
            },

            initPlaylistItems: function() {
                this.$spVideoObj = $('.sp-video-player-modal');
                this.activeEl = $('.sp-video-player-modal .bxslider .active');
                this.activeVideoId = this.activeEl.find('a').data('id');
                this.$nextEl = $('.sp-video-player-modal .bxslider .active').next();
                this.nextAsset = $('.sp-video-player-modal .bxslider .active').next().find('a').data('id');

                $('.sp-video-player-modal .bxslider .item a').click(_.bind(function(e) {
                    e.preventDefault();
                    var videoId = $(e.currentTarget).data('id');
                    var videoTitle = $(e.currentTarget).data('title');

                    $(e.currentTarget).parent().siblings().removeClass("active");
                    $(e.currentTarget).parent().addClass("active");
                    $('.sp-video-player-modal .asset-title').html(videoTitle);

                    this.loadVideoById(videoId, $(e.currentTarget).parent());
                }, this));
            },

            modifyGlobalElements: function() {
                //the z-index of the modal is 1001so we have to place it on top of the header
                this.$globalHeaderEl.css('position','relative').css('z-index','1000');
                //hide the story overlay button
                this.$overlayCloseEl.hide();
            },

            resetGlobalElements: function() {
                this.$globalHeaderEl.css('position','interit').css('z-index','auto');
                this.$overlayCloseEl.show();
                //$.modal.close();
            },

            initShareEvents: function() {
                $('.sp-video-player-modal .util-bar-btn-facebook').click(_.bind(function() { 
                    this.pausePlayer();
                }, this));
                $('.sp-video-player-modal .util-bar-flyout-close-ribbon').click(_.bind(function() { 
                    this.unpausePlayer();
                }, this));
            },

            populateUtilityShare: function(targetEl) { 
               var title = $(targetEl).data('title');
               var description = $(targetEl).data('desc');
               var shortUrl = $(targetEl).data('shorturl');
               var pageUrl = $(targetEl).data('pageurl');
               var twitterHref  = "https://twitter.com/intent/tweet?url=" + shortUrl + "&via=USATODAY&text=" + title;
               var googleplusHref = "//plus.google.com/share?url=" + shortUrl;
               var linkedinHref = "http://www.linkedin.com/shareArticle?url=" + shortUrl + "&mini=true";
               var thumbnailUrl = '';
               if ($(targetEl).find('figure').length > 0 ) {
                   thumbnailUrl =  $(targetEl).find('figure').find('img').attr('src');
               } else {
                   thumbnailUrl =  $(targetEl).data('imageurl');
               }
 
               this.$spVideoObj.find('.util-bar-flyout-nav-btn-twitter').attr('href', twitterHref);
               this.$spVideoObj.find('.util-bar-flyout-nav-btn-googleplus').attr('href', googleplusHref);
               this.$spVideoObj.find('.util-bar-flyout-nav-btn-linkedin').attr('href', linkedinHref);
               this.$spVideoObj.find('.util-bar-flyout-section-facebook').data('link', pageUrl);
               this.$spVideoObj.find('.util-bar-share-form-email textarea').html(title + 'on USAToday.com: ' + shortUrl);
               this.$spVideoObj.find('.util-bar-share-summary-title').html(title);
               this.$spVideoObj.find('.util-bar-share-summary-description').html(description);
               this.$spVideoObj.find('.util-bar-share-summary-image').data('src', thumbnailUrl);
               this.$spVideoObj.find('.util-bar-share-summary-image').attr('src', thumbnailUrl);
               this.$spVideoObj.find('.util-bar-share-loading-facebook').data('image', thumbnailUrl);
            },

            pausePlayer: function() {
                StateManager.startRefreshTimer();
                var isPlaying = this.modVP.getIsPlaying(_.bind(function(result) {
                    if (result === false) {
                        this.isPlaying = false;
                    } else {
                        this.isPlaying = true;
                    }
                }, this));
                this.modVP.pause(true);
            },

            unpausePlayer: function() {
                StateManager.stopRefreshTimer();
                if (this.isPlaying === true) {
                    this.modVP.pause(false);
                }        
            },

            showModal: function() {
                var scrollTopOffset = $(document).scrollTop() + 30;
                
                $('body').append(this.modalHtml);
                $('#sp-videomodal-container').css('top', scrollTopOffset + "px");
                
                $('#sp-videomodal-overlay').fadeIn('slow');
                $('#sp-videomodal-container').fadeIn('slow');
                  
                $('#sp-videomodal-overlay').click(_.bind(function(e) {
                    this.closeModal(e);
                }, this));      

                $('#sp-videomodal-close').click(_.bind(function(e) {
                    this.closeModal(e);
                }, this));
            },
            
            setNextAsset: function(el) {
                if ($(el).next(".item").length > 0 ) {
                    this.nextAsset = $(el).next().find('a').data('id');
                    this.$nextEl = $(el).next();
                } else {
                    this.nextAsset = $(el).siblings().filter(":first").find('a').data('id');
                    this.$nextEl = $(el).siblings().filter(":first");
                }                
            },

            updateActiveItem: function(el) {
                this.activeEl = el;
                this.activeVideoId = $(el).find('a').data('id');
                $(el).siblings().removeClass("active");
                $(el).addClass("active");
                this.setNextAsset($(el));
            },

            closeShare: function() {
                //close the share if open
                if ( $('.util-bar-flyout-share').hasClass('open') ) {
                    $('.util-bar-flyout-close-ribbon').trigger('click');
                }
            },

            closeModal: function(e) {
                this.modExp.removeEventListener(window.brightcove.api.events.ExperienceEvent.TEMPLATE_READY, this.onTemplateReady); 
                this.resetGlobalElements();
                $('#sp-videomodal-overlay').fadeOut('fast', function() {
                    $(this).remove();
                });
                $('#sp-videomodal-container').fadeOut('fast', function() {
                    $(this).remove();
                });  
            },

            onVideoComplete: function() {
                this.$activeEl = this.$nextEl;
                this.loadVideoById(this.nextAsset, this.$nextEl);
                if ($('.sp-video-player-modal').length > 0 ) {
                    var playlistInnerWidth = $('.sp-video-player-modal .bx-viewport').innerWidth();
                    var playlistOffset = $('.sp-video-player-modal .bx-viewport').offset().left;
                    var totalOffset = playlistOffset + playlistInnerWidth;
                    var nextAssetOffset =  $(this.$activeEl).offset().left;
                    if (nextAssetOffset > totalOffset) {
                        $('.sp-video-player-modal .bx-next').trigger('click');
                    }
                    $('.sp-video-player-modal .asset-title').text($(this.$nextEl).find('a').data('title'));
                }
            },
            
            onBrightCoveLoad: function(experienceId) {
                VideoView.prototype.onBrightCoveLoad.apply(this,arguments);
                this.videoType = this.player.type; 
            },
            
            onTemplateReady: function(evt) {
                VideoView.prototype.onTemplateReady.apply(this,arguments);
               
                 if (this.videoType === 'html' && this.modVP.canPlayWithoutInteraction()) {
                    this.modVP.cueVideoByID(this.cuedVideoId);
                   //this.modVP.play();
                } else {
                    this.modVP.loadVideoByID(this.cuedVideoId);
                }
            },

            destroy: function(removeEl) {
                VideoView.prototype.destroy.call(this, false);
            }

        });

        return SportsStoryRelatedVideo;
    }
);