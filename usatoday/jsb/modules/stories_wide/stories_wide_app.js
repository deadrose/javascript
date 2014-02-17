define([
    'jquery',
    'underscore',
    'base-app',
    'site-manager'
],
function(
    $,
    _,
    BaseApp,
    SiteManager
) {
    var Stories_wide_app = BaseApp.extend({

        animateRevealApp: function(fromUrl, toUrl) {
            SiteManager.getHeader().setClosedFixed();
            return BaseApp.prototype.animateRevealApp.apply(this, arguments);
        },

        afterAppRemove: function(fromUrl, toUrl){
            SiteManager.getHeader().restoreDefaultState();
        }

    });
    return Stories_wide_app;
});