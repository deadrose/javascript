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
        var InputField = BaseFormElement.extend(
        /**
         * @lends form/input-field.prototype
         */
        {

            events: {
                'focus':'onInputFocus',
                'blur':'onInputBlur',
                'keydown':'onKeydown'
            },

            /**
             * @classdesc Manages Input Fields placeholders and clear buttons
             * @author Mark Kennedy <mdkennedy@gannett.com>
             * @constructs form/input-field
             * @param {Object} options backbone options object
             *     @param {jQuery|Element|String} options.el - element or string selector to attach to
             */
            initialize: function(options) {

                options = $.extend({
                    'onClearInput': null
                }, options);

                BaseFormElement.prototype.initialize.call(this, options);

                _.bindAll(this,'onClearButtonClick');

                // we are checking whether this $el is an input tag, if not, we are assuming it is a textarea tag
                this.isInputField = (this.$el.prop("tagName") || '').toLowerCase() === 'input' ? true : false;
                this.hasPlaceHolderNativeSupport = Modernizr.input.placeholder ? true : false;
                this.placeholder = this.$el.attr('placeholder');

                if (this.placeholder) {
                    this.showPlaceHolder();
                }

                if (this.$el.data('clearable') && this.isInputField) {
                    this._setupClearButton();
                }
            },

            showPlaceHolder: function(){
                if (!this.hasPlaceHolderNativeSupport) {
                    this.setInputValue(this.placeholder);
                    this.$el.addClass('ui-text-input-placeholder');
                }
            },

            clearPlaceHolder: function(){
                if (!this.hasPlaceHolderNativeSupport) {
                    this.clearInputValue();
                    this.$el.removeClass('ui-text-input-placeholder');
                }
            },

            getInputValue: function(){
                return this.$el.val();
            },

            clearInputValue: function(){
                this.$el.val('');
                if (this.options.onClearInput) {
                    this.options.onClearInput();
                }
            },

            setInputValue: function(value){
                this.$el.val(value);
            },

            /**
             * Sets up clear button.
             * @private
             */
            _setupClearButton: function(){
                this.clearButton = $('<div class="ui-text-input-clear-btn" style="display:none"></div>');
                this.$el.parent().append(this.clearButton);
                this.clearButton.on('mousedown.' + this.cid, _.bind(function(e){
                    this.onClearButtonClick(e);
                }, this));
            },

            /**
             * Handles focus events on an input field.
             */
            onInputFocus: function(e) {
                var inputValue = this.getInputValue();
                if (inputValue !== '') {
                    if (inputValue === this.placeholder) {
                        this.clearPlaceHolder();
                    } else {
                        if (this.clearButton) {
                            this.clearButton.show();
                        }
                    }

                }
            },

            /**
             * Handles blur events on an input field.
             * @param {Event} e blur event
             */
            onInputBlur: function(e) {
                if (this.getInputValue() === '') {
                    this.reset();
                }
                if (this.clearButton){
                    this.clearButton.hide();
                }
            },

            /**
             * Resets input field
             * @deprecated since version 0.14.0
             */
            resetInput: function() {
                this.reset();
            },

            /**
             * Resets input field
             */
            reset: function() {
                this.clearInputValue();

                if (this.placeholder) {
                    this.showPlaceHolder();
                }

                if (this.clearButton) {
                    this.clearButton.hide();
                }

            },

            /**
             * Handler for typing.
             * @param {Event} e keyup event
             */
            onKeydown: function(e) {
                // we need to produce a slight delay to get the item pressed via the input field
                clearTimeout(this.keyPressDelay);
                this.keyPressDelay = setTimeout(_.bind(function() {
                    if (this.clearButton) {
                        if (this.getInputValue() === '' || this.getInputValue() === this.placeholder) {
                            this.clearButton.hide();
                        } else {
                            this.clearButton.show();
                        }
                    }
                },this), 1);
            },

            /**
             * Gets element type.
             * @returns {string}
             */
            getType: function(){
                return "input";
            },

            /**
             * Handler for clicking the clear icon
             */
            onClearButtonClick: function(e) {
                e.preventDefault();
                this.clearInputValue();
                this.clearButton.hide();
                this.$el.focus();
            },

            destroy: function(removeEl){
                if (this.clearButton) {
                    this.clearButton.off('.' + this.cid);
                    this.clearButton.remove();
                }
                BaseFormElement.prototype.destroy.call(this, removeEl);
            }

        });

        /**
         * Return view class.
         */
        return InputField;
    }
);