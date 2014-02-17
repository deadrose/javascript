define([
    'jquery',
    'underscore',
    'user-manager',
    'user-accounts/base-user-account',
    'third-party-apis/google/googleplus',
    'cookie'
],
function(
    $,
    _,
    UserManager,
    BaseUserAccount,
    Googleplus
)
    {
    'use strict';
        var GooglePlusUserAccount = BaseUserAccount.extend({
            initialize: function(options){

                BaseUserAccount.prototype.initialize.call(this, options);
                this.user = {};

                UserManager.registerAccount(this);
            },
            _handleGetUserInfo:function() {
                var deferred = $.Deferred();
                Googleplus.getUserInfo()
                    .done(_.bind(function(userInfo){
                        this.user = userInfo;
                        deferred.resolve(userInfo);
                    }, this))
                    .fail(function(){
                        deferred.reject();
                    });
                return deferred.promise();
            },
            _handleLogin: function(isAutoLogin){
                var deferred = $.Deferred(),
                    loginMethod = isAutoLogin ? 'getAuthStatus' : 'signInUser';
                Googleplus[loginMethod]()
                    .done(_.bind(function(resp){
                        this.sessionToken = resp.access_token;
                        this._handleGetUserInfo().done(_.bind(function(userData){
                            deferred.resolve(userData);
                        }, this));
                    }, this))
                    .fail(_.bind(function(){
                        deferred.reject();
                        this.logout();
                    }, this));

                return deferred.promise();
            },
            _handleLogout: function(){
                if (this.sessionToken) {
                    return Googleplus.signOutUser(this.sessionToken);
                } else {
                    return $.Deferred().resolve();
                }
            },
            getName: function(){
                return 'google';
            },

            getUserToken: function(){
                return this.sessionToken;
            },

            getUserId: function(){
                return this.user.id;
            },

            getUserAvatar: function(){
                if (this.user.image) {
                    return this.user.image.url;
                } else {
                    return "";
                }
            },

            getUserFirstName: function(){
                if (this.user.name) {
                    return this.user.name.givenName;
                } else {
                    return "";
                }
            },

            getUserLastName: function(){
                if (this.user.name){
                    return this.user.name.familyName;
                } else {
                    return "";
                }
            }

        });

        return new GooglePlusUserAccount();
    }
);