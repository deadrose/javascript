/**
* @fileoverview Line Graph (interactive) view.
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
    'libs/flot/jquery.flot'
],
function (
    $,
    _,
    BaseView,
    PubSub,
    Utils,
    ChartStyles,
    InteractiveAds
) {
    var LineGraphView = BaseView.extend({
        currentSlide: 0,

        events: {
            'plothover .chart-area': 'lazyLineHover'
        },

        /**
         * Initialize view.
         * @param {Object} options View options passed during init.
         */
        initialize: function (options) {
            // Setup options.
            options.ads = true;
            if (options.isFramed || this.$el.data('suppressad') === true) {
                options.ads = false;
            }
            options.interactiveType = 'linechart';

            // call base class initialize
            BaseView.prototype.initialize.call(this, options);

            // Initializae ads for the interactive.
            this.subviews.interactiveAds = new InteractiveAds(options);
            this.addChart();
        },

        addChart: function() {
            var data = [],
                axisLabels = this.$el.data("axislabels"),
                chartRows = this.$(".data tr"),
                innerDataLength = 0;

            this.tickLabels = [];
           
            var colorId;
            if (this.options.isFramed === true) {
                colorId = "news";
            } else {
                colorId = this.$el.data('section') ? this.$el.data('section') : "news";
            }

            var colorOverride = this.$el.data('colors') || '',
                colorList = colorOverride !== "" ? colorOverride.split("|") : "",
                xAxisOverride = this.$el.data('xaxis') || '',
                colors = colorOverride !== "" ? colorList : ChartStyles.color[colorId];

            // Loop through each row to build the flot data array.
            $.each(chartRows, _.bind(function(index, value) {
                var row = $(value),
                // Find the label, which will always be the first td.
                label = row.find("td.label").text(),
                // Find each td.coord within each row and split it up into an x and y axis.
                innerData = [],
                legend = this.$(".chart-area-legend");

                legend.find("li:eq("+index+")").css("background-color", colors[index]);

                this.tickLabels = this.createTicks(xAxisOverride);

                row.find("td.coord").each(function() {
                    var coordsSrc = ($(this).text()).split(',');
                    innerData.push([coordsSrc[0], coordsSrc[1]]);
                });
                var lineColor;
                if (chartRows.length == 1 && colorOverride === '') {
                    lineColor = colors[2];
                } else {
                    lineColor = colors[index];
                }
                if (innerData.length > innerDataLength) {
                    innerDataLength = innerData.length;
                }

                data.push({
                    label: label,
                    data: innerData,
                    color: lineColor,
                    points: {
                        fillColor: lineColor
                    }
                });
            }, this));

            if (!data.length) {
                return;
            }

            var graph = this.$(".graph");
            if (graph.length < 1) {
                return;
            }

            var y_val = [];

            data.forEach(function(d) {
                d.data.forEach(function(d) {
                    y_val.push(d[1]);
                });
            });

            var min = Math.min.apply(Math, y_val);

            var p = $.plot(
                graph,
                data,
                this.buildFlotOptions(innerDataLength, min)
            );
        },

        buildFlotOptions: function(datalength, min) {
            var flotOptions = {
                legend: {
                    show: false,
                    noColumns: 1
                },
                xaxis: {
                    ticks: this.tickLabels,
                    autoscaleMargin: 0.03,
                    position: "bottom",
                    borderColor: "rgb(237,236,236)"
                },
                yaxis: {
                    position: "left",
                    labelHeight: 25,
                    borderColor: "rgb(237,236,236)",
                    min: 0,
                    tickFormatter: function numberWithCommas(x) {
                        return x.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ",");
                    }
                },
                series: {
                    lines: {
                        show: true
                    }
                },
                grid: {
                    borderWidth: 1,
                    borderColor: "rgb(237,236,236)",
                    labelMargin: 5,
                    axisMargin: 0,
                    clickable: true,
                    hoverable: true,
                    autoHighlight: true
                },
                colors: this.colors,
                pattern: ChartStyles.createPattern()
            };

            // Check for length of data
            if (datalength < 13) {
                flotOptions.series.points = {
                    show: true,
                    radius: 5,
                    fill: true
                };
            } else if (datalength > 13) {
                flotOptions.series.points = {
                    show: false
                };
            }

            if (min < 0) {
                flotOptions.yaxis = {
                    min: null
                };
            }

            return flotOptions;
        },

        lazyLineHover: function(){
            if (!this.lazyLineDebounce){
                this.lazyLineDebounce = _.debounce(this.lineHover, 10);
            }
            this.lazyLineDebounce.apply(this, arguments);
        },

        createTicks: function (tickData) {
            var labelArray = tickData.split("|"),
                newArray = [];
            $.each(labelArray, function (index, label) {
                newArray.push([index, label]);
            });
            return newArray;
        },

        lineHover: function (event, pos, obj) {
            var chartArea = this.$('.chart-area');
            if (!obj) {
               chartArea.find(".chart-hover").hide();
               return;
            } else {
               chartArea.find(".chart-hover").show();
            }
            var templ = " <div class='{{pointerClass}}'></div>{{label}}<h4 class='weather'>{{body}}</h4>";

            var chartHover = chartArea.find(".chart-hover"),
                prefix = chartArea.data("prefix"),
                suffix = chartArea.data("suffix"),
                yOffset = chartArea.offset().top,
                xOffset = chartArea.offset().left,
                pointerClass="",
                hoverCss="",
                top = yOffset + (chartArea.height() / 2),
                middleLeft =  xOffset + (chartArea.width() / 3),
                middleRight = xOffset + (chartArea.width() / 3) * 2,
                bottom = yOffset + ((chartArea.height() / 3) * 2),
                hoverClass = "",
                chartHoverHeight = chartHover.height(),
                chartHoverWidth = chartHover.width();

            if (pos.pageX < middleLeft) {
                hoverClass = "middleleft-hover";
                pointerClass = "pointer-left";
                hoverCss = {
                    top: pos.pageY - (chartHoverHeight / 2) - yOffset,
                    left: pos.pageX - xOffset
                };
            } else if (pos.pageX > middleRight) {
                hoverClass = "middleright-hover";
                pointerClass = "pointer-right";
                hoverCss = {
                    top: pos.pageY - (chartHoverHeight / 2) - yOffset,
                    left: pos.pageX - chartHoverWidth - xOffset - 10
                };
            } else if (pos.pageY < top) {
                hoverClass = "top-hover";
                pointerClass = "pointer-top";
                hoverCss = {
                    top: pos.pageY - yOffset,
                    left: pos.pageX - (chartHoverWidth / 2) - xOffset
                };
            } else if (pos.pageY > top) {
                hoverClass = "bottom-hover";
                pointerClass = "pointer-bottom";
                hoverCss = {
                    top: pos.pageY - chartHoverHeight - yOffset,
                    left: pos.pageX - (chartHoverWidth / 2) - xOffset
                };
            } else  {
                chartHover.hide();
            }

            var bodyTxt = prefix + "" + Utils.addCommas(obj.datapoint[1]) + " " + suffix;
            var labelTxt = (obj.series.label !== "")? "<h3>" + obj.series.label + "</h3>" : "<h3 class=\"empty\"></h3>";
            var content = templ.replace("{{pointerClass}}", pointerClass).replace("{{label}}", labelTxt).replace("{{body}}", bodyTxt);

            chartHover.css(hoverCss).html(content).attr("class", hoverClass + " chart-hover");
        }
    });


    /**
     * Return view class.
     */
    return LineGraphView;
});
