
/**
 * @fileoverview Car search modules.
 * @author mdkennedy@gannett.com (Mark Kennedy)
 *
 */

define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'form/base-form',
    'ui/button-toggle'
],
    function(
        $,
        _,
        BaseView,
        StateManager,
        FormView,
        ButtonToggle
        ) {
        "use strict";
        /**
         * View class.
         */
        var CarSearchView = BaseView.extend({

            events: {
                'submit .cars-form-wrap': 'onFormSubmit'
            },

            /**
             * Initialize the view.
             */
            initialize: function(options) {
                BaseView.prototype.initialize.call(this, options);
                _.bindAll(this, 'onNewUsedToggleSelect', 'onMakeDropdownSelect', 'onModelDropdownSelect');

                // cache baseform url for later use
                this.form = this.$('.cars-form-wrap');
                this.baseFormUrl = this.form.attr('action');
                this.form.attr('action', this._buildFormUrl(this.baseFormUrl));

                this.subviews.carSearchForm = new FormView({
                    el: this.form,
                    formOptions: [{
                        el: this.$('.cars-make-dropdown'),
                        onSelect: this.onMakeDropdownSelect
                    },{
                        el: this.$('.cars-model-dropdown'),
                        onSelect: this.onModelDropdownSelect
                    }]
                });
                this.subviews.newUsedButtonToggle = new ButtonToggle({
                    el: this.$('.cars-new-used-toggle'),
                    onSelect: this.onNewUsedToggleSelect
                });
            },

            /**
             * When new/used toggle is selected.
             * @param {jQuery} item selected element
             */
            onNewUsedToggleSelect: function(item){
                var selectedVal = item.data('value'),
                    dropdownDataUrl = '/services/cars/dropdown/' + selectedVal + '/all';

                // populate 'make' and 'model' dropdowns based on new/used selection
                StateManager.fetchData(dropdownDataUrl).done(_.bind(function(html){
                    this.parseDropdown('select_dropdown1', $.parseHTML(html));
                    var modelDropdownResetHtml = this.getDropdownResetHtml('All Models');
                    this.parseDropdown('select_dropdown2', modelDropdownResetHtml);
                },this));

                // Set hidden fields based on selection of new/used
                this.setNewUsedHiddenValues(selectedVal);
                this.form.attr('action', this._buildFormUrl(this.baseFormUrl));
            },

            /**
             * Builds form url (aka 'action' attr)
             * @param {String} baseUrl the base url of the form
             * @returns {*}
             * @private
             */
            _buildFormUrl: function(baseUrl){
                // process a different form url based on new/used selection
                var newUsedToggleValue = this.$('#cars-form-new-used-select').val(),
                    url = baseUrl;
                if (newUsedToggleValue === 'used') {
                    url += 'for-sale/searchresults.action';
                } else {
                    url += 'go/search/newBuyIndex.jsp';
                }
                return url;
            },

            /**
             * Sets new/used hidden fields
             * @param {String} inputVal 'new' or 'used'
             */
            setNewUsedHiddenValues: function(inputVal){
                this.$(".cars-new-used-input").val(inputVal);
                if (inputVal === "used") {
                    this.$("input:hidden[name='stkTyp']").val('U');
                    this.$("input:hidden[name='tracktype']").val('usedcc');
                } else {
                    this.$("input:hidden[name='stkTyp']").val('N');
                    this.$("input:hidden[name='tracktype']").val('newcc');
                }
            },

            /**
             * Creates a string to reset the dropdown to a single option of All Makes/Models
             * @param {String} displayValue
             */
            getDropdownResetHtml: function(displayValue) {
                return '<option class="uotrack" value="All" selected="selected">' + displayValue + '</option>';
            },

            /**
             * When an item from the 'make' dropdown is selected
             * @param {String} selectedDataValue
             * @param {String} selectedDisplayValue
             */
            onMakeDropdownSelect: function(selectedDataValue, selectedDisplayValue){
                var newUsedToggleValue = this.$$('.cars-new-used-input').val(),
                    urlMakeValue,
                    url;
                if (selectedDataValue === 'All') {
                    urlMakeValue = 'All';
                } else {
                    urlMakeValue = selectedDisplayValue;
                }
                if (urlMakeValue === this.currentMakeSelectValue) {
                    return;
                }
                this.currentMakeSelectValue = urlMakeValue;
                
                url = '/services/cars/dropdown/' + newUsedToggleValue + '/' + _.escape(urlMakeValue.toLowerCase());

                // populate 'model' dropdown based on selected value
                StateManager.fetchHtml(url).done(_.bind(function(html){
                    if (selectedDataValue === 'All') {
                        var resetHtml = this.getDropdownResetHtml('All Models');
                        this.parseDropdown('select_dropdown2', resetHtml);
                    } else {
                        this.parseDropdown('select_dropdown2', html);
                    }
                },this));
                this.setMakeHiddenValues(selectedDataValue, selectedDisplayValue);
            },

            /**
             * When an item from the 'model' dropdown is selected
             */
            onModelDropdownSelect: function(selectedDataValue, selectedDisplayValue){
                this.setModelHiddenValues(selectedDataValue, selectedDisplayValue);
            },

            /**
             * Sets hidden values for 'make' selections
             * @param dataValue
             * @param displayValue
             */
            setMakeHiddenValues: function(dataValue, displayValue){
                this.$("input:hidden[name='AmbMkId']").val(dataValue);
                this.$("input:hidden[name='AmbMkNm']").val(displayValue);
                this.$("input:hidden[name='mkId']").val(dataValue);
            },

            /**
             * Sets hidden values for 'model' selections
             * @param dataValue
             * @param displayValue
             */
            setModelHiddenValues: function(dataValue, displayValue){
                this.$("input:hidden[name='AmbMdId']").val(dataValue);
                this.$("input:hidden[name='AmbMdNm']").val(displayValue);
                this.$("input:hidden[name='mdId']").val(dataValue);
            },

            /**
             * Build dropdown elements for selected dropdown/subviewName
             * @param {String} subviewName
             * @param {String} html
             */
            parseDropdown: function(subviewName, html) {
                this.subviews.carSearchForm.subviews[subviewName].refresh(html);
            },

            /**
             * When form is submitted
             * @param e
             */
            onFormSubmit: function(e){
                // if zipcode input field is not filled out or is invalid, alert the user by adding an error class
                var zipCodeInput = this.$('.cars-form-input-zip'),
                    validZipRegex = /^\d{5}(?:[-\s]\d{4})?$/, // Regex for valid zip (12345, 12345-6789, or 12345 6789)
                    selectedMake = this.$('#cars-form-make-select option:selected').val(),
                    selectedModel = this.$('#cars-form-model-select option:selected').val();
                if (!validZipRegex.test(zipCodeInput.val())) {
                    e.preventDefault();
                    zipCodeInput.addClass('ui-form-error');
                } else {
                    zipCodeInput.removeClass('ui-form-error');
                }
                // Remove the value if set to all on form submit because Cars.com prefers NOT to receive a value, than to receive "All"
                if (selectedMake === 'All') {
                    this.$('#cars-form-make-select option:selected').removeAttr('value');
                    this.setMakeHiddenValues('','');
                }
                if (selectedModel === 'All') {
                    this.$('#cars-form-model-select option:selected').removeAttr('value');
                    this.setModelHiddenValues('','');
                }
            },

            destroy: function(removeEl){
                // set base form's url back to original
                this.form.attr('action', this.baseFormUrl);
                BaseView.prototype.destroy.call(this, removeEl);
            }

        });

        /**
         * Return view class.
         */
        return CarSearchView;
    }
);
