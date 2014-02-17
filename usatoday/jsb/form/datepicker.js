define([
    'jquery',
    'underscore',
    'form/base-form-element',
    'utils',
    'datepicker'
],
function(
    $,
    _,
    BaseFormElement,
    Utils
) {
    "use strict";
    var DatePicker = BaseFormElement.extend(
    /**
     * @lends form/datepicker.prototype
     */
    {
        el: '.ui-date-picker',

        /**
         * This callback is called when a checkbox is clicked
         * @callback form/datepicker~onSelect
         * @param {String} dateText Date string
         * @param {jQuery} $datepicker Datepicker instance
         */
        /**
         * @classdesc Manages ui-kit datepicker (skinned jqueryui datepicker).
         * @author Mark Kennedy <mdkennedy@gannett.com>
         * @constructs form/datepicker
         * @param {Object} options backbone options object
         *     @param {jQuery|Element|String} options.el - element or string selector to attach to
         *     @param {form/datepicker~onSelect} [options.onSelect] - callback when a date is selected
         *     @param {String} [options.calendarPanelClass=ui-light] - class to put on the calendar panel
         *     @param {String} [options.urlPath=<data-url-path>] - underscore template for a url to navigate to on selecting a date
         */
        initialize: function(options) {

            _.bindAll(this, 'show', 'hide', 'onButtonClick', 'onCalendarDateSelect', 'setDate');

            // re-assign onSelect--we're hijacking it to ensure all onSelect callbacks are done here first!
            if (options.onSelect) {
                options.customOnSelect = options.onSelect;
            }
            options.onSelect = this.onCalendarDateSelect;

            //setup date picker
            this._setupDatePicker(this.$el, options);

            options = $.extend({
                calendarPanelClass: 'ui-light',
                urlPath: this.$el.data('url-path')
            }, options);

            if (options.buttonSelector) {
                this.button = this._setupButton(options.buttonSelector);
            }

            // cache
            this.body = Utils.get('body');
            this.calendarPanel = this.body.find('#ui-datepicker-div');

            // apply calendar panel class
            this.calendarPanel.addClass(options.calendarPanelClass + ' ui-date-picker-calendar-panel');

            BaseFormElement.prototype.initialize.call(this, options);
        },

        /**
         * When a date on the calendar panel is selected.
         * @param {String} dateText Date string
         * @param {jQuery} $datepicker Datepicker instance
         */
        onCalendarDateSelect: function(dateText, $datepicker){
            var path = this.options.urlPath,
                selectedDate = new Date($datepicker.selectedYear,  $datepicker.selectedMonth, $datepicker.selectedDay);
            if (path) {
                // checks if supplied url contains an underscore template
                if (path.indexOf("<%=") !== -1) {
                    // url contains an underscore template!
                    var vars = path.split('<%=');
                    vars.shift(); // get rid of first item in array since we dont need it
                    var template_data = {};
                    // using a for loop because its faster than jquery--don't try this at home
                    for (var i = 0; i < vars.length; i++) {
                        var dateFormat = vars[i].match('[a-zA-Z]+')[0];
                        template_data[dateFormat] = $.datepicker.formatDate(dateFormat, selectedDate);
                    }
                    path =  _.template(path, template_data);
                }
                Utils.triggerRoute(path);
            }

            if (this.options.customOnSelect) {
                this.options.customOnSelect(dateText, $datepicker);
            }
        },

        /**
         * Sets the date of the datepicker
         * @param {Date} date
         * @param {String} format
         */
        setDate: function(date, format) {
            if (format) {
                date = $.datepicker.formatDate(format, date);
            } else {
                date = $.datepicker.formatDate(this.options.dateFormat, date);
            }
            this.$el.datepicker('setDate', date);
        },

        /**
         * Show datepicker panel.
         */
        show: function() {
            this.$el.datepicker('show');
        },

        /**
         * Hide datepicker panel.
         */
        hide: function() {
            this.$el.datepicker('hide');
        },

        /**
         * Initializes datepicker
         * @param {jQuery} $el
         * @param {Object} options Datepicker options
         * @private
         */
        _setupDatePicker: function($el, options){
            // init JQuery UI's datepicker
            $el.datepicker(options);
        },

        /**
         * Sets up button
         * @param {jQuery|String} button
         * @private
         */
        _setupButton: function(button){
            var $button = $(button);
            $button.on('click.'+ this.cid, _.bind(function(){
                this.onButtonClick();
            }, this));
            return $button;
        },

        /**
         * When datepicker button is clicked.
         */
        onButtonClick: function() {
            this.show();
            if (this.options.onButtonClick) {
                this.options.onButtonClick(this.button, this.$el);
            }
        },

         /**
          * Gets element type.
          * @returns {String}
          */
         getType: function(){
             return "datepicker";
         },

        /**
         * Destroy override.
         */
        destroy: function() {

            if (this.button) {
                this.button.off('.' + this.cid);
            }

            // destroy datepicker using its own method.
            this.$el.datepicker('destroy');

            BaseFormElement.prototype.destroy.apply(this, arguments);
        }

    });

    return DatePicker;
});