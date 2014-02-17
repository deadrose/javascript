/**
 * @fileoverview User dropdown module (in the top nav).
 * @author ekallevig@gannett.com (Erik Kallevig), mdkennedy@gannett.com (Mark Kennedy)
 */
 
define([
    'jquery',
    'underscore',
    'baseview',
    'pubsub',
    'utils',
    'user-manager'
],
function(
    $,
    _,
    BaseView,
    PubSub,
    Utils,
    UserManager
) {
    'use strict';

    /**
     * View class.
     */
    var UserDropdown = BaseView.extend({

        ALT_ACTIVE_CLASS: 'site-nav-visible-alt-span',
        WRAP_ACTIVE_CLASS: 'site-nav-user-dropdown-wrap-active',

        events: {
            'mouseenter': 'showUserNav',
            'mouseleave': 'hideUserNav',
            'click .site-nav-user-login-btn': 'onClickLogin',
            'click .site-nav-user-logout-btn': 'onClickLogout'
        },

        initialize: function(options) {

            this.pubSub = {
                'user:login': this.showLoggedInUser,
                'user:logout': this.showLoggedOutUser
            };
            _.bindAll(this, 'toggleUserDropdown', 'showLoggedInUser', 'showLoggedOutUser');
            BaseView.prototype.initialize.call(this, options);

            // cache vars
            this.$win = Utils.get('win');
            this.$dropdown = this.$('.site-nav-user-dropdown');
            this.$loginWrap = this.$dropdown.find('.site-nav-user-logged-in-wrap');
            this.$logoutWrap = this.$dropdown.find('.site-nav-user-logged-out-wrap');
            this.$siteNavAltSpan = this.$('.site-nav-alt-span');
            this.$avatarContainer = this.$('.site-nav-user-avatar-span');
            this.$userDisplayName = this.$('.site-nav-user-display-name');
            this.$avatar = this.$('.site-nav-user-avatar-image');

        },

        /**
         * Shows user nav dropdown.
         */
        showUserNav: function() {
            clearTimeout(this.userNavTimer);
            this.userNavTimer = _.delay(this.toggleUserDropdown, this.hoverDropdownDelay, true);
        },

        /**
         * Hides user nav dropdown.
         */
        hideUserNav: function() {
            clearTimeout(this.userNavTimer);
            this.userNavTimer = _.delay(this.toggleUserDropdown, this.hoverDropdownDelay, false);
        },

        /**
         * Close user dropdown.
         * @param {Boolean} open Whether to force open the dropdown.
         */
        toggleUserDropdown: function(open) {
            this.$el.toggleClass('site-nav-active-item', open);
            if (this.$el.hasClass('site-nav-active-item')) {
                this.$win.on('scroll', this.toggleUserDropdown);
            } else {
                this.$win.off('scroll', this.toggleUserDropdown);
            }
            this._handleDropdownPanels();
            return false;
        },

        /**
         * Shows dropdown panel wrap depending on the user's logged in/logged out state.
         * @private
         */
        _handleDropdownPanels: function() {
            if (this.isUserLoggedIn) {
                this.$loginWrap.addClass(this.WRAP_ACTIVE_CLASS);
                this.$logoutWrap.removeClass(this.WRAP_ACTIVE_CLASS);
            } else {
                this.$loginWrap.removeClass(this.WRAP_ACTIVE_CLASS);
                this.$logoutWrap.addClass(this.WRAP_ACTIVE_CLASS);
            }
        },

        /**
         * Shows the user header nav item in the logged out state.
         */
        showLoggedOutUser: function() {
            this.isUserLoggedIn = false;
            this._teardownLoggedInMarkup();
        },

        /**
         * Shows the user header nav item in the logged in state.
         */
        showLoggedInUser: function(){
            this._setupLoggedInMarkup(UserManager.getAccount());
            this.isUserLoggedIn = true;
        },

        /**
         * Sets up the markup for a logged in state.
         * @param {Object} userAccount An object containing the currently logged in user account
         * @private
         */
        _setupLoggedInMarkup: function(userAccount) {
            var fullName = userAccount.getUserFirstName() + ' ' + userAccount.getUserLastName();
            this.$avatar.attr('src', userAccount.getUserAvatar());
            this.$avatar.attr('alt', fullName);
            this.$siteNavAltSpan.addClass(this.ALT_ACTIVE_CLASS);
            this.$userDisplayName.html(fullName);
        },

        /**
         * Removes appropriate markup for logged in state.
         * @private
         */
        _teardownLoggedInMarkup: function() {
            this.$avatar.attr('src', '');
            this.$avatar.attr('alt', '');
            this.$siteNavAltSpan.removeClass(this.ALT_ACTIVE_CLASS);
            this.$userDisplayName.html('');
        },

        /**
         * Click logout in the user nav item.
         */
        onClickLogout: function() {
            this.toggleUserDropdown();
            UserManager.logoutUser().done(function(){
                PubSub.trigger('uotrack', 'headerprofilelogout');
            });
        },

        /**
         * Click handler for user nav item.
         */
        onClickLogin: function(e) {
            var userAccount = $(e.target).data('user-account');
            UserManager.loginUser(userAccount).done(function(){
                PubSub.trigger('uotrack', 'headerprofilelogin');
            });
        },

        /**
         * Destroys the view.
         */
        destroy: function(removeEl) {
            this._teardownLoggedInMarkup();
            BaseView.prototype.destroy.call(this, removeEl);
        }
    });

    return UserDropdown;

});
