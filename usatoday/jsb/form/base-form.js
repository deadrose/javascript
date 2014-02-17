define([
    'jquery',
    'underscore',
    'baseview',
    'form/input-field',
    'form/autocomplete',
    'form/dropdown',
    'form/checkbox',
    'form/radio-button',
    'form/datepicker'
],
    function(
        $,
        _,
        BaseView,
        InputField,
        AutoComplete,
        SelectDropdown,
        CheckBox,
        RadioButton,
        DatePicker
        ) {
        "use strict";
        var FormView = BaseView.extend(
        /**
         * @lends form/base-form.prototype
         */
        {

            events: {
                'submit':'onFormSubmit'
            },
            /**
             * This callback is called on any error from the auto complete
             * @callback form/base-form~onSubmit
             * @param {Array} formElements - jQuery's serializeArray() of form values with required property added if the form element is a required field
             * @param {Event} formEvent - the form's submit Event object
             */
            /**
             * @classdesc Generic forms view for common site-wide form element handling. This will automatically
             * detect form elements and style them using the form widgets
             * @author Mark Kennedy <mdkennedy@gannett.com>
             * @constructs form/base-form
             * @see form/input-field
             * @see form/autocomplete
             * @see form/dropdown
             * @see form/checkbox
             * @see form/radio-button
             * @see form/datepicker
             * @param {Object} options - backbone options object
             *     @param {jQuery|Element|String} options.el - element or string selector to attach to
             *     @param {form/base-form~onSubmit} [options.onSubmit] - callback function that is fired when the form is submitted
             *     @param {Object} [options.formOptions] - custom options
             */
            initialize: function(options) {
                options = $.extend({
                    formOptions: null
                }, options);

                this.formNameMap = {};

                BaseView.prototype.initialize.call(this, options);

                this.$formItems = this.$('.ui-text-input, .ui-textarea, .ui-dropdown, .ui-radio, .ui-checkbox, .ui-date-picker');
                this.$formItems.each(_.bind(function(index, el) {
                    var $el = $(el),
                        options;
                    if (this.options.formOptions) {
                        options = this._getCustomOptions($el, this.options.formOptions);
                    }
                    if (($el.hasClass('ui-text-input') || $el.hasClass('ui-textarea')) && !$el.hasClass('ui-date-picker')) {
                        if ($el.data('autocomplete-url') || $el.hasClass('ui-autocomplete')){
                            // autocomplete field!
                            this._setupView($el, AutoComplete, index, options);
                        } else {
                            // input field (non-autocomplete)!
                            this._setupView($el, InputField, index, options);
                        }
                    } else if ($el.hasClass('ui-dropdown')) {
                        // dropdown!
                        this._setupView($el, SelectDropdown, index, options);

                    } else if ($el.hasClass('ui-radio')) {
                        // radio button!
                        this._setupView($el, RadioButton, index, options);

                    } else if ($el.hasClass('ui-checkbox')) {
                        // checkbox!
                        this._setupView($el, CheckBox, index, options);

                    } else if ($el.hasClass('ui-date-picker')) {
                        // date picker!
                        this._setupView($el, DatePicker, index, options);

                    }
                },this));

                this._setupRequiredFields();

            },

            /**
             * Checks and returns whether form element has custom options
             * @param {jQuery} $el Element used to determine a match
             * @param {Object|Array} options Options to match el against
             * @private
             */
            _getCustomOptions: function($el, options){
                // backwards compatibility, original form options was an object
                if (!$.isArray(options)) {
                    options = [options];
                }
                return _.filter(options, function(obj){
                    if ($el[0] === $(obj.el)[0]) {
                        // it's a match!
                        return true;
                    } else {
                        return false;
                    }
                })[0];
            },

            /**
             * Sets up required items in the form.
             * @private
             */
            _setupRequiredFields: function(){
                _.each(this.subviews, function(view){
                    if (view.isRequired()) {
                        view.getUIElement().addClass('ui-form-field-required');
                    }
                });
            },

            /**
             * Retrieves form element objects by their form name attribute
             * @param {String} name The name attribute of the form element
             * @returns {Array} Returns an array of matching UI elements
             */
            getFormObjectsByName: function(name){
                return this.formNameMap[name];
            },

            /**
             * Instantiates views
             * @param {jQuery} $el Jquery object el
             * @param {Object} View Backbone view to instantiate
             * @param {Number} index Subview index
             * @param {Object} options Options to use when instantiating
             * @private
             */
            _setupView: function($el, View, index, options){
                if (!options) {options = {el: $el };}
                var subviewId = 'formItem' + index,
                    name = $el.attr('name');
                // instantiate view
                this.subviews[subviewId] = new View(options);
                // add view to form name mapping
                if (this.formNameMap[name]) {
                    this.formNameMap[name].push(this.subviews[subviewId]);
                } else {
                    this.formNameMap[name] = [this.subviews[subviewId]];
                }
            },

            /**
             * Processes placeholders
             * @param {Array} items Array of Jquery objects to process
             * @private
             */
            _handlePlaceholders: function(items){
                var resetMap = [];
                // Let's temporarily remove placeholders so they don't get submitted with form
                $.each(items, function(index, el){
                    var field = $(el),
                        value = field.val();
                    if (value === field.attr('placeholder')) {
                        resetMap.push({field: field, value: value});
                        field.val('');
                    }
                });
                // after the submit is done, restore the original placeholder values
                _.defer(function(){
                    _.each(resetMap, function(itm){
                        itm.field.val(itm.value);
                    });
                });
            },

            /**
             * When form is submitted.
             */
            onFormSubmit: function(e) {
                if (!Modernizr.input.placeholder) {
                    var itemsWithPlaceholders = this.$('[placeholder*=""]');
                    if (itemsWithPlaceholders) {
                        this._handlePlaceholders(itemsWithPlaceholders);
                    }
                }
            },

            /**
             * Resets all form elements.
             * @deprecated since version 0.14.0
             */
            resetForm: function() {
                this.reset();
            },

            /**
             * Resets all form elements.
             */
            reset: function() {
                this.triggerEvent('reset');
            }

        });

        /**
         * Return view class.
         */
        return FormView;
    }
);