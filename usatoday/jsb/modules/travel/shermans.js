/**
 * @fileoverview Shermans Deals module.
 * @author bbagley@gannett.com (Brendan Bagley)
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'state',
    'baseview'
],
function(
    $,
    _,
    Backbone,
    StateManager,
    BaseView
) {
    "use strict";
        /**
         * View class.
         */
        var shermansView = BaseView.extend({

            /**
             * Initialize view.
             * @param {object} options to pass in modules options
             */
            initialize: function(options) { 

                this.$dealsList = this.$('.shermans-deal-list');
                this.$placeholder = this.$('.shermans-placeholder');

                BaseView.prototype.initialize.call(this, options);

                StateManager.fetchData('http://api.deals.shermanstravel.com/v1/deals?consumer_key=8a3c1b45da1e6e8e919bd0d42d7a130e9bbaea645886122733bd7f23802f0b0c', { dataType: 'jsonp' }).done(_.bind(function(data) {

                    this.displayDeals(data.deals);
                }, this)).fail(_.bind(function(e) {
                    this.$placeholder.html("No deals..");
                }, this));
            },

            displayDeals: function(deals) {
                _.each(deals, _.bind(function(deal) {
                    if(deal.title.length>45) {
                        deal.title = deal.title.slice(0,44) + '...';
                    }

                    var html = '<li><a href="' + deal.url + '" target="_blank">' + deal.title + '</a></li>';
                    this.$dealsList.append(html);
                }, this));

                this.$placeholder.hide();
            }

        });

        /**
         * Return view class.
         */
        return shermansView;
    }
);