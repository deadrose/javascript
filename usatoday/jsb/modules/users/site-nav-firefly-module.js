/**
 * @fileoverview User dropdown module (in the top nav).
 * @author erik.kallevig@f-i.com (Erik Kallevig)
 */
 
define([
    'jquery',
    'underscore',
    'baseview',
    'pubsub',
    'utils',
    'user-manager',
    'user-accounts/firefly-user-account'
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
    var FireflyDropdown = BaseView.extend({

        events: {
            'mouseenter': 'showUserNav',
            'mouseleave': 'hideUserNav'
        },

        initialize: function(options) {
            this.$win = Utils.get('win');
            this.$siteNavDropdown = this.$('.site-nav-dropdown');
            this.pubSub = {
                'page:load': this.updateRedirectURLs,
                'user:statuschange': this.showLoggedInStatus
            };
            this.$navlink = $('.site-nav-link.site-nav-firefly-link');
            
            _.bindAll(this, 'toggleUserDropdown');
            BaseView.prototype.initialize.call(this, options);
        },

        /**
         * Update all SAM URLs on the page with the current page's redirect URL.
         * @param {Event} e event
         */
        updateRedirectURLs: function(e) {
            var onSuccessRedirectURL = Utils.getPageUrl();

            var newQSP = '?onSuccessRedirectURL=' + encodeURIComponent(onSuccessRedirectURL);
            
            $(".sam-returns").each(function(index, link) {
                var $link = $(link);
                var url = $link.attr('href');
                
                if (typeof(url) === 'string') {
                    var splitUrl = url.split(/[\?\&]/);
                    var append = "";

                    // for now assuming first QSP is onSuccessRedirectURL
                    if (splitUrl.length > 2) {
                        append = '&' + splitUrl.slice(2).join('&');
                    }

                    $link.attr('href', splitUrl[0] + newQSP + append);
                }
            });
        },

        /**
         * mouseenter handler for user nav button.
         * @param {Event} e mouseenter event.
         */
        showUserNav: function(e) {
            clearTimeout(this.userNavTimer);
            this.userNavTimer = _.delay(this.toggleUserDropdown, this.hoverDropdownDelay, true);
        },

        /**
         * mouseleave handler for user nav button.
         * @param {Event} e mouseleave event.
         */
        hideUserNav: function(e) {
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
                this.$win.on('scroll.' + this.cid, this.toggleUserDropdown);
            } else {
                this.$win.off('scroll.' + this.cid, this.toggleUserDropdown);
            }
            return false;
        },

        showLoggedInStatus: function(accountName, loginStatus, userData) {
            if (accountName !== 'firefly') {
                return;
            }
            if (this.$navlink) {
                this.$navlink.addClass('loaded');
                delete this.$navlink;           
            }
            if (loginStatus === 'loggedIn') {
                this.showLoggedInUser(userData);
            } else if (loginStatus !== 'loggingIn') {
                this.showLoggedOutUser();
            }
        },

        /**
         * Shows the user header nav item in the logged out state.
         */
        showLoggedOutUser: function() {
            this.$siteNavDropdown.removeClass('authenticated');
            this.$siteNavDropdown.removeClass('subscribed');

            var $name = this.$('.user-display-name');
            $name.html('');
        },
        /**
         * Shows the user header nav item in the logged in state.
         */
        showLoggedInUser: function(userInfo) {
            var $name = this.$('.user-display-name');
            var userAccount = UserManager.getAccount('firefly');
            this.$siteNavDropdown.addClass('authenticated');
            if (userInfo.hasMarketAccess) {
                this.$siteNavDropdown.addClass('subscribed');
            }
            
            $name.html(userAccount.getUserFirstName() + ' ' + userAccount.getUserLastName());
        },

        destroy: function() {
            this.$win.off('.' + this.cid);
            BaseView.prototype.destroy.apply(this, arguments);
        }
    });

    return FireflyDropdown;

});
