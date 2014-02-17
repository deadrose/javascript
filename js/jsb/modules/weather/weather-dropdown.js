
/**
 * @fileoverview Weather panel dropdown in the global navigation.
 * @author mdkennedy@gannett.com (Mark Kennedy)
 *
 */

define([
    'jquery',
    'underscore',
    'backbone',
    'baseview',
    'pubsub',
    'utils',
    'state',
    'form/autocomplete',
    'easing',
    'animatecolors',
    'cookie'
],
    function(
        $,
        _,
        Backbone,
        BaseView,
        PubSub,
        Utils,
        StateManager,
        AutoComplete
        ) {
        "use strict";
        /**
         * View class.
         */
        var WeatherDropdownView = BaseView.extend({

            // View element.
            el: '.weather-nav-dropdown',

            // Events.
            events: {
                'mouseenter': 'onMouseEnter',
                'mouseleave': 'onMouseLeave',
                'click .weather-nav-dropdown-settings-open-btn': 'showSettingsPanel',
                'click .weather-nav-dropdown-settings-close-btn': 'hideSettingsPanel',
                'click .weather-nav-location-cancel-btn': 'hideSettingsPanel',
                'click .weather-nav-location-set-btn': 'onSetButtonClick',
                'submit .weather-nav-location-form': 'onSubmitLocationForm',
                'keydown .weather-nav-location-input':'onKeyDown',
                'focus .weather-nav-location-input' : 'onFocusLocationField',
                'blur .weather-nav-location-input' : 'onBlurLocationField',
                'click .weather-nav-full-forecast-btn': 'onClickFullForecast'
            },

            /**
             * Initialize the view.
             */
            initialize: function(options) {
                _.bindAll(this, 'refreshData', 'onAutoCompleteResultClick');

                this.panels = this.$('.weather-nav-dropdown-panel-wrap');
                this.frontPanel = this.panels.find('.weather-nav-conditions-panel');
                this.frontWeatherLocation = this.frontPanel.find('.weather-nav-location-name');
                this.frontWeatherIcon = this.frontPanel.find('.weather-nav-dropdown-wicon');
                this.settingsPanel = this.panels.find('.weather-nav-settings-panel');
                this.locationField = this.settingsPanel.find('.weather-nav-location-input');
                this.dropdownWiconClassName = this.frontWeatherIcon.attr('class');
                this.transitionDelay = 80;

                this.body = Utils.get('body');
                this.navBtn = this.$el.parent('.weather');
                this.$navLink = this.$el.siblings('a').eq(0);
                this.$navTempSpan = this.$navLink.find('.site-nav-alt-span');
                this.navBtnTemp = this.navBtn.find('.btn-temp');
                this.navBtnClassName = this.navBtnTemp.attr('class');
                this.pubSub = {
                    'weather:newLocation': this._parseData
                };
                BaseView.prototype.initialize.call(this, options);
                this.locationErrorEl = this.$('.weather-nav-location-error');
                if (!$.cookie('weatherLocation')) {
                    this.updateWeatherLocation(window.defaultWeatherLocation);
                } else {
                    this.refreshData();
                }
                // Setup to refresh weather data every 5 minutes.
                this.weatherDataRefresh = setInterval(this.refreshData, 300000);
            },

            /**
             * Click handler for weather dropdown form submit button.
             * @param {Event} e Click event.
             */
            onSetButtonClick: function(e) {
                e.preventDefault();
                this.updateWeatherLocation(this.locationField.val());
            },

            /**
             * When autocomplete result item is clicked.
             */
            onAutoCompleteResultClick: function() {
                this.updateWeatherLocation(this.locationField.val());
            },

            /**
             * Handler for typing.
             * @param {Event} e Event
             */
            onKeyDown: function(e) {
                var keycode = (e.keyCode ? e.keyCode : e.which);
                // enter key
                if (keycode === 13){
                    this.updateWeatherLocation(this.locationField.val());
                }
                this.clearLocationInputError();
            },

            /**
             * Submit handler for weather dropdown form.
             * @param {Event} e Submit event.
             */
            onSubmitLocationForm: function(e) {
                e.preventDefault();
            },

            /**
             * Click handler for full forecast link.
             * @param {Event} e Click event.
             */
            onClickFullForecast: function(e) {
                this.isMouseOnDropdown = false;
                this.closeDropdown();
            },

            onMouseEnter: function() {
                this.isMouseOnDropdown = true;
            },

            onMouseLeave: function(){
                if (!this.locationField.is(':focus')) {
                    this.isMouseOnDropdown = false;
                    this.closeDropdown();
                }
            },

            /**
             * Close weather dropdown.
             */
            closeDropdown: function() {
                if (this.isMouseOnDropdown) {
                    return;
                }
                if (this.isSettingsPanelActive) {
                    this.hideSettingsPanel();
                }
                StateManager.registerAnimation(this.$el.stop().fadeOut(this.transitionDelay, 'swing').promise().done(_.bind(function(){
                    this.$el.removeClass('dropdown-active');
                    this.navBtn.find('.nav-span').removeClass('dropdown-active');

                },this)));
                this.body.off('.'+ this.cid);
            },

            /**
             * Open weather dropdown.
             */
            openDropdown: function() {
                // we need to add class to navbtn
                StateManager.registerAnimation(this.$el.stop().fadeIn(this.transitionDelay, 'swing').promise().done(_.bind(function(){
                    this.$el.addClass('dropdown-active');
                    this.navBtn.find('.nav-span').addClass('dropdown-active');
                },this)));
            },

            /**
             * Show weather settings panel.
             */
            showSettingsPanel: function() {
                if (!this.$el.hasClass('settings-active')) {
                    this.$el.addClass('settings-active');
                    this.isSettingsPanelActive = true;
                }
                if (!this.subviews.autocomplete) {
                    this.subviews.autocomplete = new AutoComplete({
                        el: this.locationField,
                        resultDisplayTemplate: '<%= City %>, <%= State %>',
                        resultValueTemplate: '<%= City %>, <%= State %>',
                        onSelect: this.onAutoCompleteResultClick
                    });
                }
            },

            /**
             * Hide weather settings panel.
             */
            hideSettingsPanel: function() {
                if (this.subviews.autocomplete) {
                    this.subviews.autocomplete.resetInput();
                }
                this.clearLocationInputError();
                this.locationField.blur();
                if (this.$el.hasClass('settings-active')) {
                    this.$el.removeClass('settings-active');
                    this.isSettingsPanelActive = false;
                }

            },

            /**
             * Handles focus of location field.
             */
            onFocusLocationField: function(e) {
                this.locationField.val('');
                //add click event to body for clicks outside of the dropdown div
                this.body.on('click.'+ this.cid, _.bind(function(e){
                    // This is testing if the clicked item's parents do not contain this.el.
                    // We do this because we only want to close the dropdown if you're clicking outside this.el
                    if($(e.target).closest(this.el).length === 0) {
                        this.isMouseOnDropdown = false;
                        this.closeDropdown();
                    }
                },this));
            },

            /**
             * Handles blur of location field.
             */
            onBlurLocationField: function(e) {
                if(this.locationField.val() === '') {
                    this.locationField.val(this.locationField.data('value'));
                }
            },

            /**
             * Set weather cookie.
             * @param {String} location weather location.
             */
            setWeatherCookie: function(location) {
                $.cookie('weatherLocation', location, {path:'/',expires:1825});
            },

            /**
             * Get weather dropdown data.
             * @param {String} location weather location.
             */
            updateWeatherLocation: function(location) {
                if (!location || location === $.cookie('weatherLocation')){
                    return;
                }
                return this._fetchData(location).done(_.bind(function(data){
                    this.hideSettingsPanel();
                    PubSub.trigger('weather:newLocation', data);
                },this)).fail(_.bind(function(errorMsg){
                    this.showLocationInputError(errorMsg);
                },this));
            },

            /**
             * Refresh weather dropdown data.
             */
            refreshData: function() {
                return this._fetchData($.cookie('weatherLocation'));
            },

            /**
             * Fetch weather dropdown data.
             * @param {String} location weather location.
             */
            _fetchData: function(location) {
                if (this.isBusyGettingData || !location) {
                    return $.Deferred().reject();
                }
                location = location.replace(',','');

                this.isBusyGettingData = true;
                return $.Deferred(_.bind(function(defer){
                    StateManager.fetchData('/weather/forecast/json/' + location + '/')
                        .done(_.bind(function(data){
                            if (data.length && data[0]) {
                                this._parseData(data);
                                defer.resolveWith(this, [data]);
                            } else {
                                defer.rejectWith(this,['No data is available for this location.']);
                            }
                            this.isBusyGettingData = false;
                        },this))
                        .fail(_.bind(function(){
                            defer.rejectWith(this,['There was an error finding this location. Please try again later.']);
                            this.isBusyGettingData = false;
                        },this));
                },this));
            },

            /**
             * Shows error message.
             * @param {String} message Error message
             */
            showLocationInputError: function(message) {
                if (this.locationErrorEl.html() !== message) {
                    this.locationErrorEl.addClass('ui-input-field-error-active');
                    this.locationErrorEl.text(message);
                    this.locationErrorEl.stop().slideDown(50, 'easeInOutQuad');
                }
            },

            /**
             * Clears error.
             */
            clearLocationInputError: function(){
                if (this.locationErrorEl.hasClass('ui-input-field-error-active')) {
                    this.locationErrorEl.stop().slideUp(50, 'easeInOutQuad').promise().done(_.bind(function() {
                        this.locationErrorEl.removeClass('ui-input-field-error-active');
                        this.locationErrorEl.empty();
                    },this));
                }
            },

            /**
             * Parse weather dropdown response and append/show/hide.
             * @param {Object} data object which contains weather data.
             */
            _parseData: function(data) {
                if (!data[0].currentconditions){
                    return;
                }
                var result = data[0],
                    currentConditions = result.currentconditions,
                    location = result.local.city + ', ' + result.local.adminArea.code,
                    weatherIconClass = 'wicon-'+currentConditions.weathericon,
                    temp = currentConditions.temperature;

                // loop over the html, looking for data-weather attributes which signifies that weather data goes there
                var $dropAndNav = this.$navTempSpan.add(this.$('[data-weather]'));
                $dropAndNav.each(_.bind(function(idx, item){
                    var $item = $(item);
                    $item.html((currentConditions[$item.data('weather')] || '') + ($item.data('weather-suffix') || ''));
                }, this));

                // add special class for long location names
                if (location.length > 20) {
                    this.frontWeatherLocation.addClass('longname');
                }
                this.frontWeatherLocation.html(location);
                // add special class for temperatures longer than two digits
                if (temp > 99) {
                    this.frontWeatherTemp.addClass('three-digit');
                }
                // clear out previous icon class and add new one
                this.frontWeatherIcon.attr('class',this.dropdownWiconClassName+' '+weatherIconClass);

                this.navBtnTemp.attr('class',this.navBtnClassName+' '+weatherIconClass);
                // this.navBtnTemp.html(temp+this.navBtnTemp.data('weather-suffix'));
                // add class to show dropdown now that we have data
                this.$navTempSpan.addClass('site-nav-visible-alt-span ' + weatherIconClass);
                if ($.cookie('weatherLocation') !== location) {
                    this.setWeatherCookie(location);
                }
                this.locationField.data('value', location).val(location);


            },

            /**
             * Clean up view.
             * Removes event handlers and element (optionally).
             */
            destroy: function(removeEl) {
                this.body.off('.' + this.cid);
                clearInterval(this.weatherDataRefresh);
                BaseView.prototype.destroy.call(this, removeEl);
            }

        });


        /**
         * Return view class.
         */
        return WeatherDropdownView;
    }
);
