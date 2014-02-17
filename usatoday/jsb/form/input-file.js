/*global FormData:true*/
define([
    'jquery',
    'underscore',
    'state',
    'form/base-form-element'
],
    function(
        $,
        _,
        StateManager,
        BaseFormElement
        ) {
        "use strict";
        var InputFile = BaseFormElement.extend(
        /**
         * @lends form/base-input-file.prototype
         */
        {
            FILETYPE_MAP: {
                image: 'bmp|jpg|jpeg|gif|png|tiff|tif',
                video: 'quicktime|3g2|3gp|3gpp2|3gpp|asf|avi|dirac|dv|flav|flv|mkv|mov|mp4|m4a|mj2|mpg|mpeg|webm|ogg|ogv|x-ms-wmv'
            },

            el: '.ui-input-file',

            events: {
                'change': '_onFileSelection'
            },

            /**
             * @classdesc Manages Input File uploads
             * @author Mark Kennedy <mdkennedy@gannett.com>
             * @constructs form/base-input-file
             * @param {Object} options backbone options object
             *     @param {jQuery|Element|String} options.el - element or string selector to attach to
             */
            initialize: function(options) {

                options = $.extend({
                    onSelectFiles: null,
                    uploadAjaxOptions: null,
                    removeAjaxOptions: null,
                    ajaxFileQueryKey: 'file',
                    iframeHiddenInputValueMap: null,
                    iframeActionUploadUrl: null
                }, options);

                BaseFormElement.prototype.initialize.call(this, options);

                _.bindAll(this, 'getFiles');

                this.setup();

                this._fileMaps = [];

            },

            /**
             * Sets stuff up.
             */
            setup: function() {
                if (!this.isAjaxUploadSupported()) {
                    this._setupIframe();
                }
            },

            /**
             * Checks whether or not the user's browser can support ajax uploading
             * @returns Returns true if browser can handle modern ajax uploading, false/undefined otherwise
             */
            isAjaxUploadSupported: function() {
                return window.FormData && window.File &&
                    window.FileReader && window.FileList && !$('html').hasClass('lt-ie10');
            },

            /**
             * Gets the file maps for the currently selected files.
             * @returns {Array} Returns an array of file maps to the files.
             */
            getFiles: function() {
                return this._fileMaps;
            },

            /**
             * Takes an array of File objects and sets them as the currently selected files.
             * @param {Array|File} files An array of file list objects to set as the selected files.
             * @returns {Array} Returns an array of file maps
             */
            setFiles: function(files) {
                // clear files
                this._fileMaps = [];
                // add file maps
                _.each(files, function(file) {
                    this._fileMaps.push(this._buildFileMap(file));
                }, this);
                return this._fileMaps;
            },

            /**
             * Builds a map for each selected file.
             * @param file
             * @returns {{file: *, uploadPromise: *, removePromise: *}}
             * @private
             */
            _buildFileMap: function(file) {
                var map = {
                    file: file,
                    fileId: this._getFileId(),
                    upload: _.bind(function() {
                        return this._uploadFile(map);
                    }, this),
                    remove: _.bind(function(ajaxOptions) {
                        return this._removeFile(map, ajaxOptions);
                    }, this),
                    abort: _.bind(function() {
                        this._abortFileUpload(map);
                    }, this)
                };
                return map;
            },

            /**
             * Creates and returns a random file ID for upload tracking purposes
             * @returns {number} unique file ID
             * @private
             */
            _getFileId: function(){
                var min = 1000,
                    max = 9999;
                return Math.floor(Math.random() * (max - min + 1)) + min;
            },

            /**
             * Aborts a file upload.
             * @param fileMap
             * @private
             */
            _abortFileUpload: function(fileMap) {
                if (fileMap.xhr) {
                    fileMap.xhr.abort();
                }
            },

            /**
             * Removes a file.
             * @param fileMap
             * @returns {Deferred}
             * @private
             */
            _removeFile: function(fileMap) {
                // if upload xhr request is currently in progress, lets abort
                this._abortFileUpload(fileMap);
                return this._removeFileFromServer(fileMap);
            },

            /**
             * Handles removing a file from the server.
             * @param {Object} fileMap The file map
             * @param {Object} [ajaxOptions] (optional) The ajax options to use, defaults ajax options specified in config
             * @returns {Deferred} Returns a promise that resolves when done.
             * @private
             */
            _removeFileFromServer: function(fileMap, ajaxOptions) {
                var deferred;
                ajaxOptions = $.extend(true, {}, this.options.removeAjaxOptions, ajaxOptions);
                if (ajaxOptions && this.isAjaxUploadSupported()) {
                    deferred = StateManager.fetchData(null, ajaxOptions);
                } else {
                    // TODO: we're assuming the file is removed if in iframe-mode, is this the functionality we want?
                    deferred = $.Deferred().resolve();
                }
                return deferred.promise();
            },

            /**
             * Uploads a file
             * @param fileMap
             * @returns {Deferred}
             * @private
             */
            _uploadFile: function(fileMap) {
                // if upload xhr request is currently in progress, lets abort
                this._abortFileUpload(fileMap);
                return this._uploadFileToServer(fileMap);
            },

            /**
             * Handles uploading the file to the server.
             * @param {Object} fileMap The file map
             * @returns {Deferred} Returns a promise that resolves when done.
             * @private
             */
            _uploadFileToServer: function(fileMap) {
                var _uploadDeferred = $.Deferred(),
                    file = fileMap.file;
                if (this.isAjaxUploadSupported()) {
                    if (!file) {
                        console.log('unable to upload file: no file was specified.');
                        return _uploadDeferred.reject();
                    }

                    var onProgressCallback = _.bind(function(e) {
                        _uploadDeferred.notify(e);
                    }, this);
                    fileMap.xhr = this.getUploadXhr(onProgressCallback);
                    var requestOptions = this._getUploadRequestOptions(fileMap);
                    if (!requestOptions) {
                        console.log('unable to upload file: no ajaxOptions were given.');
                        return _uploadDeferred.reject();
                    }
                    $.ajax(requestOptions)
                        .done(function(resp) {
                            _uploadDeferred.resolve(resp);
                        })
                        .fail(function() {
                            _uploadDeferred.reject();
                        });
                } else {
                    _uploadDeferred = this._uploadUsingIframe();
                }
                return _uploadDeferred.promise();
            },

            /**
             * Takes a file map and builds and returns the request options used for the file its uploading.
             * @param {Object} fileMap The file map
             * @returns {*}
             * @private
             */
            _getUploadRequestOptions: function(fileMap) {
                var customAjaxOptions = this.options.uploadAjaxOptions;
                if (customAjaxOptions) {
                    var options = $.extend({
                        type: 'POST',
                        xhr: function() {
                            return fileMap.xhr;
                        },
                        processData: false, // tell jQuery not to process the data into query string
                        contentType: false,
                        crossDomain: true
                    }, customAjaxOptions);
                    options.data = this.getFormData(fileMap.file);
                    return options;
                } else {
                    return null;
                }
            },
            /**
             * After file(s) are selected.
             * @param e
             */
            _onFileSelection: function(e) {
                var selectedFiles = this.toArray(e.currentTarget.files),
                    fileMaps = this.setFiles(selectedFiles);
                if (this.options.onSelectFiles) {
                    this.options.onSelectFiles(fileMaps);
                }
            },

            /**
             * Takes a FileList object and converts it to a true array.
             * @param {FileList} fileList The file list to convert
             */
            toArray: function(fileList) {
                var fileLength = fileList.length,
                    files = [];
                for (var i = 0; i < fileLength; i++) {
                    var file = fileList[i];
                    files.push(file);
                }
                return files;
            },

            /**
             * Builds a modernized filetype string using the input file's value
             * (for older browsers like IE who dont support filetype on input file element)
             * @param {String} fileValue The value of the file
             * @returns {String} Returns the modernized version of the filetype, returns empty string if not found
             * @private
             */
            _buildFileType: function(fileValue) {
                var filetype = "",
                    fileNamePartial = fileValue.split('.'),
                    suffix = fileNamePartial[fileNamePartial.length - 1],
                    lowerCaseSuffix = suffix.toLowerCase();
                _.each(this.FILETYPE_MAP, function(value, key) {
                    if (value.indexOf(lowerCaseSuffix) !== -1) {
                        filetype = key + '/' + lowerCaseSuffix;
                    }
                });
                return filetype;
            },


            /**
             * Builds formData object for file submission.
             * @param {File} file The file object to be uploaded
             * @returns {FormData}
             */
            getFormData: function(file) {
                var data = new FormData(),
                    ajaxDataOptions = this.options.uploadAjaxOptions.data;
                // add additional data options to FormData
                _.each(ajaxDataOptions, function(value, key) {
                    data.append(key, value);
                }, this);
                // add file to FormData
                data.append(this.options.ajaxFileQueryKey, file);
                return data;
            },

            /**
             * Get XHR data object which is used when attempting an upload.
             * @param {Function} onProgressCallback The progress callback which continuously fires as uploading happens.
             * @returns {*}
             */
            getUploadXhr: function(onProgressCallback) {
                var xhr = this.getXhr();
                // set up progress handler
                xhr.onprogress = onProgressCallback;
                if (xhr.upload) {
                    xhr.upload.onprogress = onProgressCallback;
                }
                // force an onprogress event for certain browsers (like Firefox on Windows) that
                // wont fire the onprogress event on the last go round
                xhr.onloadend = onProgressCallback;
                return xhr;
            },

            /**
             * Gets a new XMLHttpRequest object.
             * @returns {XMLHttpRequest}
             */
            getXhr: function() {
                return new XMLHttpRequest();
            },

            /**
             * Gracefully handles the removal of all pending promises.
             */
            resetPromises: function() {
                if (this._fileMaps.length) {
                    _.each(this._fileMaps, function(fileMap) {
                        fileMap.abort();
                    }, this);
                    this._fileMaps = [];
                }
            },

            /**
             * Resets input file field.
             */
            reset: function() {
                this.$el.val('');
                if (!this.isAjaxUploadSupported()) {
                    return this._resetIframe();
                } else {
                    this.resetPromises();
                    return $.Deferred().resolve();
                }
            },

            /**
             * Gets element type.
             * @returns {string}
             */
            getType: function(){
                return "input-file";
            },

            /**
             * Sets up the iframe for file uploading.
             * @private
             */
            _setupIframe: function() {
                if (!this._$iframe) {
                    this._$iframe = this._buildIframeHtml();
                    this.$el.parent().append(this._$iframe);
                }
                this._resetIframeUrl();
            },

            /**
             * Gets the url to the iframe source.
             * @returns {string}
             */
            getIframeSrcUrl: function() {
                return window.site_static_url + '/html/ui_input_file_upload_iframe.html';
            },

            /**
             * Change the iframe's source attribute to reflect a new url.
             * @private
             */
            _resetIframeUrl: function() {
                var urlPromise = $.Deferred(),
                    url = this.getIframeSrcUrl(),
                    $iframe = this._$iframe,
                    iframe = this._$iframe.get(0),
                    isIframeUrlLoading = true;
                $iframe.load(_.bind(function() {
                    // prevent code from running if this function was triggered by anything other than this function
                    if (!isIframeUrlLoading) {
                        return;
                    } else {
                        isIframeUrlLoading = false;
                    }
                    this._setupIframeInputClickEvent();
                    urlPromise.resolve();
                }, this));
                iframe.src = url;
                return urlPromise.promise();
            },

            /**
             * Builds Iframe into the DOM
             * @returns {*|HTMLElement} Returns the iframe element.
             * @private
             */
            _buildIframeHtml: function() {
                return $('<iframe class="ui-input-file-hidden-iframe" scrolling="no" allowtransparency="true"></iframe>');
            },

            /**
             * Setup click event on input file element inside of the iframe.
             * @private
             */
            _setupIframeInputClickEvent: function() {
                var $inputFile = this._$iframe.contents().find('.ui-input-file-hidden-iframe-file-input');
                if ($inputFile.length) {
                    $inputFile.on('change.' + this.cid, _.bind(function(e) {
                        this._onIframeFileSelection(e);
                    }, this));
                }
            },

            /**
             * After a file is selected using the input file element from the iframe.
             * @param e
             * @private
             */
            _onIframeFileSelection: function(e) {
                // the browser doesnt support the File API, so we build a new file object
                // using the input field containing the selected file
                var file = {
                    type: this._buildFileType($(e.currentTarget).val())
                };
                var fileMaps = this.setFiles([file]);
                if (this.options.onSelectFiles) {
                    this.options.onSelectFiles(fileMaps);
                }
            },

            /**
             * Prepares the iframe form element for upload/submission.
             * @private
             */
            _setupIframeForm: function($iframeForm) {
                var customUploadAjaxOptions = this.options.uploadAjaxOptions,
                    hiddenValueMap = $.extend({}, customUploadAjaxOptions.data, this.options.iframeHiddenInputValueMap),
                    formActionUrl = this.options.iframeActionUploadUrl || customUploadAjaxOptions.url;
                // add action url
                $iframeForm.attr('action', formActionUrl);
                _.each(hiddenValueMap, function(value, key) {
                    $iframeForm.prepend('<input type="hidden" name="' + key + '" value="' + value+ '" />');
                });
            },

            /**
             * Uploads the file to the server using the designated iframe.
             * @private
             */
            _uploadUsingIframe: function() {
                var iframe = this._$iframe[0],
                    $iframeForm = this._$iframe.contents().find('form');
                this._iframeUploadPromise = $.Deferred();
                    this._setupIframeForm($iframeForm);
                    if ($iframeForm.length) {
                        this._$iframe.load(_.bind(function(e){

                            if (this._iframeUploadPromise && this._iframeUploadPromise.state() !== 'pending') {
                                return;
                            }
                            var iframe = e.currentTarget;
                            try {
                                var iframeWindowLocation = iframe.contentWindow.location.href;
                            }
                            catch(err) {
                                console.error('unable to determine upload status: response url from iframe was not local');
                                this._iframeUploadPromise.reject();
                                this._resetIframe();
                                return;
                            }
                            var $bodyContent = $(iframe).contents().find('body'),
                                response = $bodyContent.text();
                            // clear out iframes contents so response isnt shown to user
                            $bodyContent.html('');
                            this._iframeUploadPromise.resolve(response);
                        }, this));
                        this._submitIframeForm();
                    } else {
                        console.log('unable to upload file: can\'t find targeted iframe fallback form element');
                        this._iframeUploadPromise.reject();
                    }
                return this._iframeUploadPromise;
            },

            /**
             * Submits the iframe form.
             * @private
             */
            _submitIframeForm: function() {
                this._$iframe.contents().find('form').submit();
            },

            /**
             * Resets the iframe back to its original setup state.
             * @private
             */
            _resetIframe: function() {
                return this._resetIframeUrl();
            },

            /**
             * Destroy view.
             * @param removeEl
             */
            destroy: function(removeEl){
                this.reset().done(_.bind(function(){
                    BaseFormElement.prototype.destroy.call(this, removeEl);
                }, this));
            }

        });

        /**
         * Return view class.
         */
        return InputFile;
    }
);