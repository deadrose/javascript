/**
 * @fileoverview Super Hero module.
 * @author jlcross@gannett.com (Jon Cross)
 */
define([
        'jquery',
        'underscore',
        'baseview',
        'state',
        'utils'
    ],
    function(
        $,
        _,
        BaseView,
        StateManager,
        Utils
    ) {
        /**
         * View class for the super hero module.
         */
        var SuperHeroModule = BaseView.extend({

            // View element.
            el: '.super-hero-module-wrapper',

            // Events.
            events: {
                'click .super-hero' : 'open'
            },

            /**
             * Open asset linked in super hero module.
             * @param {Event} event View click event.
             */
            open: function(event) {
                if ($(event.target).prop('tagName').toLowerCase() != 'a') {
                    var $currentTarget = $(event.currentTarget);
                    Utils.triggerRoute($currentTarget.find('.hero-story > h1 > a'));
                }
            }
        });

        /**
         * Return view class.
         */
        return SuperHeroModule;
    }
);
