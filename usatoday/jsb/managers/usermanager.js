define([
    'jquery',
    'underscore',
    'pubsub',
    'cookie'
],
    function ($, _, PubSub) {
        'use strict';
        /**
         * User Manager manages the state of a user on the site providing login and logout functionality.
         * @exports user-manager
         * @author Mark Kennedy <mdkennedy@gannett.com>
         */
        var UserManager = function () {
            this.initialize();
        };

        UserManager.prototype = {
            /** @const
             * @private */
            PREFERRED_ACCOUNT_KEY: 'userPreferredAccount',

            /**
             * Initializes UserManager and gets initial variables.
             */
            initialize: function () {
                this.resetManager();
                if (this.preferredAccount) {
                    this.state = 'loggingIn';
                    PubSub.on('page:load', this.autoLogin, this);
                }
            },

            autoLogin: function () {
                this.state = null;
                this.loginUser(this.preferredAccount, true).fail(_.bind(function () {
                    // if we can't auto login, trigger a logout to flush any caches we may have
                    this.logoutUser();
                }, this));
                PubSub.off('page:load', this.autoLogin, this);
            },

            /**
             * Registers a account which gets added to User Manager's workflow.
             * @param {Object} Account view account
             */
            registerAccount: function (Account) {
                var accountName = Account.getName();

                if (!this.accounts[accountName]) {
                    this.accounts[accountName] = Account;
                } else {
                    console.error('duplicate account name given to registerAccount');
                    return;
                }
            },

            /**
             * Un-registers a account.
             * @param {Object} Account view
             */
            unRegisterAccount: function (Account) {
                var accountName = Account.getName();

                if (this.accounts[accountName]) {
                    this.accounts[accountName] = null;
                } else {
                    console.error('unRegisterAccount called on name that isn\'t registered!');
                }
                Account.logout();
                if (this.preferredAccount === accountName) {
                    this.setPreferredAccount(null);
                }
            },

            /**
             * Attempts to log a user into the site.
             * @param {String} [accountName=preferredAccount] The account name
             * @param {Boolean} [isAutoLogin] True if this is an autoLogin attempt
             * @return {Deferred} promise object that resolves when the user is logged in successfully
             */
            loginUser: function (accountName, isAutoLogin) {
                return this._askAccount('login', accountName, isAutoLogin).done(_.bind(function (userData) {
                    this._onLoginSuccess(userData, accountName);
                }, this));
            },

            /**
             * When a user is logged in successfully.
             * @param {Object} userData The user's information.
             * @param {String} accountName The account view that user has logged into
             * @private
             */
            _onLoginSuccess: function (userData, accountName) {
                this.setPreferredAccount(accountName);
                PubSub.trigger("user:login", userData);
            },

            /**
             * Sets the preferred account
             * @param {String} accountName The name of the account to use as the preferred one.
             */
            setPreferredAccount: function (accountName) {
                $.cookie(this.PREFERRED_ACCOUNT_KEY, accountName, { path: '/'});
                this.preferredAccount = accountName;
            },

            /**
             * Gets the currently set preferred account.
             */
            getPreferredAccount: function () {
                return this.preferredAccount || $.cookie(this.PREFERRED_ACCOUNT_KEY);
            },

            /**
             * Reports the user's login/logout state.
             * @returns {String} returns 'loggedIn', 'loggingIn', 'loginFailed' or 'loggedOut'
             */
            getLoginStatus: function (accountName) {
                var loginStatus, account = this.getAccount(accountName);
                if (account) {
                    loginStatus = account.getLoginStatus();
                } else {
                    loginStatus = 'loggedOut';
                }
                // handle situations where someone has asked the login status before the world has set up,
                // so there might not be any accounts registered, or we haven't tried to auto login yet,
                return this.state || loginStatus;
            },

            /**
             * Logs a user out of the site.
             * @param {String} [accountName=preferredAccount] optional account name to log out of
             * @return {Deferred} promise object that resolves when the user logged out successfully
             */
            logoutUser: function (accountName) {
                var promise = this._askAccount('logout', accountName);
                if (!accountName || accountName === this.getPreferredAccount()) {
                    //TODO is this the behavior we want?
                    promise.always(_.bind(this._onLogoutSuccess, this));
                }
                return promise;
            },

            /**
             * Logs out of all accounts in the system
             * @returns {Deferred} promise that will resolve when all accounts are logged out of
             */
            logoutAll: function () {
                return $.when.apply($, _.map(this.accounts, function (account) {
                    return account.logout();
                })).always(_.bind(this._onLogoutSuccess, this));
            },

            /**
             * Clears user session data.
             * @private
             */
            _onLogoutSuccess: function () {
                PubSub.trigger("user:logout");
                this.setPreferredAccount(null);
            },

            /**
             * Gets a user account
             * @param {String} [accountName=preferredAccount] The account name to grab
             * @returns {Object} Returns the account object
             */
            getAccount: function (accountName) {
                return this.accounts[accountName || this.preferredAccount];
            },

            /**
             * Gets information for the currently logged in user.
             * @param accountName
             * @returns {Deferred}
             */
            getUserInfo: function (accountName) {
                return this._askAccount('getUserInfo', accountName);
            },

            /**
             * Uses an account to grab the core information for a user.
             * @param {String} [accountName=preferredAccount] Account to use for core user info login
             * @returns {Deferred} promise object that resolves when the core information is fetched successfully
             */
            getCoreUserInfo: function (accountName) {
                return this._askAccount('getCoreUserInfo', accountName);
            },

            /**
             Reset manager to a valid state
             */
            resetManager: function () {
                this.accounts = {};
                this.preferredAccount = this.getPreferredAccount();
            },

            /**
             * Private delegator, will get an account name (optional, defaults to preferred account),
             * and calls a method on it, returning it's results
             * @param {String} methodName - name of method to call
             * @param {String} [accountName=preferredAccount] - name of account to call method on
             * @param {...*} args - arguments to pass to the method
             * @returns {*}
             * @private
             */
            _askAccount: function (methodName, accountName) {
                var account = this.getAccount(accountName);
                if (account) {
                    if (account[methodName]) {
                        return account[methodName].apply(account, Array.prototype.slice.call(arguments, 2));
                    } else {
                        return $.Deferred().reject('Account ' + (accountName || this.preferredAccount) + ' does not support method ' + methodName);
                    }
                } else {
                    return $.Deferred().reject('Invalid Account');
                }
            }

        };
        return new UserManager();

    });
