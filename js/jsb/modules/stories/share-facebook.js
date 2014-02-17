/**
 * @fileoverview Facebook share view.
 * @author Erik Kallevig <ekallevig@gannett.com>
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'baseview',
    'pubsub',
    'utils',
    'third-party-apis/facebook/facebook'
],
function(
    $,
    _, 
    Backbone,
    BaseView,
    PubSub,
    Utils,
    Facebook
) {

    /**
     * View class.
     */
    var ShareFacebook = BaseView.extend({

        // Events.
        events: {
            'click .util-bar-share-submit-btn-facebook': 'onClickPostBtn',
            'click .util-bar-success-link-facebook' : 'onClickPostLink'
        },

        /**
         * Initialize view.
         */
        initialize: function(options) {
            _.bindAll(this, 'fbShareCallback');
            BaseView.prototype.initialize.call(this, options);
        },


        /**
         * Click handler for 'post to facebook' button.
         */
        onClickPostBtn: function(e) {
            // Lazily query dom only when user clicks share btn.
            this.$loading = this.$$('.util-bar-share-loading-facebook');
            this.$status = this.$$('.util-bar-share-status-text-facebook');
            this.$message = this.$$('.util-bar-share-message-facebook');
            this.$successPane = this.$$('.util-bar-flyout-pane-success-facebook');
            this.$successLink = this.$$('.util-bar-success-link-facebook');
            this.$successDescription = this.$$('.util-bar-success-description-facebook');
            this.$flyoutSection = this.$$('.util-bar-flyout-section-facebook');

            this.fbShare();
        },

        /**
         * Share current story to feed.
         */
        fbShare: function() {
            this.$loading.show();
            var obj = {
                method : 'feed',
                link: this.$message.data('link'),
                picture: this.$message.data('image'),
                name: this.$message.data('title')
            };
            Facebook.openUIdialog(obj, this.fbShareCallback);
        },

        /**
         * Check for error or success on posting in this callback.
         * @param {Object} repsonse Feed post response.
         */
        fbShareCallback: function(response) {
            if (!response) { 
                this.$loading.hide();
            }
            else {
                if (response.error) {
                    this.$loading.hide();
                    this.$status.text('An error occurred, try again.');
                } else {
                    this.$successLink.remove();
                    if (response.post_id) {
                        var linkUrl = 'https://www.facebook.com/me/posts/' + response.post_id.replace(/.*_(.*)/gi, '$1');
                        var link = $('<a class="util-bar-success-link-facebook" href="' + linkUrl + '">View the post.</a>');
                        this.$successDescription.append(link);
                    }
                    this.$loading.hide();
                    this.$flyoutSection.hide();
                    this.$successPane.show();
                    PubSub.trigger('uotrack', 'UtilityBarShareFacebook');
                }
            }
        },

        onClickPostLink: function(e) {
            e.preventDefault();
            var linkUrl = $(e.target).attr('href');
            Utils.openPopup(linkUrl, 1000, 600);
        }
    });

    /**
     * Return view class.
     */
    return ShareFacebook;
});
