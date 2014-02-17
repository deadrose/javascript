/**
 * @fileoverview Sequencer (interactive) view.
 * @author cmanning@gannett.com (Chris Manning), mdkennedy@gannett.com (Mark Kennedy)
 */
define([
    'jquery',
    'underscore',
    'pubsub',
    'utils',
    'baseview',
    'modules/interactives/interactive-templates',
    'modules/global/brightcove-video'
],
function(
    $,
    _,
    PubSub,
    Utils,
    BaseView,
    Template,
    Video
)
    {
        /**
         * View class.
         */
        var SequencerView = BaseView.extend({

            // Events.
            events: function() {
                var clickevent = Modernizr.touch ? 'touchstart' : 'click';
                var events = {
                    'click .navigation li': 'navInteraction'
                };
                events[clickevent + ' .nav-hide'] = 'showHidePanel';
                return events;
            },

            /**
             * Initialize view.
             * @param {Object} options View options passed during init.
             */
            initialize: function(options) {
                // call base class initialize
                BaseView.prototype.initialize.call(this, options);

                //setup interactive template view
                var showAds = true;
                if (options.isFramed || this.$el.data('suppressad') === true) {
                    showAds = false;
                }
                this.subviews.template = new Template({
                    'ads': showAds,
                    'el': this.$el,
                    'ignoreFirstNav': true,
                    'interactiveType' : "sequencer",
                    'isFramed': options.isFramed,
                    'standAlone': options.standAlone
                });
                this.subviews.template.goTo(this.subviews.template.currentSlideIndex);
                this.subviews.video = [];
                this.$slideContainer = this.subviews.template.$slideContainer;
                this.$slides = this.subviews.template.$slides;
                this.$nav = this.subviews.template.$navigation;
                this.$navButton = this.$nav.find('.nav-hide-button');
                this.$viewport = this.subviews.template.$viewport;

                // Add height or width to slides depending on transition type.
                this.setupSlides();
            },

            /**
             * Prepares slides for horizontal or vertical transitions.
             */
            setupSlides: function() {
                if (this.$viewport.hasClass('slide-transition')) {
                    var newWidth = this.$slides.eq(0).width() * this.$slides.length;
                    this.$slideContainer.width(newWidth);
                } else if (this.$viewport.hasClass('vslide-transition')) {
                    var newHeight = this.$slides.eq(0).height() * this.$slides.length;
                    this.$slideContainer.height(newHeight);
                }
            },

            /**
             * Handles the navigation menu event.
             * When the nav-hide class is clicked, this function is called to
             * show or hide the navigation menu.
             */
            showHidePanel: function(e) {
                if (this.$navButton.length < 1) {
                    return false;
                }
                var isShow = this.$nav.hasClass('show'),
                    hideShowTrack = isShow ? 'showpanel' : 'hidepanel';
                this.animatePanel(isShow);
                if (this.options.isFramed !== true) {
                    this.subviews.template.trackClick('sequencer' + document.location.pathname + hideShowTrack);
                }
            },

            /**
             * Tracks any interaction with the navigation menu.
             */
            navInteraction: function() {
                // Skip the show/hide panel button for the nav interaction tracking.
                if (this.$el.find(arguments[0].currentTarget).hasClass('nav-hide')) {
                    return;
                }
                if (this.options.isFramed !== true) {
                    this.subviews.template.trackPageView();
                }
            },

            /**
             * Controls the animation used during the hiding and showing of
             * the navigaiton menu.
             */
            animatePanel: function(show) {
                if (show) {
                    this.$nav.animate({ 'width': '180px' }, 350);
                    this.$nav.find('.sq-navigation-text-wrap').fadeIn();
                } else {
                    this.$nav.find('.sq-navigation-text-wrap').fadeOut();
                    this.$nav.animate({ 'width': '48px' }, 350);
                }   
                this.$nav.toggleClass('show');
            }
        });

        /**
         * Return view class.
         */
        return SequencerView;
    }
);
