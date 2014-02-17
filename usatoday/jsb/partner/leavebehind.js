define([
    'jquery', 
    'underscore', 
    'baseview',
    'adLogger',
    'utils'
],
function(
    $, 
    _, 
    BaseView,
    AdLogger,
    Utils
) {

        /**
         * View class.
         */
        var LeaveBehindAd = BaseView.extend(
        /**
         * @lends partner/leavebehind.prototype
         */
        {
            events: {
                click: 'onClick'
            },
            /**
             * @classdesc Leavebehind helper class, this is used with closable ads to allow them to be brought back to life
             * @constructs partner/leavebehind
             * @author Jay Merrifield <jmerrifiel@gannett.com>
             * @param {Object} options backbone options object
             *     @param {jQuery|Element|String} options.el - element or string selector where the leave behind will be added
             *     @param {String} [options.template] - Underscore template used to generate the leave behind
             *     @param {String} [options.imageUrl] - Url for the image, used with the default template
             *     @param {String} [options.altText] - Alt text for the image, used with the default template
             *     @param {Boolean} [options.isCompact=true] - Specifies whether to add the "compact" class to the leave behind
             */
            initialize: function(options) {
                options = $.extend({
                    template: '<div class="leavebehind-sponsoredby">' +
                            'sponsored by' +
                        '</div>' +
                        '<img class="leavebehind-image" src="<%= imageUrl %>" alt="<%= altText %>"/>',
                    onShowAd: null,
                    imageUrl: '',
                    altText: '',
                    isCompact: true
                }, options);

                // call base class initialize
                BaseView.prototype.initialize.call(this, options);

                if (!this.$el.prop('id')) {
                    this.$el.prop('id', _.uniqueId('ad-position-'));
                }

                // Tell me about it
                AdLogger.logDebug('LeaveBehind initialized', this);
            },

            /**
             * Clean up the view (no argument).
             */
            destroy: function(removeEl) {
                this.hide();
                BaseView.prototype.destroy.call(this, false);
            },

            render: function(adObj){
                var expirationMinutes = Utils.getNested(window.site_vars, 'ads', 'LEAVEBEHIND_EXPIRATION_MINUTES'),
                    adState = adObj.getCreativeState({
                        isOpen: true
                    }, expirationMinutes);
                if (this.options.isCompact){
                    this.$el.addClass('compact');
                }else{
                    this.$el.removeClass('compact');
                }
                this.$el.empty().append(_.template(this.options.template, this.options));

                if (adState.isOpen) {
                    adState.isOpen = false;
                    adObj.setCreativeState(adState, expirationMinutes);
                    if (this.options.onShowAd) {
                        this.options.onShowAd();
                    }
                } else {
                    // show the leave behind
                    this.show();
                    // set up tracking of the leave behind instead of the actual ad
                    adObj.trackAd(this.$el);
                }
            },

            onClick: function(){
                this.hide();
                if (this.options.onShowAd){
                    this.options.onShowAd();
                }
                return false;
            }
        });

        /**
         * Return view class.
         */
        return LeaveBehindAd;
    }
);
