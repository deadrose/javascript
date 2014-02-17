define([
    'jquery',
    'underscore',
    'third-party-apis/base-third-party-api',
    'state'
],
function(
    $,
    _,
    BaseThirdPartyApi,
    StateManager
) {
    'use strict';
    /**
     * Filemobile API wrapper.
     * @author mdkennedy@gannett.com (Mark Kennedy)
     */
    var Filemobile = BaseThirdPartyApi.extend({

        initialize: function() {
            var siteconfig = this.getApiSiteConfig('FILEMOBILE');
            if (siteconfig) {
                this._vhost = siteconfig.VHOST;
            } else {
                console.error('No siteconfig set up for Filemobile!');
            }

            this.SERVICES_ENDPOINT = siteconfig.SERVICES_ENDPOINT;
            BaseThirdPartyApi.prototype.initialize.call(this);
        },

        /**
         * Makes a call to the Filemobile API service and returns a response.
         * Please see Filemobile API for reference (http://developer.filemobile.com/)
         * @param {String} method The method to use for the call (in dot notation)
         * @param {Object} args Arguments for the filemobile method
         * @param {Object} filters Filters for the filemobile method
         * @returns {*}
         */
        api: function(method, args, filters) {
            var dataArgs = $.extend({
                method: method,
                filters: filters
            }, args);
            var requestOptions = this._getDefaultRequestOptions({
                url: this.SERVICES_ENDPOINT + 'json',
                data: dataArgs
            });
            return StateManager.fetchData(null, requestOptions);
        },

        /**
         * Uploads a file to Filemobile via ajax.
         * We have separated this function from the normal API wrapper function because we need to allow additional ajaxOptions
         * @param {Object} ajaxOptions
         * @returns {Deferred}
         */
        uploadMedia: function(ajaxOptions) {
            // we need to override the url parameter to prevent people from overriding our endpoint call.
            ajaxOptions.url = this.SERVICES_ENDPOINT + 'upload2?json';
            ajaxOptions = this._getDefaultRequestOptions(ajaxOptions);
            return StateManager.fetchData(null, ajaxOptions);
        },

        /**
         * Gets default request options to send with request.
         * @param {Object} options
         * @returns {Object} The options object with default properties added
         * @private
         */
        _getDefaultRequestOptions: function(options) {
            var data = options.data;
            return $.extend(true, {
                url: this.SERVICES_ENDPOINT,
                type: 'POST',
                data: this._getFormattedRequestData(data)
            }, options);

        },

        /**
         * Adds default properties to a data object for request.
         * @param {Object} data
         * @returns {Object} The data object with default properties added
         * @private
         */
        _getFormattedRequestData: function(data) {
            var defaultData = {vhost: this._vhost};
            // check if there is an append method, which tells us that this is FormData object
            // which requires us to append the default values, rather than use an object
            if (data.append) {
                _.each(defaultData, function(value, key) {
                    data.append(key, value);
                });
            } else {
                data = $.extend(true, defaultData, data);
            }
            return data;
        },

        /**
         * Conducts an ajax request for filemobile API.
         * @param options
         * @returns {Deferred}
         * @deprecated since version 2.1.1
         */
        makeRequest: function(options) {
            var requestOptions = $.extend(true, this._getDefaultRequestOptions(), options);
            return StateManager.fetchData(null, requestOptions);
        },

        /**
         * Gets filemobile user session token.
         * @param id
         * @param atyponSessionToken
         * @returns {*}
         */
        getUserSessionToken: function(id, atyponSessionToken){
            return $.Deferred(function(defer){
                StateManager.fetchData('/filemobile/getfmsession/', {
                    type: 'POST',
                    data: {
                        coreuserid: id,
                        atyponsessiontoken: atyponSessionToken
                    }
                }).done(function(rd){
                        if(rd.success.status.state ==='valid'){
                            defer.resolve(rd.success.response);
                        } else {
                            defer.reject();
                        }
                    });
            }).promise();
        }

    });

    return new Filemobile();
});
