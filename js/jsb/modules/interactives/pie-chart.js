/**
 * @fileoverview Pie Chart (interactive) view.
 * @author Stan Wilson Jr
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'pubsub',
    'utils',
    'modules/interactives/chart-style-assets',
    'modules/interactives/interactive-ads',
    'libs/flot/jquery.flot',
    'libs/flot/jquery.flot.usat.pie'
],
function(
    $,
    _,
    BaseView,
    PubSub,
    Utils,
    ChartStyles,
    InteractiveAds
) {

    /**
     * View class.
     */
    var PieChartView = BaseView.extend({

        currentSlide: 0,

        events: {
            'plothover .chart-area': 'lazyPieHover'
        },

        /**
         * Initialize view for the pie and donut charts.
         * @param {Object} options View options passed during init.
         */
        initialize: function(options) {
            // Setup options.
            options.ads = true;
            if (options.isFramed || this.$el.data('suppressad') === true) {
                options.ads = false;
            }
            options.donut = this.$el.data('isdonut');
            options.interactiveType = options.donut ? 'donutchart' : 'piechart';

            // call base class initialize
            BaseView.prototype.initialize.call(this, options);

            // Initialize ads for the interactive.
            this.subviews.interactiveAds = new InteractiveAds(options);
            this.addChart();
        },

        /**
         * Gathers data from the DOM to build the flot pie or donut chart and
         * prints it to the screen.
         */
        addChart: function() {
            // Get information for the chart.
            var data = [],
                chartRows = this.$(".data tr");
            this.graph = this.$(".graph");

            // Set up the colors for the chart.
            var colorId;
            if (this.options.isFramed === true) {
                colorId = "news";
            } else {
                colorId = this.$el.data('section') ? this.$el.data('section') : "news";
            }
            var colorOverride = this.$el.data('colors') || '';
            this.colors = colorOverride !== "" ? colorOverride.split("|") : ChartStyles.color[colorId];

            // Loop through each row to build the flot data array.
            $.each(chartRows, _.bind(function(index, value) {
                var row =  $(value),
                    label = row.find("td:eq(0)").text(),
                    dataValue = parseFloat( row.find("td:eq(1)").text() );

                data.push({
                    label: label,
                    data: dataValue,
                    color: this.colors[index]
                });
            }, this));

            this.createLegend(data);

            // Build the flot options object and plot the chart.
            if (this.graph.length < 1) {
                return;
            }
            var p = $.plot(
                this.graph,
                data,
                this.buildFlotOptions()
            );
        },

        /**
         * Builds the options flot requires for the pie and donut charts.
         * @return {Object} flotOptions The flot options required for the charts.
         */
        buildFlotOptions: function() {
            var flotOptions = {
                series: {
                    pie: {
                        show: true,
                        stroke : {
                            color: "#fff",
                            width: 2
                        },
                        innerRadius: this.options.donut ? 0.48 : 0,
                        radius: this.options.donut ? 1 : 1
                    },
                    pattern: ChartStyles.createPattern("rgba(256,256,256,0.25)")
                },
                grid: {
                    hoverable: true,
                    clickable: true
                },
                legend: {
                    show: false
                }
            };
            return flotOptions;
        },

        /**
         * Creates the unordered list legend for each of the labels in the
         * pie or donut chart.
         * @param {Object} data Object containing information on each label.
         */
        createLegend: function(data) {
            var ulTmpl = "<ul class='row-{{row-num}}'>{{content}}</ul>",
                liTmpl = "<li class='item-{{number}}' style='{{custom}}'><h4>{{label}}</h4></li>",
                content = "";

            $.each(data, _.bind(function(index, item) {
                // Adding real data to templates and potentially adding css overrides
                var liStyle = (this.$el.data('colors')) ? "background-color:" + this.colors[index] : "",
                    li = liTmpl.replace("{{number}}", index + 1).replace("{{label}}", item.label).replace("{{custom}}", liStyle);
                content +=  li;
            }, this));

            // Adding data to UL
            var ul = ulTmpl.replace("{{content}}", content).replace("{{row-num}}", "1");

            // Adding UL to legend container 
            this.$(".chart-area-legend").html(ul);
        },

        /**
         * Called when the user hovers over the chart.
         */
        lazyPieHover: function() {
            if (!this.lazyPieDebounce) {
                this.lazyPieDebounce = _.debounce(this.pieHover, 10);
            }
            this.lazyPieDebounce.apply(this, arguments);
        },

        /**
         * Builds and displays tool tip that appears when hovering over a chart slice.
         * @param {Object} event JavaScript event object.
         * @param {Object} pos JavaScript object with user coordinates.
         * @param {Object} obj Object containing information about the hovered bar.
         */
        pieHover: function(event, pos, obj) {
            var chartArea = this.$('.chart-area');
            if (!obj) { 
                chartArea.find(".chart-hover").hide();
                return;
            } else {
                chartArea.find(".chart-hover").show();
            }
            var templ = "<div class='{{pointerClass}}'></div><h3>{{label}}</h3><h4>{{body}}</h4>";
            var chartHover = chartArea.find(".chart-hover"),
                prefix = chartArea.data("prefix"),
                suffix = chartArea.data("suffix"),
                chartXoffset = this.graph.offset().left,
                chartYoffset = this.graph.offset().top,
                top = ( this.graph.height() / 3 ) + chartYoffset,
                middleLeft = this.options.donut ? this.graph.offset().left + ( this.graph.width() / 3 ) : ( this.graph.width() / 2 ) + this.graph.offset().left,
                middleRight = this.options.donut ? ( (this.graph.width() / 3) * 2 ) + this.graph.offset().left : ( this.graph.width() / 2 ) + this.graph.offset().left,
                bottom = this.graph.offset().top + ( ( this.graph.height() / 3 ) * 2 ),
                hoverClass = "",
                hoverCss = {},
                chartHoverHeight = chartHover.height(),
                chartHoverWidth = chartHover.width();
            if (pos.pageY < top) {
                hoverClass = "top-hover";
                hoverCss = {
                    top: pos.pageY - chartYoffset,
                    left: (pos.pageX - (chartHoverWidth / 2)) - chartXoffset
                };
            } else if (pos.pageY > bottom) {
                hoverClass = "bottom-hover";
                hoverCss = {
                    top: (pos.pageY - chartHoverHeight) - chartYoffset,
                    left: (pos.pageX - (chartHoverWidth / 2) - chartXoffset)
                };
            } else if (pos.pageX < middleLeft) {
                hoverClass = "middleleft-hover";
                hoverCss = {
                    top: (pos.pageY - (chartHoverHeight / 2)) - chartYoffset,
                    left: pos.pageX - chartXoffset
                };
            } else if (pos.pageX > middleRight) {
                hoverClass = "middleright-hover";
                hoverCss = {
                    top: (pos.pageY - (chartHoverHeight / 2)) - chartYoffset,
                    left: (pos.pageX - chartHoverWidth) - chartXoffset - 10
                };
            } else {
                chartArea.find(".chart-hover").hide();
            }

            var pointerClass = "pointer-"+(hoverClass).replace('-hover','').replace("middle",""),
                percent = parseFloat(obj.series.percent).toFixed(0),
                bodyTxt = this.options.donut ?  prefix + " " + Utils.addCommas(obj.datapoint[1][0][1]) + " " + suffix :  percent + "%",
                content = templ.replace("{{pointerClass}}",pointerClass).replace("{{label}}",obj.series.label).replace("{{body}}",bodyTxt);  

            chartHover.css(hoverCss).attr("class",hoverClass+" chart-hover").html(content);
        }
    });
        
    /**
     * Return view class.
     */
    return PieChartView;
});
