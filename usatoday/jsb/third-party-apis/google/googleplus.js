/*global gapi:true*/
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
    "use strict";
        /**
         * Library to handle calls to/from Googleplus for various service interactions.
         * @author Mark Kennedy <mdkennedy@gannett.com>
         */
        var GooglePlus = BaseThirdPartyApi.extend({

            initialize: function(){

                var siteconfig = this.getApiSiteConfig('GOOGLEPLUS');
                if (siteconfig) {
                    // set config variables
                    this._clientid= siteconfig.CLIENTID;
                    this._plusonejslib= siteconfig.JSLIBURL;
                    this._cookiePolicy= siteconfig.COOKIEPOLICY;
                    this._appPackageName= siteconfig.APPPACKAGENAME;
                    this._logoutUrl= siteconfig.LOGOUT_URL;
                }

                BaseThirdPartyApi.prototype.initialize.call(this);
            },

            /**
             * Loads the Google Plus script.
             * @returns {Deferred} Resolves true with the script has successfully loaded.
             * @private
             */
            _handleLoadScript: function(){
                if (!this._loadScriptPromise) {
                    this._loadScriptPromise = $.Deferred();
                    // attach callback function to window to be called when google script has been loaded
                    this.setupOnLoadCallbacks('afterLoadGPScript', _.bind(function(){
                        this._loadGooglePlusApi().done(_.bind(function(){
                            this._loadScriptPromise.resolve();
                        }, this));
                    }, this));
                    $.ajax(this._plusonejslib, {
                        data: {
                            onload: 'afterLoadGPScript'
                        },
                        cache: true,
                        dataType: 'script'
                    });
                }
                return this._loadScriptPromise.promise();
            },

            /**
             * Loads Google Plus API.
             * @private
             */
            _loadGooglePlusApi: function() {
                var deferred = $.Deferred();
                gapi.client.load('plus', 'v1', _.bind(function() {
                    // we must call init method to prevent subsequent popup windows from
                    // being blocked when via gapi.auth.authorize() calls
                    gapi.auth.init(function(){
                        deferred.resolve();
                    });
                }, this));
                return deferred.promise();
            },

            /**
             * Gets information for a logged in user.
             * @returns {Deferred}
             */
            getUserInfo: function() {
                var deferred = $.Deferred();
                if (!this.userInfo) {
                    this.loadScript().done(function() {
                        var request = gapi.client.plus.people.get({
                            'userId': 'me'
                        });
                        request.execute(function(resp) {
                            if(resp.error) {
                                console.error("Google returned erroneous response!", resp);
                                deferred.reject();
                            }
                            else {
                                deferred.resolveWith(this, [resp]);
                            }
                        });
                    });
                } else {
                    deferred.resolveWith(this, [this.userInfo]);
                }
                return deferred.promise();
            },

            /**
             * Signs in a user using Google's authentication.
             * @returns {Deferred}
             */
            signInUser: function(){
                var deferred = $.Deferred();
                this.loadScript().done(_.bind(function(){
                    gapi.auth.authorize({
                        client_id: this._clientid,
                        requestvisibleactions: 'http://schemas.google.com/AddActivity',
                        scope: 'https://www.googleapis.com/auth/plus.login https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
                        apppackagename: this._appPackageName,
                        approvalprompt: 'force',
                        immediate: false
                    }, _.bind(function(authResult){
                        if (authResult.access_token) {
                            // Successfully authorized
                            deferred.resolveWith(this, [authResult]);
                        } else if (authResult.error) {
                            // There was an error.
                            // Possible error codes:
                            //   "access_denied" - User denied access to your app
                            //   "immediate_failed" - Could not automatically log in the user
                            console.log('There was an error: ' + authResult.error);
                            deferred.rejectWith(this, [authResult]);
                        }
                    }, this));
                }, this));
                return deferred.promise();

            },

            /**
             * Signs a user out using Google's authentication.
             * @param access_token The access token of the user that will be logged out.
             * @returns {Return}
             */
            signOutUser: function(access_token) {
                var deferred = $.Deferred();
                this.loadScript().done(_.bind(function(){
                    $.ajax({
                        type: 'GET',
                        url: this._logoutUrl,
                        data: {
                            token: access_token
                        },
                        async: false,
                        contentType: "application/json",
                        dataType: 'jsonp',
                        success: function() {
                            deferred.resolve();
                        },
                        error: function(e) {
                            deferred.reject();
                        }
                    });
                }, this));
                return deferred.promise();

            },

            /**
             * Checks whether or not a user is authorized.
             * @returns {Deferred}
             */
            getAuthStatus: function () {
                var deferred = $.Deferred();
                    this.loadScript().done(_.bind(function(){
                        gapi.auth.authorize({
                            client_id: this._clientid,
                            scope: 'https://www.googleapis.com/auth/plus.login',
                            immediate: true
                        }, function(resp){
                            deferred.resolve(resp);
                        });
                    }, this));
                return deferred.promise();
            }


        });

        return new GooglePlus();
    }
);