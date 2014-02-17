/**
 * @fileoverview Kayak view module.
 * @author mbriede@gannett.com (Matthew Briede), groots@gannett.com (George Roots), bminton@gannett.com (Brandon Minton)
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'pubsub',
    'form/base-form'
],
    function(
        $,
        _,
        BaseView,
        StateManager,
        PubSub,
        FormView
        ) {
        "use strict";
        /**
         * View class.
         */

        var TripologyView = BaseView.extend({

            // View element.
            el: '.tripology-wrapper',

            // Events.
            events: {

            },

            /**
             * Initialize view.
             * @param {Object} options
             */
            initialize: function(options) {

                _.bindAll(this, 'departureSelect', 'arriveSelect');


                BaseView.prototype.initialize.call(this, options);

                this.$tripologyForm = this.$('.tripology-form');
                this.departBoxName = this.$('#depart_loc');
                this.departBoxID = this.$('#depart_loc_1');
                this.destinationBoxName = this.$('#arrive_loc');
                this.destinationBoxID = this.$('#arrive_loc_1');

                this.pinfo = StateManager.getActivePageInfo();
                this.section = this.pinfo.section_name;

                this._setupForm();

                this.$('form').submit(function() {
                    PubSub.trigger('uotrack','tripologysearch');
                });
            },

            _setupForm: function(){
                var formOptions = [];
                var _this=this;


                formOptions.push({
                    el: $('.depart.tripology-auto'),
                    resultDisplayTemplate: '<%= displayname %>',
                    onSelect : _this.departureSelect,
                    maxResults: 5,
                    ajaxOptions: {dataType: 'jsonp'},
                    onParseResults: _this.formatResults
                });

                formOptions.push({
                    el: $('.arrive.tripology-auto'),
                    resultDisplayTemplate: '<%= displayname %>',
                    onSelect : _this.arriveSelect,
                    maxResults: 5,
                    ajaxOptions: {dataType: 'jsonp'},
                    onParseResults: _this.formatResults
                });


                this.$('.ui-date-picker').each(_.bind(function(index, el){
                    var $el = $(el),
                        button = $el.parent().find('.ui-date-picker-btn');
                    formOptions.push({
                        el: $el,
                        buttonSelector: button,
                        calendarPanelClass: 'ui-light',
                        changeMonth: true,
                        changeYear: true,
                        minDate:null,
                        maxDate:null,
                        showOtherMonths: true,
                        selectOtherMonths: true,
                        showMonthAfterYear: true,
                        dateFormat: 'm/d/yy',
                        dayNamesMin: ['S','M','T','W','T','F','S']
                    });
                }, this));

                this.$tripologyForm.each(_.bind(function(idx, el){
                    this.subviews['form' + idx] = new FormView({
                        el: $(el),
                        formOptions: formOptions
                    });
                }, this));

                

                this.$tripologyForm.submit(function(e){
                    _this.tripologyFormSubmit();

                    return false;
                });

                // create default date for fields using Date Picker
                var myDate = new Date(),
                dateVal = (myDate.getMonth()+1) + '/' + myDate.getDate() + '/' + myDate.getFullYear();
                this.$('.tripology-date-picker-field').val(dateVal);
            },

            tripologyFormSubmit: function() {
                var ser = $('.tripology-form').serializeArray();

                var $inputs = $('.tripology-form :input');

                var values = {};
                $inputs.each(function() {
                    values[this.name] = $(this).val();
                });

                var dep = new Date(values.departure_date),
                    arr = new Date (values.return_date),
                    timeDiff = Math.abs(arr.getTime() - dep.getTime()),
                    diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24)); 

                var url='http://www.tripology.com/trip/step1/?',
                departure_location_0=values.departure_location_0,
                departure_location_1=values.departure_location_1,
                destination_0=values.destination_0,
                destination_1=values.destination_1,
                departure_date=values.departure_date,
                duration=diffDays||1,
                flight=$('#flights_box').is(':checked'),
                cruise=$('#cruise_box').is(':checked'),
                hotel=$('#hotels_box').is(':checked'),
                transportation=$('#transportation_box').is(':checked'),
                cars=$('#cars_box').is(':checked');

                if(departure_location_1) {
                    url += '&departure_location_1=' + departure_location_1;
                }

                if(destination_1) {
                    url += '&destination_1=' + destination_1;
                }

                if (departure_date) {
                    url += '&departure_date=' + departure_date;
                }
                
                if(duration) {
                    url += '&duration=' + duration;
                }

                if(flight) {
                    url+= '&flight=on';
                }

                if(cruise) {
                    url += '&cruise=on';
                }

                if(hotel) {
                    url += '&hotel=on';
                }
                if(transportation || cars) {
                    url += '&transportation=on';
                }
                   

                window.open(url);
            },

            formatResults: function(e) {
                var data=[];
                _.each(e, function(o){
                    var loc=o[0],
                        id=o[1];

                    var obj = {
                        "displayname" : loc,
                        "id" : id
                    };

                    data.push(obj);
                });

                return data;
            },

            departureSelect: function(selectedValue, selectedData) {

                this.departBoxName.val(selectedData.displayname);
                this.departBoxID.val(selectedData.id);
            },
            arriveSelect: function(selectedValue, selectedData) {

                this.destinationBoxName.val(selectedData.displayname);
                this.destinationBoxID.val(selectedData.id);
            }
        });

        /**
         * Return view class.
         */
        return TripologyView;
    }
);