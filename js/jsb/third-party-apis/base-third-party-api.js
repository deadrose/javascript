define([
    'jquery',
    'underscore',
    'backbone',
    'pubsub'
],
function(
    $,
    _,
    Backbone,
    PubSub
)
    {
    "use strict";
        /**
         * A class from which all Third party API's should be extended from.
         * @author Mark Kennedy <mdkennedy@gannett.com>
         */
        var BaseThirdPartyApi = Backbone.View.extend({

            SITE_CONFIG: window.site_config.AUTH || window.site_config.THIRDPARTYAPI,

            initialize: function(){
                // the core framework needs scripts loaded on page load
                PubSub.on('page:load', _.bind(this.loadScript, this));
            },

            /**
             * Loads a script.
             * @returns {Deferred} Resolves true with the script has successfully loaded.
             */
            loadScript: function() {
                if (!this.loadScriptPromise) {
                    this.loadScriptPromise = $.Deferred();
                    this._handleLoadScript().done(_.bind(function(){
                        this.loadScriptPromise.resolve();
                    }, this));
                }
                return this.loadScriptPromise.promise();
            },

            /**
             * Function that should be overriden by each third party api.
             * @returns {Deferred} Should return a promise that resolves when the script has successfully loaded.
             * @abstract
             * @private
             */
            _handleLoadScript: function(){
                return $.Deferred().resolve();
            },

            /**
             * Sometimes scripts need their onLoad callbacks to be registered to the window
             * so they can fire them when the scripts load successfully. This function allows you to do that
             * by accepting a function and registering it to the window object.
             * @param {String} methodName The function to call once the script is loaded.
             * @param {Function} callback The function to be called
             * @private
             */
            setupOnLoadCallbacks: function(methodName, callback) {
                if (!window[methodName]) {
                    window[methodName] = _.bind(function(){
                        callback();
                    }, this);
                  }
            },

            /**
             * Gets the siteconfig object for a third party api.
             * @param {String} name The name of the API
             * @returns {Object} The site config object
             */
            getApiSiteConfig: function(name) {
                name = name.toUpperCase();
                var siteconfig = this.SITE_CONFIG;
                if (siteconfig) {
                    return siteconfig[name];
                } else {
                    console.error('No siteconfig set up for ' + name  + ' api!');
                    return "";
                }
            }

        });

        return BaseThirdPartyApi;
    }
);