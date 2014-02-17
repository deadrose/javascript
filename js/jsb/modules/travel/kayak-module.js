/**
 * @fileoverview Kayak view module.
 * @author mbriede@gannett.com (Matthew Briede), groots@gannett.com (George Roots), bminton@gannett.com (Brandon Minton)
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'pubsub',
    'form/base-form'
],
    function(
        $,
        _,
        BaseView,
        StateManager,
        PubSub,
        FormView
        ) {
        "use strict";
        /**
         * View class.
         */

        var KayakView = BaseView.extend({

            // View element.
            el: '.kayak-wrapper',

            // Events.
            events: {
                'click .kayak-btn': 'kayakWidgetBtnClick',
                'click .flight-select-radio-btn': 'onFlightRadioButtonClick',
                'clock .kayak-submit' : 'onKayakSubmitClick'
            },

            /**
             * Initialize view.
             * @param {Object} options
             */
            initialize: function(options) {
                _.bindAll(this, 'kayakWidgetBtnClick', 'tabTransition', 'onHotelAutoCompleteSelect', 'datePickerBeforeShow', 'datePickerBeforeShowDay');

                BaseView.prototype.initialize.call(this, options);

                // caching selectors
                this.$kayakHotelId = this.$('#kayak-hotel-id');

                this._setupDropdownDates();
                this._setupForms();

                // cache height of tabs to use for animations
                this.tabAnimHeights = this._getTabHeights(this.$('.kayak-tab'));

                // transition to first tab
                this.$activeTab = this.$('.kayak-btn.active');
                this.tabTransition(this.$('.kayak-btn.active').data('type'), true);

                this.$('form').submit(function() {
                    PubSub.trigger('uotrack','kayaksearch');
                });
            },

            /**
             * When a autocomplete option is selected from Hotel field
             * @param {String} selectedValue The value that is selected
             * @param {Object} selectedData The data that is selected
             */
            onHotelAutoCompleteSelect: function(selectedValue, selectedData){
                if (selectedData.hid) {
                    this.$kayakHotelId.val(selectedData.hid);
                } else {
                    this.$kayakHotelId.val('');
                }
            },

            /**
             * Grabs tab height
             * @param {String} tabId Identifier
             */
            getTabHeight: function(tabId) {
                return this.tabAnimHeights[tabId];
            },

            /**
             * Sets new tab height
             * @param {String} tabId Identifier
             * @param {String} height Height
             */
            setTabHeight: function(tabId, height) {
                this.tabAnimHeights[tabId] = height;
            },

            /**
             * When a kayak button is clicked
             * @param {Event} e Click event
             */
            kayakWidgetBtnClick: function(e) {
                var $clickedBtn = $(e.currentTarget),
                    clickedId = $clickedBtn.data('type'),
                    heatTrackType = 'kayak' + clickedId;
                PubSub.trigger('heattrack', heatTrackType);
                this.tabTransition(clickedId, false);
            },

            /**
             * Transitions to show a new tab
             * @param {String} id identifier i.e. "hotels", 'vacations'
             * @param {Boolean} isInitialLoad Is this initial load?
             */
            tabTransition: function(id, isInitialLoad) {
                var $newActiveTab = this.$('.kayak-tab-' + id),
                    $oldActiveTab = this.$activeTab,
                    activeTabClass = 'kayak-tab-active',
                    newTabHeight = this.getTabHeight(id);

                // do not execute if the new tab is the same as the current one
                if($oldActiveTab && $newActiveTab[0] === $oldActiveTab[0]) {
                    return;
                }

                if ($oldActiveTab) {
                    $oldActiveTab.removeClass(activeTabClass);
                }

                this.animTabWrapperHeight(newTabHeight).done(_.bind(function(){
                    this.makeButtonActive(id);
                    $newActiveTab.fadeIn(250, _.bind(function(){
                        $newActiveTab.addClass(activeTabClass);
                        this.$activeTab = $newActiveTab;
                    }, this));
                }, this));
            },

            /**
             * Animates tab wrapper height
             * @param {Number} height Height (in pixels)
             * @returns {*}
             */
            animTabWrapperHeight: function(height){
                return this.animate(
                    this.$('.kayak-search-widget').stop(),'height', height + 'px', 150, 'linear', 0
                );
            },

            /**
             * Adds active state to a kayak button
             * @param {String} id Identifier
             */
            makeButtonActive: function(id){
                var activeBtnClass = 'active',
                    $button = this.$('.kayak-' + id + '-btn');
                if ($button) {
                    if (this.$activeBtn) {
                        this.$activeBtn.removeClass(activeBtnClass);
                    }
                    $button.addClass(activeBtnClass);
                    this.$activeBtn = $button;
                }
            },

            /**
             * When one of the flight radio buttons is clicked.
             * @param {Event} e
             */
            onFlightRadioButtonClick: function(e){
                this.switchView($(e.currentTarget).val());
            },

            /**
             * Switches tab views.
             * @param {String} id Tab view lookup identifier
             */
            switchView: function(id) {
                var view = this.$('.flights-' + id + '-container'),
                    activeClass = 'kayak-flight-view-active',
                    viewHeight = view[0].scrollHeight;

                this.$('.kayak-flight-view').removeClass(activeClass);

                this.animTabWrapperHeight(viewHeight).done(_.bind(function(){
                    view.fadeIn(250).addClass(activeClass);
                    // update tab's height
                    this.setTabHeight('flights', viewHeight);
                },this));
            },

            /**
             * Sets up all kayak forms
             * @private
             */
            _setupForms: function(){
                var formOptions = [];

                this.$('.kayak-tab-hotels .kayak-auto, .kayak-tab-deals .kayak-auto').each(_.bind(function(index, el){
                    formOptions.push({
                        el: $(el),
                        resultDisplayTemplate: '<%= displayname %>',
                        resultValueTemplate: '<%= displayname %>',
                        maxResults: 5,
                        onSelect: this.onHotelAutoCompleteSelect,
                        ajaxOptions: {dataType: 'jsonp'}
                    });
                }, this));

                this.$('.kayak-tab-flights .kayak-auto').each(function(){
                    formOptions.push({
                        el: $(this),
                        resultDisplayTemplate: '<%= displayname %>',
                        resultValueTemplate: '<%= ap %>',
                        maxResults: 5,
                        ajaxOptions: {dataType: 'jsonp'}
                    });
                });

                this.$('.kayak-tab-vacations .kayak-auto').each(function(){
                    formOptions.push({
                        el: $(this),
                        resultDisplayTemplate: '<%= displayname %>',
                        resultValueTemplate: '<%= displayname %>',
                        maxResults: 5,
                        ajaxOptions: {dataType: 'jsonp'}
                    });
                });

                this.$('.ui-date-picker').each(_.bind(function(index, el){
                    var $el = $(el),
                        button = $el.parent().find('.ui-date-picker-btn');
                    formOptions.push({
                        el: $el,
                        buttonSelector: button,
                        calendarPanelClass: 'ui-light',
                        changeMonth: true,
                        changeYear: true,
                        minDate:null,
                        maxDate:null,
                        showOtherMonths: true,
                        selectOtherMonths: true,
                        showMonthAfterYear: true,
                        dateFormat: 'm/d/yy',
                        dayNamesMin: ['S','M','T','W','T','F','S'],
                        beforeShow: this.datePickerBeforeShow($(el)),
                        beforeShowDay: null
                    });
                }, this));

                this.$('.kayak-form').each(_.bind(function(idx, el){
                    this.subviews['form' + idx] = new FormView({
                        el: $(el),
                        formOptions: formOptions
                    });
                }, this));

                // create default date for fields using Date Picker
                var myDate = new Date();
                var massagedDate =(myDate.getMonth()+1) + '/' + myDate.getDate() + '/' + myDate.getFullYear();
                this.$('.kayak-date-picker-field').val(massagedDate);
            },

            /**
             * Called before the datepicker is shown.
             * @param {Element} input Datepicker input field.
             * @param {Object} inst Datepicker instance object.
             */
            datePickerBeforeShow: function (input) {
                input.find($('.ui-date-picker-btn')).addClass('kayak-date-picker-flyout');
                input.find($('.ui-date-picker-btn')).addClass('ui-light');
            },

            /**
             * Called before particular days are shown.
             * @param {Date} date Particular day's date.
             */
            datePickerBeforeShowDay: function (date) {
                var day = date.getDay();
                return [(day !== 0), ''];
            },

            /**
             * Sets up dates for dropdown
             */
            _setupDropdownDates: function(){
                var num = 10;
                var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                var curMonth = new Date().getMonth();
                var curYear = new Date().getFullYear();
                var len = monthNames.length;
                var startMonth = curMonth;
                var endMonth = num + startMonth;
                var remainder = endMonth - len;
                var addYears = function (arr, yr) {
                    var i = 0;
                    var startNum = arr.length;
                    while (startNum--) {
                        arr[i] += " " + yr;
                        i++;
                    }
                };
                var getYears = function(e){
                    var yr = e.substr(e.indexOf(' ')+1);
                    return yr;
                };
                var monthArr = [].concat(monthNames.slice(startMonth, endMonth));
                addYears(monthArr, curYear); // appends the year to the month array
                if (remainder > 0) {  // push the remaining months to the month array
                    var remaining = monthNames.slice(0, remainder);
                    addYears(remaining,curYear+1);  // and add the next year to them
                    monthArr.push.apply(monthArr, remaining);
                }
                for(var i=0; i<num; i++){
                    var theyear = getYears(monthArr[i]);
                    var themonth = curMonth+i+1;
                    if (themonth > 12){themonth-=12;}
                    this.$('#kayakCruiseDateDropdown').append('<option value="'+themonth+'/1/'+theyear+'">'+monthArr[i]+'</option>');
                    themonth = curMonth+i+1;
                }
            },

            /**
             * Sets all initial tab heights to prepare for height-animations
             * @param {Array} tabs Array of JQuery objects
             * @returns {{}}
             * @private
             */
            _getTabHeights: function(tabs){
                var heights = {};
                _.each(tabs, function(el){
                    var item = $(el),
                        tabId = item.data('tab-id');
                    heights[tabId] = item[0].scrollHeight;
                    if (tabId === 'flights') {
                        // find accurate height of flight tab from checked radio button
                        var id = this.$('.flight-select-radio-btn:checked').val();
                        var view = this.$('.flights-' + id + '-container');
                        heights.flights = view[0].scrollHeight;
                    }
                }, this);
                return heights;
            }
        });

        /**
         * Return view class.
         */
        return KayakView;
    }
);