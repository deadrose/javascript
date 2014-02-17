
/**
 * @fileoverview Booklist Module
 * @author jhensley@gannett.com (Jonathan Hensley)
 */

define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'utils',
    'form/base-form',
    'ui/dropdown'
],
    function(
        $,
        _,
        BaseView,
        StateManager,
        Utils,
        BaseForm,
        DropDown
        ) {
        "use strict";
        /**
         * View class.
         */
        var BookListView = BaseView.extend({

            /**
             * Define events.
             */
            events: {
                'submit #ListFilter': 'submitBooklistSearchForm'
            },

            /**
             * Initialize the view.
             */
            initialize: function(options) {

                BaseView.prototype.initialize.call(this, options);

                var maxDate = this._getMostRecentWeek();

                // Cache DOM
                this.$searchForm = this.$('#ListFilter');
                this.$searchTypes = this.$('input[name="search_type"]');
                this.$searchField = this.$('#books-list-search');
                this.$filterFields = this.$('select[name="sort"], select[name="genreId"], select[name="classId"]', this.$searchForm);
                this.$weekFilter = this.$('#booklist-datepicker');

                // Cache Attrs
                this.searchBase = this.$searchForm.attr('action');

                // Globals
                this.booklistBaseUrl = '/life/books/best-selling/week/';

                this.subviews.baseform = new BaseForm({
                    el: this.$('#ListFilter'),
                    formOptions: [{
                        el: this.$('#booklist-sortby'),
                        onSelect: _.bind(this.filterBooklist, this)
                    },
                    {
                        el: this.$('#booklist-classpicker'),
                        onSelect: _.bind(this.filterBooklist, this)
                    }, 
                    {
                        el: this.$('#booklist-genrepicker'),
                        onSelect: _.bind(this.filterBooklist, this)
                    },
                    {
                        el: this.$('#booklist-datepicker'),
                        selectWeek: true,
                        showOtherMonths: true,
                        showMonthAfterYear: true,
                        changeMonth: true,
                        changeYear: true,
                        defaultDate: +0,
                        dateFormat: 'mm/dd/yy',
                        maxDate: maxDate,
                        onSelect: _.bind(this.changeWeek, this)
                    }]
                });

                // Initialize all the buy now buttons
                this.$('.books-buy-button').each( _.bind(function(index, el){
                    this.subviews['dropdown' + index ] = new DropDown({
                        el: $(el)
                    });
                }, this));

            },

            /**
             * Capture the search form submission
             * @param e {Object} is the even object passed on form submission
             */
            submitBooklistSearchForm: function(e) {

                e.preventDefault();

                var searchType = this.$(':checked', this.$searchTypes).val(),
                    searchQuery = this.$searchField.val(),
                    searchUrl = this.searchBase + searchType + '/' + encodeURIComponent(searchQuery) + '/';

                Utils.triggerRoute(searchUrl);

            },

            /**
             * Pass all filters as get params, and trigger the routes
             */
            filterBooklist: function() {

                Utils.triggerRoute(window.location.pathname + '?' + this.$filterFields.serialize());

            },

            /**
             * Navigate to a new week of the booklist
             * @param str {String} is the datestring returned from the datepicker object
             * @param obj {Object} is the jQuery UI datepicker object
             */
            changeWeek: function(str, obj) {

                var dt = new Date(obj.selectedYear, obj.selectedMonth, obj.selectedDay),
                    week = this._getWeek(dt); // Get the week of the year

                Utils.triggerRoute(this.booklistBaseUrl + obj.selectedYear + '/' + week + '/');

            },

            /**
             * When passed a date object, return the week of the year
             * @param dt {Object} a date object
             */
            _getWeek: function(dt) {

                var yearStart = new Date(dt.getFullYear(), 0, 1);

                return Math.ceil((((dt - yearStart) / 86400000) + yearStart.getDay()+1)/7);

            },

            /**
             * Get the most recent week of the bookslist so a user cannot navigate to a future date
             */
            _getMostRecentWeek: function() {

                var dt = new Date(),
                    day = dt.getDay();

                if (day < 4) {
                    // Shift the date back to the previous Thursday - where 4 is Thursday and 7 is a full week back
                    dt.setDate(dt.getDate() - 7 + (4 - day));
                }

                return dt;

            }

        });

        /**
         * Return view class.
         */
        return BookListView;
    }
);