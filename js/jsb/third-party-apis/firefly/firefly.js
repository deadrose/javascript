define([
    'jquery',
    'underscore',
    'third-party-apis/base-third-party-api',
    'managers/requestmanager',
    'utils',
    'base64'
],
function(
    $,
    _,
    BaseThirdPartyApi,
    RequestManager,
    Utils
)
    {
        'use strict';
        /**
         * Library to handle calls to/from Facebook for various service interactions.
         * @author Dan Moore <dcmoore@gannett.com>, Mark Kennedy <mdkennedy@gannett.com>
         */
        var Firefly = BaseThirdPartyApi.extend({
            
            initialize: function(){
                BaseThirdPartyApi.prototype.initialize.call(this);
            },

            /**
             * Loads Firefly script.
             * @returns {*}
             */
            _handleLoadScript: function() {
                if (!this._fireflyPromise){
                    this._fireflyPromise = $.Deferred(_.bind(function(defer){
                        defer.resolve();
                    }, this)).promise();
                }
                return this._fireflyPromise;
            },

            /**
             * Gets information of the user who is currently logged in.
             * @returns {Deferred}
             */
            getUserInfo: function() {
                var self = this;
                var deferred = $.Deferred();
                if(!this.userInfo) {
                    this.loadScript().done(_.bind(function(){
                        var getUser = $.getJSON(Utils.getNested(window, 'firefly_urls', 'samServiceURL') + "gateway/getUser/?callback=?");
                        getUser.done(_.bind(function(data) {
                            if (data.meta.status === 0) {
                                self.userInfo = data.response;
                                deferred.resolve(data.response);
                            } else {
                                deferred.reject("Not logged in.");                            
                            }
                        })).fail(_.bind(function(data) {
                            deferred.reject("Can't contact getUser.");
                        }));
                    }, this));
                } else {
                   deferred.resolve(this.userInfo);
                }
                return deferred.promise();
            },

            sanitizeFireflyViewsObject: function(viewsObj) {
                if (!_.isObject(viewsObj)) {
                    console.error('Firefly views cookie is not an object');
                    return false;
                }
                if (!viewsObj.viewCount || !viewsObj.viewThreshold || !viewsObj.viewedContent) {
                    console.error('Missing Firefly views object properties');
                    return false;
                }
                if (!_.isNumber(viewsObj.viewCount) || !_.isNumber(viewsObj.viewThreshold) || !_.isArray(viewsObj.viewedContent)) {
                    console.error('Wrong format in Firefly views object values');
                    return false;
                }
                if (viewsObj.viewCount < 1) {
                    viewsObj.viewCount = 1;
                }
                if (viewsObj.viewThreshold < 1) {
                    viewsObj.viewThreshold = 1;
                }
                if (viewsObj.viewCount > viewsObj.viewThreshold) {
                    viewsObj.viewThreshold = viewsObj.viewCount;
                }
                return viewsObj;
            },

            /**
             * Returns firefly_akamai_open base64-encoded JSON cookie as object or false on failure.
             */
            getFireflyViewsCookie: function() {
                // Sample views object format
                // var viewsObject = {
                //     "viewCount": 1,
                //     "viewThreshold": 6,
                //     "viewedContent": [ "0001", "0002" ]
                // };
                // $.cookie('firefly_akamai_open', JSON.stringify(viewsObject), { path: '/'}); // replace with actual cookie once it's getting set.
                // $.cookie('firefly_akamai_open', btoa(JSON.stringify(viewsObject)), { path: '/'}); // replace with actual cookie once it's getting set.
                var viewsObj = false;
                var openCookie = $.cookie('firefly_akamai_open');

                try {
                    // First treat openCookie as plaintext, which it is for now until the Akamai change to base64 encode it
                    viewsObj = JSON.parse(openCookie);
                } catch (plain_ex) {
                    // The cookie will be base64-encoded eventually, so if treating it as plaintext above fails try converting it
                    try {
                        viewsObj = JSON.parse(atob(openCookie));
                    } catch (encoded_ex) {}
                }

                if (viewsObj) {
                    viewsObj = this.sanitizeFireflyViewsObject(viewsObj);
                    var viewsRemaining = viewsObj.viewThreshold - viewsObj.viewCount;
                    viewsObj.viewsRemaining = viewsRemaining;
                }

                return viewsObj;
            },

            /**
             * Gets user's logged in status.
             * @returns {*} the user's ID, a valid access token, a signed
             * request, and the time the access token and signed request each expire
             */
            getLoginStatus: function() {
                return this.getUserInfo();
            },

            /**
             * Logs in a user using Firefly's authentication.
             * @returns {Deferred}
             */
            loginUser: function() {
                return this.getLoginStatus();
            },

            /**
             * Logs out a user using Firefly's authentication.
             * NOT CURRENTLY OPERATIONAL, just pretends to work.
             * @returns {Deferred}
             */
            logoutUser: function(){
                var deferred = $.Deferred();
                this.userInfo = null;
                this.loadScript().done(_.bind(function(){
                    deferred.resolve();
                }, this));
                return deferred.promise();
            }
        });

        return new Firefly();
    }
);