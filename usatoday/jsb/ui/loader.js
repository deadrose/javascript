define([
    'jquery',
    'underscore',
    'baseview',
    'pubsub',
    'utils'
],
function(
    $,
    _,
    BaseView,
    PubSub,
    Utils
) {
    "use strict";
    var Loader = BaseView.extend(
    /**
     * @lends ui/loader.prototype
     */
    {
        /**
         * @classdesc generic ui loader, will construct html in the form of
         *            &lt;div class=&quot;ui-loader&quot;&gt;&lt;div class=&quot;loading-icon&quot;&gt;&lt;span&gt;msg&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;
         *            which will add and remove an active class to show/hide it. Default is hidden
         * @constructs ui/loader
         * @author Mark Kennedy <mdkennedy@gannett.com>
         * @param {Object} options backbone options object
         *     @param {jQuery|Element|String} options.el - element or string selector we will add the loader to
         *     @param {String} [options.msg] - text for the loader
         */
        initialize: function(options) {
            this.options = $.extend({
                msg: ''
            }, options);

            this.win = Utils.get('win');
            this.body = Utils.get('body');
            this.el = $(this.options.el);
            this.msg = this.options.msg;

            this.render();
        },

        render: function() {
            var $circDiv = $('<div>').addClass('loading-icon');

            this.$loader = $('<div>').addClass('ui-loader');
            this.$target = this.$el;
            this.$target.append(this.$loader.append($circDiv).append($('<span>').html(this.msg)));
            this.$el = this.$loader;
        },

        /**
         * Hide and destroy the loader
         * @param removeEl
         */
        destroy: function(removeEl){
            this.hide();
            BaseView.prototype.destroy.apply(this, arguments);
        },

        /**
         * Display loader.
         */
        show: function() {
            this.$loader.addClass('active');
        },

        /**
         * Hide the loader.
         */
        hide: function() {
            this.$loader.removeClass('active');
        }

    });

    /**
     * Return view class.
     */
    return Loader;
});
