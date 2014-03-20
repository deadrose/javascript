/**
 * @fileoverview Sports Front Video View
 */
define([
    'jquery',
    'underscore',
    'state',
    'backbone',
    'baseview',
    'modules/sports/sports-story-video'
],
function(
    $,
    _,
    StateManager,
    Backbone,
    BaseView,
    SportsStoryRelatedVideo
)
    {
    
        var SportsFrontVideo = SportsStoryRelatedVideo.extend({
            
            events: function() {
                var parentEvents = SportsStoryRelatedVideo.prototype.events;
                if(_.isFunction(parentEvents)){
                    parentEvents = parentEvents();
                }
                return _.extend({},parentEvents, {
                    'click .sp-video-player .playlist .item a' : 'initVideoAsset',
                    //'click .video-still-play': 'swapStillToVideo',
                    'click .video-still-play': 'loadScripts',
                    'click .sp-video-player .util-bar-btn-facebook': 'pausePlayer',
                    'click .sp-video-player .util-bar-flyout-close-ribbon': 'unpausePlayer'
                });
            },

            initialize: function (options) {
                
                SportsStoryRelatedVideo.prototype.initialize.call(this, options);
                
                this.$spVideoObj = $('.sp-video-player');
                this.$brightcove = $('.sp-video-player .BrightcoveExperience'); 
                this.brightcoveId = $('.sp-video-player .BrightcoveExperience').attr('id');
                this.activeEl = $('.sp-video-player .active');
                this.$nextEl = $('.sp-video-player .active').next();
                this.nextAsset = $('.sp-video-player .active').next().find('a').data('id');
                this.playlistLength = $('.sp-video-player .item').length;
                this.$playerEl = $('.sp-video-player .player');
                this.$videoStillEl = $('.sp-video-player .video-still');
                this.videoStillVisible = true;
                //this sets the element that has data attributes for tracking
                this.$videoObj = this.$playerEl;
                //this.cuedVideoId = $('.sp-video-player .active').find('a').data('id');
                this.cuedVideoId = $('.sp-video-player').first().data('id');
                this.videoType = '';
                
                 _.bindAll(this, '_buildBrightCoveLoadCallback','swapStillToVideo','onTemplateReady', 'onBrightCoveLoad', 'onVideoComplete',
                    'onVideoStart', 'pausePlayer', 'unpausePlayer', 'isPlayingHandler', 'determineCompletion');
                 //force initial state after user returns from story overlay 
                 this.$videoStillEl.show();
                 //this line is because HTML5 version of BC does not like to be set to display none;
                 if(window.swfobject.hasFlashPlayerVersion("1")) {
                     this.$playerEl.hide();
                 }
                 this.updateActiveItem($('.sp-video-player .item').first());   
            },

            initVideoAsset: function(e) {
                e.preventDefault();
                var videoid = $(e.currentTarget).data("id");
                var nextEl = $(e.currentTarget).parent();
                if (this.videoStillVisible === true) {
                   this.loadScripts(e);
                } else {
                    this.loadVideoById(videoid, nextEl);
                }
            },

            loadVideoById: function(newVideoId, el) {
               //sets new element for tracking 
               this.updateTrackingDataObj($(el));
               this.cuedVideoId = newVideoId;
               this.closeShare();
               this.updateActiveItem(el);
               this.modVP.loadVideoByID(newVideoId);
               this.populateUtilityShare($(el).find('a'));
            },
            
            loadScripts: function(e) {
                require(['http://admin.brightcove.com/js/BrightcoveExperiences.js'], _.bind(function() {
                    // Script creates window.brightcove object we need to create video flash players.
                    if (typeof window.brightcove !== 'undefined') {
                        console.log('Brightcove loaded');
                        this._buildBrightCoveLoadCallback();
                        this.swapStillToVideo(e);
                    } else {
                        console.log('Error loading Brightcove');
                    }
                }, this));
            },

            swapStillToVideo: function(e) {
             
               StateManager.stopRefreshTimer();
                this.videoStillVisible = false;
                this.$videoStillEl.fadeOut('fast', _.bind(function() {
                    //checks if the video was starting clicking a playlist link
                    if ($(e.currentTarget).parent().hasClass('item')) {
                        var videoid = $(e.currentTarget).data("id");
                        var nextEl = $(e.currentTarget).parent();
                        this.cuedVideoId = videoid;
                        //sets new element for tracking 
                        this.updateTrackingDataObj($(e.currentTarget).parent());
                        this.updateActiveItem($(e.currentTarget).parent());
                        this.populateUtilityShare($(e.currentTarget));
                   } 
                    this.$playerEl.css('display','block');
                    
                }, this));         
            },
            
            destroy: function(removeEl, paused) {
                StateManager.startRefreshTimer();
                //make sure we have a brightcove ID and object at the window level
                if (this.brightcoveId && window.brightcove) {
                    //make sure we have a player for this instance
                    if (!this.player) {
                        if (window.brightcove.api) {
                            this.player = window.brightcove.api.getExperience(this.brightcoveId);
                        }
                    }
                    if (this.player) {
                        //make sure we have a SmartPlayer API video player modules
                        if (!this.modVP) {
                            this.modVP = this.player.getModule(window.brightcove.api.modules.APIModules.VIDEO_PLAYER);
                        }
                        if (this.modVP && window.site_config.SMARTPLAYER) {
                            //check if video is still playing and handle
                            this.modVP.getIsPlaying(this.isPlayingHandler);
                            //remove SmartPlayer API event listeners
                            this.modVP.removeEventListener(window.brightcove.api.events.MediaEvent.BEGIN, this.onVideoStart);
                            this.modVP.removeEventListener(window.brightcove.api.events.MediaEvent.COMPLETE, this.onVideoComplete);
                            this.modVP.removeEventListener(window.brightcove.api.events.MediaEvent.PLAY, this.onMediaEventFired);
                            this.modVP.removeEventListener(window.brightcove.api.events.MediaEvent.STOP, this.onMediaEventFired);
                            this.modVP.removeEventListener(window.brightcove.api.events.MediaEvent.SEEK_NOTIFY, this.onMediaEventFired);
                            this.modVP.removeEventListener(window.brightcove.api.events.MediaEvent.PROGRESS, this.throttledDetermine);
                        }
                    }
                    // clean up the memory leak that brightcove creates
                    // they hold a brightcoveId -> dom map that they never clear
                    if (window.brightcove) {
                        if (window.brightcove.experiences) {
                            delete window.brightcove.experiences[this.brightcoveId];
                        }
                        if (window.brightcove.instances) {
                            delete window.brightcove.instances[this.brightcoveId];
                        }
                    }
                }
                if (!window.BCCallbacks) {
                    console.warn('BCCallbacks no longer available on video destroy');
                } else {
                    if (window.BCCallbacks[this.brightcoveId]) {
                        // remove brightcove callback
                        delete window.BCCallbacks[this.brightcoveId];
                    }
                    // if we're the last callback, cleanup the callback manager
                    if (_.size(window.BCCallbacks) === 0) {
                        window.BCCallbacks = undefined;
                        window.BCLoad = undefined;
                        try {
                            delete window.BCCallbacks;
                            delete window.BCLoad;
                        } catch (e) {
                        } // guard against IE throwing exceptions
                    }
                }
        
                BaseView.prototype.destroy.apply(this, arguments);
            }      
           
        });
        return SportsFrontVideo;
    }
);
