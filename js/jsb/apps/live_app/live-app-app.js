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
    var LiveApp = BaseApp.extend({

        activateLoader: function() {
            // scroll to top
            window.scrollTo(0, 0);
            // add loader
            this.$el.addClass('has-live-app-global-loader');
        },

        deactivateLoader: function() {
            // scroll to top
            window.scrollTo(0, 0);
            // remove loader
            this.$el.removeClass('has-live-app-global-loader');
        },

        animateRevealApp: function(fromUrl, toUrl) {
            SiteManager.getHeader().setClosedFixed();
            return BaseApp.prototype.animateRevealApp.apply(this, arguments);
        },

        afterAppRemove: function(fromUrl, toUrl){
            SiteManager.getHeader().restoreDefaultState();
        }

    });
    return LiveApp;
});