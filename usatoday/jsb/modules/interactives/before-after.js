 /**
 * @fileoverview Before After (interactive) view.
 * @author stwilson@gannett.com (Stan Wilson Jr), mdkennedy@gannett.com (Mark Kennedy)
 */
define([
    'jquery',
    'underscore',
    'pubsub',
    'utils',
    'baseview',
    'modules/interactives/interactive-templates'
],
function(
    $,
    _,
    PubSub,
    Utils,
    BaseView,
    Template
) {

    /**
     * View class.
     */
    var BeforeAfterView = BaseView.extend({

        events: function() {
            if (Modernizr.touch) {
                return {"touchstart .before-after-caption-toggle": "toggleCaption"};
            } else {
                return {"click .before-after-caption-toggle": "toggleCaption"};
            }
        },

        /**
         * Initialize view.
         * @param {Object} options View options passed during init.
         */
        initialize: function(options) {
            _.bindAll(this, 'setUpSlider' );
            BaseView.prototype.initialize.call(this, options);

            if (this.$el.length){
                //setup interactive template view
                this.subviews.template = new Template({
                    'el': this.$el,
                    'interactiveType' : "beforeandafter",
                    'isFramed': options.isFramed,
                    'standAlone': options.standAlone
                });
                this.subviews.template.goTo(this.subviews.template.currentSlideIndex);
                this.setUpSlider();
            }
        },

        setUpSlider : function(){
            var mod = this;
            var dragRequire = [
                'draggable'
            ];
            if (Modernizr.touch) {
                dragRequire.push('touchpunch');
            }
            require(dragRequire, function() {
                var options = {
                    animateIntro: true,
                    introDuration: 1500,
                    introPosition: 0.50,
                    cursor: 'e-resize',
                    dividerColor: 'none',
                    dividerWidth: 2,
                    handleLeftOffset: -25,
                    dragAreaWidth: 910,
                    onReady: function () {   }
                };

                this.$(".image-container").each( function() {
                    mod.beforeAfter(options, $(this), mod.subviews.template);
                });
            });
        },
        
        toggleCaption : function(){
            var caption  = this.$(".meta");
            if (caption.length > 0) {
                caption = this.$(caption[this.subviews.template.currentSlideIndex]);
            }
            var captionButton = this.$(".before-after-caption-toggle"),
                captionVisible = caption.is(':visible'),
                updateText = function() {
                    var text = captionVisible ? "Show Caption" : "Hide Caption";
                    captionButton.text(text);
                };
            caption.fadeToggle( updateText );
            if (this.options.isFramed !== true) {
                var tracking = captionVisible ?  "beforeandafter_caption_off" : "beforeandafter_caption_on";
                this.subviews.template.trackClick(tracking);
            }
        },

        beforeAfter: function(options, $imgContainer, template) {
            var defaults = {
                animateIntro: false,
                introDelay: 1000,
                introDuration: 1000,
                introPosition: 0.50,
                cursor: 'pointer',
                dividerColor: '#888',
                dividerWidth: 2,
                handleLeftOffset: -3,
                dragAreaWidth: 0,
                onReady: function() {}
            };
            options = $.extend(defaults, options);
            var randID =  Math.round(Math.random()*100000000);
            return $imgContainer.each(function() {
                var o = options,
                    $this = $imgContainer,
                    $slider = $('.slider-drag-area', $this),
                    $dragHandle = $('.drag img', $this),
                    $dragWrapper = $('.drag-wrapper', $this),
                    $before = $('.before', $this),
                    $after = $('.after', $this),
                    imgWidth = $before.find('img').width(),
                    imgHeight = $before.find('img').height(),
                    percentStart = imgWidth * o.introPosition,
                    strDragAreaHTML;

                $this.width(imgWidth).height(imgHeight);
            
                $slider.css({
                    'height': $this.height(),
                    'width': o.dragAreaWidth !== 0 ? o.dragAreaWidth : $this.width()
                });

                $dragWrapper.width($dragHandle.width())
                    .height(imgHeight)
                    .css({
                        'left': (percentStart) - ($dragHandle.width()/2) + 'px'
                    });

                $before.width(percentStart);
                $after.width(imgWidth);

                $('.drag', $this).width(o.dividerWidth)
                    .height(imgHeight)
                    .css({
                        'background': o.dividerColor
                    });

                $dragHandle.css({
                    'cursor': o.cursor,
                    'top': (imgHeight/2)-($dragHandle.height()/2) + 'px',
                    'left': o.handleLeftOffset + 'px'
                });

                function drag() {
                    $before.width(parseInt($(this).css('left'), 10) + 4);               
                }

                $dragWrapper.draggable({ 
                    containment: $slider,
                    drag: drag,
                    stop: drag,
                    axis: "x"
                });

                var draggerOffset = $dragWrapper.width() / 2 - (Math.abs(o.handleLeftOffset) - o.dividerWidth);

                function clickit() {
                    // When clicking in the container, move the bar and imageholder divs
                    $this.click(function(e){
                        template.trackFirstClick();
                        var clickX = e.pageX - $(this).offset().left;
                        $dragWrapper.stop()
                            .css("left", (clickX - draggerOffset) + 'px');
                        $before.stop().width(clickX + 'px');
                    });

                }

                if (o.animateIntro) {
                    $before.width(imgWidth);
                    $dragWrapper.css('left', (imgWidth - draggerOffset) + 'px');
                    setTimeout(function() {
                        $dragWrapper.animate({
                            'left': (percentStart - draggerOffset) + 'px'
                        }, o.introDuration);
                        $before.width(imgWidth)
                            .animate({
                                'width': percentStart + 'px'
                            }, o.introDuration, function() {
                                clickit();
                                o.onReady.call(this);
                            });
                    }, o.introDelay);
                } else {
                    clickit();
                    o.onReady.call(this);
                }
            });
        }
    });

    /**
     * Return view class.
     */
    return BeforeAfterView;
});
