/**
 * @fileoverview UGC's File upload module.
 * @author Mark Kennedy
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'form/input-file',
    'easing'
],
function(
    $,
    _,
    BaseView,
    InputFile
) {
    'use strict';

    /**
     * Module class.
     */
    var UGCFileUpload = BaseView.extend({

        FILE_CONFIG: {
            image: {
                allowedFormats: 'bmp|jpg|jpeg|gif|png|tiff|tif',
                maxSize: 10000, // kb
                previewMaxSize: 20000 // kb
            },
            video: {
                allowedFormats: 'quicktime|3g2|3gp|3gpp2|3gpp|asf|avi|dirac|dv|flav|flv|mkv|mov|mp4|m4a|mj2|mpg|mpeg|webm|ogg|ogv|x-ms-wmv',
                maxSize: 25600, // kb
                previewMaxSize: 20000 // kb
            }
        },

        PROGRESS_CLASSES: {
            done: 'ugc-upload-file-done',
            fail: 'ugc-upload-file-fail',
            pending: 'ugc-upload-file-pending',
            queued: 'ugc-upload-file-queued'
        },

        /**
         * Initialize modules.
         * @param {Object} options Module options passed during init.
         */
        initialize: function(options) {

            options = $.extend({
                sessionToken: null,
                onSelectFiles: null,
                onFileUploadSuccess: null,
                onFileUploadFail: null
            }, options);

            BaseView.prototype.initialize.call(this, options);

            _.bindAll(this, '_onSelectFiles', 'uploadFile', 'setFile', 'trashFile', 'getFile');

            this.$removeBtn = this.$('.ugc-upload-file-thumb-remove');
            this.$emptyContainer = this.$('.ugc-upload-file-thumb-empty');
            this.$filePreviewContainer = this.$('.ugc-upload-file-preview-wrap');
            this.$fileMediaPreviewWrap = this.$('.ugc-upload-file-media-preview-wrap');
            this.$progressText = this.$('.ugc-upload-file-progress-text');
            this.$errorWrap = this.$('.ugc-upload-file-thumb-error-wrap');
            this.$errorText = this.$('.ugc-upload-file-thumb-error-text');

            // we need to check if filemobile site config exists to get tests to pass
            if (window.site_config.THIRDPARTYAPI.FILEMOBILE) {
                this.FM_SITE_CONFIG = window.site_config.THIRDPARTYAPI.FILEMOBILE;
                this.SERVICES_ENDPOINT = this.FM_SITE_CONFIG.SERVICES_ENDPOINT;
                this.VHOST = this.FM_SITE_CONFIG.VHOST;
            }

            this.setup();

        },


        /**
         * Sets up the fallback input file for uploading (non-multiple selection of files).
         */
        setup: function() {
            var inputFileUploadAjaxOptions = this.getUploadAjaxOptions(),
                inputFileRemoveAjaxOptions = this.getRemoveUploadAjaxOptions(),
                iframeDataMap = this.getIframeHiddenValueMap();
            if (!this.subviews.inputFileUpload) {
                this.subviews.inputFileUpload = new InputFile({
                    el: this.$('.ugc-upload-file-input'),
                    onSelectFiles: this._onSelectFiles,
                    maxUploads: 6,
                    uploadAjaxOptions: inputFileUploadAjaxOptions,
                    removeAjaxOptions: inputFileRemoveAjaxOptions,
                    iframeHiddenInputValueMap: iframeDataMap
                });
            }
        },

        /**
         * When files are selected using the file picker.
         * @param selectedFileMaps
         */
        _onSelectFiles: function(selectedFileMaps) {
            if (this.isProgressiveUpload()) {
                // pass selected file maps to parent callback to determine next available upload slot
                if (this.options.onSelectFiles) {
                    this.options.onSelectFiles(selectedFileMaps);
                }
            } else {
                this.onIframeFileSelection(selectedFileMaps);
            }
        },

        /**
         * Creates object containing data for hidden values when iframe-mode is used for uploading.
         */
        getIframeHiddenValueMap: function() {
            return {
                hidden: 'HIDDEN',
                vhost: this.VHOST,
                sessiontoken: this.getSessionToken(),
                redirect: window.location.protocol + '//' + window.location.host + '/yourtake/upload/response/'

            };
        },


        /**
         * Gets ajax options for uploading.
         * @returns {Object}
         */
        getUploadAjaxOptions: function() {
            return {
                url: this.SERVICES_ENDPOINT + 'upload2?json',
                type: 'POST',
                crossDomain: true,
                data: {
                    sessiontoken: this.getSessionToken(),
                    hidden: 'HIDDEN',
                    vhost: this.VHOST
                }
            };
        },
        /**
         * Gets file upload removal ajax options.
         * @returns {Object}
         */
        getRemoveUploadAjaxOptions: function() {
            return {
                url: this.SERVICES_ENDPOINT + 'json',
                type: 'POST',
                crossDomain: true,
                data: {
                    vhost: this.VHOST,
                    sessiontoken: this.getSessionToken(),
                    method: 'media.trashFile'
                }
            };
        },

        /**
         * When files from inside of the iframe are selected
         */
        onIframeFileSelection: function(selectedFileMaps) {
            this.setFile(selectedFileMaps[0]);
            this.uploadFile();
        },

        /**
         * Builds HTML attributes based on a file.
         * @param {HTMLElement} el The element to add attributes to
         * @param {File} file The file object to use to build attributes
         * @returns {Deferred} Returns a promise that resolves with an HTML element when complete
         * @private
         */
        _getHtmlElementAttributes: function(el, file) {
            var deferred = $.Deferred(),
                sourceUrl = this.getFileSourceUrl(file);
            if (sourceUrl && el) {
                var tag = el.tagName.toLowerCase();
                if (tag === 'video') {
                    if (this.isLoadedMetadataSupported(file.type)) {
                        $(el).one('loadedmetadata', _.bind(function(e) {
                            deferred.resolve(e.target);
                        }, this));
                    } else {
                        deferred.resolve(el);
                    }
                } else if (tag === 'img') {
                    el.onload = _.bind(function() {
                        deferred.resolve(el);
                    }, this);
                }
                el.src = sourceUrl;
            } else {
                // element cant be created!
                return deferred.reject();
            }
            return deferred.promise();
        },

        /**
         * Builds an HTML element tag based on file type.
         * @param filetype
         * @returns {HTMLElement} The html element
         * @private
         */
        _getHtmlElementTag: function(filetype) {
            var type = this.getFileTypeKey(filetype),
                el;
            if (type === 'video') {
                el = document.createElement('video');
            } else if (type === 'image') {
                el = document.createElement('img');
            }
            return el;
        },

        /**
         * Checks if a filetype can fire onloadedmetadata callback when it loads.
         * @param filetype
         * @returns {Array|Boolean}
         */
        isLoadedMetadataSupported: function(filetype) {
            var pattern = 'video/(3g2|3gp|x-ms-wmv)';
            // for some reason, the above files do not fire the 'loadedmetadata' callback when loaded *shrugs*
            var regex = new RegExp(pattern, 'gi');
            return !filetype.match(regex);
        },

        /**
         * Builds the the preview element and prepares it for insertion into the DOM.
         * @param fileMap The file map
         * @returns {Deferred} Returns promise that resolves with the media element when done
         * @private
         */
        _buildPreviewMediaElement: function(fileMap) {
            var deferred = $.Deferred();

            $.when(this._elementAttrMapPromise).always(_.bind(function(){
                var $mediaEl = $(fileMap.getHtmlElement()),
                    isPreviewable = fileMap.isPreviewable(),
                    typeKey = this.getFileTypeKey(fileMap.file.type),
                    mediaClass;

                if ($mediaEl.length && isPreviewable) {
                    // previewing is available!
                    mediaClass = 'ugc-upload-file-media-preview';
                    $mediaEl.addClass(mediaClass + '-' + this.getElementOrientation($mediaEl));
                } else {
                    // no preview can be made!
                    $mediaEl = $('<div>');
                    mediaClass = 'ugc-upload-file-media-no-preview';
                }

                // if video, add video props
                if ($mediaEl[0].tagName.toLowerCase() === 'video') {
                    $mediaEl.prop({
                        autoplay: 'true',
                        muted: 'true',
                        loop: 'true'
                    });
                }

                // add general preview class
                $mediaEl.addClass(mediaClass);
                // add file type class
                $mediaEl.addClass(mediaClass + '-' + typeKey);

                deferred.resolve($mediaEl);
            }, this));

            return deferred.promise();
        },

        /**
         * Returns an element's orientation based on its width and height.
         * @param {jQuery|HTMLElement} el The element
         */
        getElementOrientation: function(el) {
            el = $(el)[0];
            var width = el.videoWidth || el.width,
                height = el.videoHeight || el.height;
            return width > height ? 'landscape' : 'portrait';
        },

        /**
         * Gets currently selected file.
         * @returns {Object} Returns the current file map object
         */
        getFile: function() {
            if (this._fileMap) {
                return this._fileMap.file;
            } else {
                return '';
            }
        },

        /**
         * Gets the file map of the currently selected file.
         * @returns {Object} Returns the current file map object
         */
        getFileMap: function() {
            return this._fileMap;
        },

        /**
         * Gets the input file map of the currently selected file.
         * @returns {Object} Returns the current file map object
         */
        getInputFileMap: function() {
            return this._inputFileMap;
        },

        /**
         * Updates the file map with new data.
         * @param data
         */
        updateFile: function(data) {
            return $.extend(this._fileMap.file, data);
        },

        /**
         * Builds a file mapping.
         * @param fileMapData
         * @private
         */
        _buildFileMap: function(fileMapData) {
            this._inputFileMap = fileMapData;
            var file = fileMapData.file,
                htmlElement = this._getHtmlElementTag(file.type),
                previewable = this.isPreviewable(file);
            var map = {
                file: file,
                fileId: fileMapData.fileId,
                isPreviewable: function() {
                    return previewable;
                },
                getHtmlElement: function() {
                    return htmlElement;
                }
            };
            this._elementAttrMapPromise = this._getHtmlElementAttributes(htmlElement, file).done(_.bind(function(el){
                htmlElement = el;
            }, this));
            return map;
        },

        /**
         * Sets the current file and adjusts the html to prepare for uploading.
         * @param fileMapData The file data
         */
        setFile: function(fileMapData) {
            this._fileMap = this._buildFileMap(fileMapData);
            this.$emptyContainer.hide();
            this.$el.removeClass('ugc-upload-file-thumb-inactive');
            this.$el.addClass(this._getProgressTypeClass());
            this.$removeBtn.show();
            this.setProgressClass(this.PROGRESS_CLASSES.queued);

            // validate upload!
            if (!this.isFileTypeAllowed()) {
                this.showError(this.getFileTypeNotAllowedMessage());
            }
            if (!this.isFileSizeAllowed()) {
                this.showError(this.getFileSizeNotAllowedMessage());
            }
        },

        /**
         * Generates and returns a key representing the file type (i.e. 'image', 'video')
         * @param filetype The filetype
         * @returns {String} Returns slugified file type
         */
        getFileTypeKey: function(filetype) {
            if (filetype) {
                return filetype.split('/')[0];
            } else {
                return '';
            }
        },

        /**
         * Generates and returns a file format based on the file type
         * @param filetype The filetype
         * @returns {String} Returns slugified file type
         */
        getFileFormatKey: function(filetype) {
            if (filetype) {
                return filetype.split('/')[1];
            } else {
                return '';
            }
        },

        /**
         * Adjusts html to prepare for upload.
         */
        setupProgressHandling: function() {
            this.$filePreviewContainer.show();
            this.setProgressClass(this.PROGRESS_CLASSES.pending);
            this.$fileMediaPreviewWrap.css('width', 0);
            if (!this.isProgressiveUpload()) {
                this.$fileMediaPreviewWrap.css('width', '100%');
            } else {
                this.$progressText.text('0%');

            }
            this.$fileMediaPreviewWrap.show();
            this._setupProgressText();
            if (!this.isProgressiveUpload()) {
                this.$progressText.text('Uploading your file');
            }
        },

        /**
         * Uploads the currently selected file to the server.
         */
        uploadFile: function() {

            if (!this.isFileValid()) {
                this._fileUploadPromise = $.Deferred().reject(this.getFileTypeNotAllowedMessage(), this.getFile(), this.getFileMap());
                return this._fileUploadPromise;
            }

            if (!this._fileUploadPromise || this._fileUploadPromise.state() !== 'pending') {

                this._fileUploadPromise = $.Deferred();

                // add preview media element
                this._buildPreviewMediaElement(this._fileMap).done(_.bind(function($previewEl){

                    this.$fileMediaPreviewWrap.html($previewEl);

                    this.setupProgressHandling();

                    this.getInputFileMap().upload()
                        .progress(_.bind(function(e) {
                            var percent = this.getProgressPercentage(e);
                            this.onUploadFileProgress(percent);
                            this._fileUploadPromise.notify(percent);
                        }, this))
                        .done(_.bind(function(resp) {
                            var file = this.updateFile(this.parseNewFileData(resp)),
                                fileMap = this.getFileMap();
                            this.setUploadSuccess(file);
                            this._fileUploadPromise.resolve(file, fileMap);
                            if (this.options.onFileUploadSuccess) {
                                this.options.onFileUploadSuccess(file, fileMap);
                            }
                        }, this))
                        .fail(_.bind(function() {
                            var message = this.getUploadFailureMessage(),
                                fileMap = this.getFileMap(),
                                file = fileMap.file;
                            this.setUploadFail(message);
                            this._fileUploadPromise.reject(message, file, fileMap);
                            if (this.options.onFileUploadFail) {
                                this.options.onFileUploadFail(message, file, fileMap);
                            }
                        }, this));

                }, this));
            }

            return this._fileUploadPromise.promise();
        },

        /**
         * Gets the failure message for an upload that failed.
         */
        getUploadFailureMessage: function() {
            return 'something went wrong';
        },


        /**
         * Sets up progress text.
         */
        _setupProgressText: function() {
            if (this.isProgressiveUpload()) {
                this.$progressText.addClass('ugc-upload-file-progress-percentage-text');
            }
        },

        /**
         * Determines whether the current upload is progressive (modern-browsers) or non-progressive (old browsers).
         * @returns {*}
         */
        isProgressiveUpload: function() {
            return this.isPreviewableBrowser();
        },

        /**
         * Gets the class that identifies which type of progress to show (progressive/non-progressive).
         * @returns {string}
         */
        _getProgressTypeClass: function() {
            if (!this._progressTypeClass){
                if (this.isProgressiveUpload()) {
                    this._progressTypeClass = 'ugc-progressive-upload';
                } else {
                    this._progressTypeClass = 'ugc-nonprogressive-upload';
                }
            }
            return this._progressTypeClass;
        },

        /**
         * Sets a progress class.
         * @param progressClass
         */
        setProgressClass: function(progressClass) {
            this.removeProgressClasses();
            this.$filePreviewContainer.addClass(progressClass);
        },

        /**
         * Removes all progress classes
         */
        removeProgressClasses: function() {
            var cssClassString = '';
            _.each(this.PROGRESS_CLASSES, function(cssClass){
                cssClassString += cssClass + ' ';
            });
            this.$filePreviewContainer.removeClass(cssClassString);
        },

        /**
         * Trashes file on the server.
         */
        trashFile: function() {
            var ajaxOptions,
                file = this.getFile(),
                inputMap = this.getInputFileMap();
            if (file && file.id) {
                ajaxOptions = {data: {id: file.id}};
            }

            if (inputMap) {
                inputMap.remove(ajaxOptions);
            }
        },

        /**
         * Checks whether a file is valid.
         */
        isFileValid: function() {
            return !this._isInvalid;
        },

        /**
         * Gets the message for a file that is too big.
         */
        getFileSizeNotAllowedMessage: function() {
            return 'That file is too big';
        },

        /**
         * Gets the message for a file that has a file type that is not permitted.
         */
        getFileTypeNotAllowedMessage: function() {
            var end = 'that file type',
                file = this.getFile();
            if (file) {
                end = this.getFileFormatKey(file.type) + ' files';
            }
            return 'We don\'t allow ' + end;
        },

        /**
         * Gets the current user's session token
         * @returns {Number|String} The session token of the user
         */
        getSessionToken: function() {
            return this.options.sessionToken;
        },

        /**
         * Checks if file is an allowed file format.
         * @returns {boolean} Returns true if it is a valid file format
         */
        isFileTypeAllowed: function() {
            var file = this.getFile(),
                filetype = file.type,
                map = this.getFileConfig(this.getFileTypeKey(filetype));
            if (map) {
                // if we can't detect the file type, assume the file is okay
                var regex = new RegExp(this.getAllowedFileFormats(filetype),  'gi');
                return file.type.match(regex);
            } else {
                // if no file type assume its okay
                return !filetype;
            }
        },

        /**
         * Gets the file types allowed for a file.
         * @param filetype
         * @returns {string} The allowed types
         */
        getAllowedFileFormats: function(filetype) {
            var map = this.getFileConfig(this.getFileTypeKey(filetype)),
                formats;
            if (map) {
                formats = map.allowedFormats;
            }
            return formats;
        },

        /**
         * Checks if the file size fits our constraints.
         * @returns {Boolean} True if the file size is acceptable, false if too big
         */
        isFileSizeAllowed: function() {
            var file = this.getFile(),
                filetype = file.type,
                size = file.size,
                key = this.getFileTypeKey(filetype),
                maxSize;
            if (!size) {
                // if we cant detect size on old browsers (like IE), lets assume its okay
                return true;
            } else if (this.getFileConfig(key)) {
                maxSize = this.getMaxFileSize(filetype);
                return (size / 1024) < maxSize;
            } else {
                return true;
            }
        },

        /**
         * Gets the file configuration map.
         * @param key
         */
        getFileConfig: function(key) {
            return this.FILE_CONFIG[key];
        },

        /**
         * Gets the maximum file size allowed for a file.
         * @param filetype
         * @returns {string} The max size
         */
        getMaxFileSize: function(filetype) {
            var map = this.getFileConfig(this.getFileTypeKey(filetype)),
                size;
            if (map) {
                size = map.maxSize;
            }
            return size;
        },

        /**
         * Checks if we're able to generate a preview for the file.
         * @param file The file to check
         * @returns {Boolean} True if we are able to show a preview.
         */
        isPreviewable: function(file) {
            var previewable,
                filetype = file.type,
                key = this.getFileTypeKey(filetype);
            if (key === 'video') {
                previewable = this.isPreviewableVideo(filetype) && this.isPreviewableFileAcceptableSize(file);
            } else if (key === 'image') {
                previewable = true;
            }
            return previewable && this.isPreviewableBrowser();
        },

        /**
         * Checks if brower supports previewable content.
         * @returns {boolean}
         */
        isPreviewableBrowser: function() {
            return this.subviews.inputFileUpload.isAjaxUploadSupported() ? true : false;
        },

        /**
         * Checks if the file size fits our constraints to show a preview.
         * @param file The file
         * @returns {Boolean} True if the file size is acceptable
         */
        isPreviewableFileAcceptableSize: function(file) {
            var map = this.getFileConfig(this.getFileTypeKey(file.type)),
                maxSize;
            if (map) {
                maxSize = map.previewMaxSize;
                return (file.size / 1024) < maxSize;
            } else {
                return true;
            }

        },

        /**
         * Checks if a video is able to to be previewed
         * @param {String} filetype The file type of the video
         * @returns {Boolean} True/False
         */
        isPreviewableVideo: function(filetype) {
            var format = filetype.split('/')[1]; // only use the filetype's suffix (i.e. mp3, mp4, etc)
            return Modernizr.video[format] === 'probably';
        },

        /**
         * Builds the source data blob of a file.
         */
        getFileSourceUrl: function(file) {
            window.URL = window.URL || window.webkitURL;
            if (window.URL && window.URL.createObjectURL) {
                return window.URL.createObjectURL(file);
            } else {
                return '';
            }
        },

        /**
         * Progresses the indicator based on percentage.
         * @param {Number} percentage  The percentage of upload completed
         */
        onUploadFileProgress: function(percentage) {
            var percentageText = percentage + '%';
            this.$fileMediaPreviewWrap.animate({'width': percentageText}, {
                duration: 400,
                easing: 'linear',
                queue: false
            });
            this.$progressText.text(percentageText);
        },

        /**
         * Builds a helper progress object.
         * @param {Event} e The on progress event
         */
        getProgressPercentage: function(e) {
            return Math.floor((e.loaded / e.total) * 100);
        },

        /**
         * Updates the existing file object with new file data from the response.
         * @param response
         * @returns {File} returns the updated file
         */
        parseNewFileData: function(response) {
            response = this.parseToJSON(response);
            var newFileData;
            if (response.mf_status) {
                // if we've uploaded using iframe fallback (for browsers that dont support ajax uploading),
                // the response data is limited to just a status number and file id, so we handle this accordingly
                var statusNum = parseInt(response.mf_status, 10),
                    fileId = parseInt(response.mf_mid, 10);
                if (statusNum !== 1) {
                    // file upload failed!
                    this.onUploadFileFail('file upload failed');
                    return "";
                } else {
                    newFileData = {id: fileId};
                }
            } else {
                // upload was done using ajax so we have the full response data object available
                // and will update the original file data with it
                newFileData = response.files[0];
            }

            return newFileData;
        },

        /**
         * Takes a response stringified version of an object and converts it to a real object
         * @param {String} stringObj The response
         * @returns {*}
         */
        parseToJSON: function(stringObj) {
            if ($.type(stringObj) === 'string') {
                // some browsers put ugly gobbly gook in front of the object we need, preventing JSON.parse
                // from working correctly, so we must get rid of the whitespace to parse correctly
                stringObj = stringObj.substr(stringObj.indexOf('{'));
            }
            return JSON.parse(stringObj);
        },

        /**
         * When the file has been uploaded successfully.
         */
        setUploadSuccess: function() {
            this.setProgressClass(this.PROGRESS_CLASSES.done);
            this.$fileMediaPreviewWrap.css('width', '100%');
            this.$progressText.empty();
        },

        /**
         * Shows error message.
         * @param {String} errorMsg The error message to show
         */
        showError: function(errorMsg) {
            this.$errorWrap.addClass('active');
            this.$errorText.text(errorMsg);
            this.$filePreviewContainer.hide();
            this._isInvalid = true;
        },

        /**
         * Adjusts markup to show an upload failure.
         * @param message Error message to show
         */
        setUploadFail: function(message) {
            this.setProgressClass(this.PROGRESS_CLASSES.fail);
            this.$progressText.empty();
            this.showError(message);
        },

        /**
         * Resets view.
         */
        reset: function() {
            // reset html
            this.$filePreviewContainer.hide();
            this.$el.removeClass(this._getProgressTypeClass());
            this.$el.addClass('ugc-upload-file-thumb-inactive');
            this.$fileMediaPreviewWrap.css('width', 0);
            this.$fileMediaPreviewWrap.hide();
            this.$fileMediaPreviewWrap.empty();
            this.$progressText.removeClass('ugc-upload-file-progress-percentage-text');
            this.$progressText.empty();
            this.removeProgressClasses();
            this.$emptyContainer.show();
            this.$removeBtn.hide();
            this.$errorWrap.removeClass('active');
            this.$errorText.empty();

            // remove cached vars
            this._fileMap = null;
            this._inputFileMap = null;
            this._fileUploadPromise = null;
            this._elementAttrMapPromise = null;
            this._isInvalid = null;

            this.subviews.inputFileUpload.reset();
        },

        /**
         * Destroys view.
         */
        destroy: function() {
            this.reset();
            BaseView.prototype.destroy.call(this, false);
        }

    });

    /**
     * Return modules class.
     */
    return UGCFileUpload;
});
