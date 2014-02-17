
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
    'form/base-form'
],
    function(
        $,
        _,
        BaseView,
        StateManager,
        Utils,
        BaseForm
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

                // Cache DOM
                this.$searchForm = this.$('#ListFilter');
                this.$searchTypes = this.$('input[name="search_type"]');
                this.$searchField = this.$('#books-list-search');

                // Cache Attrs
                this.searchBase = this.$searchForm.attr('action');

                // Globals
                this.booklistBaseUrl = '/life/books/best-selling/week/';

                this.subviews.baseform = new BaseForm({
                    el: this.$('#ListFilter')
                });

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

            }

        });

        /**
         * Return view class.
         */
        return BookListView;
    }
);