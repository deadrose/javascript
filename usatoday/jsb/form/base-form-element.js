define([
    'jquery',
    'underscore',
    'baseview'
],
    function(
        $,
        _,
        BaseView
        ) {
        "use strict";
        var BaseFormElement = BaseView.extend(
        /**
         * @lends form/form-element.prototype
         */
        {

            /**
             * @classdesc Base class for all form elements
             * @author Mark Kennedy <mdkennedy@gannett.com>
             * @constructs form/form-element
             */
            initialize: function(options) {
                BaseView.prototype.initialize.call(this, options);
            },

            /**
             * Returns form version of element.
             * @returns {jQuery}
             */
            getFormElement: function(){
                return this.$el;
            },

            /**
             * Returns div-version of element.
             * @returns {jQuery}
             */
            getUIElement: function(){
                return this.$el;
            },

            /**
             * Gets the type of the element.
             * @returns {String}
             */
            getType: function(){
                return "";
            },

            /**
             * Resets element
             */
            reset: function(){},

            /**
             * Checks if the form element is required.
             * @returns {Boolean} True if form element has a required attribute
             */
            isRequired: function() {
                var required = this.getFormElement().attr('required');
                return required === "required" || required;
            }

        });

        /**
         * Return view class.
         */
        return BaseFormElement;
    }
);