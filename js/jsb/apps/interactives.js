/**
 * @fileoverview Application class for stand-alone interactive assets.
 * @author jlcross@gannett.com (Jon Cross)
 */
define([
    'jquery',
    'underscore',
    'base-app'
],
    function(
        $,
        _,
        BaseApp
    ) {

        /**
         * View class.
         */
        var InteractivesApp = BaseApp.extend({

            trackPageLoad: function(pageInfo) {
                // When the interactive is framed, pause the Omniture reporting.
                 if (window.top === window) {
                    BaseApp.prototype.trackPageLoad(pageInfo);
                 }
            }
        });

        /**
         * Return view class.
         */
        return InteractivesApp;
    }
);
