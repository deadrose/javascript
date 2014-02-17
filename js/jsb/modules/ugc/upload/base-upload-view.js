/**
 * @fileoverview UGC's Base Upload View.
 * @author Mark Kennedy
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'modules/ugc/upload/base-upload-form',
    'modules/ugc/ugc-user',
    'third-party-apis/google/google-maps'
],
    function(
        $,
        _,
        BaseView,
        UGCBaseUploadForm,
        UGCUser,
        GoogleMapsApi
        ) {
        "use strict";


        var UGCBaseUploadView = BaseView.extend({

            /**
             * Initialize page.
             * @param {Object} options Page options passed during init.
             */
            initialize: function(options) {

                options = $.extend({
                    uploadFormOptions: {}
                }, options);

                BaseView.prototype.initialize.call(this, options);

                this.$views = this.$('.ugc-upload-form-view');
                this.$uploadView = this.$views.filter('.ugc-upload-form-view-upload');
                this.$submitSuccessView = this.$views.filter('.ugc-upload-form-view-submit-success');
                this.$submitFailView = this.$views.filter('.ugc-upload-form-view-submit-fail');
                this.$loggingInView = this.$views.filter('.ugc-upload-form-view-logging-in');
                this.$loginFailView = this.$views.filter('.ugc-upload-form-view-login-fail');

                _.bindAll(this, '_onSubmitSuccess', '_onSubmitFail', '_onFileUploadSuccess', '_onFileRemove');

                // hide all views initially
                this.$views.hide();

                var currentView = this.getCurrentView();
                if (currentView) {
                    // if there is an active view, show it.
                    this._transitionView(currentView);
                }


                // setup file success wrappers
                this.$successUploadedFileWrappers = this.$('.ugc-upload-success-file');
                this.$successUploadedFileWrappers.addClass('ugc-upload-success-file-empty');

                this.setupForm();



            },

            /**
             * Sets up the upload form.
             */
            setupForm: function() {
                return UGCUser.getUserInfo().done(_.bind(function(userInfo){
                    var uploadFormOptions = $.extend({}, this._buildUploadFormOptions(), {userInfo: userInfo});
                    if (!this.subviews.uploadForm) {
                        this.subviews.uploadForm = new UGCBaseUploadForm(uploadFormOptions);
                    }
                }, this));
            },

            /**
             * Builds the options for the instantiation of upload form.
             * @returns {*}
             * @private
             */
            _buildUploadFormOptions: function() {
                return $.extend({}, {
                    el: this.$('.ugc-front-upload-form'),
                    onSubmitSuccess: this._onSubmitSuccess,
                    onSubmitFail: this._onSubmitFail,
                    onFileUploadSuccess: this._onFileUploadSuccess,
                    onFileRemove: this._onFileRemove
                }, this.options.uploadFormOptions);
            },

            /**
             * When the form is successfully submitted.
             * @param {Object} data Object containing successfully uploaded data.
             * @private
             */
            _onSubmitSuccess: function(data){
                this.revealView(this.$submitSuccessView);
            },

            /**
             * When form submission fails.
             * @private
             */
            _onSubmitFail: function(){
                this.revealView(this.$submitFailView);
            },

            /**
             * When a file is uploaded successfully.
             * @param {File} file The file object
             * @param {Object} fileMap The file map
             * @private
             */
            _onFileUploadSuccess: function(file, fileMap) {
                // only set location with the first file with location data
                if (!this._hasUploadLocationBeenSetByFile) {
                    this.getUploadLocationByFile(file).done(_.bind(function(location){
                        this.getForm().setUploadLocation(location);
                        this._hasUploadLocationBeenSetByFile = true;
                    }, this));
                }
                this.addFileToUploadSuccessMarkup(fileMap);
            },

            /**
             * Gets a geolocation based on a file object's data.
             * @param {Object} fileData The file data
             * @returns {Deferred} Returns a promise that resolves when a location is successfully obtained
             */
            getUploadLocationByFile: function(fileData) {
                var lat = fileData.geo_latitude,
                    lon = fileData.geo_longitude;
                // sometimes files dont have lat and lon!
                if (lat && lon) {
                    return this.getGeolocationByLatLon(lat, lon);
                } else {
                    return $.Deferred().reject();
                }
            },

            /**
             * Converts a latitude and longitude coordinates into a human-readable location
             * @param {Number} lat Latitude
             * @param {Number} lon Longitude
             * @returns {Deferred} Returns a promise that resolves when a geolocation is obtained successfully
             */
            getGeolocationByLatLon: function(lat, lon) {
                var deferred = $.Deferred();
                GoogleMapsApi.getGeolocation(lat, lon).done(_.bind(function(resp){
                    // format the response into a normalized location object before resolving
                    var location = GoogleMapsApi.formatGeolocationResponse(resp);
                    deferred.resolve(location);
                }, this));
                return deferred.promise();
            },

            /**
             * When a file is removed from upload form.
             * @param {File} file The file object
             * @param {Object} fileMap The file map that was removed
             * @private
             */
            _onFileRemove: function(file, fileMap) {
                this.removeFileFromUploadSuccessMarkup(fileMap);
            },

            /**
             * Adds a file to the upload success div.
             * @param fileMap The file map object
             */
            addFileToUploadSuccessMarkup: function(fileMap) {
                var fileId = fileMap.fileId,
                    $mediaEl = this._buildUploadSuccessMediaElement(fileMap),
                    $nextEmptyFileWrapper = this.$successUploadedFileWrappers.filter('.ugc-upload-success-file-empty').eq(0);
                $nextEmptyFileWrapper.data('file-id', fileId);
                $nextEmptyFileWrapper.append($mediaEl);
                $nextEmptyFileWrapper.removeClass('ugc-upload-success-file-empty');
            },

            /**
             * Removes a file from the upload success div.
             * @param {File} fileMap The file map object
             */
            removeFileFromUploadSuccessMarkup: function(fileMap) {
                var $fileWrapper = this.$successUploadedFileWrappers.filter(function() {
                    return $.data(this, 'file-id') === fileMap.fileId;
                });
                this.removeFileDataFromUploadSuccessMarkup($fileWrapper);
            },

            /**
             * Removes the file data from an upload success div.
             * @param {jQuery} $div The index of the div to be removed
             */
            removeFileDataFromUploadSuccessMarkup: function($div) {
                $div.removeData('file-id');
                $div.empty();
                $div.addClass('ugc-upload-success-file-empty');
            },

            /**
             * Removes all files from the upload success div.
             */
            resetUploadSuccessMarkup: function() {
                _.each(this.$successUploadedFileWrappers, function(fileWrapper) {
                    this.removeFileDataFromUploadSuccessMarkup($(fileWrapper));
                }, this);
            },

            /**
             * Builds the html markup for the media element
             * @param fileMap The file map
             * @returns {jQuery}
             * @private
             */
            _buildUploadSuccessMediaElement: function(fileMap) {
                var el = fileMap.getHtmlElement(),
                    sourceUrl, width, height, orientation,
                    file = fileMap.file,
                    mediaType = file.type.split('/')[0],
                    isFilePreviewable = fileMap.isPreviewable(),
                    genericMediaClass = 'ugc-upload-success-media';

                if (el) {
                    sourceUrl = el.src;
                    width = el.videoWidth || el.width;
                    height = el.videoHeight || el.height;
                }

                var $mediaEl;
                if (isFilePreviewable && mediaType === 'video') {
                    $mediaEl = $('<video src="' + sourceUrl + '">');
                } else if (isFilePreviewable && mediaType === 'image') {
                    $mediaEl = $('<img src="' + sourceUrl + '">');
                } else {
                    $mediaEl = $('<div>');
                }

                // add orientation class
                if (width && height && isFilePreviewable) {
                    orientation = width > height ? 'landscape' : 'portrait';
                    $mediaEl.addClass(genericMediaClass + '-' + orientation);
                }
                $mediaEl.addClass(genericMediaClass);
                $mediaEl.addClass(genericMediaClass + '-' + mediaType);

                var previewTypeClass;
                if (isFilePreviewable) {
                    previewTypeClass = genericMediaClass + '-preview';
                } else {
                    previewTypeClass = genericMediaClass + '-no-preview';
                }
                $mediaEl.addClass(previewTypeClass);

                return $mediaEl;
            },

            /**
             * Reveals an upload form view.
             * @param {jQuery|HTMLElement} view The element to show
             * @returns {Deferred} Returns a promise that resolves when the the element reveals itself
             */
            revealView: function(view){

                var $view = $(view);
                view = $view[0];

                // resolve immediately if view is already showing
                if (this.getCurrentView() === view) {
                    return $.Deferred().resolve();
                }

                if ($view.hasClass('ugc-upload-form-view-required')) {
                    // view requires login!
                    return this._revealProtectedView(view);
                } else {
                    // view does not require login!
                    return this._revealUnprotectedView(view);
                }
            },

            /**
             * Reveals a view that does not require user login.
             * @param {HTMLElement} view The view to reveal
             * @returns {Deferred}
             * @private
             */
            _revealUnprotectedView: function(view) {
                return this._transitionView(view);
            },

            /**
             * Transitions a view into existence.
             * @param {HTMLElement} view The view to show
             * @returns {Deferred} Returns a promise that resolves when done
             * @private
             */
            _transitionView: function(view) {
                var deferred = $.Deferred(),
                    previousView = this.getCurrentView();
                this.setCurrentView(view);
                this._handleRevealView(view, previousView).done(_.bind(function(){
                    deferred.resolve();
                }, this));
                return deferred.promise();
            },

            /**
             * Sets a view as the active one.
             * @param {jQuery|HTMLElement} view The view to set as active
             */
            setCurrentView: function(view) {
                var $view = $(view);
                this.$views.removeClass('view-active');
                $view.addClass('view-active');
            },

            /**
             * Reveals a view that requires login.
             * @params {HTMLElement} view The view to reveal
             * @private
             */
            _revealProtectedView: function(view) {
                var deferred = $.Deferred(),
                    loginState = UGCUser.getLoginState(),
                    currentView = this.getCurrentView();

                if (loginState === 'loggedOut') {
                    // bail because user is logged out!
                    return $.Deferred().reject();
                }

                if (loginState === 'loginFailed' && currentView !== this.$loginFailView[0]) {
                    // login has failed and user has already previously attempted to login
                    // if current view is login failed view, this means a user already has seen it,
                    // so instead of showing it again, we assume to try again by continuing with this function
                    this.revealView(this.$loginFailView);
                } else {
                    // user is logging in!
                    this.revealView(this.$loggingInView);
                }

                $.when(UGCUser.getUserInfo())
                    .done(_.bind(function(){
                        this._transitionView(view).done(_.bind(function(){
                            deferred.resolve();
                        }, this));
                    }, this))
                    .fail(_.bind(function(){
                        // getting user info failed!
                        this._transitionView(this.$loginFailView);
                        deferred.reject();
                    }, this));
                return deferred.promise();
            },

            /**
             * Override-able function to handle the revealing of a view (div).
             * @param {HTMLElement} view The view that is requested to be shown
             * @param {HTMLElement} previousView The original view before the new one that was requested
             * @returns {Deferred} Returns a promise that resolves when the is revealed
             */
            _handleRevealView: function(view, previousView) {
                var $view = $(view),
                    $previousView = $(previousView);
                $view.show();
                $previousView.hide();
                return $.Deferred().resolve();
            },

            /**
             * Gets the currently active view.
             * @returns {jQuery|Array} Returns current view if there is one and empty array if not
             */
            getCurrentView: function() {
                return this.$views.filter('.view-active')[0];
            },

            /**
             * Gets the upload form subview.
             * @returns {Object} The upload form subview
             */
            getForm: function() {
                return this.subviews.uploadForm;
            },

            /**
             * Gets the current state of the upload form.
             * @returns {String} returns 'notSubmitted', 'submitPending', 'submitFailed' or 'submitSuccess'
             */
            getFormSubmitStatus: function() {
                var form = this.getForm();
                if (form) {
                    return form.getSubmitStatus();
                } else {
                    return 'notSubmitted';
                }
            },

            /**
             * Get the default upload location for the upload form.
             * @returns {*|{latitude: number, longitude: number}}
             */
            getDefaultUploadLocation: function() {
                if (this.subviews.uploadForm) {
                    return this.subviews.uploadForm.getDefaultUploadLocation();
                } else {
                    return '';
                }
            },

            /**
             * Logs in user.
             */
            loginUser: function() {
                return UGCUser.loginUser();
            },

            /**
             * Reset.
             */
            reset: function() {
                if (this.subviews.uploadForm) {
                    this.subviews.uploadForm.reset();
                }
                this.resetUploadSuccessMarkup();
                this._hasUploadLocationBeenSetByFile = false;
            },

            /**
             * Destroy view.
             */
            destroy: function(removeEl) {
                BaseView.prototype.destroy.call(this, removeEl);

            }

        });

        /**
         * Return page class.
         */
        return UGCBaseUploadView;
    });
