 /**
 * @fileoverview Bar Chart (interactive) view.
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
    'libs/flot/jquery.flot.multibars',
    'libs/flot/jquery.flot.usat.style'
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
    var BarChartView = BaseView.extend({

        currentSlide: 0,

        events: {
            'plothover .chart-area': 'lazyBarHover'
        },

        /**
         * Initialize view for the bar graphs.
         * @param {Object} options View options passed during init.
         */
        initialize: function(options) {
            // Setup options.
            options.ads = true;
            if (options.isFramed || this.$el.data('suppressad') === true) {
                options.ads = false;
            }
            options.interactiveType = 'barchart';
            options.orientation = this.$el.data('orientation');

            // call base class initialize
            BaseView.prototype.initialize.call(this, options);

            // Initialize ads for the interactive.
            this.subviews.interactiveAds = new InteractiveAds(options);
            this.addChart();
        },

        /**
         * Gathers data from the DOM to build the flot bar chart and
         * prints it to the screen.
         */
        addChart: function() {
            var data = [],
                axisLabels = this.$el.data("axislabels") || '',
                chartRows = this.$(".data tr");

            this.barType = this.$el.data("ismulti") ? "multi" : "single";
            this.tickLabels = [];

            // Set up the colors for the graph.
            var colorId;
            if (this.options.isFramed === true) {
                colorId = "news";
            } else {
                colorId = this.$el.data('section') ? this.$el.data('section') : "news";
            }
            var colorOverride = this.$el.data('colors') || '',
                colorList = colorOverride !== "" ? colorOverride.split("|") : "",
                singleColor = '';
            if (colorList !== '') {
                singleColor = colorList[0];
                this.colors = colorList;
                this.colorsLegend = colorList.slice(0);
                // Horizontal graphs have to have the colors reversed to make them match the
                // legend's order when graphed.
                if (this.options.orientation === 'horizontal' &&
                    chartRows.length > 1
                ) {
                    this.colors.reverse();
                }
            } else {
                singleColor = ChartStyles.color[colorId][2];
                // Horizontal graphs have to have the colors reversed to make them match the
                // legend's order when graphed.
                if (this.options.orientation === 'horizontal' &&
                    chartRows.length > 1
                ) {
                    this.colors = ChartStyles.color[colorId].slice(0, chartRows.length);
                    this.colors.reverse();
                } else {
                    this.colors = ChartStyles.color[colorId];
                }
            }

            // Loop through each row to build the flot data array.
            $.each(chartRows, _.bind(function(index, value) {
                var row = $(value),
                    // Find the label, which will always be the first td.
                    label = row.find("td.label").text(),
                    // Find each td.coord within each row and split it up into an x and y axis.
                    innerData = [],
                    legend = this.$(".chart-area-legend");

                // If this table is not multi, the labels are just the labels.
                // If it is multi, the labels are what is established in the axislabels data.
                if (this.barType !== "multi") {
                   this.$(".chart-area-legend").hide();
                } else if (colorOverride !== "") {
                    legend.find("li:eq("+index+")").css("background-color", this.colorsLegend[index]);
                }

                row.find("td.coord").each(function() {
                    var coordsSrc = ($(this).text()).split(',');
                    innerData.push([coordsSrc[0], coordsSrc[1]]);
                });
                var lineColor = this.barType === "multi" ? "rgb(256, 256, 256)" : (innerData[0][1] < 0) ? "#900" : singleColor;

                data.push({
                    label: label,
                    data: innerData,
                    color: lineColor,
                    bars: {
                        borderWidth: 30,
                        fillColor: this.barType === "multi" ? this.colors[index] : (innerData[0][1] < 0) ? "#900" : singleColor
                    }
                });
            }, this));

            this.tickLabels = this.createTicks(axisLabels);

            if (!data.length) {
                return;
            }

            // Build the flot options object and plot the chart.
            var graph = this.$(".graph");
            if (graph.length < 1) {
                return;
            }
            var p = $.plot(
                graph,
                data,
                this.buildFlotOptions(this.countBars(data), data.length)
            );
        },

        /**
         * Builds and displays tool tip that appears when hovering over a bar.
         * @param {Object} event JavaScript event object.
         * @param {Object} pos JavaScript object with user coordinates.
         * @param {Object} obj Object containing information about the hovered bar.
         */
        barHover: function(event, pos, obj) {
            var chartArea = this.$('.chart-area'),
                yOffset = chartArea.offset().top,
                xOffset = chartArea.offset().left,
                chartHover = chartArea.find(".chart-hover"),
                prefix = chartArea.data("prefix"),
                suffix = chartArea.data("suffix"),
                pointerClass;

            if (!obj) {
                chartHover.hide();
                return;
            } else {
                chartHover.show();
            }
            var label =   obj.series.label,
                templ = "<div class='{{pointerClass}}'></div>";
            
            if (this.barType !== "multi") {
                templ += "<p></p>";
            } else {
                templ += "<h3>{{label}}</h3>";
            }
            templ += "<h4 class='weather'>{{body}}</h4>";
            var top = yOffset + (chartArea.height() / 2),
                middleLeft = xOffset + (chartArea.width() / 3),
                middleRight = xOffset + (chartArea.width() / 3) * 2,
                bottom = yOffset + ((chartArea.height() / 3) * 2),
                hoverClass = "",
                hoverCss = {},
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

            var datapointIndex = this.options.orientation == 'horizontal' ? 0 : 1;
            var bodyTxt = prefix + "" + Utils.addCommas(obj.datapoint[datapointIndex]) + " " + suffix,
                content = templ.replace("{{pointerClass}}", pointerClass).replace("{{label}}", label ).replace("{{body}}", bodyTxt);

            chartHover.css(hoverCss).html(content).attr("class", hoverClass + " chart-hover");
        },

        /**
         * Builds the options flot requires for the bar graph.
         * Accomodates both vertical and horizontal orientations.
         * @param {Number} barCount The number of bars the graph has.
         * @return {Object} flotOptions The flot options required for the bar graph.
         */
        buildFlotOptions: function(barCount, dataSets) {
            var flotOptions = {
                multiplebars: (this.barType === 'multi')? true : false,
                legend: {
                    show: false
                },
                series: {
                    bars: {
                        show: true,
                        borderWidth: 30,
                        barWidth: this.calculateBarWidth(barCount, dataSets),
                        align: "center",
                        order: "integer"
                    }
                },
                grid: {
                    borderWidth: 1,
                    labelMargin: 5,
                    axisMargin: 0,
                    clickable: true,
                    hoverable: true,
                    autoHighlight: true,
                    borderColor: "rgb(237,236,236)"
                },
                colors: this.colors,
                pattern: ChartStyles.createPattern()
            };

            // Deal with orientation-specific settings.
            if (this.options.orientation === 'horizontal') {
                flotOptions.xaxis = {
                    position: "bottom",
                    autoscaleMargin: this.calculateAutoScaleMargin(barCount, 'x'),
                    tickFormatter: function numberWithCommas(x) {
                        return x.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ",");
                    }
                };
                flotOptions.yaxis = {
                    ticks: this.tickLabels,
                    position: "left",
                    tickLength: 0,
                    labelWidth: this.calculateLabelWidth(),
                    autoscaleMargin: this.calculateAutoScaleMargin(barCount, 'y')
                };
                flotOptions.bars = {
                    horizontal: true
                };
            } else {
                flotOptions.xaxis = {
                    ticks: this.tickLabels,
                    position: "bottom",
                    tickLength: 0,
                    autoscaleMargin: this.calculateAutoScaleMargin(barCount, 'x')
                };
                flotOptions.yaxis = {
                    position: "left",
                    labelWidth: 40,
                    tickFormatter: function numberWithCommas(x) {
                        return x.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ",");
                    }
                };
            }
            return flotOptions;
        },

        /**
         * Builds the ticks array for the flot chart.
         * @param {String} tickData Pipe delimited string of labels for the ticks.
         * @return {Array} newArray
         */
        createTicks : function (tickData) {
            var labelArray = tickData.split("|"),
                newArray = [];

            $.each(labelArray, function (index, label) {
                newArray.push([index, label]);
            });
            return newArray;
        },

        /**
         * Calculates the autoscaleMargin value for the flot graph.
         * @param {Number} barCount Number of bars to display.
         * @param {String} axis The graph axis for the margin.
         * @return {Number} margin
         */
        calculateAutoScaleMargin: function(barCount, axis) {
            var margin = 0;
            if (this.options.orientation === 'horizontal' && axis === 'x') {
                margin = 0.01;
            } else if (this.options.orientation === 'horizontal' && axis === 'y' ||
                this.options.orientation === 'vertical' && axis === 'x'
            ) {
                if (barCount < 5) {
                    margin = 0.2;
                } else if (barCount >= 5 && barCount < 8) {
                    margin = 0.07;
                } else if (barCount >= 8 && barCount < 10) {
                    margin = 0.03;
                } else if (barCount >= 10) {
                    margin = 0.02;
                }
            }
            return margin;
        },

        /**
         * Calculates the width of bars for the flot graph.
         * @param {Number} barCount Number of bars to display.
         * @param {Number} dataSets Number of different sets of data.
         * @return {Number} width
         */
        calculateBarWidth: function(barCount, dataSets) {
            var width = 0.8;
            if (this.barType === 'multi') {
                if (barCount < 4) {
                    width = 0.4;
                } else if (barCount >= 4 && barCount < 18) {
                    width = 0.32;
                } else {
                    width = 0.25;
                }
                if (dataSets === 3) {
                    width *= 0.8;
                }
                if (dataSets === 4) {
                    width *= 0.5;
                }
            } else {
                if (this.options.orientation === 'horizontal') {
                    if (barCount < 6) {
                        width = 0.6;
                    } else if (barCount >= 6) {
                        width = 0.7;
                    }
                } else {
                    if (barCount < 5) {
                        width = 0.5;
                    } else if (barCount >= 5 && barCount < 7) {
                        width = 0.6;
                    } else if (barCount >= 7 && barCount <= 9) {
                        width = 0.7;
                    }
                }
            }
            return width;
        },

        /**
         * Calculates the approximate width of the y axis labels for horizontal
         * graphs.
         * @return {Number} labelWidth
         */
        calculateLabelWidth: function() {
            var labelWidth = 90,
                maxWidth = 0;
            this.$('.hiddenLabels .tickLabel').each(function(index) {
                var $this = $(this),
                    currentWidth = $this.width();
                if (maxWidth < currentWidth) {
                    maxWidth = currentWidth;
                }
            });
            // Add some padding to keep the labels from touching the axis descriptor.
            if (maxWidth + 10 < labelWidth) {
                labelWidth = maxWidth + 10;
            }
            return labelWidth;
        },

        /**
         * Calculates the number of bars for the flot graph.
         * @param {Array} barData Array containing the data for the graph.
         * @return {Number} barCount
         */
        countBars: function(barData) {
            var dataLength = barData.length,
                barCount = 0;
            for (var i = 0; i < dataLength; i ++) {
                barCount = barCount + barData[i].data.length;
            }
            return barCount;
        },

        /**
         * Called when the user hovers over a bar.
         */
        lazyBarHover: function() {
            if (!this.lazyBarDebounce) {
                this.lazyBarDebounce = _.debounce(this.barHover, 10);
            }
            this.lazyBarDebounce.apply(this, arguments);
        }
   });

    /**
     * Return view class.
     */
    return BarChartView;
});
