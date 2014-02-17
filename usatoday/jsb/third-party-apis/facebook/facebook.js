/*global FB:true*/
define([
    'jquery',
    'underscore',
    'third-party-apis/base-third-party-api'
],
function(
    $,
    _,
    BaseThirdPartyApi
)
    {
        'use strict';
        /**
         * Library to handle calls to/from Facebook for various service interactions.
         * @author Mark Kennedy <mdkennedy@gannett.com>
         */
        var Facebook = BaseThirdPartyApi.extend({
            
            initialize: function(){
                this._config = this.getApiSiteConfig('FACEBOOK');
                if (this._config) {
                    this._appid  = this._config.APPID;
                    this._channelUrl = window.location.protocol + '//' + window.location.host+window.site_static_url+'html/channel.html';
                    this._perms = this._config.PERMISSIONS;
                }

                BaseThirdPartyApi.prototype.initialize.call(this);
            },

            /**
             * Loads Facebook script.
             * @returns {*}
             */
            _handleLoadScript: function() {
                if (!this._facebookPromise){
                    this._facebookPromise = $.Deferred(_.bind(function(defer){
                        if (!this._config.ENABLED){
                            defer.reject();
                            return;
                        }
                        $.ajax('//connect.facebook.net/en_US/all.js',
                            {
                                cache: true,
                                data: {},
                                dataType: 'script'
                            }).done(_.bind(function() {
                                // even if the script loads, ad/script blockers may prevent FB from becoming available
                                // if it's not available, fail the load so no future scripts fire/crash
                                if (FB) {
                                    this._initializeFacebook();
                                    defer.resolve();
                                } else {
                                    defer.reject();
                                }
                            }, this)).fail(function() {
                                defer.reject();
                            });
                    }, this)).promise();
                }
                return this._facebookPromise;
            },

            /**
             * Initializes Facebook's global var that will be used when making calls.
             */
            _initializeFacebook: function(){
                FB.init({
                    appId      : this._appid,
                    channelUrl : this._channelUrl,
                    status     : true,
                    cookie     : true,  // yes we want to use cookies
                    xfbml      : false  // don't auto parse xfbml tags
                });
            },

            /**
             * Registers a Facebook Event.
             * @param {String} eventName Name of the event
             * @param {Function} callback The function to call when the event fires
             */
            subscribeEvent: function(eventName, callback){
                this.loadScript().done(function(){
                    FB.Event.subscribe(eventName, function(response) {
                        callback(response);
                    });
                });
            },

            /**
             * Unregisters a Facebook Event.
             * @param {String} eventName Name of the event
             * @param {Function} callback The function to call when the event fires
             */
            unsubscribeEvent: function(eventName, callback){
                this.loadScript().done(function(){
                    FB.Event.unsubscribe(eventName, function(response) {
                        callback(response);
                    });
                });
            },

            /**
             * Gets information of the user who is currently logged in.
             * @returns {Deferred}
             */
            getUserInfo: function() {
                var deferred = $.Deferred();
                this.loadScript().done(_.bind(function(){
                    FB.api('/me?fields=name,first_name,last_name,gender,picture', _.bind(function(response) {
                        if (!response || response.error) {
                            console.error("Facebook returned erroneous response!", response);
                            deferred.reject();
                        } else {
                            deferred.resolve(response);
                        }
                    }, this));
                }, this));
                return deferred.promise();
            },
            /**
             * Gets user's logged in status.
             * @returns {*} the user's ID, a valid access token, a signed
             * request, and the time the access token and signed request each expire
             */
            getLoginStatus: function() {
                var deferred = $.Deferred();
                this.loadScript().done(_.bind(function(){
                    FB.getLoginStatus(function(response) {
                        if(response.status === 'connected') {
                            // user is logged in and has authenticated your app for the user
                            deferred.resolve(response.authResponse);
                        } else if (response.status === 'not_authorized') {
                            deferred.reject('user is logged in to Facebook but has not authenticated the app');
                        } else {
                            deferred.reject('the user isn\'t logged in to Facebook.');
                        }
                    });
                }, this));
                return deferred.promise();
            },

            /**
             * Makes a call to the core internal endpoint to grab a Facebook session token.
             * @param {Number} userId The user's unique ID
             * @returns {Deferred}
             */
            getSessionToken: function(userId){
                return $.ajax('/facebook/tokens/'+this.accessToken, {
                    type: 'POST',
                    data: {
                         userID: userId
                    }
                });
            },
            /**
             * Calls Facebook's XFBML Parse
             */
            parse: function(element) {
                var parsedDeferred = $.Deferred();
                this.loadScript().done(_.bind(function(){
                    FB.XFBML.parse(element, function(){
                        parsedDeferred.resolve();
                    });
                }, this));
                return parsedDeferred.promise();
            },

             /**
             * Calls Facebook's UI method
             */
            openUIdialog: function(obj, callback) { 
                this.loadScript().done(_.bind(function(){
                    FB.ui(obj, callback); 
                }, this)); 
            },

            permissions: function() {
                return this._perms;
            },

            /**
             * Logs in a user using Facebook's authentication.
             * @returns {Deferred}
             */
            loginUser: function() {
                var deferred = $.Deferred();
                this.loadScript().done(_.bind(function(){
                    FB.login(function(response){
                        var authRespObj = response.authResponse;
                        if (authRespObj) {
                            // user successfully logged in!
                            deferred.resolveWith(this, [authRespObj]);
                        } else {
                            // User cancelled login or did not fully authorize.
                            deferred.reject();
                        }
                    }, {scope : this._perms });

                }, this));
                return deferred.promise();
            },

            /**
             * Logs out a user using Facebook's authentication.
             * @returns {Deferred}
             */
            logoutUser: function(){
                var deferred = $.Deferred();
                this.loadScript().done(_.bind(function(){
                    FB.logout(function(){
                        deferred.resolve();
                    });
                }, this));
                return deferred.promise();
            }
        });

        return new Facebook();
    }
);