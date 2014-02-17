/**
 * @fileoverview Firefly flyout.
 * @author Erik Kallevig <ekallevig@gannett.com>
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'pubsub',
    'third-party-apis/firefly/firefly',
    'modules/stories/utility-bar-flyout'
],
function(
    $,
    _,
    Backbone,
    PubSub,
    Firefly,
    UtilityBarFlyout
) {

    "use strict";
    /**
     * View class.
     */
    var UtilityBarModuleFirefly = UtilityBarFlyout.extend({

        messaging: {
            'first': 'Enjoy a limited number of articles over the next 30 days',
            'last': 'This is your last article!',
            'tweener': ' articles left',
            'tweener_singular': ' article left'
        },
        gps_tracking: {
            'first': 'CPPWFIRST',
            'last': 'CPPWSUBFIN',
            'tweener': 'CPPWSUB30',
            'tweener_singular': 'CPPWSUB1L'            
        },

        /**
         * Initialize view.
         */
        initialize: function(options) {
            options = $.extend({
                noFlyoutScroll: true
            }, options);
            this.events = _.extend({},UtilityBarFlyout.prototype.events,this.events);
            this.$title = this.$('.util-bar-flyout-firefly-title');
            this.$subBtn = this.$('.util-bar-flyout-firefly-subscribe-btn');
            UtilityBarFlyout.prototype.initialize.call(this, options);
        },

        setTitle: function(title, large) {
            this.$title.text(title);
            if (large) {
                this.$title.addClass('util-bar-flyout-firefly-title-large');
            } else {
                this.$title.removeClass('util-bar-flyout-firefly-title-large');
            }
        },

        setGPS: function(source) {
            var gpsURL = this.$subBtn.attr('href');

            gpsURL = gpsURL.replace(/(gps-source)=.*/, '$1=' + source);

            this.$subBtn.attr('href', gpsURL);
        },

        open: function() {
            PubSub.trigger('uotrack', 'UtilityBarFireflyOpen');

            // View count messaging logic.
            var viewsCookie = Firefly.getFireflyViewsCookie();
            if (viewsCookie) {
                if (viewsCookie.viewCount === 1) {
                    this.setTitle(this.messaging.first);
                    this.setGPS(this.gps_tracking.first);
                } else if (viewsCookie.viewsRemaining === 0) {
                    this.setTitle(this.messaging.last);
                    this.setGPS(this.gps_tracking.last);
                } else {
                    var tweenerMsg = viewsCookie.viewsRemaining > 1 ? this.messaging.tweener : this.messaging.tweener_singular;
                    var tweenerGPS = viewsCookie.viewsRemaining > 1 ? this.gps_tracking.tweener : this.gps_tracking.tweener_singular;
                    this.setTitle(viewsCookie.viewsRemaining + tweenerMsg, true);
                    this.setGPS(tweenerGPS);
                }
            }

            UtilityBarFlyout.prototype.open.call(this);
        },

        close: function() {
            PubSub.trigger('uotrack', 'UtilityBarFireflyClose');
            this.destroy();
        }

    });

    /**
     * Return view class.
     */
    return UtilityBarModuleFirefly;
});
