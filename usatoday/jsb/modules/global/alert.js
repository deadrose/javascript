define([
    'jquery',
    'underscore',
    'pubsub'
],
function(
    $,
    _,
    PubSub
) {

    /**
     * Global Alert message, generic hover message mainly used for system errors
     * @deprecated
     * @exports modules/global/alert
     * @author Jay Merrifield <jmerrifiel@gannett.com>
     */
    var Alert = function(){

    };
    Alert.prototype = {
        render: function() {
            if (!this.$alert){
                this.$alert = $('<div class="ui-alert"><span class="text"></span><span class="close-btn">Close</span></div>')
                                .appendTo($('body'));
                this.$alertText = this.$alert.find('.text');
                this.$alert.on('click', '.close-btn', _.bind(function(){
                    this.hide();
                }, this));
            }
        },

        /**
         * Display alert.
         * @param {String} msg The HTML to display.
         */
        show: function(msg) {
            this.render();
            PubSub.trigger('show:alert');
            this.$alertText.html(msg);
            this.$alert.addClass('active').removeClass('error');
        },

        /**
         * Hide the alert.
         */
        hide: function() {
            PubSub.trigger('hide:alert');
            this.$alert.removeClass('active error');
        },

        /**
         * Display error message.
         * @param {String} msg The HTML to display.
         */
        showError: function(msg) {
            this.render();
            PubSub.trigger('show:error:alert');
            this.$alertText.html(msg);
            this.$alert.addClass('active error');
        }
    };

    /**
     * Return singleton.
     */
    return new Alert();
});
