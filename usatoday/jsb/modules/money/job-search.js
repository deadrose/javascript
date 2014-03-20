
/**
 * @fileoverview Job search modules.
 * @author mdkennedy@gannett.com (Mark Kennedy)
 *
 */

define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'form/base-form'
],
    function(
        $,
        _,
        BaseView,
        StateManager,
        FormView
        ) {
        "use strict";
        /**
         * View class.
         */
        var JobSearchView = BaseView.extend({

            /**
             * Initialize the view.
             */
            initialize: function(options) {
                BaseView.prototype.initialize.call(this, options);

                // Do not use "fetchHtml".  This service returns an html fragment.  IE intereprets it as invalid html and throws it away.  Use fetchData instead.
                StateManager.fetchData('/money/jobs/categories/', { timeout: 10000 }).done(_.bind(function(html){
                    this.$('.jobs-form-dropdown').html(html);
                }, this))
                .always(_.bind(function(){
                    this.subviews.jobSearchForm = new FormView({
                        el: this.$('.jobs-form-wrap')
                    });
                }, this));
            }
        });

        /**
         * Return view class.
         */
        return JobSearchView;
    }
);
