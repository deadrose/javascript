/**
 * @fileoverview Sports News module view.
 * @author Kent Lee <kklee@usatoday.com>
 */
define([
    'jquery',
    'underscore',
    'utils',
    'state',
    'pubsub',
    'baseview'
],
function(
    $,
    _,
    Utils,
    StateManager,
    PubSub,
    BaseView
) {

    var SportsNewsView = BaseView.extend({

        initialize: function(options) {
            BaseView.prototype.initialize.call(this, options);
            this.$newsBlock = this.$('.sp-news-wrap');
            this.loadTaxonomyNews(this.$newsBlock.data('url'));
        },

        loadTaxonomyNews: function(url) {
            var that = this;
            StateManager.fetchHtml(url, { timeout: 100000 }).done(_.bind(function(html) {
                if (html && html.length) {
                    that.$('.card-suspender-title').removeClass('hide');
                    that.$newsBlock.html(html);
                }
            }, this));
        },

        destroy: function(removeEl){
            BaseView.prototype.destroy.call(this, removeEl);
        }

    });

    return SportsNewsView;
});