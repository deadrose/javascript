/**
 * @fileoverview Utility functions for the current UGC user.
 * @author Mark Kennedy
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'user-manager',
    'third-party-apis/filemobile/filemobile'
],
    function(
        $,
        _,
        BaseView,
        UserManager,
        Filemobile
        ) {
        "use strict";

        var UGCUser = BaseView.extend({

            USERINFO_TIMEOUT: 15, // secs

            initialize: function() {

                this.pubSub = {
                    'user:logout': this.onUserManagerLogout,
                    'user:login': this.onUserManagerLogin
                };
                BaseView.prototype.initialize.call(this);

                if (UserManager.getLoginStatus() === 'loggingIn') {
                    this._loginPubSubPromise = $.Deferred();
                }

                this.loginUser();

            },

            /**
             * Log in user into Filemobile.
             * @returns {Deferred} Returns a promise that resolves when user is logged in.
             */
            loginUser: function() {
                var userManagerLoginStatus = UserManager.getLoginStatus();

                this._loginFailed = false;
                this._loginPromise = $.Deferred();

                if (userManagerLoginStatus === 'loggedOut' || userManagerLoginStatus === 'loginFailed') {
                    return this._loginPromise.reject();
                }

                // at this point the user is either logged in or logging in
                // which is handled by UserManager's login pubsub call
                $.when(this._loginPubSubPromise).done(_.bind(function(){
                    this._getFilemobileUserInfo()
                        .done(_.bind(function(userInfo){
                            // user logged in!
                            this._loginPromise.resolve(userInfo);
                        }, this))
                        .fail(_.bind(function(){
                            // user login failed!
                            this._loginFailed = true;
                            this._loginPromise.reject();
                        }, this));
                }, this));
                return this._loginPromise.promise();
            },

            /**
             * Gets user information.
             * @returns {Deferred} Returns promise that resolves when done
             */
            getUserInfo: function() {
                var deferred = $.Deferred();
                $.when(this._loginPromise)
                    .done(_.bind(function(userInfo){
                        deferred.resolve(userInfo);
                    }, this))
                    .fail(_.bind(function(){
                        deferred.reject();
                    }, this));
                return deferred.promise();
            },


            /**
             * Gets the information for the logged in user account.
             */
            getUserManagerUserData: function() {
                var userAccount = UserManager.getAccount(),
                    userInfoObj;
                if (userAccount && userAccount.getUserFirstName()) {
                    userInfoObj = {
                        firstname: userAccount.getUserFirstName(),
                        lastname: userAccount.getUserLastName(),
                        avatar: userAccount.getUserAvatar()
                    };
                }
                return userInfoObj;
            },

            /**
             * Gets core user information.
             * @returns {Deferred} Returns promise that resolves when done
             * @private
             */
            _getCoreUserInfo: function() {
                if (!this._coreUserInfoPromise || this._coreUserInfoPromise.state() === 'rejected') {
                    this._coreUserInfoPromise = $.Deferred();
                    UserManager.getCoreUserInfo()
                        .done(_.bind(function(coreUserData){
                            // merge new core data with existing user manager data
                            var coreUserObj = $.extend(true, this.getUserManagerUserData(), {
                                coreuserid: coreUserData.CoreUserId,
                                atyponsessiontoken: coreUserData.AtyponSessionKey
                            });
                            this._coreUserInfoPromise.resolve(coreUserObj);
                        }, this))
                        .fail(_.bind(function(){
                            this._coreUserInfoPromise.reject();
                            console.warn('failed to get user core info!');
                        }, this));
                }
                return this._coreUserInfoPromise;
            },

            /**
             * DEBUG function to mock latency in obtaining filemobile user data.
             * @param {boolean} reject Whether to mock a rejection
             * @returns {Deferred}
             */
            _mockDelayedGetUserInfo: function(reject) {
                var d = $.Deferred();
                this._getFilemobileUserInfo().done(function(userData){
                    // add a 20 second delay
                    _.delay(_.bind(function(){
                        if (reject) {
                            d.reject();
                        } else {
                            d.resolve(userData);
                        }
                    }, this), 20000);
                });
                return d.promise();
            },

            /**
             * Gets the amount of time to stop attempting to get user information.
             * @returns {number}
             */
            getUserInfoTimeout: function() {
                return this.USERINFO_TIMEOUT * 1000;
            },

            /**
             * Gets Filemobile session data for a user.
             * @returns {Deferred} Returns a promise that resolves with the filemobile user data when completed
             */
            _getFilemobileUserInfo: function() {
                if (!this._fmUserInfoPromise || this._fmUserInfoPromise.state() === 'rejected') {
                    this._fmUserInfoPromise = $.Deferred();
                    this._getCoreUserInfo()
                        .done(_.bind(function(coreUserInfo){
                            if (coreUserInfo.FileMobileId && coreUserInfo.FileMobileSessionToken) {
                                // do not attempt to get file mobile data if we already have it
                                this._fmUserInfoPromise.resolve();
                            }
                            Filemobile.getUserSessionToken(coreUserInfo.coreuserid, coreUserInfo.atyponsessiontoken)
                                .done(_.bind(function(response){
                                    var fmUserInfo = {sessiontoken: response.FileMobileSessionToken, fmid: response.FileMobileId};
                                    // merge new filemobile info with core user info
                                    var finalUserInfo = $.extend(coreUserInfo, fmUserInfo);
                                    this._fmUserInfoPromise.resolve(finalUserInfo);
                                }, this))
                                .fail(_.bind(function(){
                                    this._fmUserInfoPromise.reject();
                                    console.warn('unable to get filemobile user data!');
                                }, this));
                        }, this))
                        .fail(_.bind(function(){
                            this._fmUserInfoPromise.reject();
                        }, this));

                    _.delay(_.bind(function(){
                        // if we still cant get filemobile data after a reasonable amount of time, reject the promise
                        if (this._fmUserInfoPromise.state() === 'pending') {
                            this._fmUserInfoPromise.reject();
                        }
                    }, this), this.getUserInfoTimeout());

                }
                return this._fmUserInfoPromise.promise();
            },

            /**
             * Gets user's logged in state.
             * @returns {String} returns 'loggedIn', 'loggingIn', 'loginFailed' or 'loggedOut'
             */
            getLoginState: function() {
                if (this._loginPromise.state() === 'resolved') {
                    return 'loggedIn';
                } else if (this._loginPromise.state() === 'pending') {
                    return 'loggingIn';
                } else if (this._loginFailed) {
                    return 'loginFailed';
                } else  {
                    return 'loggedOut';
                }
            },

            /**
             * When the user logs out using global user manager.
             */
            onUserManagerLogout: function(){
                this.logoutUser();
            },

            /**
             * Logs user out of filemobile and user manager.
             */
            logoutUser: function() {
                this._coreUserInfoPromise = $.Deferred().reject();
                this._loginPromise = $.Deferred().reject();
                this._loginPubSubPromise = null;
                this._fmUserInfoPromise = $.Deferred().reject();
            },

            /**
             * When the user logs in using global user manager.
             */
            onUserManagerLogin: function(){
                if (this._loginPubSubPromise) {
                    this._loginPubSubPromise.resolve();
                }
                this.loginUser();
            },

            /**
             * Destroy function.
             */
            destroy: function(removeEl) {
                this.logoutUser();
                BaseView.prototype.destroy.call(this, removeEl);
            }
        });

        /**
         * Return page class.
         */
        return new UGCUser();
    });
