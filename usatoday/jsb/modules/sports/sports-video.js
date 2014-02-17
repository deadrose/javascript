/**
 * @fileoverview Sports Video View
 * @author ikenticus (extends global video)
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'modules/global/brightcove-video'
],
function(
    $,
    _,
    BaseView,
    VideoView
) {
    'use strict';

    var SportsVideoView = VideoView.extend({

            events: function() {
                var parentEvents = VideoView.prototype.events;
                if(_.isFunction(parentEvents)){
                    parentEvents = parentEvents();
                }
                return _.extend({},parentEvents, {
                    'click .videoStillPlay': 'swapImageForVideo',
                    'click .hero-3up-image-1': 'swapImageForVideo',
                    'click .stagfront-hero-3up-text-1': 'swapImageForVideo'
                });
            },

            initialize: function(options) {
                // alter the utility bar class to prevent it from auto-scrolling
                this.$('.util-bar-primary-modules').addClass('util-bar-primary-modules-topic');
                this.$('.util-bar-primary-modules-topic').removeClass('util-bar-primary-modules');

                VideoView.prototype.initialize.call(this, options);
            },

            swapImageForVideo: function(e) {
                // Hide the parent-label on the main video
                $(this.$('.parent-label.sports')[0]).css('display','none');
                VideoView.prototype.swapImageForVideo.call(this, e);
            },

            destroy: function(removeEl) {
                VideoView.prototype.destroy.call(this, false);
            }

        });

        return SportsVideoView;
    }
);