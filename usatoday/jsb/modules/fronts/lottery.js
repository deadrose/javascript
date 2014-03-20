/**
 * @fileoverview Lottery module view.
 * @author Jonathan Hensley <jhensley@gannett.com>
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'utils',
    'ui/dropdown'
],
    function(
        $,
        _,
        BaseView,
        StateManager,
        Utils,
        Dropdown
        ) {
        "use strict";
        /**
         * View class.
         */
        var LotteryView = BaseView.extend({

            /**
             * Initialize view.
             * @param {object} options to pass in modules options
             */
            initialize: function(options) {

                options = $.extend({
                    refreshDelay: 6000, //ms
                    refresh: false
                },options);
                _.bindAll(this, 'updateLottery');
                BaseView.prototype.initialize.call(this,options);
                if (this.options.refresh) {
                    this.subviews.refreshInterval = StateManager.recurringFetchHtml('/lottery/front-modules', null, this.options.refreshDelay, this.updateLottery);
                } else {
                    StateManager.fetchHtml('/lottery/front-modules').done(this.updateLottery);
                }
            },

            updateLottery: function(html){
                this.$el.html(html);
                this.setupDropdown();
            },

            setupDropdown: function(){
                if (this.subviews.selectDropdown) {
                    this.subviews.selectDropdown.destroy();
                }
                this.subviews.selectDropdown = new Dropdown({
                    el: this.$('.lottery-state-picker-dropdown')
                });
            }


        });

        /**
         * Return view class.
         */
        return LotteryView;
    }
);
