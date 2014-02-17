/**
 * @fileoverview Sponsored series bar module view.
 * @author Chad Shryock <cdshryock@gannett.com>
 */
define([
    'jquery', 
    'underscore', 
    'baseview'
],
function(
    $,
    _,
    BaseView
) {
    'use strict';
        /**
         * View class.
         */
        var SponsoredSeriesBarView = BaseView.extend({
            animationTime: 200,

            // Events.
            events: {
                'click .close-drawer': 'closeDrawer',
                'click nav ul li a': 'toggleDrawer'
            },

            closeDrawer: function() {
                this.$navAnchors.removeClass('open');
                this.$drawer.slideUp(this.animationTime, _.bind(function() {
                    this.$drawer.removeClass('open').removeAttr('style');
                    this.$openSection.removeClass('open').removeAttr('style');
                    this.$openSection = null;
                }, this));
                return false;
            },

            /**
             * Initialize view.
             * @param {Object} options View options passed in during init.
             */
            initialize: function(options) {
                this.options = $.extend({}, options);
                this.$navAnchors = this.$('nav ul li a');
                this.$drawer = this.$('.drawer');
                this.$sectionAbout = $('.sponsor-about', this.$drawer);
                this.$sectionResources = $('.sponsor-resources', this.$drawer);
                this.$sectionVideos = $('.sponsor-videos', this.$drawer);
            },

            toggleDrawer: function(evt) {
                var $me = $(evt.target);

                if ($me.hasClass('open')) {
                    // close the drawer
                    this.closeDrawer();
                } else {
                    // Turn all tabs off
                    this.$navAnchors.removeClass('open');
                    // Turn the tab on
                    $me.addClass('open');

                    // Find the new section to open
                    var $newOpenSection = null;
                    switch($me.attr('href')) {
                        case '#sponsor-about':
                            $newOpenSection = this.$sectionAbout;
                            break;
                        case '#sponsor-resources':
                            $newOpenSection = this.$sectionResources;
                            break;
                        case '#sponsor-videos':
                            $newOpenSection = this.$sectionVideos;
                            break;
                    }

                    if (!this.$openSection) {
                        $newOpenSection.addClass('open').removeAttr('style');
                        this.$drawer.slideDown(this.animationTime, _.bind(function() {
                            this.$drawer.addClass('open').removeAttr('style');
                        }, this));
                    } else {
                        this.$openSection.slideUp(this.animationTime, _.bind(function() {
                            this.$openSection.removeClass('open').removeAttr('style');
                            $newOpenSection.slideDown(this.animationTime, _.bind(function() {
                                $newOpenSection.addClass('open').removeAttr('style');
                            }, this));
                        }, this));
                    }
                    this.$openSection = $newOpenSection;
                }
                return false;
            }
        });

        /**
         * Return view class.
         */
        return SponsoredSeriesBarView;
    }
);
