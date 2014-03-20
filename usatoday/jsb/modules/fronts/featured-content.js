/**
 * @fileoverview Featured Content module view.
 * @author Robert Huhn <rhuhn@usatoday.com>  and John Heiner <jheiner@usatoday.com>
 */
 
define(['jquery',
        'underscore',
        'baseview',
        'utils',
        'ui/generic-paginator'
        ],
    function($, _, BaseView, Utils, GenericPaginatorView) {

        /**
         * View class.
         */
        var FeaturedContentView = BaseView.extend({

            // Events.
            events: {
                'mouseenter' : 'stoptimer',
                'mouseleave' : 'starttimer'
            },

            /**
             * Initialize view.
             * @param {Object} options View options passed in during init.
             */
            initialize: function(options) {
                _.bindAll(this, 'automate', 'goTo');

                options = $.extend({
                    transition : {
                        interval : 15000
                    },
                    animations: {
                        useCSSTransforms : false
                    }
                }, options);
                this.subviews = {};

                this.moveMe = this.$('.featured-content-series');
                this.viewport = this.moveMe.parent();

                this.subviews.paginator = new GenericPaginatorView({
                    el: this.$('.paginator'),
                    onGoTo: this.goTo
                });

                if (options.transition) {
                    this.interval = options.transition.interval || false;
                    this.timer = null;

                    if (this.interval) {this.starttimer();}
                }
                // call base class initialize
                BaseView.prototype.initialize.call(this, options);
            },

            /*
             * Function to handle automated rotation of the carousel.
             */
            automate: function() {
                this.subviews.paginator.goToNextPage(true);
            },

            /**
             * Clean up view.
             * Removes event handlers and element (optionally).
             * @param {boolean} removeEl option to also remove View from DOM.
             */
            destroy: function(removeEl) {
                this.stoptimer();

                // call base class destroy
                BaseView.prototype.destroy.call(this, removeEl);
            },

            goTo: function(index) {
                var offsetBy = this.viewport.outerWidth(),
                    targetOffset = offsetBy * index * -1;

                this.animate(this.moveMe, 'left', targetOffset+'px', 450, 'ease-in-out');

                Utils.lazyLoadImage(this.moveMe.find('img'));
            },

            /*
             * Start the interval that automates slide switching.
             */
            starttimer: function() {
                if (this.interval && !this.timer){
                    this.timer = setInterval(this.automate, this.interval);
                }
            },

            /*
             * Stop the interval - primarily used when hovering the modules.
             */
            stoptimer: function() {
                if (this.timer){
                    clearInterval(this.timer);
                    this.timer = null;
                }
            }

        });

        /**
         * Return view class.
         */
        return FeaturedContentView;
    }
);
