define([
    'jquery',
    'underscore',
    'utils',
    'baseview',
    'state',
    'modules/scroller/vertical-scroll'
],
    function(
        $,
        _,
        Utils,
        BaseView,
        StateManager,
        VerticalScroll
        ) {
        "use strict";
        var UIDropdown = BaseView.extend(
        /**
         * @lends ui/dropdown.prototype
         */
        {
            events: {
                'click .ui-dropdown-value': 'onClick',
                'keydown': 'onKeyDown',
                'click .ui-dropdown-item': 'onItemClick',
                'mouseenter .ui-dropdown-item': 'onItemHover',
                'click .ui-dropdown-item-link': 'onItemLinkClick'
            },

            /**
             * This callback is called on select of a dropdown item
             * @callback ui/dropdown~onSelect
             * @param {String} dataValue - value of the selected item
             * @param {String} displayValue - display value of the selected item
             * @param {jQuery} selectedItem - the jQuery element of the selected item
             */
            /**
             * @classdesc Used for adding dropdown functionality to html elements (preferably divs or ul's) that have a 'ui-dropdown' class.<br/>
             * For dropdowns that are &lt;select&gt;&lt;/select&gt;'s, the {@link form/dropdown} class should be used instead.
             * @author Mark Kennedy <mdkennedy@gannett.com>
             * @constructs ui/dropdown
             * @param {Object} options backbone options object
             *     @param {jQuery|Element|String} options.el - element or string selector to attach to
             *     @param {ui/dropdown~onSelect} options.onSelect - callback when dropdown is selected
             */
            initialize: function(options) {
                options = $.extend({
                    onSelect: null // callback function when item is selected ie. function(selectedItem){}
                }, options);

                _.bindAll(this, 'refresh');

                BaseView.prototype.initialize.call(this, options);

                this.body = Utils.get('body');

                if (!this.$el.attr('tabindex')) {
                    // set default tab index to 0 if none provided
                    this.$el.attr('tabindex', 0);
                }

                // cache frequently used items
                this.dropdownItems = this._setupDropdownItems(this.$('.ui-dropdown-item'));
                this.dropdownValueDiv = this.$('.ui-dropdown-value');

                // setup initial value
                this.defaultItem = this.dropdownItems.filter('[data-selected="selected"]');
                this.setValue(this.defaultItem.data('value'), this.defaultItem.text());
            },

            /**
             * Sets up html for dropdown items
             * @param {String|jQuery} $dropdownItems Dropdown item html
             * @returns {jQuery|Array} jQuery Array of dropdown items
             * @private
             */
            _setupDropdownItems: function($dropdownItems){
                $dropdownItems = $($dropdownItems);
                // set initial selected item if there is one, if not use first dropdown item
                var selectedItem = $dropdownItems.filter('[data-selected="selected"]');
                if (selectedItem.length !== 1) {
                    var firstItem = $dropdownItems.eq(0);
                    if (firstItem.length) {
                        firstItem.attr('data-selected', 'selected');
                    }
                }
                // make sure each dropdown item has everything needed to function correctly
                $dropdownItems.each(function(idx, el){
                    var $el = $(el),
                        $link = $el.find('a');
                    // handle link item
                    if ($link.length) {
                        $el.addClass('ui-dropdown-item-with-link');
                    } else {
                        $el.addClass('ui-dropdown-item-without-link');
                    }

                });
                return $dropdownItems;
            },

            /**
             * open dropdown contents.
             */
            open: function(){
                var value = this.getDataValue(),
                    matchingItem = this.getDropdownItemByDataValue(value);
                matchingItem.eq(0).attr('data-selected','selected')
                                  .addClass('ui-dropdown-item-highlight');
                this.$el.addClass('expanded');
                this.isDropdownOpen = true;
                if (!this.subviews.scrollbar) {
                    this.subviews.scrollbar = new VerticalScroll({
                        el: this.$('.ui-dropdown-content'),
                        contentClass: '.ui-dropdown-items-container',
                        padding: 6
                    });
                } else {
                    this.subviews.scrollbar.refresh();
                }
                if (matchingItem.length) {
                    this.subviews.scrollbar.scrollToElement(matchingItem, false, 50);
                }

                // add click event to body to close dropdown when user clicks anywhere outside of it
                this.body.on('click.'+ this.cid, _.bind(function(e){
                    // This is testing if the clicked item's parents contain this.el (the dropdown)
                    // When it does not, we know this event was triggered outside of the dropdown
                    // and therefore, can safely close dropdown
                    if($(e.target).closest(this.el).length === 0) {
                        this.close();
                    }
                },this));
            },

            /**
             * close dropdown contents.
             */
            close: function(){
                this.$el.removeClass('expanded');
                this.dropdownItems.removeClass('ui-dropdown-item-highlight');
                this.isDropdownOpen = false;
                this.body.off('click.' + this.cid);
            },

            /**
             * When dropdown is clicked
             * @param {MouseEvent} e click event.
             */
            onClick: function(e) {
                if (!this.isDropdownOpen){
                    this.open();
                } else {
                    this.close();
                }
            },

            /**
             * When pressing keys (while dropdown is in focus).
             * @param {KeyboardEvent} e Keypress event
             */
            onKeyDown: function(e) {
                var keycode = (e.keyCode ? e.keyCode : e.which);
                // up/down key
                if (keycode === 38 || keycode === 40) {
                    if (!this.isDropdownOpen) {
                        this.open();
                    } else {
                        this.onResultItemUpDownArrowKeyPress(keycode);
                    }
                    e.preventDefault();
                    return;
                } else if (keycode === 27) {
                    // escape key
                    if (this.isDropdownOpen) {
                        e.preventDefault();
                        this.close();
                    }
                } else if (keycode === 9) {
                    // tab key
                    if (this.isDropdownOpen) {
                        e.preventDefault();
                        this.close();
                    }
                } else if (keycode === 32 || keycode === 13) {
                    // space bar/enter key
                    this.onSpaceBarOrEnterKeyPress();
                    e.preventDefault();
                    return;
                }
            },

            /**
             * When user presses the up or down arrow keys when typing in the input field.
             * @param {Number} keycode Up or down keycode
             */
            onResultItemUpDownArrowKeyPress: function(keycode){
                var highlightedItem = this.dropdownItems.filter('.ui-dropdown-item-highlight').eq(0);
                this.dropdownItems.removeClass('ui-dropdown-item-highlight');
                if (!highlightedItem.length){
                    highlightedItem = this.dropdownItems.eq(0);
                } else if (keycode === 38){
                    // up
                    highlightedItem = highlightedItem.prev();
                    if (!highlightedItem.length) {
                        // loop!
                        highlightedItem = this.dropdownItems.last();
                    }
                    if (this.subviews.scrollbar) {
                        this.subviews.scrollbar.scrollToElement(highlightedItem, false, 50);
                    }
                } else if (keycode === 40) {
                    // down
                    highlightedItem = highlightedItem.next();
                    if (!highlightedItem.length) {
                        // loop!
                        highlightedItem = this.dropdownItems.first();
                    }
                    if (this.subviews.scrollbar) {
                        this.subviews.scrollbar.scrollToElement(highlightedItem, false, 50);
                    }
                }
                highlightedItem.addClass('ui-dropdown-item-highlight');
            },

            /**
             * When spacebar is pressed when selecting a dropdown item.
             */
            onSpaceBarOrEnterKeyPress: function(){
                var $selectedItem = this.dropdownItems.filter('.ui-dropdown-item-highlight').eq(0),
                    href = $selectedItem.find('a').attr('href'),
                    dataValue = $selectedItem.data('value'),
                    displayValue = $selectedItem.text();
                if ($selectedItem.length) {
                    this.setValue(dataValue, displayValue);
                }

                if (this.options.onSelect){
                    this.options.onSelect(dataValue, displayValue, $selectedItem);
                }

                if (href) {
                    Utils.triggerRoute(href);
                }

            },

            /**
             * When a dropdown item is clicked.
             * @param {MouseEvent} e Event
             */
            onItemClick: function(e){
                var clickedItem = $(e.currentTarget),
                    dataValue = clickedItem.data('value'),
                    displayValue = clickedItem.text();
                this.setValue(dataValue, displayValue);
                if (this.options.onSelect){
                    this.options.onSelect(dataValue, displayValue, clickedItem);
                }
            },

            /**
             * When a dropdown a (href) link is clicked.
             * @param {MouseEvent} e Event
             */
            onItemLinkClick: function(e){
                var clickedItem = $(e.currentTarget).closest('.ui-dropdown-item');
                this.setValue(clickedItem.data('value'), clickedItem.text());
            },

            /**
             * When a dropdown item is hovered over.
             * @param {MouseEvent} e Event
             */
            onItemHover: function(e){
                this.dropdownItems.removeClass('ui-dropdown-item-highlight');
                $(e.currentTarget).addClass('ui-dropdown-item-highlight');
            },

            /**
             * Updates dropdown value using value strings
             * @param {String} dataValue
             * @param {String} displayValue
             */
            setValue: function(dataValue, displayValue){
                var $matchingItem;
                this.dropdownItems.removeAttr('data-selected');
                // we want to allow dataValue to be an empty string
                if (dataValue !== undefined) {
                    this.dropdownValueDiv.data('value', dataValue);
                    $matchingItem = this.getDropdownItemByDataValue(dataValue);
                } else {
                    $matchingItem = this.getDropdownItemByDisplayValue(displayValue);
                }
                this.dropdownValueDiv.html(displayValue);
                if ($matchingItem.eq(0).data('selected') !== 'selected') {
                    $matchingItem.eq(0).attr('data-selected', 'selected');
                }
                if (this.isDropdownOpen) {
                    this.close();
                }
            },

            /**
             * Grabs current data-value of dropdown
             * @returns {*}
             */
            getDataValue: function(){
                return this.dropdownValueDiv.data('value') || '';
            },

            /**
             * Grabs current display value of dropdown
             * @returns {*}
             */
            getDisplayValue: function(){
                return this.dropdownValueDiv.text() || '';
            },

            /**
             * Finds a dropdown item by data value
             * @param dataValue Value to check against
             */
            getDropdownItemByDataValue: function(dataValue){
                return this.dropdownItems.filter('[data-value="' + dataValue + '"]');
            },

            /**
             * Finds a dropdown item by display value
             * @param displayValue Value to check against
             */
            getDropdownItemByDisplayValue: function(displayValue){
                return this.dropdownItems.filter(':contains("' + displayValue + '")');
            },

            /**
             * Refreshes/updates dropdown item contents with new data
             * @param {String} html html to append to DOM
             */
            refresh: function(html){
                if (html) {
                    var $dropdownItems = this._setupDropdownItems(html);
                    this.$('.ui-dropdown-items-container').html($dropdownItems);
                    this.dropdownItems = $dropdownItems;
                }
                var defaultItem = this.dropdownItems.filter('[data-selected="selected"]');
                this.setValue(defaultItem.data('value'), defaultItem.text());
                this.defaultItem = defaultItem;
            },

            /**
             * Resets dropdown.
             */
            reset: function(){
                this.setValue(this.defaultItem.data('value'), this.defaultItem.text());
            },

            /**
             * Clean up view.
             * Removes event handlers and element (optionally).
             */
            destroy: function(removeEl) {
                this.body.off('.' + this.cid);
                BaseView.prototype.destroy.call(this, removeEl);
            }
        });

        /**
         * Return view class.
         */
        return UIDropdown;
    }
);