define([
    'jquery',
    'underscore',
    'form/base-form-element',
    'state',
    'form/input-field'
],
    function(
        $,
        _,
        BaseFormElement,
        StateManager,
        InputField
        ) {
        "use strict";
        var AutoComplete = BaseFormElement.extend(
        /**
         * @lends form/autocomplete.prototype
         */
        {

            events: {
                "keydown .ui-text-input": 'onKeyDown',
                "paste .ui-text-input": 'updateResults',
                "focusout" : 'onInputBlur',
                "mousedown .ui-autocomplete-result-item": 'onMouseDownResultItem',
                "mouseenter .ui-autocomplete-result-item": 'onResultMouseEnterLeave',
                "mousedown .ui-text-input-clear-btn": 'onClearButtonClick'
            },

            /**
             * This callback is called on any error from the auto complete
             * @callback form/autocomplete~onError
             * @param {String} message - message of why there was an error
             */
            /**
             * This callback is called on any error from the auto complete
             * @callback form/autocomplete~onSelect
             * @param {String} value - the selected value or display text
             * @param {Object} result - the full result object that was selected
             */
            /**
             * This callback is called when results are delivered/fetched
             * @callback form/autocomplete~onShowResults
             * @param {Array.<Object>} results - Array of results
             */
            /**
             * This callback is used when the data returned from the endpoint is not in a list
             * @callback form/autocomplete~onParseResults
             * @param {Object} results - The results from the endpoint
             * @return {Array.<Object>} An array of results to display to the user
             */

            /**
             * @classdesc Autocomplete
             * @author Mark Kennedy <mdkennedy@gannett.com>
             * @constructs form/autocomplete
             * @param {Object} options backbone options object
             *      @param {jQuery|Element|String} options.el - element or string selector to attach to
             *      @param {String} [options.url=<data-autocomplete-url>] - endpoint url to hit, if not given will access data-autocomplete-url from the el
             *      @param {Object} [options.ajaxOptions] - options to pass to jquery's ajax handler
             *      @param {String} [options.ajaxQueryKey=query] - the key to set the input value to for the ajax request
             *      @param {String} options.resultDisplayTemplate - underscore template of display value
             *      @param {String} options.resultValueTemplate - underscore template of data value
             *      @param {form/autocomplete~onError} [options.onError] - callback when an error occurs
             *      @param {form/autocomplete~onSelect} [options.onSelect] - callback when an item is chosen
             *      @param {Number} [options.maxResults=4] - number of results to show in the dropdown
             *      @param {form/autocomplete~onShowResults} [options.onShowResults] - callback before results are shown to the user
             *      @param {form/autocomplete~onParseResults} [options.onParseResults] - callback to convert incompatible data into an array of result items
             */
            initialize: function(options) {

                options = $.extend({
                    url: this.$el.data('autocomplete-url'),
                    ajaxOptions: null,
                    ajaxQueryKey: 'query',
                    resultDisplayTemplate: null,
                    resultValueTemplate: null,
                    onError: null,
                    onSelect: null,
                    maxResults: 4,
                    onShowResults: null,
                    onParseResults: null
                }, options);

                this.inputField = this.$el;

                // must reassign this.el to input field's container to allow backbone events to access its contents
                this.setElement(this.$el.parent(),false);

                this.autoCompleteResultsContainer = $('<ul class="ui-autocomplete-result-container"></ul>');
                this.autoCompleteContent = $('<div class="ui-autocomplete-content"></div>');
                this.autoCompleteContent.append(this.autoCompleteResultsContainer);
                this.$el.append(this.autoCompleteContent);

                _.bindAll(this, 'updateResults','showResult','clearResults');
                BaseFormElement.prototype.initialize.call(this,options);

                this.subviews.inputField = new InputField({
                    el: this.inputField,
                    onClearInput: this.options.onClearInput
                });
            },

            /**
             * Updates fetch parameters.
             * @param {Object} ajaxOptions New options
             */
            updateAjaxOptions: function(ajaxOptions){
                $.extend(true, this.options.ajaxOptions, ajaxOptions);
            },

            /**
             * Updates result.
             */
            updateResults: function(){
                // we need to produce a slight delay to get the item pressed via the input field
                clearTimeout(this.keyPressDelay);
                this.keyPressDelay = setTimeout(_.bind(function() {
                    var inputValue = this.inputField.val();
                    // cancel call to fetchdata if currently running
                    if (this.fetcher) {
                        this.fetcher.abort();
                    }
                    if (inputValue.length) {
                        this.fetcher = this._fetchResults(inputValue);
                    } else {
                        this.clearResults();
                    }
                },this), 1);
            },

            /**
             * When a autocomplete match is hovered with the mouse.
             */
            onResultMouseEnterLeave : function(e){
                var el = $(e.target);
                if (!el.hasClass('hover')) {
                    // remove all hover class from all other results
                    this.autoCompleteResultsContainer.find('.ui-autocomplete-result-item').removeClass('hover');
                    el.addClass('hover');
                }
            },

            /**
             * When focus on autocomplete input field is lost.
             */
            onInputBlur : function(){
                this.clearResults();
                if (this.fetcher) {
                    this.fetcher.abort();
                }
            },

            /**
             * When clicking a result with the mouse.
             * @param e
             */
            onMouseDownResultItem: function(e){
                if (e.which === 3) {
                    // don't count right clicks as valid
                    return;
                }
                this._processSelectedItem($(e.currentTarget));
            },

            /**
             * Handler for typing.
             * @param {Event} e Event
             */
            onKeyDown: function(e) {
                var keycode = (e.keyCode ? e.keyCode : e.which),
                    items = this.autoCompleteResultsContainer.find('.ui-autocomplete-result-item'),
                    hoveredItem = items.filter('.ui-autocomplete-result-hover');
                if (keycode === 9){
                    // tab key
                    return;
                } else if ((keycode === 38 || keycode === 40)) {
                    // up/down arrow keys
                    e.preventDefault();
                    if (items.length) {
                        this.onResultItemUpDownArrowKeyPress(keycode, hoveredItem);
                    }
                } else if (keycode === 13){
                    // enter key
                    if (hoveredItem.length) {
                        e.preventDefault();
                        this._processSelectedItem(hoveredItem);
                    } else {
                        this.clearResults();
                    }
                } else if (keycode === 32 && hoveredItem.length) {
                    // spacebar
                    this._processSelectedItem(hoveredItem);
                } else {
                    this.updateResults();
                }

            },

            /**
             * When user presses the up or down arrow keys when typing in the input field.
             * @param {Number} keycode Keycode
             * @param {Jquery} currHoveredItem Item that is currently hovered over.
             */
            onResultItemUpDownArrowKeyPress: function(keycode, currHoveredItem){
                var items = this.autoCompleteResultsContainer.find('.ui-autocomplete-result-item');
                items.removeClass('ui-autocomplete-result-hover');
                if (keycode === 38) {
                    // up
                    if (!currHoveredItem.length || this.inputField.val() === this.currentInputFieldValue) {
                        this.hoverResultItem(items.last());
                    } else if (currHoveredItem.prev().length) {
                        this.hoverResultItem(currHoveredItem.prev());
                    } else {
                        this.inputField.val(this.currentInputFieldValue);
                    }
                } else {
                    // down
                    if (!currHoveredItem.length) {
                        this.hoverResultItem(items.first());
                    } else if (currHoveredItem && currHoveredItem.next().length) {
                        this.hoverResultItem(currHoveredItem.next());
                    } else {
                        this.inputField.val(this.currentInputFieldValue);
                    }
                }
            },

            /**
             * Hovers an autocomplete result element.
             * @param element Element to be hovered.
             */
            hoverResultItem: function(element){
                element.addClass('ui-autocomplete-result-hover');
                this.inputField.val(element.text());
            },

            /**
             * Returns div-version of autocomplete field.
             * @returns {jQuery}
             */
            getUIElement: function(){
                return this.inputField;
            },

            /**
             * Returns form version of autocomplete field.
             * @returns {jQuery}
             */
            getFormElement: function(){
                return this.inputField;
            },

            /**
             * Resets autocomplete field.
             */
            reset: function(){
                this.clearResults();
                this.subviews.inputField.reset();
            },

            /**
             * Resets autocomplete field.
             * @deprecated since version 0.14.0
             */
            resetInput: function(){
                this.reset();
            },

            /**
             * Displays an autocomplete result by appending it to appropriate DOM element
             * @param {String} displayValue
             * @param {String} dataValue
             * @param {Object} dataItem
             */
            showResult: function(displayValue, dataValue, dataItem){
                var itemEl = $('<li class="ui-autocomplete-result-item"></li>');
                itemEl.text(displayValue);
                itemEl.data('value', dataValue);
                if (dataItem) {
                    itemEl.data('result', dataItem);
                }
                this.autoCompleteResultsContainer.append(itemEl);

            },

            /**
             * Clears out autocomplete results.
             */
            clearResults: function(){
                this.autoCompleteResultsContainer.empty();
            },

            /**
             * Handler for clicking the clear icon
             * @param {Event} e click event
             */
            onClearButtonClick: function(e) {
                this.clearResults();
            },

            /**
             * Processes selected autocomplete item.
             * @param {jQuery} element The selected element
             * @private
             */
            _processSelectedItem: function(element){
                var value = element.data('value') || element.text(),
                    resultData = element.data('result');
                this.inputField.val(value);
                this.clearResults();
                if (this.options.onSelect) {
                    this.options.onSelect(value, resultData);
                }
            },

            /**
             * Does some magic to prepare ajaxOptions for fetching.
             * @param {String} value query string
             * @returns {Object} ajaxOptions Object containing ajaxOptions to fetch
             * @private
             */
            _getFetchAjaxOptions: function(value){
                var ajaxOptions = $.extend(true, {}, this.options.ajaxOptions),
                    queryObj = {};
                var url = ajaxOptions.url || this.options.url;
                // check if url contains underscore template
                if (url.indexOf("<%=") !== -1) {
                    ajaxOptions.url = _.template(url, {'query': value});
                } else {
                    queryObj[this.options.ajaxQueryKey] = value;
                    ajaxOptions = $.extend(true, {'url': url, 'data': queryObj}, ajaxOptions);
                }
                return ajaxOptions;
            },

            /**
             * Display results.
             * @param {String} value String value to check (what user typed in input field)
             * @private
             */
            _fetchResults: function(value){
                var fetchOptions = this._getFetchAjaxOptions(value);
                return StateManager.fetchData(null, fetchOptions)
                    .done(_.bind(function(data){
                        var results = data;
                        if (this.options.onParseResults) {
                            results = this.options.onParseResults(data);
                        }
                        // empty previous results
                        this.autoCompleteResultsContainer.empty();

                        // truncate data set to max amount
                        if ($.isArray(results) && results.length > 0) {
                            results = results.slice(0, this.options.maxResults);
                            this._parseResults(results);
                            if (this.options.onShowResults) {
                                this.options.onShowResults(results);
                            }
                            this.currentInputFieldValue = this.inputField.val();
                        }
                    },this))
                    .fail(_.bind(function(msg){
                        if (this.options.onError) {
                            this.options.onError(msg);
                        }
                    },this));
            },

            /**
             * Parse result data.
             * @param {Array} results Data set.
             * @private
             */
            _parseResults: function(results) {
                $.map(results, _.bind(function (item) {
                    var resultDataValue,
                        resultDisplayValue;
                    if (this.options.resultDisplayTemplate) {
                        resultDisplayValue = _.template(this.options.resultDisplayTemplate, item);
                    }
                    if (this.options.resultValueTemplate) {
                        resultDataValue =  _.template(this.options.resultValueTemplate, item);
                    }
                    this.showResult(resultDisplayValue, resultDataValue, item);
                }, this));
            },
            /**
             * Gets element type.
             * @returns {String}
             */
            getType: function(){
                return "autocomplete";
            },

            destroy: function(removeEl){
                this.autoCompleteContent.remove();
                BaseFormElement.prototype.destroy.call(this, removeEl);
            }

        });

        /**
         * Return view class.
         */
        return AutoComplete;
    }
);