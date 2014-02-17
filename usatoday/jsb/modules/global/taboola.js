define([
    'jquery',
    'underscore',
    'utils'
],
    function($, _, Utils) {
        'use strict';
        /**
         * @constructs modules/global/taboola
         * @author Chris Manning
         * @param {Object} options
         *     @param {String} [options.apiBase=http://api.taboola.com/1.0/json/usatodaydemo/] - base url for taboola api urls
         *     @param {String} [options.apiKey=90393b522c6937bd3b1e815ead8d189cea03650] - taboola api key
         *     @param {String} [options.widgetUrl=http://cdn.taboolasyndication.com/libtrc/usatodaydemo/loader.js] - url for the widget implementation of taboola
         *     @param {Boolean} [options.widget=false] - ability to request a widget version of taboola
         */
        var Taboola = function(options){
            var siteconfig = Utils.getNested(window, 'site_config', 'THIRDPARTYAPI', 'Taboola') || {};
            this.options = $.extend({
                apiBase: siteconfig.apiBase + siteconfig.api_id,
                apiKey: siteconfig.apiKey,
                widgetUrl: 'http://cdn.taboolasyndication.com/libtrc/'+ siteconfig.publisher_id+'/loader.js',
                widget: siteconfig.widget,
                taboola_enabled: siteconfig.ENABLED
            }, options);

            if (this.options.widget) {
                Utils.loadScript(this.options.widgetUrl, '_taboola', _.bind(this.getWidget, this));
            }
        };

        Taboola.prototype = {
            /**
             * Fires off an analytic request to taboola letting them known an item was clicked
             * @param {String} itemId
             * @param {String} itemType
             * @param {String} responseId
             * @param {String} placement
             */
            registerTaboolaClick: function(itemId, itemType, responseId, placement) {
                if (!placement) {
                    placement = 'below-photo';
                }
                var url = this.options.apiBase + '/recommendations.notify-click' +
                    '?app.type=desktop&app.apikey=' + this.options.apiKey + '&response.id=' + responseId +
                    '&item.type=' + itemType + '&item.id=' + itemId + '&placement=' + placement;
                new Image().src = url;
            },

            /**
             * Fires off an analytic request to let taboola know that the recommendations are now visible
             * @param responseId
             * @private
             */
            registerTaboolaVisible: function(responseId) {
                var url = this.options.apiBase + '/recommendations.notify-visible' +
                    '?app.type=desktop' + '&app.apikey=' + this.options.apiKey + '&response.id=' + responseId;
                new Image().src = url;
            },

            /**
             * This callback is called when taboola data comes in
             * @callback modules/global/taboola~getRelatedCallback
             * @param {Object} data - taboola data
             */
            /**
             * Request to get taboola raw data
             * @param {modules/global/taboola~getRelatedCallback} callback - called when the request to taboola succeeds
             * @param {String} [sourceType=video]
             * @param {String} [recType=video]
             * @param {Number} [count=6]
             * @param {String} [sourceUrl=window.location.href]
             * @param {Number} [sourceID=0]
             */
            getRelated: function(callback, sourceType, recType, count, sourceUrl, sourceID) {
                if(this.options.taboola_enabled) {
                    if (!callback) {
                        return;
                    }
                    sourceType = sourceType || 'video';
                    recType = recType || 'video';
                    count = count || 6;
                    // We can do better than this. But most likely not until we have canonical urls.
                    sourceUrl = sourceUrl || window.location.href;
                    sourceID = sourceID || 0;

                    var svcUrl = this.options.apiBase + '/recommendations.get';
                    svcUrl += '?output.callback=define&app.type=desktop&app.apikey=' + this.options.apiKey;
                    svcUrl += '&source.id=' + sourceID + '&source.url=' + encodeURIComponent(sourceUrl) + '&source.type=' + sourceType + '&rec.type=' + recType + '&rec.count=' + count;

                    Utils.requireSingleUseScript(svcUrl).done(_.bind(function(data) {
                        Utils.set('taboolaResponseID', data.id);
                        if (!data.list) {
                            data.list = {};
                        }
                        this.registerTaboolaVisible(data.id);
                        callback(data);
                    }, this));
                }
            },

            getWidget: function(_taboola) {
                if(this.options.taboola_enabled){
                    if (this.options.widget.length > 1) {
                        console.log('TABOOLA more stories');
                    }

                    _taboola.push({
                        notify: 'newPageLoad'
                    });
                    _taboola.push({
                        article: 'auto',
                        target_type: 'mix',
                        url: window.location.href
                    });

                    _.each(this.options.widget, function(widget) {
                        if (Utils.getPageUrl().indexOf('/sports/') !== -1 || Utils.getPageUrl().indexOf('/gameon/') !== -1) {
                            _taboola.push({
                                category: 'sports',
                                mode: widget.mode,
                                container: widget.container
                            });
                        } else {
                            _taboola.push({
                                mode: widget.mode,
                                container: widget.container
                            });
                        }
                    });
                }
            }
        };

        return Taboola;
    }
);