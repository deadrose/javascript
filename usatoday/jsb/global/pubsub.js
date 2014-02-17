define(['underscore', 'backbone'],
    function(_, Backbone) {
        "use strict";
        /**
         * Global PubSub ("event aggregator") object.
         * Extend Backbone.Events to a global object used for PubSub.
         * @author Erik Kallevig <ekallevig@gannett.com>
         * @exports pubsub
         */
        var PubSub = _.extend({}, Backbone.Events);

        PubSub.attach = function(events, context) {
            _.each(events, _.bind(function(callback, eventName){
                this.on(eventName, callback, context);
            }, this));
        };

        PubSub.unattach = function(events, context) {
            _.each(events, _.bind(function(callback, eventName){
                this.off(eventName, callback, context);
            }, this));
        };

        var origTrigger = PubSub.trigger;
        PubSub.trigger = function(events){
            try{
                origTrigger.apply(PubSub, arguments);
            }catch(ex){
                console.error('PubSub trigger "' + events + '" threw exception: ',
                    (ex.stack || ex.stacktrace || ex.message));
            }
            return PubSub;
        };

        return PubSub;
    }
);
