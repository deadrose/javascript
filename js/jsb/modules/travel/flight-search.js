/**
 * @fileoverview Flightsearch view.
 * @author Brendan Bagley
 */

define([
    'jquery',
    'underscore',
    'pubsub',
    'state',
    'baseview',
    'form/base-form',
    'form/autocomplete'
],
function(
    $,
    _,
    PubSub,
    StateManager,
    BaseView,
    FormView,
    AutoComplete
) {
    "use strict";
    var FlightSearchView = BaseView.extend({

        events: {
            'submit form': 'flightSearchFormSubmit',
            'click .flight-tracker-search-btn' : 'flightSearchButtonClick',
            'click .expand-arrow' : 'expandDetailsClick',
            'click .expand-view' : 'expandDetailsClick',
            'blur .required': 'requiredBlur'
        },

        /**
         * Initialize view.
         */
        initialize: function(options) {
            options=$.extend(true, {
                type:false
            }, options);

            this.statusi= {
                A  : 'En Route',
                C  : 'Canceled',
                D  : 'Diverted',
                DN : 'Data source needed',
                L  : 'Landed',
                NO : 'Not Operational',
                R  : 'Redirected',
                S  : 'Scheduled',
                U  : 'Unknown'
            };

            this.searchResultsTemplate = $('#search-results-template');

            var h = new Date();
            h = h.getHours();
            if (h % 2 !== 0) {
                h = h + 1;
            }
            this.$('#flightTime').val(h);

            _.bindAll(this, 'renderResults');

            this.pubSub = {
                'popup:click': this.flightStatsSearch
            };

            //calls super method
            BaseView.prototype.initialize.call(this, options);

            var activeForm=false;
            var forms = this.$('form');
            _.each(forms, function(item, index){
                this.subviews['flightSearchForm' + index] = new FormView({
                    el: $(item)
                });
                if($(item).hasClass('flight-tracker-form-active')) {
                    activeForm=$(item).data('search-type');
                }

                var parentIndex = index;
                _.each($(item).find('.airport-code'), _.bind(function(item, index){
                    this.subviews['flightSearchAutoComplete' + parentIndex + '-' + index] = new AutoComplete({
                        el: $(item),
                        maxResults: 6,
                        resultDisplayTemplate: '<%= abbr %> - <%= name %>',
                        resultValueTemplate: '<%= abbr %>',
                        url: '/travel/flight-tracker/airports/search/'
                    });
                }, this));
                _.each($(item).find('.airline-code'), _.bind(function(item, index){
                    this.subviews['flightSearchAutoComplete' + parentIndex + '-' + index] = new AutoComplete({
                        el: $(item),
                        maxResults: 6,
                        resultDisplayTemplate: '<%= abbr %> - <%= name %>',
                        resultValueTemplate: '<%= abbr %>',
                        url: '/travel/flight-tracker/airlines/search/'
                    });
                }, this));
            }, this);

            if(activeForm) {
                this.options.type=activeForm;
            }

            if(!this.options.type) {
                this.options.type='flight';
            }

            this.currentSearchType = this.options.type;
            this.$('.flight-tracker-'+this.options.type+'-form-wrap').addClass('flight-tracker-form-active');
            this.$('.flight-tracker-search-btn.'+this.options.type).addClass('active');

        },

        flightSearchFormSubmit: function(e) {
            var form = $(e.currentTarget);
            var errors = 0;
            form.find('.required').each(function(){
                var $t = $(this);
                if ($t.val() === '') {
                    $t.addClass('input-error');
                    errors++;
                }
            });
            if (errors !== 0) {
                return false;
            }

            if (!form.attr('action')) {
                e.preventDefault();
                var formValues = {};
                _.each(form.serializeArray(), function(obj){
                    formValues[obj.name] = obj.value;
                }, this);
                this.flightStatsSearch(this.currentSearchType, formValues);
            }
            PubSub.trigger('uotrack', 'flighttrackermap');
        },

        /**
         * Build url
         * @param {String} searchType
         * @param {Object} params Object of optional parameters
         */
        getFlightSearchUrl: function(searchType, params){
            var url = this.$el.attr('data-fs-baseurl') + 'flightstatus/rest/v2/jsonp/',
                appId = this.$el.attr('data-fs-appid'),
                appKey = this.$el.attr('data-fs-appkey'),
                date = new Date(),
                year = date.getFullYear(),
                day = date.getDate(),
                month = date.getMonth() + 1,
                hour = date.getHours(),
                ymd = year + '/' + month + '/' + day,
                baseParams = '?appId=' + appId + '&appKey=' + appKey + '&extendedOptions=useInlinedReferences';

            if (searchType === 'flight') {
                url += 'flight/status/' + params.airline_name + '/' + params.flight_number + '/dep/' + ymd + baseParams;
            } else if (searchType === 'route') {
                url += 'route/status/' + params.origin_airport + '/' + params.dest_airport + '/dep/' + ymd + baseParams + '&utc=false&maxFlights=100';
            } else if (searchType === 'airport') {
                if (_.isUndefined(params.flight_time)) {
                    params.flight_time = hour;
                }
                url += 'airport/status/' + params.airport_code + '/' + params.flight_type + '/' + ymd + '/' + params.flight_time + baseParams + '&numHours=2';
            } else {
                url = '';
            }
            return url;
        },

        /**
         * Perform flight search
         * @param {String} searchType
         * @param {Object} params Object of optional parameters
         */
        flightStatsSearch: function(searchType, params) {
            var url = this.getFlightSearchUrl(searchType, params);
            // if data is currently being fetched, we need to stop it
            if (this.fetch) {
                this.fetch.abort();
            }
            this.fetch = StateManager.fetchData(url, { dataType: 'jsonp' }).done(_.bind(function(data) {
                    this.renderResults(data.flightStatuses, searchType, params);
                }, this)).fail(_.bind(function(){
                    this.$('.flight-tracker-results').html('<div class="error">There is no matching flight data.</div>');
                },this));

        },

        flightSearchButtonClick: function(e) {
            var clickedItem = $(e.currentTarget),
                newSearchType = clickedItem.attr('data-search-type');
            if(this.currentSearchType !== newSearchType) {
                this.$('.flight-tracker-search-btn').removeClass('active');
                clickedItem.addClass('active');
                this.$('.flight-tracker-' + this.currentSearchType + '-form-wrap').removeClass('flight-tracker-form-active');
                this.$('.flight-tracker-' + newSearchType + '-form-wrap').addClass('flight-tracker-form-active');
                this.currentSearchType = newSearchType;
            }
        },

        requiredBlur: function(e) {
            var $t = $(e.currentTarget);
            if ($t.val() !== '') {
                $t.removeClass('input-error');
            }
        },

        renderResults: function (results, type, params) {
            var statusi = this.statusi;
            _.each(results, function(result) {
                result.status = statusi[result.status];
                result.color = 'green';
                if(!_.isUndefined(result.delays)) {
                    var overallDelay = 0;
                    _.each(result.delays, function(delay) {
                        overallDelay += delay;
                    });
                    result.delays = overallDelay + " min";
                    result.color = 'yellow';
                }
                else {
                    result.delays = 'On-time';
                }
                if(result.status === 'Canceled') {
                    result.color = 'red';
                }
                if(_.isUndefined(result.departureAirport.stateCode)) {
                    result.departureAirport.stateCode = result.departureAirport.countryCode;
                }
                if(_.isUndefined(result.arrivalAirport.stateCode)) {
                    result.arrivalAirport.stateCode = result.arrivalAirport.countryCode;
                }
            });
            if(results.length) {
                results = { results : results };
                var list = _.template(this.searchResultsTemplate.html(), results);
                var resultsTitle = 'Results for ' + type + ' search:';
                if (params.flight_type_full && params.airport_name) {
                    resultsTitle = params.flight_type_full + ': ' + params.airport_name;
                }
                this.$('.flight-tracker-results').empty().append('<div class="search-title">' + resultsTitle + '</div>').append(list);
            }
            else {
                this.$('.flight-tracker-results').html('<div class="error">No matching flight data found.</div>');
            }
        },

        expandDetailsClick: function(e) {
            var flightId = $(e.target).attr('data-flightid');
            var $detailView = this.$('.detail-view-' + flightId);
            if(!$detailView.hasClass('open')) {
                $detailView.show().addClass('open');
                $(e.target).addClass('active');
            }
            else {
                $detailView.hide().removeClass('open');
                $(e.target).removeClass('active');
            }
        }

    });
    return FlightSearchView;
});
