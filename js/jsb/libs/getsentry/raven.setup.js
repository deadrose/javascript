define(['raven'], function(Raven){
    var sentry = window.site_config.SENTRY;
    if (sentry && sentry.CHANCE && sentry.DSN) {
        Raven.config(sentry.DSN).install();
        // replace onerror handler with our own sampler to avoid us blowing out our error allocation count
        var ravenErrorHandler = window.onerror;
        window.onerror = function () {
            if (window.site_config.SENTRY.CHANCE > Math.random()) {
                ravenErrorHandler.apply(window, arguments);
            }
        };
    }
    return Raven;
});
