define(['jquery', 'underscore', 'managers/trafficcop', 'utils'],
    function($, _, TrafficCop, Utils) {
		var cidx = window.cidx = window.cidx || 0;

        /**
         * Keeps track of all ongoing background requests and cancels them if a navigation request comes in
         * Also optimizes fetchHtml requests and provides helper recurringFetchData methods
         * @exports managers/requestmanager
         * @author Jay Merrifield <jmerrifiel@gannett.com>
         */
        var RequestManager = function(){
            this.DEBUG = true;
            this.xhrList = [];
            this.intervalList = [];
        };
        $(document).ajaxSend(function(evt, xhr, settings) {
            if (settings.method === 'post') {
                xhr.setRequestHeader("X-CSRFToken", $.cookie('csrftoken'));
            }
        });
        RequestManager.prototype = {
            timeout: 30000,
            /**
             * Helper function that auto populates fetchData with the isHtml flag being true
             * @param url
             * @param options
             * @param isNavigation
             * @param isStatic
             * @return {Deferred} jQuery promise object
             */
            fetchHtml: function(url, options, isNavigation, isStatic) {
            	console.log(window.cidx++, '!!!RequestManager.fetchHtml(', url, options, isNavigation, isStatic, ')');

                return this.fetchData(url, options, isNavigation, isStatic, true);
            },

            /**
             * repeatedly calls fetchHtml at a specified interval and passing the results to a callback
             * @param {String} url The path to the ajax endpoint.
             * @param {Object} options ajax options
             * @param {Number} interval time in ms to repeat
             * @param {Function} callback function to call when fetchHtml succeeds
             * @param {Boolean} [isStatic] tells the ajax request whether to add the pjax headers or not
             * @return {Number} setInterval id
             */
            recurringFetchHtml: function(url, options, interval, callback, isStatic) {
            	console.log(window.cidx++, '!!!RequestManager.recurringFetchHtml(', url, options, interval, callback, isStatic, ')');

                return this.recurringFetchData(url, options, interval, callback, isStatic, true);
            },

            /**
             * repeatedly calls fetchData at a specified interval and passing the results to a callback
             * @param {String} url The path to the ajax endpoint.
             * @param {Object} options ajax options
             * @param {Number} interval time in ms to repeat
             * @param {Function} callback function to call when fetchHtml succeeds
             * @param {Boolean} [isStatic] tells the ajax request whether to add the pjax headers or not
             * @param {Boolean} [isHtml] will return a quickly built jQuery dom object
             * @return {Number} setInterval id
             */
            recurringFetchData: function(url, options, interval, callback, isStatic, isHtml) {
            	console.log(window.cidx++, '!!!RequestManager.recurringFetchData(', url, options, interval, callback, isStatic, isHtml, ')');

                var request = _.bind(function(){
                    this.fetchData(url, options, false, isStatic, isHtml).done(function(html){
                        callback(html);
                    });
                }, this);
                request();
                var id = setInterval(request, interval);
                this.intervalList.push(id);
                return id;
            },

            /**
             * Fetch data from server via AJAX. Takes a path to fetch and a
             * callback to parse the data and initialize views.
             * @param {String} url The path to the ajax endpoint.
             * @param {Object} options ajax options
             * @param {Boolean} isNavigation specifies if this request is a navigation request
             *                  or a background loading request
             * @param {Boolean} isStatic tells the ajax request whether to add
             *      the pjax headers or not
             * @param {Boolean} isHtml will return a quickly built jQuery dom object
             * @return {Deferred} jQuery promise object
             */
            fetchData: function(url, options, isNavigation, isStatic, isHtml) {
            	console.log(window.cidx++, '!!!RequestManager.fetchData(', url, options, isNavigation, isStatic, isHtml, ')');

                options = this._setupRequest(url, options, isStatic);

                var deferred = $.Deferred();
                this._startRequest(deferred, options, isNavigation, isHtml);
                var returnPromise = deferred.promise();
                returnPromise.abort = _.bind(function(){
                    deferred.reject();
                }, this);
                return returnPromise;
            },
            _setupRequest: function(url, options, isStatic) {
            	console.log(window.cidx++, '!!!RequestManager._setupRequest(', url, options, isStatic, ')');

                var extra_headers = {};

                if (isStatic) {
                    extra_headers['X-PJAX'] = "true";
                    extra_headers['X-PJAX-Container'] = "#overlay";
                }
                if (!url){
                    url = '/';
                }else if (url.indexOf('/') !== 0 && url.indexOf('http') !== 0){
                    url = '/' + url;
                }
                options = $.extend({
                    url: url,
                    data: {ajax: true},
                    beforeSend: function(xhr) {
                    	console.log(window.cidx++, '!!!RequestManager.beforeSend(', xhr, ')');

                        $.each(extra_headers, function(k, v){
                            xhr.setRequestHeader(k, v);
                        });
                    },
                    timeout: this.timeout
                }, options);
                return options;
            },
            _startRequest: function(defer, ajaxOptions, isNavigation, isHtml, isAuthed) {
            	console.log(window.cidx++, '!!!RequestManager._startRequest(', defer, ajaxOptions, isNavigation, isHtml, isAuthed, ')');

                var proceed = this._initializeFetchData(ajaxOptions.url, isNavigation);
                if (!proceed){
                    defer.reject();
                    return;
                }
                var ajaxPromise = $.ajax(ajaxOptions);
                if (this.DEBUG) {
                    ajaxPromise.fail(function(e) {
                        if (e.statusText && e.statusText !== 'abort') {
                            console.log('fetchData Error: ', e.statusText, ajaxOptions);
                        }
                    });
                }
                defer.fail(function() {
                    if (ajaxPromise.state() === 'pending') {
                        ajaxPromise.abort();
                    }
                });
                ajaxPromise = TrafficCop.addRequest(ajaxPromise);
                this._registerNavRequests(ajaxPromise, defer, ajaxOptions.url, isNavigation);
                if (!isNavigation) {
                    this._resolveAjax(ajaxPromise, defer, isHtml);
                } else {
                    this._resolveNavAjax(ajaxPromise, defer, ajaxOptions, isNavigation, isHtml, isAuthed);
                }
            },
            _resolveNavAjax: function(ajaxPromise, defer, ajaxOptions, isNavigation, isHtml, isAuthed) {
            	console.log(window.cidx++, '!!!RequestManager._resolveNavAjax(', ajaxPromise, defer, ajaxOptions, isNavigation, isHtml, isAuthed, ')');

                ajaxPromise.done(_.bind(function() {
                    var authUrl = ajaxPromise.original.getResponseHeader('X-Firefly-Session-Needed');
                    if (authUrl) {
                        this._handleFireflyAuth(authUrl, defer, ajaxOptions, isNavigation, isHtml, isAuthed);
                    } else {
                        this._resolveAjax(ajaxPromise, defer, isHtml);
                    }
                }, this)).fail(function(){
                    RequestManager.prototype._resolveAjax(ajaxPromise, defer, isHtml);
                });
            },
            _handleFireflyAuth: function(authUrl, defer, ajaxOptions, isNavigation, isHtml, isAuthed) {
            	console.log(window.cidx++, '!!!RequestManager._handleFireflyAuth(', authUrl, defer, ajaxOptions, isNavigation, isHtml, isAuthed, ')');

                if (isAuthed) {
                    // something is wrong here, we've already authed once
                    console.error('Auth failed, X-Firefly-Session-Needed appeared on refetch');
                    defer.reject('NOT AUTHORIZED');
                } else {
                    console.log('Requesting FIREFLY Auth');
                    var authDefer = this._getFireflyAuth(authUrl).done(_.bind(function() {
                        // restart auth
                        console.log('FIREFLY Auth Successful, requesting original asset');
                        this._startRequest(defer, ajaxOptions, isNavigation, isHtml, true);
                    }, this)).fail(function(message, details) {
                        // redirect not authorized page
                        defer.reject(message, details);
                    });
                    defer.fail(function(){
                        // user aborted the request
                        authDefer.reject();
                    });
                }
            },
            _resolveAjax: function(ajaxPromise, deferred, isHtml) {
            	console.log(window.cidx++, '!!!RequestManager._resolveAjax(', ajaxPromise, deferred, isHtml, ')');

                ajaxPromise.done(function(h){
                    if (isHtml){
                        h = RequestManager.prototype._toHtml(h);
                    }
                    deferred.resolveWith(ajaxPromise, [h]);
                }).fail(function(e){
                    deferred.rejectWith(ajaxPromise, [e]);
                });
            },
            _toHtml: function(d) {
            	console.log(window.cidx++, '!!!RequestManager._toHtml(', /*d,*/ ')');

                // this is a faster way of generating a jquery object from an html fragment
                var frag = document.createDocumentFragment(),
                    div = document.createElement('div');
                div.innerHTML = d;
                frag.appendChild(div);
                return $(frag).children().children();
            },
            _getFireflyAuth: function(authUrl) {
            	console.log(window.cidx++, '!!!RequestManager._getFireflyAuth(', authUrl, ')');

                var timeoutId, iframe = this._createFireflyiFrame(authUrl);
                return $.Deferred(_.bind(function(defer){
                    timeoutId = setTimeout(function(){
                        console.error('Auth timeout occurred');
                        defer.reject('NOT AUTHORIZED', 'Request Timed Out');
                    }, this.timeout);
                    $(window).on('message', function(event) {
                        event = event.originalEvent;
                        if (event.origin !== window.location.origin) {
                            return;
                        }
                        try {
                            var data = JSON.parse(event.data);
                            if (data.type !== 'firefly-auth') {
                                // not a firefly auth message
                                return;
                            }
                            if (data.auth === 'success') {
                                defer.resolve(data);
                                return;
                            }
                            defer.reject('NOT AUTHORIZED', data);
                        } catch(e) {
                            // ignore invalid data, probably not meant for us
                        }
                    });
                }, this)).always(function(){
                    clearTimeout(timeoutId);
                    document.body.removeChild(iframe);
                });
            },
            _createFireflyiFrame: function(authUrl) {
            	console.log(window.cidx++, '!!!RequestManager._createFireflyiFrame(', authUrl, ')');

                var iframe = document.createElement("iframe");
                iframe.id = iframe.name = _.uniqueId('firefly_auth_');
                iframe.className = 'hidden';
                iframe.src = authUrl;
                document.body.appendChild(iframe);
                return iframe;
            },
            _registerNavRequests: function(ajaxPromise, deferred, url, isNavigation) {
            	console.log(window.cidx++, '!!!RequestManager._registerNavRequests(', ajaxPromise, deferred, url, isNavigation, ')');

                var navRequest = {
                    ajaxPromise: ajaxPromise,
                    resultDeferred: deferred,
                    url: url,
                    isNav: isNavigation
                };
                this.xhrList.push(navRequest);
                ajaxPromise.always(_.bind(function(){
                    this.xhrList = _.without(this.xhrList, navRequest);
                }, this));
            },
            /**
             * This private function validates whether or not this fetch data should proceed
             * as well as setting up the internal structures necessary to track the request
             * @param {String} url The path being requested
             * @param {Boolean} isNavigation Boolean marking whether this is a nav or background request
             * @return {Boolean} true or false depending on whether the request should proceed
             * @private
             */
            _initializeFetchData: function(url, isNavigation) {
            	console.log(window.cidx++, '!!!RequestManager._initializeFetchData(', url, isNavigation, ')');

                var navRequest = this.xhrList.length == 1 && this.xhrList[0],
                    navRequestInProgress = navRequest && navRequest.isNav;
                if (!isNavigation) {
                    if (navRequestInProgress) {
                        // reject any background requests when we're changing navigation
                        return false;
                    }
                } else {
                    if (navRequestInProgress && navRequest.url === url) {
                        // double clicking a link, reject it
                        return false;
                    }
                    this.abortAllRequests();
                }
                return true;
            },
            /**
             * This public function will abort all requests
             * WARNING!  THIS WILL ABORT ALL REQUESTS!
             * @public
             */
            abortAllRequests: function() {
            	console.log(window.cidx++, '!!!RequestManager.abortAllRequests(', ')');

                // abort all background requests
                _.each(this.xhrList, function(item) {
                    item.ajaxPromise.abort();
                    item.resultDeferred.reject();
                });
                // abort all background intervals
                _.each(this.intervalList, function(item) {
                    clearInterval(item);
                });
                this.xhrList = [];
                this.intervalList = [];
            }
        };
        return new RequestManager();
    }
);