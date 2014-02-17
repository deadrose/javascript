define([
    'jquery',
    'underscore',
    'baseview',
    'adLogger',
    'libs/swfobject/swfobject'
],
function(
    $,
    _,
    BaseView,
    AdLogger
) {
    'use strict';
        /**
         * @classdesc Builds an IAB ad of type flash, image, or script url
         * @constructs partner/iab
         * @author Jay Merrifield <jmerrifiel@gannett.com>
         * @author Chad Shryock <dshryock@gannett.com>
         */
        var IABView = BaseView.extend(
        /**
         * @lends partner/iab.prototype
         */
        {

            destroy: function(removeEl) {
                if (this.$markup) {
                    this.$markup.remove();
                }
                BaseView.prototype.destroy.call(this, removeEl);
            },

            render: function(adData) {
                var promise;
                this.$el.addClass('iab-risingstar');
                if (adData.adCreativeType === 'flash') {
                    this.setupFlash(adData);
                } else if (adData.adCreativeType === 'image') {
                    this.setupImage(adData);
                } else if (adData.adCreativeType === 'third') {
                    promise = this.setupThirdParty(adData);
                }
                if (!promise) {
                    return $.Deferred().resolve();
                } else {
                    return promise;
                }
            },

            setupFlash: function(data) {
                var flashvars = {
                        clickTag: data.clickUrl + data.clickThruUrl
                    },
                    param = {
                        allowscriptaccess: "always",
                        wmode: "transparent"
                    },
                    attr = data.flashAttr || {},
                    flashId = _.uniqueId('flashiab_');

                this.$markup = $('<div id="' + flashId + '"></div>');
                this.$el.append(this.$markup);

                if (window.swfobject) {
                    window.swfobject.embedSWF(data.flashUrl, flashId, data.width, data.height, "9.0.0", null, flashvars, param, attr);
                }
            },

            setupImage: function(data) {
                this.$markup = $('<a href="' + data.clickUrl + data.clickThruUrl + '" target="_blank">' +
                    '<img src="' + data.imageUrl + '">' +
                    '</a>');
                this.$el.append(this.$markup);
            },

            setupThirdParty: function(data) {
                // Create the iframe which will be returned
                var iframe = document.createElement("iframe");

                iframe.id = iframe.name = _.uniqueId('iframeiab_');
                iframe.src = 'about:blank';
                iframe.width = this.options.width || 0;
                iframe.height = this.options.height || 0;
                iframe.scrolling = 'no';
                iframe.marginWidth = 0;
                iframe.marginHeight = 0;
                iframe.frameBorder = 0;
                iframe.className = 'iab-iframe';

                // This is necessary in order to initialize the document inside the iframe
                this.$el[0].appendChild(iframe);

                // Initiate the iframe's document to null
                iframe.doc = null;

                // Depending on browser platform get the iframe's document, this is only
                // available if the iframe has already been appended to an element which
                // has been added to the document
                if (iframe.contentDocument) {
                    // Firefox, Opera
                    iframe.doc = iframe.contentDocument;
                } else if (iframe.contentWindow) {
                    // Internet Explorer
                    iframe.doc = iframe.contentWindow.document;
                } else if (iframe.document) {
                    // Others?
                    iframe.doc = iframe.document;
                }

                // If we did not succeed in finding the document then throw an exception
                if (!iframe.doc) {
                    AdLogger.logError("IAB iFrame failed creation, container must be inserted into DOM before creating the iFrame");
                    return $.Deferred().reject();
                }

                // Create the script inside the iframe's document which will call the
                iframe.doc.open();
                iframe.doc.write('<!doctype html><head><script>window.template = ' + JSON.stringify(data) + ';</script></head></head><body><script src="' + data.thirdPartyScript + '"></script></body></html>');
                this.$markup = $(iframe);
                return $.Deferred(function(defer){
                    _.defer(function(){
                        defer.resolve();
                    });
                }).promise();
            },

            onResize: function(){
                // IAB ads don't change size, so ignore this event, trust the css will keep us positioned correctly
            },

            onStopToClose: function() {
                // IAB ads don't yet have a way to say stop running
            }
        });

        /**
         * Return view class.
         */
        return IABView;
    }
);
