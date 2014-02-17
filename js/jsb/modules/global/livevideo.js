/**
 * @fileoverview Generic element handling live videos. 
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'pubsub',
    'state',
    'utils',
    'modules/global/brightcove-video'
],
function(
    $,
    _,
    Backbone,
    PubSub,
    StateManager,
    Utils,
    Video
) {


        /**
         * View class.
         */
        var LiveVideo = Backbone.View.extend({

            events:{
                'click #close_modal_link': 'close'
            },

            /**
             * Initialize the view.
             */
            initialize: function() {
                this.m_uiModal={};
                this.m_uiModalBgrnd={}; 
                this.win = Utils.get('win')[0]; 
                this.body = Utils.get('body');
                this.service = '/services/livevideos/';
                if (arguments.length > 0 && arguments[0].service) {
                    this.service = arguments[0].service;
                }
                StateManager.registerFullScreenView(this);
                this.win.gannett = {}; // we need this because player is going to fire this method on popout
                var _this=this;
                this.win.gannett.videoplayer_modal = {
                    openPopup: function(){ 
                        var URL = '/livevideos/popout/';
                        var description= $("#videoplayer_modal .video-title").text();
                        var sponsor= $("#videoplayer_modal .sponsor-text").text();
                        var sourcelogo= $("#videoplayer_modal .video-logo").attr("src");
                        var vid= $("#videoplayer_modal").attr('data-assetid');
                        URL += "?videoid="+vid+"&description="+description+"&sponsor="+sponsor+"&sourcelogo="+sourcelogo;
                        if(vid) {
                            Utils.openPopup(URL,640, 440);
                            _this.close();
                        }
                    }
                };
            }, 
            /**
             * load the live video content to the dom 
             * @param assetid {id}  VPC asset id for live video
             */
            loadLiveVideo: function(assetid) {
                var _this = this;
                StateManager.fetchHtml(this.service + assetid).done(function(r){
                    _this.body.append(r);
                    _this.video = new Video({
                        el:  $("#videoplayer_modal"),
                        autostart: true,
                        live: true
                    });
                    _this.m_uiModal = $("#videoplayer_modal");
                    _this.m_uiModalBgrnd = $("#lightbox");

                    _this.m_uiModal.show();
                    _this.m_uiModalBgrnd.fadeIn(300);
                    _this.setElement('#videoplayer_modal');
                });
            },
            /**
             * closes the live video modal, null object,remvoes it from dom   
             * and also destroys unused variables.
             */
             

            close: function() {
                if(this.m_uiModal) {
                    StateManager.clearFullScreenView(); 
                    var bgrnd = this.m_uiModalBgrnd;
                    this.destroy(true); 
                    this.m_uiModalBgrnd.fadeOut(300, function(){bgrnd.remove();});
                    this.m_uiModal = null;
                    this.m_uiModalBgrnd = null; 
                    this.win.gannett = {}; 
                }
            },

            /**
             * Clean up view.
             * Removes event handlers and element (optionally).
             * @param {boolean} removeEl option to also remove View from DOM.
             */
            destroy: function(removeEl) {
                //lets destroy video object too 
                if (this.video){
                    this.video.destroy(true);
                }
                this.undelegateEvents();
                if (removeEl) this.remove();
            }
        });

        /**
         * Return view class.
         */
        return LiveVideo;

});
