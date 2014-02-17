
define('framework-config',[], function(){
    return {
        "paths": {
            "jquery": "libs/jquery/jquery-2.0.3", //"libs/jquery/jquery.require",
            "jquery_modern": "libs/jquery/jquery-2.0.3",
            "jquery_legacy": "libs/jquery/jquery-1.10.2",
            "jqueryui": "libs/jquery/plugins/jquery-ui-1.10.2.custom.min",
            "underscore": "libs/underscore/underscore",
            "backbone": "libs/backbone/backbone-dev",
            "utils": "global/utils",
            "baseview": "global/base-view",
            "base-app": "apps/base-app",
            "pubsub": "global/pubsub",
            "site-manager": "managers/sitemanager",
            "state": "managers/statemanager",
            "user-manager": "managers/usermanager",
            "raven": "libs/getsentry/raven",
            "raven.setup": "libs/getsentry/raven.setup",
            "cookie": "libs/jquery/plugins/jquery.cookie",
            "easing": "libs/jquery/plugins/jquery.easing.1.3",
            "animatecolors": "libs/jquery/plugins/jquery.animate-colors-min",
            "mousewheel": "libs/jquery/plugins/jquery.mousewheel.min",
            "uiPageTurn": "libs/jquery/plugins/jquery.ui-page-turn",
            "uiFlip": "libs/jquery/plugins/jquery.ui-flip",
            "transformSupport": "libs/jquery/plugins/jquery.transformSupport",
            "facebook": "auth/facebook",
            "googleplus": "auth/googleplus",
            "user-auth": "auth/user-auth",
            "datepicker": "libs/jquery/plugins/jquery-ui.datepicker",
            "draggable": "libs/jquery/plugins/jquery-ui.draggable.min",
            "touchpunch": "libs/jquery/plugins/jquery-ui.touch-punch.min",
            "admanager": "managers/admanager",
            "sharedAdPosition": "partner/shared-ad-position",
            "meteredAdPosition": "partner/metered-ad-position",
            "indexedAdPosition": "partner/indexed-ad-position",
            "directAdPosition": "partner/direct-ad-position",
            "leaflet": "libs/leaflet/leaflet-0.4.4",
            "base64": "libs/base64/base64",
            "adLogger": "partner/ad-logger"
        },

        "shim": {
            "jquery_modern": ["console.setup"],
            "jquery_legacy": ["console.setup"],
            "raven": ["jquery"],
            "cookie": ["jquery"],
            "easing": ["jquery"],
            "animatecolors": ["jquery"],
            "mousewheel": ["jquery"],
            "touchpunch": ["jquery", "jqueryui"],
            "backbone": ["underscore", "jquery"]
        }
    };
});
