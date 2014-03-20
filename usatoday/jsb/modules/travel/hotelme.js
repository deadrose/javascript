/**
 * @fileoverview Hotelme view module.
 * @author rmendez@gannett.com (Rotty Mendez)
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'state',
    'pubsub',
    'baseview'
],
function(
    $,
    _,
    Backbone,
    StateManager,
    PubSub,
    BaseView
) {
        /**
         * View class.
         */
        var hotelmeView = BaseView.extend({

            /**
             * Initialize view.
             * @param {object} options to pass in modules options
             */
            initialize: function(options) { 
                StateManager.fetchHtml('/travel/hotelme/').done(_.bind(function(html){
                    this.$el.html(html);
                }, this));

                BaseView.prototype.initialize.call(this, options);
            }

        });

        /**
         * Return view class.
         */
        return hotelmeView;
    }
);

