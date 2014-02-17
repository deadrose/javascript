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
        var SponsorshipView = BaseView.extend(
        /**
         * @lends partner/asset-sponsorship.prototype
         */
        {

            backgroundTemplate: '<%= sponsorshipHtml %>',
            logoTemplate: '<div class="sponsor"><img src="<%= imageLogo %>" alt="<%= imageLogoAlt %>"><span>Sponsored by <br/><%= imageLogoAlt %></span></div>',

            /**
             * @classdesc Handles the asset sponsorship ad functionality.
             * @constructs partner/asset-sponsorship
             * @author Chad Shryock <dshryock@gannett.com>
             */
            initialize: function(options) {
                options = $.extend({
                    imageSkinLeft: null,
                    imageSkinRight: null,
                    clickThru: null,
                    imageLogo: null,
                    imageLogoAlt: null
                }, options);

                // call base class initialize
                BaseView.prototype.initialize.call(this, options);
            },

            destroy: function(removeEl) {
                if (this.$background){
                    this.$background.remove();
                    this.$background = null;
                }
                if (this.$logo){
                    this.$logo.remove();
                    this.$logo = null;
                }
                BaseView.prototype.destroy.call(this, removeEl);
            },

            render: function() {
                this.setupBackground();
                this.setupLogo();
            },

            setupBackground: function() {
                if (this.options.hasSkin !== 'Yes' && this.options.sponsorshipHtml) {
                    return;
                }

                this.$background = $(_.template(this.backgroundTemplate, this.options));
                
                this.$el.parent().append(this.$background);
            },

            setupLogo: function() {
                var $topicBar = this.$('.content-bar-top .title').eq(0);
                if (!$topicBar.length) {
                    return;
                }
                this.$logo = $(_.template(this.logoTemplate, this.options));
                $topicBar.after(this.$logo);
            }
        });

        /**
         * Return view class.
         */
        return SponsorshipView;
    }
);
