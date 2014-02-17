/**
 * @fileoverview 404 / 500 view.
 * @author Robert Huhn
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'state',
    'pubsub',
    'apps/simple-overlay'
],
function(
    $,
    _,
    Backbone,
    StateManager,
    PubSub,
    SimpleOverlay
) {

    /**
     * View class.
     */
    var ErrorView = SimpleOverlay.extend({

        initialize: function(options) {
            // call base class initialize
            SimpleOverlay.prototype.initialize.call(this, options);

            if (this.options.ajax){
                // we're not a state managed object
                this.render(this.options.htmlFrag);
                StateManager.registerFullScreenView(this);
                this.afterPageReveal();
            }
        },

        /**
         * Close overlay.
         */
        close: function(e) {
            if (e && e.target !== e.currentTarget){
                // trap clicks inside the transition wrap to prevent them from closing the overlay
                return;
            }
            if (this.options.ajax){
                StateManager.clearFullScreenView(this);
                this.destroy(true);
            }else{
                StateManager.navigateToPreloadedUrl();
            }
            return false;
        }
    });
    return ErrorView;

});
