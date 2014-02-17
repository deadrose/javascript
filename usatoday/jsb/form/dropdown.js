define([
    'jquery',
    'underscore',
    'form/base-form-element',
    'ui/dropdown'
],
    function(
        $,
        _,
        BaseFormElement,
        Dropdown
        ) {
        "use strict";
        var FormDropdown = BaseFormElement.extend(
        /**
         * @lends form/dropdown.prototype
         */
        {
            events: {
                'change': 'onChange'
            },
            /**
             * This callback is called on select of a dropdown item
             * @callback form/dropdown~onSelect
             * @param {String} dataValue - value of the selected item
             * @param {String} displayValue - display value of the selected item
             * @param {jQuery} selectedItem - the jQuery element of the selected item
             */
            /**
             * @classdesc Used for adding dropdown functionality to &lt;select&gt;&lt;/select&gt; elements ONLY.<br/>
             * For dropdowns that are not select elements (i.e. divs or uls), the {@link ui/dropdown} should be used instead.
             * @author Mark Kennedy <mdkennedy@gannett.com>
             * @constructs form/dropdown
             * @param {Object} options backbone options object
             *     @param {jQuery|Element|String} options.el - element or string selector to attach to
             *     @param {form/dropdown~onSelect} [options.onSelect] - callback when a date is selected
             *     @param {String} [options.dropdownContentClass] - additional class to put on dropdown container
             * @see ui/dropdown
             */
            initialize: function(options) {
                options = $.extend({
                    onSelect: null,
                    dropdownContentClass: null
                }, options);

                _.bindAll(this, 'refresh', 'onDivDropdownSelect');


                this.$el.hide();
                this.selectOptionItems = this.$('option');
                this.dropdownDiv = this._buildDropdownHtml(this.selectOptionItems);
                // set select dropdown's tabindex to negative number to remove it from the tabbing flow
                this.$el.attr('tabindex','-1');
                this.dropdownDiv.insertAfter(this.$el);

                BaseFormElement.prototype.initialize.call(this, options);

                this.subviews.dropdown = new Dropdown({
                    el: this.dropdownDiv,
                    onSelect: this.onDivDropdownSelect
                });
            },
            /**
             * Builds div-version of dropdown
             * @param {jQuery} selectOptionItems set of option tags
             * @returns {jQuery}
             * @private
             */
            _buildDropdownHtml: function(selectOptionItems) {
                var dropdownDiv = $('<div class="' + this.$el.attr('class') + '"></div>');
                if (this.options.dropdownContentClass){
                    dropdownDiv.addClass(this.options.dropdownContentClass);
                }
                var dropdownValueDiv = $('<div class="ui-dropdown-value ui-btn"></div>');
                var dropdownContent = $('<div class="ui-dropdown-content"></div>');
                var dropdownItemHtml = this._buildDropdownHtmlItems(selectOptionItems);

                // reassign attrs from the select onto the dropdown
                dropdownDiv.attr('class',this.$el.attr('class'));
                dropdownDiv.attr('tabindex', this.$el.attr('tabindex') || 0);

                dropdownDiv.append(dropdownValueDiv).append(dropdownContent);
                dropdownContent.append(dropdownItemHtml);
                return dropdownDiv;
            },

            /**
             * Builds div-version of dropdown items
             * @param {jQuery} selectOptionItems set of option tags
             * @returns {*}
             * @private
             */
            _buildDropdownHtmlItems: function(selectOptionItems){
                var dropdownItemsContainer = $('<ul class="ui-dropdown-items-container"></ul>');
                selectOptionItems.each(_.bind(function(index, el){
                    var item = $(el),
                        selectValue = item.val(),
                        displayValue = item.html(),
                        dropdownItem = $('<li class="ui-dropdown-item" data-value="'+selectValue+'">' + displayValue + '</li>');
                    if (item.is(':selected')){
                        dropdownItem.attr('data-selected','selected');
                    }
                    dropdownItemsContainer.append(dropdownItem);
                }, this));
                return dropdownItemsContainer;
            },

            /**
             * Populates select dropdown with new data
             * @param {String} [html] html String of select <option>'s to populate dropdown with
             */
            refresh: function(html) {
                var dropdownItemContainer = this._buildDropdownHtmlItems($(html));
                this.subviews.dropdown.refresh(dropdownItemContainer);
                this.$el.html(html);
            },

            /**
             * Returns div-version of dropdown.
             */
            getUIElement: function(){
                return this.dropdownDiv;
            },

            /**
             * Gets element type.
             * @returns {string}
             */
            getType: function(){
                return "dropdown";
            },

            /**
             * Resets dropdown to original value.
             */
            reset: function(){
                this.subviews.dropdown.reset();
                this.$el.val('');
            },

            /**
             * When an item from the div-version of dropdown is selected
             * @param {String} dataValue data-value attr of selected item
             * @param {String} displayValue display value of selected item
             * @param {jQuery} selectedItem the selected item
             */
            onDivDropdownSelect: function(dataValue, displayValue, selectedItem){
                this.$el.val(dataValue);
                if (this.options.onSelect) {
                    this.options.onSelect(dataValue, displayValue, selectedItem);
                }
            },

            onChange: function(){
                this.subviews.dropdown.setValue(this.$el.val());
            },

            destroy: function(removeEl) {
                this.dropdownDiv.remove();
                BaseFormElement.prototype.destroy.call(this, removeEl);
            }

        });

        /**
         * Return view class.
         */
        return FormDropdown;
    }
);