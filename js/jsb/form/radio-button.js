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
        var RadioButton = BaseFormElement.extend(
        /**
         * @lends form/radio-button.prototype
         */
        {
            events: {
                'click' : 'onRadioInputClick'
            },
            /**
             * This callback is called on select of a dropdown item
             * @callback form/radio-button~onClick
             * @param {jQuery} divRadio - the jQuery element that was selected
             */
            /**
             * @classdesc Manages Form radio buttons.
             * @author Mark Kennedy <mdkennedy@gannett.com>
             * @constructs form/radio-button
             * @param {Object} options backbone options object
             *     @param {jQuery|Element|String} options.el - element or string selector to attach to
             *     @param {form/radio-button~onClick} [options.onClick] - callback when an radio checkbox is selected
             */
            initialize: function(options) {
                options = $.extend({
                    onClick: null
                }, options);

                BaseFormElement.prototype.initialize.call(this, options);
                this.radioDiv = this._buildDivRadio(this.$el);
            },

            /**
             * Builds the div-version of the radio button
             * @param {jQuery} inputRadioEl The radio button input element
             * @returns {jQuery}
             * @private
             */
            _buildDivRadio: function(inputRadioEl){
                var radioDiv = $('<div class="' + inputRadioEl.attr('class') + '" data-name="' + inputRadioEl.attr('name') + '" data-value="'+ inputRadioEl.val() +'"></div>'),
                    radioInputLabelEl = this.$el.closest('form').find('label[for="' + inputRadioEl.attr('id') + '"]');

                if (inputRadioEl.is(':checked')) {
                    radioDiv.addClass('ui-radio-selected');
                }
                if (inputRadioEl.is('disabled')) {
                    radioDiv.addClass('ui-radio-disabled');
                }
                radioDiv.on('keydown.' + this.cid + ' click.' + this.cid, _.bind(function(e){
                    if (e.type === 'keydown') {
                        this.onKeyDown(e);
                    } else {
                        this.onRadioClick(e);
                    }
                },this));

                var radioInputTabIndex = inputRadioEl.attr('tabindex');
                // set tabindex to -1 to ignore radio input when tabbing
                inputRadioEl.attr('tabindex', '-1');
                if (radioInputTabIndex) {
                    radioDiv.attr('tabindex', radioInputTabIndex);
                } else {
                    radioDiv.attr('tabindex', '0');
                }

                var divRadioLabelEl = this._buildDivRadioLabel(radioInputLabelEl);
                radioDiv.append(divRadioLabelEl);
                radioInputLabelEl.hide();

                radioDiv.insertAfter(inputRadioEl);
                return radioDiv;
            },

            /**
             * Builds div-version of radio label
             * @param radioInputLabelEl
             * @returns {jQuery}
             * @private
             */

            _buildDivRadioLabel: function(radioInputLabelEl){
                var divLabel = $('<span class="ui-radio-label"></span>');
                if (radioInputLabelEl.length) {
                    // move label text inside of new div label
                    divLabel.text(radioInputLabelEl.text());
                } else {
                    // if no label, use radio input value as label
                    divLabel.text(this.$el.val());
                }
                return divLabel;
            },

            /**
             * Check
             */
            select: function(){
                if (!this.radioDivs) {
                    this.radioDivs = this.$el.closest('form').find('div.ui-radio[data-name=' + this.$el.attr('name') + ']');
                }
                this.radioDivs.removeClass('ui-radio-selected');
                this.radioDiv.addClass('ui-radio-selected');
                if (this.options.onClick) {
                    this.options.onClick(this.radioDiv);
                }
            },

            onKeyDown: function(e){
                var keycode = (e.keyCode ? e.keyCode : e.which);
                if (keycode === 32 || keycode === 13) {
                    // spacebar or enter key
                    e.preventDefault();
                    this.onRadioClick(e);
                }
            },

            /**
             * When the div-version of radio button is clicked.
             */
            onRadioClick: function(e) {
                e.preventDefault();
                if (!this.radioDiv.hasClass('ui-radio-selected')) {
                    this.select();
                    this.$el.prop('checked', true);
                }

            },
            /**
             * When the input radio button is clicked.
             */
            onRadioInputClick: function(e){
                this.onRadioClick(e);
            },

            /**
             * Returns div-version of radio button.
             * @returns {jQuery}
             */
            getUIElement: function(){
                return this.radioDiv;
            },

            /**
             * Gets element type.
             * @returns {String}
             */
            getType: function(){
                return "radio";
            },

            destroy: function(removeEl) {
                this.radioDiv.off('.' + this.cid);
                this.radioDiv.remove();
                BaseFormElement.prototype.destroy.call(this, removeEl);
            }

        });

        /**
         * Return view class.
         */
        return RadioButton;
    }
);