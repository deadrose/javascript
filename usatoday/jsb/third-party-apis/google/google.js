/*global google:true*/
define([
    'jquery',
    'underscore',
    'third-party-apis/base-third-party-api'
],
function(
    $,
    _,
    BaseThirdPartyApi
)
    {
    "use strict";
        /**
         * The Google API.
         * @author Mark Kennedy <mdkennedy@gannett.com>
         */
        var Google = BaseThirdPartyApi.extend({

            initialize: function(){
                BaseThirdPartyApi.prototype.initialize.call(this);
            },

            /**
             * Handles loading a Google API js script
             * @private
             */
            _handleLoadScript: function(){
                if (!this._loadJSApiScriptPromise) {
                    this._loadJSApiScriptPromise = $.Deferred();
                    $.ajax('https://www.google.com/jsapi', {
                        cache: true,
                        dataType: 'script'
                    }).done(_.bind(function(){
                            this._loadJSApiScriptPromise.resolve();
                        },this));
                }
                return this._loadJSApiScriptPromise.promise();
            },

            /**
             * Handles loading a Google API.
             * @returns {Deferred} Returns a promise that resolves when done
             * @abstract
             * @private
             */
            _handleLoadApi: function(){
                console.error('loadGoogleApi failed: unimplemented api!');
                return $.Deferred().reject('unimplemented feature');
            },

            /**
             * A wrapper method to load a Google api, just like Google does it :)
             * @param {String} moduleName
             * @param {String} versionNum
             * @param {Object} optionalSettings
             * @returns {Deferred} Promise when done
             */
            loadGoogleApi: function(moduleName, versionNum, optionalSettings) {
                var deferred = $.Deferred();
                this.loadScript().done(function(){
                    // hi-jack the callback to fulfill our promise
                    var settings = optionalSettings || {},
                        origCallback = settings.callback;
                    settings.callback = function(){
                        deferred.resolve();
                        // if there is no callback specified, make sure we still use it
                        if (origCallback) {
                            origCallback();
                        }
                    };
                    google.load.call(this, moduleName, versionNum, settings);
                });
                return deferred.promise();
            }

        });

        return Google;
    }
);