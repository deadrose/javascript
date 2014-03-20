/**
* @fileoverview Team leaders module.
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
    var TeamLeaders = BaseView.extend({

        events: {
            'click .front-gallery-link': 'onSuspenderItemClick'
        },

        initialize: function() {
            BaseView.prototype.initialize.call(this, this.options);
            this.links = this.$('.front-gallery-link');
            this.viewport = this.$('.sp-team-leaders-viewport');
            this.slider = this.$('.sp-team-leaders-slider');
            this.views = this.$('.sp-team-leaders-wrap');
            //For Team statistics modules
            this.charts = this.$('.sports-team-statistics-charts');
            this.animateGraphs(this.charts.eq(0));
        },

        onSuspenderItemClick: function(e){
            var clickedItem = $(e.currentTarget),
                id = clickedItem.data('id'),
                module_name = clickedItem.data('modules-name'),
                selectedClass = 'selected';
            e.preventDefault();
            this.links.parent().removeClass(selectedClass);
            this.links.filter(clickedItem).parent().addClass(selectedClass);

            if (module_name === 'team-leaders') {
                this.views.removeClass('selected');
                this.views.filter('.sp-team-leaders-wrap-' + id).addClass(selectedClass);
            } else if (module_name === 'team-statistics') {
                this.$target_stats = this.$('.sports-team-statistics-charts-'+id);
                this.animateGraphs(this.$target_stats);
                // STEP 2: Switch to targeted stats set
                this.charts.hide();
                this.$target_stats.show();
            }
        },

        animateGraphs: function($target_stats){
            var delayTicker = 100,
                $category = $target_stats.find('.sports-team-statistics-chart-group .category'),
                $graph_bars = $target_stats.find('.sports-team-statistics-chart-group .bar'),
                $graph_values = $target_stats.find('.sports-team-statistics-chart-group .value');

            // STEP 1: Reset bars to zero and hide categories, graph-values
            $graph_bars.css('height','0%');
            $category.hide();
            $graph_values.hide();

            // STEP 2: Fade in category titles
            $category.fadeIn(1000);

            // STEP 3: Animate bars one-by-one
            $graph_bars.each(function(idx, el){
                $(el).delay(delayTicker).animate({'height': $(el).data('percentage')}, 500, 'easeOutElastic');
                delayTicker += 100;
            });

            // STEP 4: Fade in graph-values
            $graph_values.delay(delayTicker).fadeIn(1000);
        }

    });

    return TeamLeaders;
});
