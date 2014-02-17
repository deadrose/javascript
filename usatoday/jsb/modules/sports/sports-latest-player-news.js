/**
* @fileoverview JS functionality for latest player news
*/
define([
    'jquery',
    'underscore',
    'backbone',
    'base-app',
    'modules/sports/sports-module-update'
],
function(
    $,
    _,
    Backbone,
    BaseApp,
    SportsModuleUpdate
)
    {
        var LatestPlayerNewsView = BaseApp.extend({

            initialize: function (options) {
                BaseApp.prototype.initialize.call(this, options);

                var $playerNews = $(this.el).find('.sports-latest-player-news');
                var moreLink = $playerNews.data('livefeed-more-link') || null;
                var moreLinkText = $playerNews.data('livefeed-more-link-text') || 'More...';

                this.subviews.updatemodule = new SportsModuleUpdate({
                    el: '.livefeed-news-list',
                    maxItems: 5,
                    getItems: 5,
                    removeNewHighlight: 20,
                    updateDelay: 30,
                    dataSrcAttr: 'data-src',
                    dataSection: 'data-livefeed',
                    dataLoading: 'livefeed-loading',
                    dataTimeStamp: 'data-timestamp',
                    dataContentId: 'data-content-id',
                    moreLink: moreLink,
                    moreLinkText: moreLinkText,
                    newContentClass: 'newcontent'
                });
            }
        });
        return LatestPlayerNewsView;
    }
);
