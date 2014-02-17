/**
* @fileoverview JS functionality for sports countdown
*/
define([
    'jquery',
    'underscore',
    'backbone',
    'baseview'
],
function(
    $,
    _,
    Backbone,
    BaseView
)
    {
        var CountdownView = BaseView.extend({

            initialize: function () {
                this.$countdown = this.$('.sports-countdown');
                this.secondsInMinute = 60;
                this.secondsInHour = 60 * this.secondsInMinute;
                this.secondsInDay = 24 * this.secondsInHour;
                this.startDate = this.$countdown.data('startdate') ? new Date(this.$countdown.data('startdate')) : new Date();
                this.endDate = this.$countdown.data('enddate') ? new Date(this.$countdown.data('enddate')) : this.startDate;

                if (this.endDate < this.startDate) {
                    this.endDate = this.startDate;
                }

                this.dateDiffInSeconds = Math.ceil((this.endDate - this.startDate) * 0.001);

                if (this.dateDiffInSeconds > 0) {
                    this.startCountdown();
                }
            },

            startCountdown: function () {
                this.timer = setInterval($.proxy(function () {
                    this.dateDiffInSeconds = this.dateDiffInSeconds - 1;

                    var days = Math.floor(this.dateDiffInSeconds / this.secondsInDay);
                    var hourSeconds = this.dateDiffInSeconds % this.secondsInDay;
                    var hours = Math.floor(hourSeconds / this.secondsInHour);
                    var minuteSeconds = hourSeconds % this.secondsInHour;
                    var minutes = Math.floor(minuteSeconds / this.secondsInMinute);
                    var seconds = Math.ceil(minuteSeconds % this.secondsInMinute);
                    var countdownData = {
                        days: days,
                        hours: hours,
                        minutes: minutes,
                        seconds: seconds
                    };

                    this.$countdown.find('#days').text(days < 10 ? '0' + days : days);
                    this.$countdown.find('#hours').text(hours < 10 ? '0' + hours : hours);
                    this.$countdown.find('#minutes').text(minutes < 10 ? '0' + minutes : minutes);
                    this.$countdown.find('#seconds').text(seconds < 10 ? '0' + seconds : seconds);

                    if (this.dateDiffInSeconds <= 0) {
                        clearInterval(this.timer);
                        return;
                    }
                }, this), 1000);
            }
        });
        return CountdownView;
    }
);
