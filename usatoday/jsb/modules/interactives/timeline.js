/**
 * @fileoverview Timeline (interactive) view.
 * @author cmanning@gannett.com (Chris Manning), mdkennedy@gannett.com (Mark Kennedy)
 */
define([
    'jquery',
    'underscore',
    'pubsub',
    'utils',
    'baseview',
    'modules/interactives/interactive-templates',
    'modules/global/brightcove-video',
    'touchswipe'
],
function(
    $,
    _,
    PubSub,
    Utils,
    BaseView,
    Template,
    Video,
    TouchSwipe
)
    {

        /**
         * View class.
         */
        var TimelineView = BaseView.extend({

            // Events.
            events: {
                'click .timeslider .marker': 'renderButtonClick',
                'click .slide-nav.prev, .slide-nav.next': 'renderArrowClick'
            },

            /**
             * Initialize view.
             * @param {Object} options View options passed during init.
             */
            initialize: function(options) {
                // call base class initialize
                BaseView.prototype.initialize.call(this, options);

                //setup interactive template view
                this.subviews.template = new Template({
                    'el': this.$el,
                    'interactiveType' : "timeline",
                    'isFramed': options.isFramed,
                    'standAlone': options.standAlone
                });
                this.$leftArrow = this.subviews.template.$leftArrow;
                this.$rightArrow = this.subviews.template.$rightArrow;
                this.$slideContainer = this.subviews.template.$slideContainer;
                this.$slides = this.subviews.template.$slides;
                this.$viewport = this.subviews.template.$viewport;
                this.$timeslider = this.$(".timeslider");
                this.$timesliderBelt = this.$timeslider.find(".belt");
                this.$timesliderBuckle = this.$timeslider.find(".buckle");
                this.$timesliderLabelContainer = this.$timeslider.find('.labels');
                this.$timesliderLabels = this.$timesliderLabelContainer.find('.label');
                this.$contentBox = this.$slideContainer.find(".timeline-slide-content");
                this.$contentIndicator = this.$contentBox.find(".indicator");
                this.$gridLines = this.$viewport.find(".grid-line");

                this.numLabels = 13;
                this.arrEventPositions = [];
                this.maxSlides = this.subviews.template.maxSlides;
                this.speed = 500;
                this.arrayPanelMax = 850; //max width of elements inside of stage + 24 pix for padding
                this.numPanelMinLefts = 6;
                this.numMarkerWidth = 9;
                this.strDateBegin = "";
                this.strDateEnd = "";
                this.blnFirstClickDone = false;
                this.currentSlideIndex = this.subviews.template.currentSlideIndex;

                var dragRequire = ['draggable'];
                var dragOptions = {
                    containment: ".buckle-box",
                    cursor: "move",
                    stop: _.bind(this.snapToMarker, this)
                };
                if (Modernizr.touch) {
                    dragRequire.push('touchpunch');
                    dragOptions.delay = 200;

                    var self = this;
                    this.$('.stage').swipe({
                        self: self,
                        swipe: function(e, direction, distance, duration, fingerCount, swipeOptions) {
                            if (direction === 'right' || direction === 'down') {
                                swipeOptions.self.previousSlide();
                            } else {
                                swipeOptions.self.nextSlide();
                            }
                        }
                    });
                }
                require(dragRequire, _.bind(function() {
                    this.loadData();
                    this.$timesliderBuckle.draggable(dragOptions);
                }, this));
            },

            loadData: function() {
                var timeSliderContent = "",
                    viewportData = this.$viewport.data() || {},
                    _this = this;
                this.strDateBegin = viewportData.graphstart;
                this.strDateEnd = viewportData.graphend;

                this.$slides.each(function(index) {
                    var percent = $(this).find('.timeline-slide-content').data().tlpercent;
                    var panelMax = parseInt(_this.arrayPanelMax, 10);
                    var numLeftPosition = Math.round( ( percent * panelMax ) + 27);
                    _this.arrEventPositions[index] = numLeftPosition;
                    timeSliderContent += "<div class=\"marker\" style=\"left:" + numLeftPosition + "px;\"></div>";
                });
                this.$timesliderBelt.append(timeSliderContent);
                this.maxEvents = this.arrEventPositions.length;
                this.setUpLabels();
                //move belt buckle to initial position
                this.$('.timeslider .marker').eq(0).trigger('click');
            },

            setUpLabels: function() {
                var dateStart = this.strDateBegin,
                    dateEnd = this.strDateEnd,
                    numTimeSpan = dateEnd - dateStart,
                    _this = this,
                    panelMax = _this.arrayPanelMax;
                // position labels
                this.$timesliderLabels.each(function(index) {
                    var labelDate = $(this).data().labelms,
                    numLeftPosition = Math.round((((labelDate - dateStart) / numTimeSpan) * ( panelMax )));
                    $(this).css('left', numLeftPosition);
                });
                // position gridlines
                this.$gridLines.each(function(index) {
                    var value = _this.$timesliderLabels.eq(index).position().left + 33 + 'px';
                    $(this).css('left', value);
                });
                this.$timesliderLabels.find(".time").fadeIn("slow");
            },
            
            
            renderButtonClick: function(e) {
                var target = $(e.target);
                var _parent = target.parent().find(".marker"); 
                this.goTo( _parent.index(target));

                // This function is called on initial load, so don't track until the user has actually clicked.
                if( this.blnFirstClickDone ){
                    if (this.options.isFramed !== true) {
                        this.subviews.template.trackPageView();
                    }
                }else{
                    this.blnFirstClickDone = true;
                }
            },
            
            renderArrowClick: function(e) {
                if ($(e.currentTarget).is(this.$leftArrow)) {
                    this.previousSlide();
                } else {
                    this.nextSlide();
                }

                if (this.options.isFramed !== true) {
                    this.subviews.template.trackPageView();
                }
            },

            goTo: function(index){           
                var oldSlideIndex = this.currentSlideIndex,
                    newSlideIndex = index;
                var numLeftPosition;
                var _this = this;
                _this.currentSlideIndex = newSlideIndex;

                var currentPanelWidth = parseInt( _this.$contentBox.eq(newSlideIndex).width(), 10) ;
                var maxLeft = this.arrayPanelMax - currentPanelWidth;

                //move timeslider buckle to current slide
                this.$timesliderBuckle.css("left", (this.arrEventPositions[newSlideIndex] - 19).toString() + "px");

                // calculate positions
                numLeftPosition = Math.round(this.arrEventPositions[newSlideIndex] + (this.numMarkerWidth / 2) - currentPanelWidth / 2);
                if (numLeftPosition > maxLeft) {
                    numLeftPosition = maxLeft;
                } else if (numLeftPosition < this.numPanelMinLefts) {
                    numLeftPosition = this.numPanelMinLefts;
                }

                //move indicator to correct position
                this.$slides.eq(newSlideIndex)
                    .find('.indicator')
                    .css("left", ( this.arrEventPositions[newSlideIndex] - 8 ) - numLeftPosition.toString() + "px");

                this.$slides.removeClass('active')
                    .eq(newSlideIndex)
                    .css("left", numLeftPosition.toString() + "px")
                    .addClass('active');

                //open all content links in new window
                this.$contentBox.find(".text a").attr("target", "_blank");

                this.subviews.template.goTo(newSlideIndex);

                //set current slide index
                this.currentSlideIndex = newSlideIndex;
            },

            previousSlide: function() {
                this.goTo(Math.max(this.currentSlideIndex-1, 0));
            },

            nextSlide: function() {
                this.goTo(Math.min(this.currentSlideIndex+1, this.maxSlides-1));
            },

            snapToMarker: function (e) {
                var numClosest = 850, numIndex, i, objScrubber = $(e.target);
                var numScrubberPosition = Number(objScrubber.css("left").replace("px", ""));
                for (i = 0; i < this.arrEventPositions.length; i++) {
                    if (Math.abs((numScrubberPosition + 19) - this.arrEventPositions[i]) < numClosest) {
                        numIndex = i;
                        numClosest = Math.abs((numScrubberPosition + 19) - this.arrEventPositions[i]);
                    }
                }

                if (this.options.isFramed !== true) {
                    this.subviews.template.trackPageView();
                }
                this.goTo(numIndex);
            }
        });

        /**
         * Return view class.
         */
        return TimelineView;
    }
);