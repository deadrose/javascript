/**
 * @fileoverview Money markets stock lookup.
 * @author Mark Kennedy <mdkennedy@gannett.com>
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'utils',
    'form/autocomplete',
    'directAdPosition'
],
    function(
        $,
        _,
        BaseView,
        StateManager,
        Utils,
        AutoComplete,
        DirectAdPosition
        ) {
        "use strict";
        /**
         * View class.
         */
        var StockLookupView = BaseView.extend({

            events: {
                'submit': 'onFormSubmit'
            },

            /**
             * Initialize view.
             */
            initialize: function(options) {
                BaseView.prototype.initialize.call(this,options);

                _.bindAll(this, 'onStockSelect');

                this._initAd();

                this.$lookupInput = this.$('.money-markets-stock-lookup-input');
                this.subviews.autocomplete = new AutoComplete({
                    el: this.$lookupInput,
                    resultDisplayTemplate: '<%= Symbol %> - <%= Name %>',
                    resultValueTemplate: '<%= Symbol %>',
                    onSelect: this.onStockSelect
                });
            },

            _initAd: function(){
                var adDiv = this.$('.stock-ticker-ad');
                if (adDiv.length){
                    // set up ad
                    this.subviews.ad = new DirectAdPosition({
                        el: adDiv,
                        adSizes: [88,31],
                        adPlacement: 'sponsor_logo',
                        adType: 'sponsor_logo',
                        pageInfo: StateManager.getActivePageInfo()
                    });
                }
            },

            /**
             * When a stock result autocomplete item is selected.
             * @param {String} value Selected item data
             * @param {Object} data Selected item data
             */
            onStockSelect: function(value, data){
                var stockUrlPath = this.parseStockPath(data.SymbolType);
                this.setStockPath(stockUrlPath);
                if (this.$el.is('form')) {
                    this.$el.submit();
                } else {
                    this.$('form').submit();
                }
            },

            setStockPath: function(stockSymbol){
                this.$$('.money-markets-stock-lookup-path-input').val(stockSymbol);
            },
            getStockPath: function(){
                return this.$$('.money-markets-stock-lookup-path-input').val();
            },

            /**
             * given a symbol type, will determine the stock path for it
             * @param {String} symbolType
             * @returns {*}
             */
            parseStockPath: function(symbolType){
                var dataPath = 'stocks';
                if (symbolType) {
                    switch(symbolType) {
                        case 'C':
                            dataPath = 'stocks';
                            break;
                        case 'F':
                            dataPath = 'mutual-funds';
                            break;
                        case 'G':
                            dataPath = 'etfs';
                            break;
                    }
                }
                return dataPath;
            },

            /**
             * Checks if we have the stock path yet, if not, parses it
             * @param {Event} e form submit event
             */
            onFormSubmit: function(e){
                if (!this.getStockPath()) {
                    e.preventDefault();
                    if (this.$lookupInput.val()){
                        var stockValue = this.$lookupInput.val().toUpperCase();
                        StateManager.fetchData(this.$lookupInput.data('autocomplete-url') + stockValue).done(_.bind(function(data){
                            if (data && data.length){
                                // we need to filter our data object when there are multiple data sets
                                _.each(data,function(obj){
                                    if (obj.Symbol === stockValue) {
                                        this.setStockPath(this.parseStockPath(obj.SymbolType));
                                        this.$lookupInput.val(stockValue);
                                    }
                                },this);
                                this.$el.submit();
                            }
                        }, this));
                        //TODO show the user an error for invalid stock ticker?
                    }
                }
            },

            destroy: function(removeEl){
                this.$$('.money-markets-stock-lookup-path-input').val('');
                this.$lookupInput.blur();
                BaseView.prototype.destroy.call(this, removeEl);
            }

        });

        /**
         * Return view class.
         */
        return StockLookupView;
    }
);
