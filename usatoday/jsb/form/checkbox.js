define([
    'jquery',
    'underscore',
    'form/base-form-element'
],
    function(
        $,
        _,
        BaseFormElement
        ) {
        "use strict";
        var Checkbox = BaseFormElement.extend(
        /**
         * @lends form/checkbox.prototype
         */
        {
            events: {
                'click': 'onCheckboxInputClick'
            },

            /**
             * This callback is called when a checkbox is clicked
             * @callback form/checkbox~onClick
             * @param {jQuery} checkboxDiv - element the user clicked on
             * @param {Boolean} value - true or false representing checked or not
             */
            /**
             * @classdesc Form Checkboxes
             * @author Mark Kennedy <mdkennedy@gannett.com>
             * @constructs form/checkbox
             * @param {Object} options backbone options object
             *     @param {jQuery|Element|String} options.el - element or string selector to attach to
             *     @param {form/checkbox~onClick} [options.onClick] - callback when the checkbox is checked
             */
            initialize: function(options) {
                options = $.extend({
                    onClick: null
                }, options);
                BaseFormElement.prototype.initialize.call(this, options);
                _.bindAll(this, 'onCheckboxClick');
                this.checkboxDiv = this._buildDivCheckbox(this.$el);
                this.isCheckedByDefault = this.$el.is(':checked');
            },

            /**
             * Builds div-version of checkbox
             * @param {Jquery} inputCheckboxEl The checkbox input element
             * @returns {*|HTMLElement}
             * @private
             */
            _buildDivCheckbox: function(inputCheckboxEl){
                var checkboxDiv = $('<div class="' + inputCheckboxEl.attr('class') + '" data-name="' + inputCheckboxEl.attr('name') + '" data-value="' + inputCheckboxEl.val() + '"></div>'),
                    checkboxInputLabelEl = this.$el.closest('form').find('label[for="' + inputCheckboxEl.attr('id') + '"]');
                if (inputCheckboxEl.is(':checked')) {
                    checkboxDiv.addClass('ui-checkbox-checked');
                }
                if (inputCheckboxEl.is(':disabled')) {
                    checkboxDiv.addClass('ui-checkbox-disabled');
                }
                checkboxDiv.on('keydown.' + this.cid + ' click.' + this.cid, _.bind(function(e){
                    if (e.type === 'keydown') {
                        this.onKeyDown(e);
                    } else {
                        this.onCheckboxClick(e);
                    }
                },this));

                var checkboxInputTabIndex = inputCheckboxEl.attr('tabindex');
                // set tabindex to -1 to ignore radio input when tabbing
                inputCheckboxEl.attr('tabindex', '-1');
                if (checkboxInputTabIndex) {
                    checkboxDiv.attr('tabindex', checkboxInputTabIndex);
                } else {
                    checkboxDiv.attr('tabindex', '0');
                }

                var divCheckboxLabelEl = this._buildDivCheckboxLabel(checkboxInputLabelEl);
                checkboxDiv.append(divCheckboxLabelEl);
                checkboxInputLabelEl.hide();

                checkboxDiv.insertAfter(inputCheckboxEl);
                return checkboxDiv;
            },

            /**
             * Builds div-version of checkbox label
             * @param checkboxInputLabelEl
             * @returns {*|HTMLElement}
             * @private
             */
            _buildDivCheckboxLabel: function(checkboxInputLabelEl){
                var divLabel = $('<span class="ui-checkbox-label"></span>');
                if (checkboxInputLabelEl.length) {
                    // move label text inside of new div label
                    divLabel.text(checkboxInputLabelEl.text());
                } else {
                    // if no label, use radio input value as label
                    divLabel.text(this.$el.val());
                }
                return divLabel;
            },

            onKeyDown: function(e){
                var keycode = (e.keyCode ? e.keyCode : e.which);
                if (keycode === 32 || keycode === 13) {
                    // spacebar or enter key
                    e.preventDefault();
                    this.onCheckboxClick(e);
                }
            },

            /**
             * Check
             */
            check: function(){
                this.checkboxDiv.addClass('ui-checkbox-checked');
                this.$el.prop('checked', true);
            },

            /**
             * Un-check
             */
            unCheck: function(){
                this.checkboxDiv.removeClass('ui-checkbox-checked');
                this.$el.prop('checked', false);
            },

            /**
             * When div-version of checkbox is clicked.
             */
            onCheckboxClick: function(e) {
                var isChecked;
                if (this.checkboxDiv.hasClass('ui-checkbox-checked')) {
                    this.unCheck();
                    isChecked = false;
                } else {
                    this.check();
                    isChecked = true;
                }
                if (this.options.onClick) {
                    this.options.onClick(this.checkboxDiv, isChecked);
                }
            },

            /**
             * Returns div-version of checkbox.
             * @returns {jQuery}
             */
            getUIElement: function(){
                return this.checkboxDiv;
            },

            /**
             * Gets element type.
             * @returns {String}
             */
            getType: function(){
                return "checkbox";
            },

            /**
             * Resets checkbox to initial value.
             */
            reset: function(){
                if (this.isCheckedByDefault) {
                    this.check();
                } else {
                    this.unCheck();
                }
            },

            /**
             * When the input checkbox is clicked.
             */
            onCheckboxInputClick: function(e){
                this.onCheckboxClick(e);
            },

            destroy: function(removeEl) {
                this.checkboxDiv.off('.' + this.cid);
                this.checkboxDiv.remove();
                BaseFormElement.prototype.destroy.call(this, removeEl);
            }

        });

        /**
         * Return view class.
         */
        return Checkbox;
    }
);