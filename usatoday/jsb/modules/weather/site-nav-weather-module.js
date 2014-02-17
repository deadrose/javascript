/**
 * @fileoverview Weather dropdown module (in the top nav).
 * @author erik.kallevig@f-i.com (Erik Kallevig)
 */
 
define([
    'jquery',
    'underscore',
    'baseview',
    'pubsub',
    'utils',
    'state',
    'modules/weather/weather-dropdown'
],
function(
    $,
    _,
    BaseView,
    PubSub,
    Utils,
    StateManager,
    WeatherDropdown
) {
    'use strict';

    /**
     * View class.
     */
    var WeatherDropdownNavModule = BaseView.extend({

        events: {
            'mouseenter': 'onHoverWeatherNav',
            'mouseleave': 'onHoverWeatherNav',
            'click .site-nav-weather-link': 'onClickWeatherNav'
        },

        initialize: function() {
            BaseView.prototype.initialize.apply(this);

            // Initialize weather header dropdown functionality
            this.subviews.weatherDropdown = new WeatherDropdown();
        },

        /**
         * Hover handler for weather nav button.
         * @param {Event} e Hover event.
         */
        onHoverWeatherNav: function(e) {
            var $navAltSpan = this.$('.site-nav-alt-span');
            clearTimeout(this.navBtnHoverDelay);
            if ($navAltSpan.hasClass('site-nav-visible-alt-span')) {
                if (e.type === 'mouseenter'){
                    $navAltSpan.addClass('site-nav-active-alt-span');
                    this.navBtnHoverDelay = _.delay(_.bind(this.subviews.weatherDropdown.openDropdown, this.subviews.weatherDropdown), this.hoverDropdownDelay);
                } else {
                    $navAltSpan.removeClass('site-nav-active-alt-span');
                    this.navBtnHoverDelay = _.delay(_.bind(this.subviews.weatherDropdown.closeDropdown, this.subviews.weatherDropdown), this.hoverDropdownDelay);
                }
            }

        },

        /**
         * Click handler for weather nav button.
         * @param {Event} e Click event.
         */
        onClickWeatherNav: function(e) {
            this.subviews.weatherDropdown.closeDropdown();
        }

    });

    return WeatherDropdownNavModule;

});
