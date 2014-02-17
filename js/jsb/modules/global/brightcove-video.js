/**
 * @fileoverview Single Video module view.
 * @author Chris Manning
 * @author Jay Merrifield
 * @author Brendan Bagley
 */
/*global APIModules:true*/
define(['jquery', 'underscore', 'baseview', 'pubsub','state'],
    function($, _, BaseView, PubSub, StateManager) {
        'use strict';

        /**
         * View class.
         */
        var VideoView = BaseView.extend({

            // Events.
            events: {
                'click .videoStillPlay': 'swapImageForVideo',
                'click .videoStill' : 'swapImageForVideo',
                'click .videoCloseButton': 'hidePlayer'
            },

            /**
             * Fired on new VideoView 
             */
            initialize: function(options) {
                options = $.extend({
                    live: false,
                    onVideoComplete: null,
                    onVideoShow: null,
                    onVideoHide: null,
                    onVideoLoaded: null
                }, options);
                this.$videoObj = this.$('.videoObject');
                this.$brightcove = this.$('.BrightcoveExperience'); 
                this.brightcoveId = this.$('.BrightcoveExperience').attr('id');
                this.playerHTML = this.$videoObj.html();
                var videoData = this.$videoObj.data() || {};
                var aam= (($.cookie('aamusat')||'').match(/[0-9]+/g)||[]).join(',');
                var aid= $.cookie('aam_uuid');
                var cust_params = "&aam=" + aam + "&u=" + aid;
                this.pageinfo= StateManager.getActivePageInfo();
                if (this.pageinfo.series) { 
                    cust_params += "&series=" + encodeURIComponent(this.pageinfo.series);
                } else if (this.pageinfo.topic) {
                    cust_params += "&topic=" + encodeURIComponent(this.pageinfo.topic);
                }
                
                var adServerURL = 'http://pubads.g.doubleclick.net/gampad/ads?env=vp&gdfp_req=1&impl=s&output=xml_vast2&iu=' +
                    window.site_config.ADS.DFP.ACCOUNTID+ '/' +window.site_config.ADS.DFP.ACCOUNTNAME+ '/preroll_video/' +
                    videoData.cst+ '&sz=920x508&unviewed_position_start=1&cust_params=ttid%3D'+
                    videoData.brightcovevideoid+ encodeURIComponent(cust_params)+ '&cmsid=12768&url=""';

                $('<param>', {name: 'adServerURL', value: adServerURL }).appendTo(this.$('.BrightcoveExperience'));

                if (!this.$videoObj.length || !this.brightcoveId){
                    // this probably means we've been instantiated on the wrong element
                    return;
                }

                _.bindAll(this, 'createPlayer', 'onBrightCoveLoad', 'onTemplateReady', 'onVideoComplete', 'onVideoStart', 'isPlayingHandler', 'determineCompletion');

                this.throttledDetermine = _.throttle(this.determineCompletion, 1500);

                // call base class initialize
                BaseView.prototype.initialize.call(this, options);

                if (this.options.autostart || this.$videoObj.attr('data-autoplay')) {
                    this.createPlayer();
                }

                this._buildBrightCoveLoadCallback();
                this.pubSub = {
                    'pause:videos': this.pauseVideo
                };
                PubSub.attach(this.pubSub, this);
            },

            _buildBrightCoveLoadCallback: function(){
                if (!window.BCCallbacks){
                    window.BCCallbacks = {};
                }
                window.BCCallbacks[this.brightcoveId] = this.onBrightCoveLoad;
                if (!window.BCLoad) {
                    window.BCLoad = function(experienceId){
                        if (window.BCCallbacks[experienceId]){
                            window.BCCallbacks[experienceId](experienceId);
                        }else{
                            console.log('received brightcove callback for video that does not exist: ' + experienceId);
                        }
                    };
                }
            },

            /*
            * Sets BC experience variables & event listeners through SmartPlayer API
            */
            onBrightCoveLoad: function(experienceId) {
                //loading indicator for the scripts on our end
                this.$('.temp-loader').fadeOut();
                this.player = window.brightcove.api.getExperience(experienceId);
                this.APIModules = window.brightcove.api.modules.APIModules;
                if (!this.player){
                    console.warn('brightcove video loaded, but could not get experience: ' + experienceId);
                }else{
                    console.log("brightcove loaded successfully", this.brightcoveId);
                    if (this.options.onVideoLoaded){ 
                        this.options.onVideoLoaded(this.brightcoveId); 
                    }
                    this.modVP = this.player.getModule(this.APIModules.VIDEO_PLAYER);
                    this.modCon = this.player.getModule(this.APIModules.CONTENT);
                    this.modExp = this.player.getModule(this.APIModules.EXPERIENCE);
                    this.modExp.addEventListener(window.brightcove.api.events.ExperienceEvent.TEMPLATE_READY, this.onTemplateReady);
                }
            },

            onTemplateReady: function(evt) {
                if (this.modVP){
                    this.modVP.addEventListener(window.brightcove.api.events.MediaEvent.BEGIN, this.onVideoStart);
                    this.modVP.addEventListener(window.brightcove.api.events.MediaEvent.COMPLETE, this.onVideoComplete);
                    this.modVP.addEventListener(window.brightcove.api.events.MediaEvent.PLAY, this.onMediaEventFired);
                    this.modVP.addEventListener(window.brightcove.api.events.MediaEvent.STOP, this.onMediaEventFired);
                    this.modVP.addEventListener(window.brightcove.api.events.MediaEvent.SEEK_NOTIFY, this.onMediaEventFired);
                    this.modVP.addEventListener(window.brightcove.api.events.MediaEvent.PROGRESS, this.throttledDetermine);
                }
            },

            /*
             * Finish gathering analytics info and fire PubSub event
             */
            onVideoStart : function(evt) {
                var videoDetail = this.getVideoDetail();
                if (evt.duration < 0) {
                    videoDetail.videoDuration = "";
                } else if (evt.duration < 120) {
                    videoDetail.videoDuration = "less than 2 min";
                } else {
                    videoDetail.videoDuration = "greater than 2 min";
                }

                videoDetail.completion = '0%';
                if (videoDetail.liveVideoSubject) {
                    videoDetail.videoName = videoDetail.liveVideoSubject;
                } else {
                    videoDetail.videoName = evt.media.displayName;
                }
                videoDetail.eventtype = 'video:load';
                videoDetail.contentid = evt.target.experience.id;
                videoDetail.videoFulllengthUrl = evt.media.FLVFullLengthURL;
                if (typeof videoDetail.assetid !== "undefined") {
                    if (evt.media.referenceId !== videoDetail.assetid.toString()) {
                        videoDetail.assetid = evt.media.referenceId;
                        videoDetail.ssts = evt.media.customFields.gdp_ssts||videoDetail.ssts;
                        videoDetail.cst = evt.media.customFields.gdp_cst||videoDetail.cst;
                        videoDetail.videocontentprovider = evt.media.customFields.gannetttracking+ '|' +evt.media.displayName;
                        videoDetail.keywords = evt.media.customFields.gdp_tags||videoDetail.keywords;
                        if(typeof evt.media.customFields.gdp_canonical_url !== "undefined") {
                            videoDetail.pathName = evt.media.customFields.gdp_canonical_url.replace(/^.*\/\/[^\/]+/, '');
                        }
                        videoDetail = this.setVideoDetailMeta(videoDetail);
                    }
                }
                PubSub.trigger('video:load', videoDetail);
            },

            onVideoComplete: function() {
                console.log('video playback finished: ' + this.brightcoveId);
                if ($.isFunction(this.options.onVideoComplete)) {
                    this.options.onVideoComplete();
                }
            },

            //handler for BrightCove smart player API media events
            onMediaEventFired: function(evt) {
                PubSub.trigger('uotrack', evt.type);
            },

            determineCompletion: function(evt) {
                var dur = evt.duration,
                    pos = evt.position,
                    percentage=Math.round( pos/dur*100);
                if (!this.fiftypercent && percentage >= 50 && percentage < 95) {
                    PubSub.trigger('vitrack', "50%");
                    this.fiftypercent = true;
                } else if (!this.ninetyfivepercent && percentage >= 95 && percentage < 99) {
                    PubSub.trigger('vitrack', "95%");
                    this.ninetyfivepercent = true;
                }
            },

            /**
             * Render Brightcove Player
             */
            createPlayer: function() {
                if (window.brightcove) {
                    // Quick fix to keep iPad from loading all of the videos at once.
                    var experience = this.$brightcove;
                    experience.params = {
                        'forceHTML': false
                    };

                    window.brightcove.createExperiencesPostLoad = function() {};

                    //start gathering metadata for analytics
                    window.brightcove.createExperiences(null, this.brightcoveId);

                    StateManager.stopRefreshTimer();
                    this.$videoObj.show();
                } else {
                    //we need to require the Brightcove JS
                    this.loadScripts(this.createPlayer);
                }
            },

            /**
             * Clean up view.
             * Removes event handlers and element (optionally).
             * @param {Boolean} removeEl specifies whether we should remove the el from the dom.
             * @param {Boolean} paused specifies if we're merely pausing the video instead of destroying it completely.
             */
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
                        //make sure we have a SmartPlayer API video player module
                        if (!this.modVP) {
                            this.modVP = this.player.getModule(window.brightcove.api.modules.APIModules.VIDEO_PLAYER);
                        }
                        if (this.modVP) {
                            this.resetVideoState();
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
            },

            /*
             * Return DOM elements to pre-played state so video player can be recreated
             */
            resetVideoState : function() {
                //make sure we have a brightcove ID and object at the window level
                if (this.player) {
                    if (this.modVP) {
                        //check if video is still playing and handle
                        this.pauseVideo();
                        //remove SmartPlayer API event listeners
                        this.modVP.removeEventListener(window.brightcove.api.events.MediaEvent.BEGIN, this.onVideoStart);
                        this.modVP.removeEventListener(window.brightcove.api.events.MediaEvent.COMPLETE, this.onVideoComplete);
                        this.modVP.removeEventListener(window.brightcove.api.events.MediaEvent.PLAY, this.onMediaEventFired);
                        this.modVP.removeEventListener(window.brightcove.api.events.MediaEvent.STOP, this.onMediaEventFired);
                        this.modVP.removeEventListener(window.brightcove.api.events.MediaEvent.SEEK_NOTIFY, this.onMediaEventFired);
                        this.modVP.removeEventListener(window.brightcove.api.events.MediaEvent.PROGRESS, this.throttledDetermine);
                        this.modVP = false;
                        this.modCon = false;
                        this.modExp = false;
                    }
                    this.player=false;
                }
                this.$('.videoStill, .videoStillPlay').show();
                this.$videoObj.html(this.playerHTML);
                this.hidePlayer();

            },

            /**
             * Hide Brightcove Player
             */
            hidePlayer: function() {
                if (this.$videoObj) {
                    this.$videoObj.hide();
                }
                if (this.options.onVideoHide) {
                    this.options.onVideoHide();
                }
                StateManager.startRefreshTimer();
            },

            /**
             * Load Brightcove Player script dependencies
             */
            loadScripts: function(callback) {
                require(['http://admin.brightcove.com/js/BrightcoveExperiences.js'], function() {
                    // Script creates window.brightcove object we need to create video flash players.
                    if (typeof window.brightcove !== 'undefined') {
                        console.log('Brightcove loaded');
                        callback();
                    } else {
                        console.log('Error loading Brightcove');
                    }
                });
            },

            /* Replace the video still with an actual video player
             * @param {Event} e Browser event
             */
            swapImageForVideo: function(e){
                this.createPlayer();
                if (this.options.onVideoShow) {
                    this.options.onVideoShow();
                }
                this.$('.videoStill, .videoStillPlay').hide();

                // Loading indicator for the scripts on our end
                this.$('.temp-loader').show();
                PubSub.trigger('video:playClick');
            },

            /* Pulls in relevant metadata for analytics calls
             */
            getVideoDetail: function() {
                var videoDetail = this.$videoObj.data() || {};
                videoDetail.pathName='';
                if (videoDetail.liveVideoSubject) {
                    videoDetail.pathName =  videoDetail.liveVideoSubject;
                } else if (videoDetail.videourl) {
                    videoDetail.pathName =  videoDetail.videourl.replace(/^.*\/\/[^\/]+/, '');
                }
                
                return this.setVideoDetailMeta(videoDetail);
            },

            /* Abstracting cst and ssts values, to be built for every new video load */
            setVideoDetailMeta: function(videoDetail) {
                try {
                    if (!videoDetail.cst) {
                        videoDetail.cstlist = videoDetail.cst.split('/');
                        videoDetail.category = videoDetail.cstlist[0];
                        videoDetail.cst = videoDetail.cstlist.slice(0, 3).join(':');
                        videoDetail.subcategory = videoDetail.cstlist.slice(0, 2).join(':');
                    }
                    if(!videoDetail.sstslist) {
                        videoDetail.sstslist= videoDetail.ssts.split('/');
                        videoDetail.section= videoDetail.sstslist[0];
                        videoDetail.ssts= videoDetail.sstslist.join(':');
                        videoDetail.subsection= videoDetail.sstslist.slice(0,2).join(':');
                        videoDetail.topic= videoDetail.sstslist.slice(0,3).join(':');
                    }
                } catch (er) {
                    console.error('Invalid page', er.stack || er.stacktrace || er.message);
                    return;
                }
                return videoDetail;
            },

            pauseVideo: function() {
                if (this.modVP !== undefined) {
                    this.modVP.pause(true);
                }
            },

            /* Receives playing status from Brightcove API function and pauses video, if needed
             */
            isPlayingHandler: function(result) {
                if(!this.options.live) {
                    if(result) {
                        this.modVP.pause(true);
                    }
                }
            },

            loadVideoById: function(newVideoId) {
                this.modVP.loadVideoByID(newVideoId);
            }
        });

        /**
         * Return view class.
         */
        return VideoView;
    }
);