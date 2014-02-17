/**
 * @fileoverview Base UGC upload module.
 * @author Mark Kennedy
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'modules/ugc/upload/file-upload',
    'modules/ugc/ugc-user',
    'form/base-form',
    'managers/cachemanager'
],
    function(
        $,
        _,
        BaseView,
        StateManager,
        UGCFileUpload,
        UGCUser,
        BaseForm,
        CacheManager
        ) {
        "use strict";

        var UGCBaseUploadForm = BaseView.extend({

            el: '.ugc-upload-form',

            events: {
                'submit': 'onSubmit',
                'blur .ugc-upload-location-input': 'onLocationFieldBlur',
                'click .ugc-upload-file-thumb-remove': 'onClickThumbRemove',
                'focus .ugc-upload-description-input, .ugc-upload-title-input': 'onInputFieldFocus',
                'blur .ugc-upload-description-input, .ugc-upload-title-input': 'onInputFieldBlur'
            },

            /**
             * Initialize page.
             * @param {Object} options Page options passed during init.
             */
            initialize: function(options) {

                options = $.extend({
                    onSubmitSuccess: null,
                    onSubmitFail: null,
                    onSubmitInvalidForm: null,
                    onUploadLocationChange: null,
                    onFileUploadSuccess: null,
                    onFileUploadFail: null,
                    onFileRemove: null,
                    userInfo: null
                }, options);

                _.bindAll(this, 'submit', 'parseVenuesForAutocomplete',
                    '_onSelectAutoCompleteLocationResult', 'onFileSelection', 'onDescInputFieldCharChange',
                    'onTitleInputFieldCharChange', 'onFileUploadSuccess', 'onFileUploadFail');

                BaseView.prototype.initialize.call(this, options);

                this.$postTitleInput = this.$('.ugc-upload-title-input');
                this.$postTitleInputCharCounter = this.$('.ugc-upload-title-field-char-counter');
                this.$postDescInput = this.$('.ugc-upload-description-input');
                this.$postDescInputCharCounter = this.$('.ugc-upload-description-field-char-counter');
                this.$locationInput = this.$('.ugc-upload-location-input');
                this.$submitBtn = this.$('.ugc-upload-submit-btn');
                this.$topicIdInput = this.$('.ugc-front-topic-id-input');
                this.formItemErrorClass = 'ui-form-field-error';
                this.$successUploadedFileWrappers = this.$('.ugc-upload-success-file');
                this.$thumbs = this.$('.ugc-upload-file-thumb');

                this.pageInfo = StateManager.getActivePageInfo();

                this.setupForm();

            },

            /**
             * Initializes upload form.
             */
            setupForm: function(){
                    if (!this.subviews.form) {
                        this.subviews.form = new BaseForm({
                            el: this.$el,
                            formOptions: [
                                {
                                    el: this.$locationInput,
                                    maxResults: 7,
                                    ajaxOptions: this.getFormAutoCompleteAjaxOptions(),
                                    resultDisplayTemplate: this.getFormValueTemplate(),
                                    resultValueTemplate: this.getFormValueTemplate(),
                                    onParseResults: this.parseVenuesForAutocomplete,
                                    onSelect: this._onSelectAutoCompleteLocationResult
                                },
                                {
                                    el: this.$postDescInput,
                                    onValueChange: this.onDescInputFieldCharChange
                                },
                                {
                                    el: this.$postTitleInput,
                                    onValueChange: this.onTitleInputFieldCharChange
                                }
                            ]
                        });
                    }
                this.setupFileUploads();
                // setup required fields
                this.setupRequiredFields();
                // setup file success wrappers
                this.$successUploadedFileWrappers.addClass('ugc-upload-success-file-empty');
            },

            /**
             * Called whenever character count changes in description input field.
             */
            onDescInputFieldCharChange: function(newValue) {
                this.$postDescInputCharCounter.html(newValue.length);
            },

            /**
             * Called whenever character count changes in title input field.
             */
            onTitleInputFieldCharChange: function(newValue) {
                this.$postTitleInputCharCounter.html(newValue.length);
            },

            /**
             * When input field is in focus.
             */
            onInputFieldFocus: function(e) {
                // show counter div
                if ($(e.currentTarget).hasClass('ugc-upload-description-input')) {
                    this.$postDescInputCharCounter.show();
                } else {
                    this.$postTitleInputCharCounter.show();
                }
            },

            /**
             * When input field loses focus.
             */
            onInputFieldBlur: function(e) {
                // hide counter div
                if ($(e.currentTarget).hasClass('ugc-upload-description-input')) {
                    this.$postDescInputCharCounter.hide();
                } else {
                    this.$postTitleInputCharCounter.hide();
                }
            },

            /**
             * Sets up file uploads.
             */
            setupFileUploads: function() {
                this._fileUploadSubviews = [];
                // setup file uploaders
                _.each(this.$thumbs, function(thumb, idx) {
                    var View = new UGCFileUpload({
                        el: $(thumb),
                        sessionToken: this.options.userInfo.sessiontoken,
                        onSelectFiles: this.onFileSelection,
                        onFileUploadSuccess: this.onFileUploadSuccess,
                        onFileUploadFail: this.onFileUploadFail
                    });
                    this.subviews['fileUpload' + idx] = View;
                    this._fileUploadSubviews.push(View);
                }, this);
            },

            /**
             * When files are selected from the multiple file input.
             */
            onFileSelection: function(selectedFiles) {
                var maxUploads = this.$thumbs.length,
                    numSelectedFiles = this.getFiles().length,
                    numProcessableFiles = Math.min(maxUploads - numSelectedFiles, selectedFiles.length),
                    processableFiles = selectedFiles.slice(0, numProcessableFiles);
                if (processableFiles.length) {
                    _.each(processableFiles, function(file) {
                        this.addUpload(file);
                    }, this);
                }
            },

            /**
             * Adds a file to the form to be uploaded.
             * @param {File} file The file that will be uploaded
             */
            addUpload: function(file) {
                var nextAvailableThumb = this.$thumbs.filter('.ugc-upload-file-thumb-inactive').first(),
                    subviewIndex = this.$thumbs.index(nextAvailableThumb),
                    subview = this._fileUploadSubviews[subviewIndex];
                // assign the file to the subview
                subview.setFile(file);

                if (subview.isFileValid()) {
                    this._addToUploadQueue(_.bind(function(){
                        return subview.uploadFile();
                    }, this));
                }
            },

            /**
             * Adds a file's subview to upload queue.
             * @param {Function} onReadyCallback The function to be called when ready
             * @private
             */
            _addToUploadQueue: function(onReadyCallback) {
                this._queuedUploadPromises = this._queuedUploadPromises || [];
                var deferred = $.Deferred();
                $.when.apply(this, this._queuedUploadPromises).always(function() {
                    onReadyCallback()
                        .progress(function(percentage){
                            // okay to allow least 2 simultaneous uploads when one has reached near completion
                            if (percentage > 95) {
                                deferred.resolve();
                            }
                        })
                        .done(function(){
                            // account for times when onprogress is not fired (i.e. when file uploads at blazing speed)
                            deferred.resolve();
                        });
                });
                this._queuedUploadPromises.push(deferred.promise());
            },

            /**
             * When a thumbnail x is clicked.
             */
            onClickThumbRemove: function(e) {
                var $clickedThumb = $(e.currentTarget),
                    $parentThumb = $clickedThumb.closest('.ugc-upload-file-thumb'),
                    subviewIndex = this.$thumbs.index($parentThumb);
                this.removeUpload(subviewIndex);
            },

            /**
             * Removes file from uploads.
             * @param subviewIndex
             */
            removeUpload: function(subviewIndex) {
                var subview = this.subviews['fileUpload' + subviewIndex],
                    fileMap = subview.getFileMap();
                // only trash the uploaded files if the form hasn't been submitted successfully
                if (this.getSubmitStatus() !== 'submitSuccess') {
                    subview.trashFile();
                }
                subview.reset();
                this._showHideSubmitButton();
                if (this.options.onFileRemove) {
                    this.options.onFileRemove(fileMap.file, fileMap);
                }
            },

            /**
             * Resets all file uploads.
             */
            resetFileUploads: function() {
                _.each(this._fileUploadSubviews, function(subview, subviewIndex) {
                    // only remove uploads from subviews that actually have files in them
                    if (subview.getFile()) {
                        this.removeUpload(subviewIndex);
                    }
                }, this);
            },

            /**
             * Gets the underscore template to use for the autocomplete results displaying.
             */
            getFormValueTemplate: function() {
                return'<%= name %>' +
                    '<% if (location.address) { %> - <%= location.address %><% } %>' +
                    '<% if (location.city) { %>, <%= location.city %><% } %>' +
                    '<% if (location.state) { %>, <%= location.state %><% } %>';
            },

            /**
             * Returns autocomplete options to use for BaseForm.
             */
            getFormAutoCompleteAjaxOptions: function() {
                var location = this.getUploadLocation(),
                    foursquareLocation = '';
                if (location) {
                    foursquareLocation = location.latitude + ',' + location.longitude;
                }
                return {
                    url: '/api/foursquare/venues/search',
                    dataType: 'jsonp',
                    data: {
                        'v': '20130319',
                        'intent':'global',
                        'limit': 20,
                        'll': foursquareLocation
                    }
                };
            },

            /**
             * Applies a 'required' class to items to show a fancy little asterisk.
             */
            setupRequiredFields: function() {
                var $reqFields = this.$('.ui-form-field-required');
                _.each($reqFields, function(field) {
                    $(field).parent().addClass('required');
                }, this);
            },

            /**
             * When the location field's focus is lost.
             */
            onLocationFieldBlur: function() {
                this.setUploadLocation(this.getUploadLocation());
            },

            /**
             * Updates location so we can narrow our search when autocomplete fetches results.
             * location lookup for autocomplete to display a narrower set of results.
             * @param {Object} location
             */
            updateLocationFieldAutoCompleteParams: function(location) {
                var name = this.$locationInput.attr('name');
                if (this.subviews.form && name) {
                    var autoCompleteView = this.subviews.form.getFormObjectsByName(name)[0];
                    var dataParams = {
                        'll': location.latitude + ',' + location.longitude
                    };
                    autoCompleteView.updateAjaxOptions({'data': dataParams});
                }
            },

            /**
             * When a result is selected from the autocomplete
             * @param {String} dataValue New value of input field
             * @param {Object} result Object containing data from selected item
             */
            _onSelectAutoCompleteLocationResult: function(dataValue, result) {
                var location = result.location,
                locationObj = {
                    latitude: location.lat,
                    longitude: location.lng,
                    city: location.city,
                    state: location.state,
                    country: location.cc,
                    venue: dataValue
                };
                this.setUploadLocation(locationObj);
            },

            /**
             * Takes fetched autocomplete's results and finds the right nested data within the response and returns
             * it back to autocomplete for it to display the results correctly.
             * @param {Object} data The full data result autocomplete kicks back.
             * @returns {Object}
             */
            parseVenuesForAutocomplete: function(data) {
                var response;
                if (data.response && data.response.venues && data.response.venues.length > 0) {
                    response = data.response.venues;
                }
                return response;
            },

            /**
             * Gets current upload location for the form.
             * @returns {*}
             */
            getUploadLocation: function() {
                return CacheManager.getValue(this.getUploadLocationLookupKey()) || this.getDefaultUploadLocation();
            },

            /**
             * Gets default USA location.
             * @returns {{latitude: number, longitude: number}}
             */
            getDefaultUploadLocation: function() {
                return {latitude: 37.9, longitude: -95};
            },

            /**
             * Gets the local storage lookup key for upload location.
             */
            getUploadLocationLookupKey: function() {
                return 'ugcUploadLocation';
            },

            /**
             * Sets the location information for the upload form to a new location.
             * @param {Object} location
             */
            setUploadLocation: function(location){
                this.updateLocationFieldAutoCompleteParams(location);
                this.setUploadLocationField(location);
                CacheManager.setValue(this.getUploadLocationLookupKey(), location);
                if (this.options.onUploadLocationChange) {
                    this.options.onUploadLocationChange(location);
                }
            },

            /**
             * Resets upload form location.
             */
            resetUploadLocation: function() {
                CacheManager.clearValue(this.getUploadLocationLookupKey());
                if (this.options.onUploadLocationChange) {
                    this.options.onUploadLocationChange();
                }
            },

            /**
             * Sets the location autocomplete field.
             * @param {Object} location
             */
            setUploadLocationField: function(location) {
                var value = '';
                if (location) {
                    if (location.venue) {
                        // we have a venue name, so use that as locations value!
                        value = location.venue;
                    } else if (location.city && location.state) {
                        value = location.city + ', ' + location.state;
                    }
                }
                this.$locationInput.val(value);
            },

            /**
             * Shows/hides the submit button depending on how many files are uploaded.
             * @private
             */
            _showHideSubmitButton: function() {
                var files = this.getUploadedFiles();
                if (!files.length) {
                    this.$submitBtn.addClass('ugc-upload-submit-btn-disabled');
                } else {
                    this.$submitBtn.removeClass('ugc-upload-submit-btn-disabled');
                }
            },

            /**
             * Get all files that have been successfully uploaded.
             * @returns {Array}
             */
            getUploadedFiles: function() {
                var files = [];
                _.each(this._fileUploadSubviews, function(subview){
                    var file = subview.getFile();
                    if (file && subview.isFileValid()) {
                        files.push(file);
                    }
                });
                return files;

            },

            /**
             * Get all files that have been attempted to be uploaded.
             * @returns {Array}
             */
            getFiles: function() {
                var files = [];
                _.each(this._fileUploadSubviews, function(subview) {
                    var file = subview.getFile();
                    if (file) {
                        files.push(file);
                    }
                }, this);
                return files;
            },

            /**
             * When a file is uploaded successfully.
             * @param {File} file The file object
             * @param {Object} fileMap The file map
             */
            onFileUploadSuccess: function(file, fileMap) {
                this._showHideSubmitButton();
                if (this.options.onFileUploadSuccess) {
                    this.options.onFileUploadSuccess(file, fileMap);
                }

            },

            /**
             * When a file upload fails.
             * @param {String} [error] The error message describing reason for failure
             * @param {File} [file] The file that failed
             * @param {Object} [fileMap] The file map of the file that failed
             */
            onFileUploadFail: function(error, file, fileMap) {
                if (file) {
                    file.error = true;
                }
                this._showHideSubmitButton();
                if (this.options.onFileUploadFail) {
                    this.options.onFileUploadFail(error, file, fileMap);
                }
            },

            /**
             * When form submission is triggered.
             * @param e
             */
            onSubmit: function(e) {
                e.preventDefault();
                this.submit();
            },

            /**
             * Whether form submission has been disabled.
             */
            isSubmitDisabled: function() {
                return this.$submitBtn.hasClass('ugc-upload-submit-btn-disabled');
            },

            /**
             * Submits the form.
             */
            submit: function(){

                // bail if form is currently sending or if submit button is disabled
                if (this.getSubmitStatus() === 'submitPending' || this.isSubmitDisabled()){
                    return;
                }

                if (!this.validateForm()) {
                    // form is invalid!
                    if (this.options.onSubmitInvalidForm) {
                        this.options.onSubmitInvalidForm();
                    }
                    return;
                }

                this.$submitBtn.addClass('ugc-upload-submit-btn-sending');

                var submitData = this.getFormSubmitData();

                this._formSubmitPromise = this.sendFormDataToServer(submitData)
                    .done(_.bind(function(data){
                        this._onSubmitSuccess(data);
                    }, this))
                    .fail(_.bind(function(){
                        this._onSubmitFail();
                    }, this));

                this._formSubmitPromise.always(_.bind(function(){
                    this.$submitBtn.removeClass('ugc-upload-submit-btn-sending');
                }, this));

            },

            /**
             * Gets the current state of the upload form.
             * @returns {String} returns 'notSubmitted', 'submitPending', 'submitFailed' or 'submitSuccess'
             */
            getSubmitStatus: function() {
                if (!this._formSubmitPromise) {
                    return 'notSubmitted';
                } else if (this._formSubmitPromise.state() === 'rejected') {
                    return 'submitFailed';
                } else if (this._formSubmitPromise.state() === 'pending') {
                    return 'submitPending';
                } else {
                    return 'submitSuccess';
                }
            },

            /**
             * On successful form submission.
             * @private
             */
            _onSubmitSuccess: function(data) {
                if (this.options.onSubmitSuccess) {
                    this.options.onSubmitSuccess(data);
                }
            },

            /**
             * On successful form failure.
             * @private
             */
            _onSubmitFail: function() {
                if (this.options.onSubmitFail) {
                    this.options.onSubmitFail();
                }
            },

            /**
             * Sends form data to server.
             * @param data
             * @returns {Deferred}
             */
            sendFormDataToServer: function(data) {
                return StateManager.fetchData(null, {
                        url: '/yourtake/updatemedia/',
                        type: 'POST',
                        data: data
                    });
            },

            /**
             * Gets the data needed for form submission.
             * @returns {Object}
             */
            getFormSubmitData: function() {
                var pageType = this.pageInfo.basePageType,
                    assetid = this.pageInfo.assetid,
                    data = {
                        'user': JSON.stringify(this.options.userInfo),
                        'parentgroupid': this.$topicIdInput.val(),
                        'mediaitems': JSON.stringify(this.getSubmitFiles()),
                        'post': JSON.stringify(this.getSubmitPostData()),
                        'type': pageType,
                        'ssts': this.pageInfo.ssts
                    };
                // add story data if available
                if (assetid) {
                    data.story = JSON.stringify(this.getSubmitStoryData());
                }
                // add vhost
                data.vhost = window.site_config.THIRDPARTYAPI.FILEMOBILE.VHOST;
                return data;

            },

            /**
             * Gets the files for the submission form.
             * @returns {Object}
             */
            getSubmitFiles: function() {
                return this.getUploadedFiles();
            },

            /**
             * Validates the form (before submission happens)
             * @returns {boolean} Returns true if form items are valid
             * @private
             */
            validateForm: function() {
                var isFormValid = false,
                    loopCount = 0;

                // if no valid file uploads, form is invalid immediately
                if (!this.getUploadedFiles().length) {
                    return false;
                }

                _.each(this.subviews.form.formNameMap, function(objs, key){
                    var isItemValid;

                    _.each(objs, function(item){
                        isItemValid = this._validateFormItem(item);
                    }, this);

                    // if the first item is valid, we need to change the form validation to true
                    if (loopCount === 0 && isItemValid) {
                        isFormValid = true;
                    }
                    if (!isItemValid && isFormValid) {
                        isFormValid = false;
                    }
                    loopCount++;
                }, this);


                return isFormValid;
            },

            /**
             * Determines if an individual form item is valid.
             * @param {Object} obj Form item object
             * @returns {Boolean} Returns true if item is valid
             * @private
             */
            _validateFormItem: function(obj){
                var $formItem = obj.getFormElement(),
                    $uiItem = obj.getUIElement(),
                    itemValue = $formItem.val();
                if ($formItem.hasClass('ui-form-field-required') && (itemValue === '' || itemValue === obj.placeholder)) {
                    $uiItem.addClass(this.formItemErrorClass);
                    return false;
                } else {
                    $uiItem.removeClass(this.formItemErrorClass);
                    return true;
                }
            },

            /**
             * Gets the post data for the submission form.
             * @returns {Object}
             */
            getSubmitPostData: function() {
                var location = this.getSubmitLocationData();
                return $.extend(location, {
                    'title': this.$postTitleInput.val(),
                    'description': this.$postDescInput.val(),
                    'tags':this.pageInfo.taxonomykeywords||""
                });
            },
            /**
             * Gets the story data for the submission form.
             * @returns {Object}
             */
            getSubmitStoryData: function() {
                var pageInfo = this.pageInfo;
                return {
                    id: pageInfo.assetid,
                    url: pageInfo.full_url || location.href,
                    title: pageInfo.seotitle
                };
            },
            /**
             * Formats the location data for the submission form.
             * @returns {Object}
             */
            getSubmitLocationData: function() {
                var location = this.getUploadLocation();
                if (location) {
                    return {
                        geo_latitude: location.latitude,
                        geo_longitude: location.longitude,
                        city: location.city,
                        state: location.state,
                        country: location.country,
                        venue: location.venue
                    };
                } else {
                    return {};
                }
            },

            /**
             * Resets the upload form.
             */
            reset: function(){

                // if form is sending at the time of resetting, reset the submit button and abort the call.
                if (this.getSubmitStatus() === 'submitPending') {
                    this.$submitBtn.removeClass('ugc-upload-submit-btn-sending');
                    this._formSubmitPromise.abort();
                }

                // reset form subview
                if (this.subviews.form) {
                    // remove error classes from form if they exist
                    _.each(this.subviews.form.formNameMap, function(objs){
                        _.each(objs, function(obj){
                            obj.getUIElement().removeClass(this.formItemErrorClass);
                        }, this);
                    }, this);
                    this.subviews.form.reset();
                }

                this.resetFileUploads();
                this.resetUploadLocation();

                this._formSubmitPromise = null;
                this._queuedUploadPromises = null;

                this._showHideSubmitButton();

            },

            /**
             * When the view is destroyed.
             * @param removeEl
             */
            destroy: function(removeEl) {
                BaseView.prototype.destroy.call(this, removeEl);
            }

        });

        /**
         * Return page class.
         */
        return UGCBaseUploadForm;
    });
