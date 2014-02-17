define([
    'jquery',
    'underscore',
    'pubsub',
    'user-accounts/base-user-account',
    'user-manager',
    'third-party-apis/facebook/facebook',
    'cookie'
],
function(
    $,
    _,
    PubSub,
    BaseUserAccount,
    UserManager,
    Facebook
)
    {
        'use strict';
        var FacebookUserAccount = BaseUserAccount.extend({
            initialize: function(options){
                BaseUserAccount.prototype.initialize.call(this, options);

                this.user = {};

                UserManager.registerAccount(this);
            },
            _handleGetUserInfo: function() {
                var deferred = $.Deferred();
                Facebook.getUserInfo()
                    .done(_.bind(function(userData){
                        this.user = userData;
                        deferred.resolve(userData);
                    }, this))
                    .fail(function(){
                        deferred.reject();
                    });
                return deferred.promise();
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
                Facebook[loginMethod]()
                    .done(_.bind(function(authResponse){
                        this._afterLoginSuccess(authResponse);
                        this._handleGetUserInfo().done(function(userData){
                            deferred.resolve(userData);
                        });
                    }, this))
                    .fail(_.bind(function(){
                        deferred.reject();
                    }, this));
                return deferred.promise();
            },

            _afterLoginSuccess: function(response){
                this.sessionToken = response.accessToken;
                this.user.id = response.userID;

            },

            _handleLogout: function(){
                // reset user obj
                this.user = {};
                this.sessionToken = null;
                return Facebook.logoutUser();
            },
            getName: function(){
                return 'facebook';
            },

            getUserToken: function(){
                return this.sessionToken;
            },

            getUserId: function(){
                return this.user.id;
            },

            getUserAvatar: function(){
                if (this.user.picture && this.user.picture.data) {
                    return this.user.picture.data.url;
                } else {
                    return "";
                }
            },

            getUserFirstName: function(){
                return this.user.first_name;
            },

            getUserLastName: function(){
                return this.user.last_name;
            }
        });

        return new FacebookUserAccount();
    }
);