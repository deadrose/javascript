/**
 * @fileoverview Overview (interactive) view.
 * @author mdkennedy@gannett.com (Mark Kennedy)
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'utils',
    'baseview',
    'modules/interactives/interactive-templates',
    'modules/global/brightcove-video'
],
function(
    $,
    _,
    Backbone,
    Utils,
    BaseView,
    Template,
    Video
)
    {
        /**
         * View class.
         */
        var OverviewView = BaseView.extend({
            /**
             * Initialize view.
             * @param {Object} options View options passed during init.
             */
            initialize: function(options) {
                // call base class initialize
                BaseView.prototype.initialize.call(this, options);

                //setup interactive template view
                var showAds = true;
                if (options.isFramed || this.$el.data('suppressad') === true) {
                    showAds = false;
                }
                if (this.$el.length) {
                    this.subviews.template = new Template({
                        'ads': showAds,
                        'el': this.$el,
                        'interactiveType' : "chronology",
                        'isFramed': options.isFramed,
                        'standAlone': options.standAlone
                    });
                    this.subviews.template.goTo(this.subviews.template.currentSlideIndex);
                }
            }
        });

        /**
         * Return view class.
         */
        return OverviewView;
    }
);
