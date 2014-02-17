/**
 * @fileoverview Election Topic Page view.
 * @author stwilson@gannett.com (Stan Wilson) 
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'utils',
    'pubsub',
    'baseview',
    'form/autocomplete'
    ],
    function(
        $,
        _,
        Backbone,
        Utils,
        PubSub,
        BaseView,
        AutoComplete
    ) {


        /**
         * View class.
         */
        var ElectionView = BaseView.extend({

             // View element.
            el: '#elections-2012',

            /**
            * Initialize view.
            */
            initialize: function (options) {

                this.$win = Utils.get('win');
                if( $("#election-results-fullscreen").get(0)  ){
                    this.onResize();
                    this.$win.on('resize.' + this.cid, this.onResize);
                }
                _.bindAll(this, 'onStateSelect');
                BaseView.prototype.initialize.call(this, options);
                this.$('.election-state-input').each(_.bind(function(idx, el){
                    this.subviews['stateAutocomplete' + idx] = new AutoComplete({
                        el : el,
                        resultDisplayTemplate: '<%= state %>',
                        resultValueTemplate: '<%= state %>',
                        onSelect: this.onStateSelect,
                        selectedInputValue: 'state'
                    });
                }, this));
            },
            /**
             * When an item is selected from autocomplete states.
             * @param {String} value Selected items data
             * @param {Object} data Selected items data
             */
            onStateSelect : function(value, data){
                var form = this.$('#election-state-nav-form');
                form.attr('action', data.link);
                form.submit();
            },

            onResize:function(){
                var newHeight = ( this.$win.height() > 620)?  this.$win.height() : 620;
                $("#election-results-fullscreen").height( newHeight  );
            },

            /**
             * Clean up view.
             * Removes event handlers and element (optionally).
             * @param {boolean} removeEl option to also remove View from DOM.
             */
            destroy: function(removeEl) {
                this.$win.off('.' + this.cid);
                BaseView.prototype.destroy.call(this, removeEl);
            }
        });


        /**
         * Return view class.
         */
        return ElectionView;
    }
);
