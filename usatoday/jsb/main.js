/**
 * @fileoverview Bootstrap file for USAToday.com.
 * @author ekallevig@gannett.com (Erik Kallevig)
 */

require(['framework-config'], function(frameworkConfig){
    require.config(frameworkConfig);

    /**
     * Kick off the site.
     */
    require([
        'site-manager',
        'state',
        'modules/global/header',
        'third-party-apis/facebook/facebook',
        'third-party-apis/google/google',
        'user-accounts/facebook-user-account',
        'user-accounts/googleplus-user-account',
        'raven.setup',
        'analytics/settealium'
    ],
    function(SiteManager, StateManager, Header) {
        SiteManager.start(!window.chromeless && Header, StateManager);
    });
});
