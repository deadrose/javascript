/**
 * @fileoverview Functions that create popups from utility bar that
 * can't be hidden behind async operations -- must be a direct result
 * of click event to avoid popup blocking.
 * @author Erik Kallevig <ekallevig@gannett.com>
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'pubsub'
],
function(
    $,
    _,
    Backbone,
    PubSub
) {


    /**
     * View class.
     */
    var UtilityBarModulePopups = Backbone.View.extend({

    });

    /**
     * Return view class.
     */
    return new UtilityBarModulePopups();
});
