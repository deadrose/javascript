/**
 * @fileoverview Print view.
 * @author Jonathan Hensley <jhensley@gannett.com>
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'pubsub',
    'baseview'
],
function(
    $,
    _,
    Backbone,
    PubSub,
    BaseView
) {


    /**
     * View class.
     */
    var UtilityBarModulePrint = BaseView.extend({

        /**
         * Initialize view.
         */
        initialize: function(options) {
            BaseView.prototype.initialize.call(this, options);
        },

        open: function() {
            PubSub.trigger('uotrack', 'UtilityBarPrint');
            window.print();
            this.destroy();
        },

        close: function() {
            this.destroy();
        },

        /**
         * Clean up view.
         * Removes event handlers and element (optionally).
         * @param {boolean} removeEl option to also remove View from DOM.
         */
        destroy: function(removeEl) {
            BaseView.prototype.destroy.call(this, removeEl);
            if (this.options.onDestroy) this.options.onDestroy(this);
        }
    });

    /**
     * Return view class.
     */
    return UtilityBarModulePrint;
});
