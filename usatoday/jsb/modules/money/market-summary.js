/**
 * @fileoverview Markets search module view.
 * @author Jonathan Hensley <jhensley@gannett.com>
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'state'
],
    function(
        $,
        _,
        BaseView,
        StateManager
        ) {
        "use strict";
        /**
         * View class.
         */
        var MarketsSearchView = BaseView.extend({

            /**
             * Initialize view.
             */
            initialize: function(options) {
                BaseView.prototype.initialize.call(this,options);

                if (options.layoutType === 'suspender') {
                    this.interval = StateManager.recurringFetchHtml('/services/markets/home-widget/', null, 60000, _.bind(function(html){
                        this.$('#CList-Markets').html(html);
                    }, this));
                } else {
                    this.interval = StateManager.recurringFetchHtml('/services/markets/default-quotes/', null, 60000, _.bind(function(html){
                        this.$('.money-markets-tool-default-quotes').html(html);
                    }, this));
                }
            },

            destroy: function(){
                clearInterval(this.interval);
                BaseView.prototype.destroy.apply(this, arguments);
            }

        });

        /**
         * Return view class.
         */
        return MarketsSearchView;
    }
);
