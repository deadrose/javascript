define([
    'jquery',
    'underscore',
    'pubsub',
    'baseview',
    'managers/cachemanager'
],
    function(
        $,
        _,
        PubSub,
        BaseView,
        CacheManager
        ) {
        "use strict";
        var BaseUserAccount = BaseView.extend(
        /**
         * @lends "user-accounts/base-user-account.prototype"
         */
        {
            /**
             * @classdesc Base class for all types of user accounts that should be overriden for unique functionality.
             * @constructs user-accounts/base-user-account
             * @author Mark Kennedy <mdkennedy@gannett.com>
             */
            initialize: function(options) {
                _.bindAll(this, '_handleGetCoreUserInfo');
                BaseView.prototype.initialize.call(this, options);
            },

            /**
             * Gets user's information.
             * @returns {Deferred} with the user data object
             */
            getUserInfo: function() {
                if (this.loginPromise) {
                    //TODO if we can enforce all logins to return their user info, this function turns into a one line return this.loginPromise;
                    return this.loginPromise.then(_.bind(function() {
                            return this._handleGetUserInfo();
                        }, this));
                } else {
                    return $.Deferred().reject('account not logged in');
                }
            },

            /**
             * Abstract function meant to be overridden by implementer with getUserInfo functionality
             * @abstract
             * @returns {Deferred} promise that resolves when the account has user info
             * @private
             */
            _handleGetUserInfo: function() {
                console.error('getUserInfo failed: unimplemented function!');
                return $.Deferred().reject('unimplemented feature');
            },


            /**
             * Gets user's core user information.
             * @returns {Deferred} with the user data object
             */
            getCoreUserInfo: function() {
                if (this.loginPromise) {
                    return this.loginPromise.then(_.bind(function() {
                            return CacheManager.getValue('coreuserinfo', this._handleGetCoreUserInfo);
                        }, this));
                } else {
                    return $.Deferred().reject('account not logged in');
                }
            },

            /**
             * Overridable function that, by default, gets core user info from /user-service/
             * @returns {Deferred} promise that resolves when the account has core user info
             * @private
             */
            _handleGetCoreUserInfo: function() {
                 return $.Deferred(_.bind(function(defer) {
                        $.ajax('/user-service/getcoreuser/' + this.getUserId() + '/' + this.getName(), {
                            type: 'POST',
                            data: {
                                token: this.getUserToken()
                            }
                        }).done(function(r) {
                            if (r && r.success && r.success.status) {
                                if (r.success.status.state === 'valid') {
                                    defer.resolve(r.success.response);
                                } else {
                                    defer.reject(r.success.status.message);
                                }
                            } else {
                                defer.reject('unable to get core user data, invalid response!');
                            }
                        }).fail(function() {
                            defer.reject('unable to get core user data!');
                        });
                    }, this)).promise();
            },

            /**
             * Logs user in.
             * @param {Boolean} isAutoLogin True if this login method was triggered automatically
             * @returns {Deferred}
             */
            login: function(isAutoLogin) {
                var loginStatus = this.getLoginStatus();
                if (loginStatus !== 'loggedIn') {
                    this.loginPromise = this._handleLogin(isAutoLogin);
                    this._onLoginStatusChange();
                    this.loginPromise.always(_.bind(function(userData){
                        this._onLoginStatusChange.apply(this, arguments);
                    }, this));
                }
                return this.loginPromise;
            },

            /**
             * Gets the current login status
             * @returns {String} returns 'loggedIn', 'loggingIn', 'loginFailed' or 'loggedOut'
             */
            getLoginStatus: function() {
                if (!this.loginPromise) {
                    return 'loggedOut';
                } else if (this.loginPromise.state() === 'rejected') {
                    return 'loginFailed';
                } else if (this.loginPromise.state() === 'pending') {
                    return 'loggingIn';
                } else {
                    return 'loggedIn';
                }
            },

            _onLoginStatusChange: function() {
                PubSub.trigger.apply(PubSub, ['user:statuschange', this.getName(), this.getLoginStatus()].concat(Array.prototype.slice.call(arguments, 0)));
            },

            /**
             * Abstract function meant to be overridden by implementer with login functionality
             * @abstract
             * @returns {Deferred} promise that resolves when the login succeeds
             * @private
             */
            _handleLogin: function() {
                console.error('Login failed: unimplemented function!');
                return $.Deferred().reject('unimplemented feature');
            },

            _flushCaches: function() {
                CacheManager.clearValue('coreuserinfo');
            },

            /**
             * Logs user out.
             * @returns {Deferred}
             */
            logout: function() {
                this._flushCaches();
                if (this.loginPromise) {
                    this.loginPromise = null;
                    this._onLoginStatusChange();
                    return this._handleLogout();
                } else {
                    return $.Deferred().resolve();
                }
            },

            /**
             * Abstract function meant to be overridden by implementer with logout functionality
             * @abstract
             * @returns {Deferred} promise that resolves when the logout succeeds
             * @private
             */
            _handleLogout: function() {
                return $.Deferred().resolve();
            },

            /**
            * Returns a promise that will resolve or reject based on when the login promise resolves or rejects
            * @returns {Deferred}
            */
            whenLoggedIn: function() {
               if (this.loginPromise) {
                   return this.loginPromise;
               } else {
                   return $.Deferred().reject();
               }
            },

            /**
             * Returns user token
             * @returns {String}
             */
            getUserToken: function() {
                return "";
            },

            /**
             * Returns the user id
             * @returns {String}
             */
            getUserId: function(){
                return "";
            },

            /**
             * Returns the url to the user's avatar
             * @returns {String}
             * @abstract
             */
            getUserAvatar: function(){
                return "";
            },

            /**
             * Returns the user's first name
             * @returns {String}
             * @abstract
             */
            getUserFirstName: function(){
                return "";
            },

            /**
             * Returns the user's last name
             * @returns {String}
             * @abstract
             */
            getUserLastName: function(){
                return "";
            },

            /**
             * Returns the name of the account
             * @returns {String}
             * @abstract
             */
            getName: function() {
                throw 'No name defined';
            }
        });

        /**
         * Return view class.
         */
        return BaseUserAccount;
    }
);