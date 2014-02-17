define(['jquery', 'underscore', 'backbone', 'baseview'],
    function($, _, Backbone, BaseView) {

        /**
         * View class.
         */
        var GenericPaginatorView = BaseView.extend(
        /**
         * @lends ui/generic-paginator.prototype
         */
        {
            // Events.
            events: {
                'click .paginator-indicator-target' : 'onPaginatorClick'
            },

            /**
             * This callback is called before the paginator is going to an index, also gives the ability to cancel the action
             * @callback ui/generic-paginator~onBeforePaginator
             * @param {Number} index - index that the paginator is going to
             * @param {MouseEvent} event - click event
             * @returns {Boolean} whether to allow the paginator to go to the index
             */
            /**
             * This callback is called after the paginator has gone to a new index
             * @callback ui/generic-paginator~onGoTo
             * @param {Number} index - index that the paginator is going to
             */
            /**
             * @classdesc The following template is associated with this view.  This is the expected html for this view.
             * <br/><br/>
             * {% include "partials/generic-paginator.html" with items=data.interactive.events %}
             * <br/><br/>
             * The following JavaScript is required to integrate the functionality of this sub-view with its parent view.
             * <br/><br/>
             * this.subviews.pagination = new GenericPaginatorView({<br/>
             *     el: this.$el.find('.paginator'),</br>
             *     onGoTo: function(index) {}<br/>
             * });
             * @author Erik Luchauer <eluchauer@gannett.com>
             * @constructs ui/generic-paginator
             * @tutorial tutorialid
             * @param {Object} options backbone options object
             *     @param {jQuery|Element|String} options.el - element or string selector to attach to
             *     @param {ui/generic-paginator~onBeforePaginator} options.onBeforePaginator - callback before the paginator goes to an index
             *     @param {ui/generic-paginator~onGoTo} options.onGoTo - callback after the paginator goes to an index
             */
            initialize: function(options) {
                this.$pageElements = this.$(".paginator-indicator-target");

                options = $.extend({
                    onBeforePaginator: null, // function(index), called before executing onPaginatorClick
                    onGoTo: null // function(index), this is the callback for navigating to a paginated item
                }, options);

                // call base class initialize
                BaseView.prototype.initialize.call(this, options);
            },

            /**
             * Fires when the pagination is clicked on.
             * If an onBeforePaginator function was passed into the paginator object,
             * that function will fire at the beginning of this method.
             * @param {MouseEvent} event. Event object from user's click.
             * @private
             */
            onPaginatorClick: function(event) {
                if (event) event.preventDefault();
                var pageNumber = $(event.currentTarget).index();

                if (this.options.onBeforePaginator) {
                    var proceed = this.options.onBeforePaginator(pageNumber, event);
                    if (!proceed) {
                        return false;
                    }
                }

                this.goToPage(pageNumber);
            },

            // Public API

            /**
             * Updates the selected (active) bullet based on the click of its parent (.paginator-indicator-target) element.
             * Some parent views have ways of updating the pagination outside of clicking the actual page bullets.
             * This method allows those parent views to update the pagination when using their native page update methods.
             * @param {Number} pageNumber selected page number to switch to the active bullet
             */            
            goToPage: function(pageNumber) {
                if (this.$pageElements.length === 0) {
                    return;
                }

                if (pageNumber < 0) {
                    pageNumber = 0;
                } else if (pageNumber >= this.$pageElements.length) {
                    pageNumber = this.$pageElements.length - 1;
                }

                var $pageEl = this.$pageElements.eq(pageNumber);
                
                this.$('.paginator-indicator-bullet').removeClass('active');
                $pageEl.find('.paginator-indicator-bullet').addClass('active');

                if (this.options.onGoTo) {
                    this.options.onGoTo(pageNumber);
                }
            },

            /**
             * Triggers the paginator to go to the next index
             * @param {Boolean} rotate specifies whether we should rotate once we hit the end
             */
            goToNextPage: function(rotate) {
                // Cache the selectors.
                var $active = this.$('.paginator-indicator-bullet.active'),
                    currentIndex = $active.parent().index();

                // Triger the event on the next item in the list.
                // If on the last, and rotate is true, trigger the first.
                if (currentIndex < this.$pageElements.length - 1) {
                    this.goToPage(currentIndex + 1);
                } else if (rotate) {
                    this.goToPage(0);
                }
            },

            /**
             * Triggers the paginator to go to the previous index
             * @param {Boolean} rotate specifies whether we should rotate once we hit the beginning
             */
            goToPrevPage: function(rotate) {
                // Cache the selectors.
                var $active = this.$('.paginator-indicator-bullet.active'),
                    currentIndex = $active.parent().index();

                // Triger the event on the previous item in the list.
                // If on the first, and rotate is true, trigger the last.
                if (currentIndex > 0) {
                    this.goToPage(currentIndex - 1);
                } else if (rotate) {
                    this.goToPage(this.$pageElements.length - 1);
                }
            }
        });

        return GenericPaginatorView;
    }
);
