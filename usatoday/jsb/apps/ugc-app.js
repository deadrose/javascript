/**
 * @fileoverview UGC App.
 */
define([
    'jquery',
    'underscore',
    'base-app',
    'site-manager',
    'state'
],
    function(
        $,
        _,
        BaseApp,
        SiteManager,
        StateManager
        ) {
        "use strict";

        /**
         * Page class.
         */
        var UGCApp = BaseApp.extend({

            /**
             * Initialize page.
             * @param {Object} options Page options passed during init.
             */
            initialize: function(options) {
                BaseApp.prototype.initialize.call(this, options);
                // stop global site refresh, we dont want UGC upload content being wiped!
                StateManager.stopRefreshTimer();
            },

            /**
             * animates page to page within an app
             * @param {String} fromUrl path we're leaving
             * @param {String} toUrl path we're about to go to
             * @return {Deferred} a promise object that resolves when the animation is complete
             */
            animateChangePagePreData: function(fromUrl, toUrl){
                SiteManager.scrollTop(0);
            }

        });

        /**
         * Return page class.
         */
        return UGCApp;
    });
