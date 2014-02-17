define([
    'jquery',
    'underscore',
    'pubsub',
    'user-accounts/base-user-account',
    'user-manager',
    'utils',
    'third-party-apis/firefly/firefly',
    'cookie'
],
function(
    $,
    _,
    PubSub,
    BaseUserAccount,
    UserManager,
    Utils,
    Firefly
)
    {
        'use strict';
        var FireflyUserAccount = BaseUserAccount.extend({
            initialize: function(options){
                BaseUserAccount.prototype.initialize.call(this, options);

                this.user = {};

                UserManager.registerAccount(this);
                
                // try to auto-login
                UserManager.loginUser('firefly');
            },

            _handleGetUserInfo: function() {
                var deferred = $.Deferred();
                Firefly.getUserInfo()
                    .done(_.bind(function(userData) {
                        this.user = userData;
                        deferred.resolve(userData);
                    }, this))
                    .fail(function(){
                        deferred.reject();
                    });
                return deferred.promise();
            },

            _handleGetCoreUserInfo: function() {
                var deferred = $.Deferred();
                Firefly.getUserInfo()
                    .done(_.bind(function(userData) {
                        var coreUserInfo = {
                            "CoreUserId": Utils.getNested(userData, 'userService', 'coreUserId'),
                            "AtyponSessionKey": this.getUserToken(),
                            "GooglePlusId": undefined,
                            "AtyponId": userData.userId,
                            "FaceBookId": undefined,
                            "FileMobileId": undefined
                        };

                        // append social provider IDs
                        var identities = Utils.getNested(userData, 'userService', 'identities') || [];
                        for (var i=0; i < identities.length; i++) {
                            var id = identities[i];
                            if (id.ProviderName === 'Facebook') {
                                coreUserInfo.FaceBookId = id.ProviderUserId;
                            } else if (id.ProviderName === 'Google') {
                                coreUserInfo.GooglePlusId = id.ProviderUserId;
                            } else if (id.ProviderName === 'Filemobile') {
                                coreUserInfo.FileMobileId = id.ProviderUserId;
                            }
                        }

                        deferred.resolve(coreUserInfo);
                    }, this))
                    .fail(function(){
                        deferred.reject();
                    });
                return deferred.promise();
            },

            /**
             * Gets the firefly user info object
             * @returns {Deferred}
             */
            getUserInfo: function(){
                return Firefly.getUserInfo();
            },

            /**
             * Returns the decoded firefly views cookie
             * @returns {Object}
             */
            getViewsCookie: function(){
                return Firefly.getFireflyViewsCookie();
            },

            _handleLogin: function(isAutoLogin) {
                var deferred = $.Deferred(),
                    loginMethod;
                if (isAutoLogin) {
                    // user has logged in before, so lets check status
                    loginMethod = 'getLoginStatus';
                } else {
                    loginMethod = 'loginUser';
                }
                Firefly[loginMethod]()
                    .done(_.bind(function(authResponse){
                        this._handleGetUserInfo().done(function(userData){
                            deferred.resolve(userData);
                        });
                    }, this))
                    .fail(_.bind(function(){
                        deferred.reject();
                        this.logout();
                    }, this));
                return deferred.promise();
            },

            _handleLogout: function(){
                if (this.getUserToken()) {
                    return Firefly.logoutUser(this.sessionToken);
                } else {
                    return $.Deferred().resolve();
                }
            },
            getName: function(){
                return 'firefly';
            },

            getUserToken: function(){
                return $.cookie('sessionKey');
            },

            getUserId: function(){
                return this.user.userId;
            },

            getUserAvatar: function(){
                if (this.user.picture && this.user.picture.data) {
                    return this.user.picture.data.url;
                } else {
                    return "";
                }
            },

            getUserFirstName: function(){
                return this.user.firstName;
            },

            getUserLastName: function(){
                return this.user.lastName;
            }
        });

        return new FireflyUserAccount();
    }
);