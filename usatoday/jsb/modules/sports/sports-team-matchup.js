/**
* @fileoverview Team Matchup module.
* @author mdkennedy@gannett.com (Mark Kennedy)
*/
define([
    'jquery',
    'underscore',
    'backbone',
    'baseview',
    'easing'
],
function(
    $,
    _,
    Backbone,
    BaseView
) {

    /**
     * View class.
     */
    var TeamMatchup = BaseView.extend({

        initialize: function() {
            BaseView.prototype.initialize.call(this, this.options);
            var delayTicker = 0;
            var away_bars = this.$('.sp-matchup-away-stat-chart-fill');
            var home_bars = this.$('.sp-matchup-home-stat-chart-fill');
            away_bars.each(_.bind(function(idx, el){
                this.animBar($(el), delayTicker);
                this.animBar(home_bars.eq(idx), delayTicker);
                delayTicker += 100;
            }, this));
        },

        animBar: function($el, delay) {
            $el.delay(delay).animate({'width': $el.data('percentage')}, 175, 'easeInQuad');
        }

    });

    return TeamMatchup;
});
