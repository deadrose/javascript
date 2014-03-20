/**
 * @fileoverview Utility bar flyout.
 * @author Erik Kallevig <ekallevig@gannett.com>
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'utils',
    'state',
    'pubsub',
    'modules/stories/utility-bar-flyout'
],
function(
    $,
    _,
    Backbone,
    Utils,
    StateManager,
    PubSub,
    UtilityBarFlyout
) {
    'use strict';

    /**
     * View class.
     */
    var UtilityBarModuleShare = UtilityBarFlyout.extend({

        events: {
            'click .util-bar-flyout-nav-btn': 'onClickFlyoutNavBtn'
        },

        /**
         * Initialize view.
         * @param {Object} options Share modules init options.
         */
        initialize: function(options) {
            _.bindAll(this, 'onClickFlyoutNavBtn');      
            var objShareImage = this.$('.util-bar-share-summary-image');
            Utils.lazyLoadImage(objShareImage, 'data-src', true);

            this.events = _.extend({}, UtilityBarFlyout.prototype.events, this.events);

            UtilityBarFlyout.prototype.initialize.call(this, options);
            this._loadUtilityBarModules();
        },

        _loadUtilityBarModules: function() {
            var utilityBarModules = window.site_config.UTILITY_BAR_MODULES;
            if (!utilityBarModules) {
                return;
            }
            var shareModule = _.find(utilityBarModules,
                function(module){
                    return module.name === 'utility-bar-modules-share';
                }
            );
            if (shareModule && shareModule.options && shareModule.options.submodules) {
                StateManager.resourceManager.fetchPageModules(shareModule.options.submodules).done(_.bind(function(modules){
                    if (!this.destroyed) {
                        _.each(modules, function(module){
                            this.subviews[module.name] = new module.ModuleClass(_.extend({
                                'el': module.selector
                            }, module.options));
                        }, this);
                    }
                }, this));
            }
        },

        onClickFlyoutNavBtn: function(e) {
            var $btn = $(e.currentTarget);
            var moduleSection = $(e.currentTarget).data('share-method'),
                shareTrack = 'utilitybarshare' + moduleSection;

            PubSub.trigger('uotrack', shareTrack);
            if ($btn.prop('tagName') !== 'A') {
                e.preventDefault();
                if (moduleSection) {
                    StateManager.getActiveApp().$('.util-bar-btn-' + moduleSection).trigger('click');
                }
            }
        },

        /**
         * Shows a specific section of the utility bar modules
         * (ie. facebook section vs. email section) - hides others.
         * @param {string} sectionName Section of the utility modules to show.
         */
        showSection: function(sectionName) {
            this.activeSection = sectionName;
            this.$('.util-bar-flyout-section, .util-bar-flyout-pane').hide();
            this.$('.util-bar-flyout-pane-share, .util-bar-flyout-section-' + sectionName).show();
            this.$('.util-bar-flyout-nav-btn').removeClass('active');
            this.$('.util-bar-flyout-nav-btn-' + sectionName).addClass('active');
        }
    });

    /**
     * Return view class.
     */
    return UtilityBarModuleShare;
});
