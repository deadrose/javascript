/**
 * @fileoverview Handles the asset sponsorship ad functionality for sports galleries.
 * @author Jordan Manwaring <jmanwaring@gannett.com>
 */

define([
    'jquery', 
    'underscore', 
    'baseview',
    'pubsub'
],
function(
    $, 
    _, 
    BaseView,
    PubSub
) {
    'use strict';
        var SportsGallerySponsorshipSkin = BaseView.extend(
        {

            initialize: function(options) {
                options = $.extend({
                    imageSkinTop: '',
                    imageSkinRight: '',
                    imageSkinRightHeight: 0,
                    imageSkinBottom: '',
                    imageSkinLeft: '',
                    imageSkinLeftHeight: 0,
                    htmlBackground: '',
                    clickThru: ''
                }, options);

                this.$background = $('');

                _.bindAll(this, 'showSkin', 'hideSkin', 'setupBackground');

                // call base class initialize
                BaseView.prototype.initialize.call(this, options);

                PubSub.on('carousel:cardfilmActive', this.showSkin);
                PubSub.on('carousel:sidebarClosed', this.hideSkin);
            },

            destroy: function(removeEl) {
                if (this.$background){
                    this.$background.remove();
                    this.$background = null;
                }
                PubSub.off('carousel:cardfilmActive', this.showSkin);
                PubSub.off('carousel:sidebarClosed', this.hideSkin);
                BaseView.prototype.destroy.call(this, removeEl);
            },

            hideSkin: function() {
                this.$background.hide();
            },

            render: function() {
                this.setupBackground();
                if(this.options.startVisible()) {
                    this.showSkin();
                }
            },

            showSkin: function() {
                if(this.options.sidebarAds()) {
                    // only show the skin of the active gallery
                    if (this.$background.parent().hasClass('active')) {
                        this.$background.show();
                    }
                }
            },

            setupBackground: function() {
                if (this.options.hasSkin !== 'Yes' && this.options.sponsorshipHtml) {
                    return;
                }

                this.$background = $(_.template(this.options.htmlBackground, this.options));

                var galleryHeight = $(this.options.galleryClass).height();

                if(this.options.imageSkinTop === '') {
                    this.$background.remove('.sp-galleries-skin-top');
                }
                if(this.options.imageSkinRight === '') {
                    this.$background.remove('.sp-galleries-skin-right');
                } else {
                    var rightTopOffset = (galleryHeight-this.options.imageSkinRightHeight)/2;
                    this.$background.children('.sp-galleries-skin-right').css('top', rightTopOffset);
                }
                if(this.options.imageSkinBottom === '') {
                    this.$background.remove('.sp-galleries-skin-bottom');
                }
                if(this.options.imageSkinLeft === '') {
                    this.$background.remove('.sp-galleries-skin-left');
                } else {
                    var leftTopOffset = (galleryHeight-this.options.imageSkinLeftHeight)/2;
                    this.$background.children('.sp-galleries-skin-left').css('top', leftTopOffset);
                }

                this.hideSkin();
                this.$el.after(this.$background);
            }

        });

        /**
         * Return view class.
         */
        return SportsGallerySponsorshipSkin;
    }
);
