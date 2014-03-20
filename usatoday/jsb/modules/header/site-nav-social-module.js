/**
 * @fileoverview Weather dropdown module (in the top nav).
 * @author erik.kallevig@f-i.com (Erik Kallevig)
 */
 
define([
    'jquery',
    'underscore',
    'baseview',
    'utils'
],
function(
    $,
    _,
    BaseView,
    Utils
) {
    'use strict';

    /**
     * View class.
     */
    var SocialDropdownNavModule = BaseView.extend({

        events: {
            'mouseenter': 'onHoverSocialNav',
            'mouseleave': 'onHoverSocialNav'
        },

        initialize: function() {
            this.$dropdown = this.$('.site-nav-social-modules-dropdown');
            this.$navItem = this.$('.site-nav-social-span');

            this.initSocialShareButtons();

            BaseView.prototype.initialize.apply(this);
        },

        /**
         * Hover handler for weather nav button.
         * @param {Event} e Hover event.
         */
        onHoverSocialNav: function(e) {
            if (e.type === 'mouseenter'){
                this.$dropdown.addClass('dropdown-active');
                this.$navItem.addClass('active');
            } else {
                this.$dropdown.removeClass('dropdown-active');
                this.$navItem.removeClass('active');
            }
        },

        initSocialShareButtons: function() {
            this._loadGooglePlus();
        },

        _loadGooglePlus: function() {
            Utils.loadScript('https://apis.google.com/js/plusone.js', 'gapi');
        }

    });

    return SocialDropdownNavModule;

});
