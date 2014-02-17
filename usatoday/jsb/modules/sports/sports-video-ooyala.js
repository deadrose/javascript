/**
* @fileoverview Ooyala Front Video Module.
* @author tjrivera@usatoday.com (Tommy Rivera)
*/
define([
    'jquery',
    'underscore',
    'state',
    'backbone',
    'baseview'
],
function(
    $,
    _,
    StateManager,
    Backbone,
    BaseView
) {

    /**
     * View class.
     */
    var SportsOoyalaVideo = BaseView.extend({
        
     // Events.
        events: {
            'click #ooyalaplaylist li.item': 'selectVideo'
        },
        
        initialize: function() {
            BaseView.prototype.initialize.call(this, this.options);
            
            this.settings = {
                wmode : 'transparent',
                enableChannels : true,
                autoplay : false,
                debug: true,
                nextIndex : 2,
                containerId : 'ooyalaplayer',
                playlistContainer : 'ooyalaplaylist',
                videoTitleId : 'ooyala-title',
                playlistId : 'ooyalaplaylist',
                videoPlayer : {},
                hasPlayed : false,
                width : $('#ooyalaplayer').data('width'),
                height: $('#ooyalaplayer').data('height'),
                adsetcode : $('#ooyalaplayer').data('adsetcode'),
                adtagurl: $('#ooyalaplayer').data('adtagurl'),
                autoRotate : true,
                cuedvideoid : '',
                viewdestroyed : false
                
            };
            
            this.firstVideoId = $('#' + this.settings.containerId).data('videoid');
            this.playerApiUrl = $('#' + this.settings.containerId).data('playerapiurl');
            
            _.bindAll(this, 'createPlayer', 'loadScripts', 'selectVideo', 'playerReceiver', 'loadVideoById', 'setNextplaylistItem', 'clearActiveElement', 'setActiveElement', 'getAdOptions');
            
            //set up google video ads 
            if (window.googletag) {
                window.googletag.cmd.push(function () {
                window.googletag.pubads().enableSingleRequest();
                window.googletag.companionAds().setRefreshUnfilledSlots(true);
                window.googletag.enableServices();
                });
            }
            this.loadScripts();
        },
        
        /**
         * Load Brightcove Player script dependencies
         */
        loadScripts: function() {
            require([this.playerApiUrl], _.bind(function() {
                if (typeof window.OO !== 'undefined') {
                    this.createPlayer( this.firstVideoId );
                } else {
                    console.log('Error loading ooyala');
                }
            }, this));
        },
        
        /**
         * Sets up module
         */
        createPlayer: function( videoid ) {
          //apply video player options and create the player
            var opts = {
               wmode : this.settings.wmode,
               enableChannels : true,
               autoplay : this.settings.autoplay,
               width : this.settings.width + 'px',
               height : this.settings.height + 'px',
               debug : this.settings.debug,
               adSetCode : this.settings.adsetcode,
               onCreate : _.bind(function (player) {
                   window.mb = player.mb;
                   window.mb.subscribe('*', 'PGATourOoyala', _.bind(function (eventName) {
                       this.playerReceiver(eventName);
                   }, this));

                },this)  
                
            };
            
            opts['google-ima-ads-manager'] = this.getAdOptions( videoid );
            
            this.settings.videoPlayer = window.OO.Player.create(this.settings.containerId, videoid, opts);
            
        },
        
        //destroys and removed the player completely
        destroyVideo : function(callback) {
            this.settings.videoPlayer.destroy();
        },
        
        //Selects the video id from the playlist item and passed to loadVideoById and sets
        selectVideo : function(e) {
            this.loadVideoById($(e.currentTarget).data('videoid'));
            this.clearActiveElement();
            this.setActiveElement($(e.currentTarget));
            this.setNextplaylistItem($(e.currentTarget));
        },
        
        //ooyala messageBus receiver/listener callback
        playerReceiver : function( evt ) {
            //console.log(evt);
             switch(evt) {
             
             case 'played' :
                var playlistItem =  $('#' + this.settings.playlistId + ' li:nth-child(' + this.settings.nextIndex + ')');
                var videoid = playlistItem.data('videoid');
                $(playlistItem).trigger('click');
             break;
              
             case 'playbackReady' :
                  //prevents initial load from auto playing
                  if (this.settings.hasPlayed === true && this.settings.autoplay === false || this.settings.hasPlayed === false && this.settings.autoplay === true ) {
                     this.settings.videoPlayer.play();
                  } else {
                       this.settings.hasPlayed = true;
                 }
              break; 
              
              case 'playing' :
                  StateManager.stopRefreshTimer();
              break;
              
              case 'destroy' :
                  if (this.settings.viewdestroyed === false ) {
                     this.loadVideoById();
                  }
              break;
                  
             }
        },
        
        //gets and sets the ad options to be passed to create the player
        getAdOptions : function( videoid , opts ) {
            var adUrl = this.settings.adtagurl.replace('%s',videoid);
            var scoreTime = new Date().getTime();
            var adopts = {
                adTagUrl : adUrl,
                additionalAdTagParameters: {
                    correlator: scoreTime   
                },
                showInAdControlBar: true
            };
            
            return adopts;
            
        },
        
        //loads another video by ooyala video id
        loadVideoById : function( videoid ) {
           if (videoid) {
                this.settings.cuedvideoid = videoid;
                this.destroyVideo();     
            } else {
                this.createPlayer(this.settings.cuedvideoid);
            }
            
         },
         
        //sets the next playlist item/element for to playnext video
        setNextplaylistItem : function(el) {
             if ( el.next().attr('data-index') ) {
                 this.settings.nextIndex = el.next().data('index');
             } else {
                 this.settings.nextIndex = 1;
             }
         },
         
         //sets the video title ** this experience for golf currently not calling this **
         setVideoTitle : function() {
            var video_title = this.settings.videoPlayer.getTitle();
            $('#' + this.settings.videoTitleId).html(video_title);    
         },

         //clears any css states for active elements
         clearActiveElement : function() {
             $('#' + this.settings.playlistId + ' li').siblings().removeClass('active');
         },
         
         //sets any needed css states for active elements
         setActiveElement : function(el) {
             el.addClass('active');
         },
         
        destroy: function() {
            this.settings.viewdestroyed = true;
            this.clearActiveElement();
            this.setActiveElement($('#' + this.settings.playlistId + ' li').first());
            if (typeof this.settings.videoPlayer.destroy == 'function') { 
                this.settings.videoPlayer.destroy();
            }
            
            BaseView.prototype.destroy.apply(this, arguments);
        }

    });

    return SportsOoyalaVideo;
});
