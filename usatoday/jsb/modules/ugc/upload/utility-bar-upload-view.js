/**
 * @fileoverview UGC Utility bar upload view.
 * @author Mark Kennedy <mdkennedy@gannett.com>
 */
define([
    'jquery',
    'underscore',
    'modules/ugc/upload/base-upload-view',
    'user-manager',
    'modules/ugc/ugc-user',
    'easing'
],
function(
    $,
    _,
    UGCBaseUploadView,
    UserManager,
    UGCUser
) {
    'use strict';

    /**
     * View class.
     */
    var UGCUtilityBarUploadView = UGCBaseUploadView.extend({

        el: '.ugc-util-bar-flyout-upload-form-view-container',

        events: {
            'click .ugc-util-bar-flyout-upload-form-contribute-more-btn': 'onClickContributeMoreButton',
            'click .ugc-util-bar-flyout-upload-form-view-upload-teaser': 'onClickUploadTeaserButton',
            'click .ugc-util-bar-flyout-submit-btn': 'onClickSubmitButton',
            'click .ugc-util-bar-flyout-cancel-btn': 'onClickCancelButton',
            'click .ugc-util-bar-flyout-be-first-to-contribute-graphic-signedin': 'onBeFirstToContributeButtonClick',
            'click .ugc-login-btn': 'onClickLoginButton',
            'click .ugc-util-bar-flyout-upload-form-login-fail-try-again': 'onClickLoginFailTryAgain'
        },

        initialize: function(options) {

            options = $.extend({
                onRefresh: null,
                uploadFormOptions: {
                    el: this.$('.ugc-util-bar-flyout-upload-form')
                }
            }, options);

            this.pubSub = {
                'user:login': this.onUserLogin,
                'user:logout': this.onUserLogout
            };
            UGCBaseUploadView.prototype.initialize.call(this, options);

            this.$views = this.$('.ugc-util-bar-flyout-upload-form-view');
            this.$uploadTeaserView = this.$views.filter('.ugc-util-bar-flyout-upload-form-view-upload-teaser');
            this.$uploadView = this.$views.filter('.ugc-util-bar-flyout-upload-form-view-upload');
            this.$submitSuccessView = this.$views.filter('.ugc-util-bar-flyout-upload-form-view-submit-success');
            this.$submitFailView = this.$views.filter('.ugc-util-bar-flyout-upload-form-view-submit-fail');
            this.$notSignedInView = this.$views.filter('.ugc-util-bar-flyout-view-notsignedin');

            this.setup();

        },

        /**
         * Sets stuff up for the view.
         */
        setup: function() {
            if (UGCUser.getLoginState() === 'loggedOut') {
                this.revealView(this.$notSignedInView);
            } else {
                this.revealView(this.$uploadTeaserView);
            }
        },

        /**
         * Reveals a view.
         * @param {HTMLElement} view The view to reveal
         * @param {HTMLElement} previousView The original view
         * @returns {*} Returns a promise when done.
         */
        _handleRevealView: function(view, previousView){
            var deferred = $.Deferred(),
                $view = $(view),
                viewHeight = $view.height();
            $(previousView).hide();
            this.updateViewContainerHeight(viewHeight).done(_.bind(function(){
                $view.fadeIn(400, _.bind(function() {
                    deferred.resolve();
                    if (this.options.onRefresh) {
                        this.options.onRefresh();
                    }
                }, this));
            }, this));
            return deferred.promise();
        },

        /**
         * Shows the upload form.
         */
        show: function() {
            return this.revealView(this.$uploadTeaserView);
        },


        /**
         * Animates the container of all the views to a specific height.
         * @param {Number} viewHeight
         * @returns {Deferred}
         */
        updateViewContainerHeight: function(viewHeight) {
            var deferred = $.Deferred(),
                easing,
                duration;
            if (viewHeight === 0) {
                easing = 'easeOutQuad';
                duration = 160;
            } else {
                easing = 'easeOutBack';
                duration = 400;
            }
            this.$el.stop().animate({'height': viewHeight + 'px'}, {
                duration: duration,
                easing: easing,
                complete: function(){
                    deferred.resolve();
                }
            });
            return deferred.promise();
        },

        /**
         * When the form is successfully submitted.
         * @param {Object} data Object containing successfully uploaded data.
         * @private
         */
        _onSubmitSuccess: function(data){
            var post = data.post;
            // add username to view
            this.$submitSuccessView.find('.ugc-upload-form-submission-text-username').text(data.user.firstname);
            // add post groupid to link
            var $viewPostLink = this.$submitSuccessView.find('.ugc-util-bar-flyout-upload-form-view-your-contribution-btn');
            $viewPostLink.attr('href', _.template($viewPostLink.attr('href'), {post_id: post.groupid}));

            this.revealView(this.$submitSuccessView);
        },

        /**
         * When contribute more button is clicked.
         */
        onClickContributeMoreButton: function() {
            this.reset();
            this.revealView(this.$uploadView);
        },

        /**
         * When teaser upload button is clicked.
         */
        onClickUploadTeaserButton: function() {
            this.revealView(this.$uploadView);
        },

        /**
         * When clicking on the upload form submit button.
         */
        onClickSubmitButton: function() {
            this.getForm().submit();
        },

        /**
         * When clicking on the upload form cancel button.
         */
        onClickCancelButton: function() {
            this.reset();
        },

        /**
         * When the login button is clicked.
         * @param {Event} e
         */
        onClickLoginButton: function(e){
            var userAccount = $(e.target).data('user-account');
            UserManager.loginUser(userAccount);
            e.preventDefault();
        },

        /**
         * When user clicks on 'try again' link when login has failed.
         */
        onClickLoginFailTryAgain: function(e) {
            e.preventDefault();
            this.loginUser();
            this.revealView(this.$uploadView);
        },

        /**
         * When clicking on 'be first to contribute' graphic.
         */
        onBeFirstToContributeButtonClick: function() {
            this.revealView(this.$uploadView);
        },

        /**
         * When user logs out.
         */
        onUserLogout: function(){
            this.revealView(this.$notSignedInView);
        },

        /**
         * When user logs in.
         */
        onUserLogin: function(){
            this.setup();
        },

        /**
         * Reset.
         */
        reset: function() {
            var submitStatus = this.getFormSubmitStatus();
            UGCBaseUploadView.prototype.reset.call(this);
            if (submitStatus === 'submitSuccess' || submitStatus === 'submitFailed') {
                this.revealView(this.$uploadView);
            } else {
                this.revealView(this.$uploadTeaserView);
            }
        },

        /**
         * Destroys the view.
         * @param removeEl
         */
        destroy: function(removeEl) {
            UGCBaseUploadView.prototype.destroy.call(this, removeEl);
        }

    });

    /**
     * Return view class.
     */
    return UGCUtilityBarUploadView;
});
