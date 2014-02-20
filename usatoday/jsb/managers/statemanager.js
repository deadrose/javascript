define([
    'jquery',
    'underscore',
    'pubsub',
    'utils',
    'modules/global/alert',
    'managers/trafficcop',
    'managers/requestmanager',
    'managers/routemanager',
    'managers/resourcemanager',
    'site-manager',
    'managers/siteconfig'
],
    function ($, _, PubSub, Utils, Alert, TrafficCop, RequestManager, RouteManager, ResourceManager, SiteManager, SiteConfig) {
        'use strict';
        if (!Object.getPrototypeOf) {
            // polyfill for IE8 (fullscreen transitions need it)
            Object.getPrototypeOf = function (object) {
                // May break if the constructor has been tampered with
                return object.constructor.prototype;
            };
        }

        var cidx = window.cidx = window.cidx || 0;

        /**
         * @event page:unload
         * @desc This event is fired when a page is torn down before all animation and ajax requests are fired
         */
        /**
         * State Manager that handles the application state. Maintains the active view and
         * manages routing and transitioning between the views. Ajax calls and animation calls
         * should be registered with the state manager to guarantee that animation isn't interrupted
         * and that stale or requests that are being thrown out.
         * @requires managers/trafficcop
         * @requires managers/requestmanager
         * @exports state
         * @author Jay Merrifield <jmerrifiel@gannett.com>
         */
        var StateManager = function () {
            this.scrollEl = Utils.get('scrollEl');
            this.body = Utils.get('body');
            this.initialize();
        };
        StateManager.prototype = {
            /** @const
             * @private */
            DEBUG: true,
            /** @const
             * @private */
            LAYER_OVERLAY: 'overlay',
            /** @const
             * @private */
            LAYER_PRELOAD: 'preload',
            /** @const
             * @private */
            LAYER_BASE: 'base',
            /** @const
             * @private */
            REFRESH_FREQUENCY: (window.site_config.REFRESH_RATE || 0) * 60 * 1000,

            /**
             * This starts state manager, spin up the route manager, resource manager, and refresh timer
             */
            start: function () {
                console.log(window.cidx++, '!!!StateManager.start(', ')');

                return SiteConfig.loadSiteConfigs(window.site_config.JS.CONFIG).done(_.bind(function (siteConfig) {
                    this.siteConfig = siteConfig; // stash this so we can debug it's value
                    this._setupGlobalPubSub(siteConfig.global.pubSub);
                    this.routeManager = new RouteManager({
                        appMap: siteConfig.apps,
                        pageList: siteConfig.pages,
                        onRouteChange: _.bind(this._onRouteChange, this)
                    });

                    this.resourceManager = new ResourceManager({
                        siteModules: siteConfig.siteModules
                    });

                    // If click is not registered for 15 min, refresh the page --
                    // for non-overlays.
                    this.startRefreshTimer();
                }, this));
            },

            _setupGlobalPubSub: function (pubSubMap) {

                console.log(window.cidx++, '!!!StateManager._setupGlobalPubSub(', pubSubMap, ')');

                _.each(pubSubMap, function (paths, key) {
                    require(paths, function () {
                        var mods = arguments;
                        PubSub.on(key, function (options) {
                            _.each(mods, function (Mod) {
                                new Mod(options);
                            });
                        });
                    });
                });
            },

            fetchPageModules: function (pageModules) {

                console.log(window.cidx++, '!!!StateManager.fetchPageModules(', pageModules, ')');

                return this.resourceManager.fetchPageModules(pageModules);
            },
            /**
             * Internal initialization helper, builds activeAppInfo and preloadedAppInfo objects
             */
            initialize: function () {
                console.log(window.cidx++, '!!!StateManager.initialize(', ')');

                this.activeAppInfo = {
                    url: null,
                    css: [],
                    layer: null,
                    scrollTop: 0,
                    app: null
                };
                this.lastUrl = null;
                this._clearPreloadedAppInfo();
                this.fullscreenView = null;
            },
            _clearPreloadedAppInfo: function () {
                console.log(window.cidx++, '!!!StateManager._clearPreloadedAppInfo(', ')');

                this.preloadedAppInfo = {
                    url: null,
                    css: [],
                    scrollTop: 0,
                    app: null
                };
            },

            /**
             * Route Change callback for route manager, will make certain the correct app, route, and path
             * are loaded properly into state manager
             * @param {Object} app object representing the app that owns the path, including what class needs to be initialized
             * @param {Object} page object representing the specific route requested including what css and javascript is needed
             * @param {String} url that is being loaded
             * @param {Boolean} [preload] specifying if the change is a preloaded url or not
             * @private
             */
            _onRouteChange: function (app, page, url, preload) {
                console.log(window.cidx++, '!!!StateManager._onRouteChange(', app, page, url, preload, ')');

                if (this.DEBUG) {
                    console.log('App: ' + page.appName + '/' + page.name);
                }
                var appInitOptions = {
                    preloadedUrl: page.preloadedUrl || app.preloadedUrl
                };
                if (preload) {
                    return this._preloadApp(app.AppClass, appInitOptions, url, page);
                } else {
                    return this._loadApp(app.AppClass, appInitOptions, url, app.overlay, page);
                }
            },

            /**
             * Will load the given path into a preloaded/stashed state that can be quickly navigated to when asked
             * can only be used if the active app is an overlay
             * (but if we do not own that path, just ignore it until we close out of the current content)
             * @param {String} fragment to preload
             * @return {Deferred} promise object that resolves when the path is fully loaded
             */
            preloadPath: function (fragment) {
                console.log(window.cidx++, '!!!StateManager.preloadPath(', fragment, ')');

                var url = Utils.getDefinedRoute(fragment);
                if (url || url === '') {
                    if (!window.chromeless && (!this.activeAppInfo.layer || this.activeAppInfo.layer === this.LAYER_OVERLAY)) {
                        return this._loadPath(url, true);
                    } else {
                        return $.Deferred().reject();
                    }
                } else {
                    /* fake preload: do not preload anything, but tell .navigateToPreloadedUrl() where to go */
                    return $.Deferred().reject();
                }
            },

            /**
             * Given a path, determine it's layer, resources, and how to transition to it correctly
             * @param {String} url to navigate to
             * @param {Boolean} [preload] whether this path is an active path or a preloaded path
             * @return {Deferred} promise object
             * @private
             */
            _loadPath: function (url, preload) {
                console.log(window.cidx++, '!!!StateManager._loadPath(', url, preload, ')');

                var routeInfo = this.routeManager.getRouteInfoForUrl(url);
                if (!routeInfo) {
                    console.error('StateManager: tried navigating to path, but no match found: ' + url);
                    return null;
                } else {
                    return this._onRouteChange(routeInfo.app, routeInfo.page, url, preload);
                }
            },

            /**
             * Triggers an ajax reload of the current page
             * @returns {Deferred}
             */
            refreshActiveApp: function () {
                console.log(window.cidx++, '!!!StateManager.refreshActiveApp(', ')');

                var currentPath = this.activeAppInfo.url,
                    pageInfo = this.routeManager.getRouteInfoForUrl(currentPath).page,
                    resourcePromise = this.resourceManager.fetchJavascript(pageInfo.buildfile && pageInfo.buildfile.path, pageInfo.path, pageInfo.modules),
                    requestPromise = this._fetchPathHtml(currentPath);

                PubSub.trigger('page:unload');
                return this.activeAppInfo.app.changePage(currentPath, currentPath, requestPromise, resourcePromise);
            },

            /**
             * This is used when we want to pretend like we navigated to the url, but don't make the request yet.
             * This is to facility inbetween ads that want to interrupt and redirect a page navigation to an ad instead.
             * The goal is that if the user hits reload, they get the page they were intending to go to. If they hit the
             * back button they go back to the url they were at.
             * @param {String} url
             * @returns {Boolean} whether or not the ajax navigate succeeded. It doesn't succeed if the url isn't
             */
            partialNavigateToUrl: function (url) {
                console.log(window.cidx++, '!!!StateManager.partialNavigateToUrl(', url, ')');

                if (Utils.triggerRoute(url, null, null, true)) {
                    this.activeAppInfo.intentUrl = Utils.getDefinedRoute(url);
                    return true;
                }
                return false;
            },

            /**
             * Navigates to the current preloaded url, or the default path passed in if no preloaded app is currently there
             * @param defaultPath
             */
            navigateToPreloadedUrl: function (defaultPath) {
                console.log(window.cidx++, '!!!StateManager.navigateToPreloadedUrl(', defaultPath, ')');

                var navPath = this.preloadedAppInfo.url || defaultPath;
                if (!navPath) {
                    navPath = '/';
                } else if (navPath[0] !== '/') {
                    if (!navPath.match(/^https?:/)) {
                        navPath = '/' + navPath;
                    }
                }
                var navWarning = this.getActivePageInfo().navigationWarning;
                if (navWarning && !window.confirm(navWarning)) {
                    return;
                }
                Utils.triggerRoute(navPath);
            },

            /**
             * Registers a full screen view with the state manager. This is necessary because
             * the full screen view doesn't have a unique url and lives outside the knowledge
             * of the state manager
             * @param {Object} fullscreenView
             */
            registerFullScreenView: function (fullscreenView) {
                console.log(window.cidx++, '!!!StateManager.registerFullScreenView(', fullscreenView, ')');

                this._setFixedPosition(this.activeAppInfo, this.activeAppInfo.app, true);
                this.fullscreenView = fullscreenView;
                // pause the app, and all it's modules
                this.activeAppInfo.app.pause();
            },

            setActiveAppFixed: function (partialCover) {

                console.log(window.cidx++, '!!!StateManager.setActiveAppFixed(', partialCover, ')');

                this._setFixedPosition(this.activeAppInfo, this.activeAppInfo.app, partialCover);
            },

            /**
             * Clears out the full screen view from the state manager
             */
            clearFullScreenView: function () {
                console.log(window.cidx++, '!!!StateManager.clearFullScreenView(', ')');

                this._clearFixedPosition(this.activeAppInfo, this.activeAppInfo.app, true);
                // fullscreenView will be null if state manager triggered the close, which means
                // the user triggered a transition somewhere else, so don't rebuild the current view
                if (this.fullscreenView) {
                    this.fullscreenView = null;
                    // trigger a transition in place, with no requestPromise to fire beforePageReveal and afterPageReveal
                    // and restore all javascript
                    return this._loadPath(this.activeAppInfo.url);
                }
            },

            clearActiveAppFixed: function (partialCover) {

                console.log(window.cidx++, '!!!StateManager.clearActiveAppFixed(', partialCover, ')');

                this._clearFixedPosition(this.activeAppInfo, this.activeAppInfo.app, partialCover);
            },


            /**
             * This is the main state manager call, this will compare what the current state
             * of the universe is, and make any ajax calls, and transition to the current state
             * with the correct view information
             *
             * @param {Class} NextAppClass the javascript class that is taking over the site.
             * @param {Object} initOptions any initialization options for the view class.
             * @param {String} toUrl path being loaded.
             * @param {Boolean} overlay overlay the view on top of the existing view.
             * @param {Object} pageInfo page info for the path
             */
            _loadApp: function (NextAppClass, initOptions, toUrl, overlay, pageInfo) {
                console.log(window.cidx++, '!!!StateManager._loadApp(', NextAppClass, initOptions, toUrl, overlay, pageInfo, ')');

                var finishPromise, type = (overlay ? this.LAYER_OVERLAY : this.LAYER_BASE),
                    resourcePromise = this.resourceManager.fetchJavascript(pageInfo.buildfile && pageInfo.buildfile.path, pageInfo.path, pageInfo.modules);

                this._closeFullscreenView();

                // Save the active url before we transition which could tamper with the url
                this.lastUrl = this.activeAppInfo.url;
                if (!this.activeAppInfo.app) {
                    // initial page load, html is already loaded, just reveal the app
                    if (type === this.LAYER_OVERLAY) {
                        this.$overlayFilm = $('#overlay-film');
                    }
                    finishPromise = this._buildNewApp(NextAppClass, initOptions, type).revealApp(null, toUrl, null, resourcePromise);
                } else {
                    PubSub.trigger('page:unload');
                    if (this.activeAppInfo.intentUrl && this.activeAppInfo.intentUrl !== toUrl) {
                        // pretend as if we're coming from the intentUrl instead of the actual current url
                        this.activeAppInfo.url = this.activeAppInfo.intentUrl;
                    }
                    this.activeAppInfo.intentUrl = null;
                    finishPromise = this._handleTransition(this.activeAppInfo.app, NextAppClass, initOptions,
                        type, this.activeAppInfo.url, toUrl, resourcePromise);
                }
                this.activeAppInfo.url = toUrl;
                this.activeAppInfo.css = pageInfo.css || [];
                this.resourceManager.fetchStyles(_.union(this.preloadedAppInfo.css, this.activeAppInfo.css), finishPromise);
                return finishPromise;
            },
            /**
             * Retrieves the last url the site ajax'd from
             * @returns {String}
             */
            getLastUrl: function () {
                console.log(window.cidx++, '!!!StateManager.getLastUrl(', ')');

                return this.lastUrl;
            },
            _preloadApp: function (NextAppClass, initOptions, toUrl, pageInfo) {
                console.log(window.cidx++, '!!!StateManager._preloadApp(', NextAppClass, initOptions, toUrl, pageInfo, ')');

                if (this.DEBUG) {
                    console.log('Router: Preloading: ', toUrl);
                }
                var finishPromise = this._handleTransition(this.preloadedAppInfo.app, NextAppClass, initOptions,
                    this.LAYER_PRELOAD, this.preloadedAppInfo.url, toUrl, $.Deferred().resolve());
                this.preloadedAppInfo.css = pageInfo.css || [];
                this.preloadedAppInfo.url = toUrl;
                this.resourceManager.fetchStyles(_.union(this.preloadedAppInfo.css, this.activeAppInfo.css), finishPromise);
                return finishPromise;
            },
            _closeFullscreenView: function () {
                console.log(window.cidx++, '!!!StateManager._closeFullscreenView(', ')');

                // full screen views live outside of the state manager because they don't
                // modify the url. If that assumption ever changes, we should switch
                // full screen view to being state managed and this hack can go away
                if (this.fullscreenView) {
                    // we need to clear out fullscreenView before calling close,
                    // because we are navigating to a new view, and don't want an accidental
                    // call to clearFullscreenView to reinstantiate the activeView
                    var fullscreenView = this.fullscreenView;
                    this.fullscreenView = null;
                    fullscreenView.close();
                }
            },
            _handleTransition: function (activeApp, NextAppClass, initOptions, requestedLayerType, fromUrl, toUrl, resourcePromise) {
                console.log(window.cidx++, '!!!StateManager._handleTransition(', activeApp, NextAppClass, initOptions, requestedLayerType, fromUrl, toUrl, resourcePromise, ')');

                // the goal of this function is to trigger both an animation and an ajax request
                // at the same time. We use registerAnimation to make certain both events
                // finish at the same time before proceeding to the final phase
                var animationPromise, requestPromise, requestedApp,
                    preload = requestedLayerType === this.LAYER_PRELOAD,
                    removalPromise = this._removeApps(NextAppClass, requestedLayerType, fromUrl, toUrl);

                if (!removalPromise) {
                    // we're not removing the current app for a couple of reasons,
                    // 1: Opening an overlay on top of the current app
                    // 2: Preloading an app behind an overlay
                    // 3: Changing the page of the currently loaded app

                    // fetch new html?
                    if (fromUrl !== toUrl) {
                        requestPromise = this._fetchPathHtml(toUrl, preload);
                    } else {
                        RequestManager.abortAllRequests();
                    }
                    if (requestedLayerType === this.LAYER_OVERLAY && this.activeAppInfo.layer === this.LAYER_BASE) {
                        requestedApp = this._buildNewApp(NextAppClass, initOptions, requestedLayerType);
                        animationPromise = this._revealOverlay(requestedApp, fromUrl, toUrl, requestPromise, resourcePromise);
                    } else if (preload && !this.preloadedAppInfo.app) {
                        requestedApp = this._buildNewApp(NextAppClass, initOptions, requestedLayerType);
                        animationPromise = requestedApp.revealApp(fromUrl, toUrl, requestPromise, resourcePromise, true);
                    } else {
                        // if we're not removing the view, let the app transition internally
                        animationPromise = activeApp.changePage(fromUrl, toUrl, requestPromise, resourcePromise, preload);
                    }
                } else if (requestedLayerType === this.LAYER_BASE && this.preloadedAppInfo.app) {
                    // if we have a preloaded app (ie, _removeApps didn't destroy it), it means the current app is an overlay,
                    // and we're also request a base level app (overlay -> base) and we need to trigger chagnePage
                    activeApp = this._movePreloadAppToActiveApp(requestedLayerType);
                    fromUrl = this.activeAppInfo.url;
                    if (fromUrl !== toUrl) {
                        requestPromise = this._fetchPathHtml(toUrl, preload);
                    } else if (!preload) {
                        RequestManager.abortAllRequests();
                    }
                    animationPromise = $.Deferred(_.bind(function (defer) {
                        removalPromise.done(_.bind(function () {
                            // transition the active app to optionally trigger an animation and init it
                            activeApp.changePage(fromUrl, toUrl, requestPromise, resourcePromise, preload).done(function () {
                                defer.resolve();
                            });
                        }, this));
                    }, this)).promise();
                } else {
                    // We need a new app, build that bitch
                    requestPromise = this._fetchPathHtml(toUrl, preload);
                    requestedApp = this._buildNewApp(NextAppClass, initOptions, requestedLayerType);
                    animationPromise = $.Deferred(_.bind(function (defer) {
                        removalPromise.done(_.bind(function () {
                            SiteManager.scrollTop(0); // need to trigger scrollTop to maintain the header position
                            requestedApp.revealApp(fromUrl, toUrl, requestPromise, resourcePromise, preload).done(function () {
                                defer.resolve();
                            });
                        }, this));
                    }, this)).promise();
                }
                return animationPromise;
            },
            _movePreloadAppToActiveApp: function (requestedLayer) {
                console.log(window.cidx++, '!!!StateManager._movePreloadAppToActiveApp(', requestedLayer, ')');

                var activeApp = this.activeAppInfo.app = this.preloadedAppInfo.app;
                this.activeAppInfo.css = this.preloadedAppInfo.css;
                this.activeAppInfo.url = this.preloadedAppInfo.url;
                this.activeAppInfo.layer = requestedLayer;
                this._clearPreloadedAppInfo();
                return activeApp;
            },
            _buildNewApp: function (NewAppType, initOptions, layerType) {
                console.log(window.cidx++, '!!!StateManager._buildNewApp(', NewAppType, initOptions, layerType, ')');

                var nextView = new NewAppType(initOptions);

                // save the variables
                if (layerType === this.LAYER_PRELOAD) {
                    this.preloadedAppInfo.app = nextView;
                } else {
                    if (layerType === this.LAYER_OVERLAY && this.activeAppInfo.app && this.activeAppInfo.layer !== this.LAYER_OVERLAY) {
                        this.activeAppInfo.app.pause();
                        this.preloadedAppInfo.app = this.activeAppInfo.app;
                        this.preloadedAppInfo.url = this.activeAppInfo.url;
                        this.preloadedAppInfo.css = this.activeAppInfo.css || [];
                    }
                    this.activeAppInfo.app = nextView;
                    this.activeAppInfo.layer = layerType;
                }
                return nextView;
            },
            _revealOverlay: function (nextApp, fromUrl, toUrl, requestPromise, resourcePromise) {
                console.log(window.cidx++, '!!!StateManager._revealOverlay(', nextApp, fromUrl, toUrl, requestPromise, resourcePromise, ')');

                // save the transitionView, cause the world might change by the time we finish animating
                var transitionView = this.preloadedAppInfo.app;
                this.body.css('overflow-y', 'scroll');
                this._transitionToOverlayScroll(this.preloadedAppInfo);
                this._fadeInOverlayFilm(nextApp);
                var promise = nextApp.revealApp(fromUrl, toUrl, requestPromise, resourcePromise, false);
                SiteManager.scrollTop(0);
                promise.done(_.bind(function () {
                    this.body.css('overflow-y', '');
                    transitionView.afterOverlayReveal(this.scrollTop);
                }, this));
                return promise;
            },
            _fadeInOverlayFilm: function (nextApp) {
                console.log(window.cidx++, '!!!StateManager._fadeInOverlayFilm(', nextApp, ')');

                var fadeInOptions = nextApp.options.animations.fadeIn;
                this.$overlayFilm = $('<div class="ui-film"></div>');
                this.body.append(this.$overlayFilm);
                nextApp.animate(this.$overlayFilm, 'opacity', 0.7, fadeInOptions.duration, 'ease-in');
            },
            _fadeOutOverlayFilm: function (activeApp) {
                console.log(window.cidx++, '!!!StateManager._fadeOutOverlayFilm(', activeApp, ')');

                var overlayFilm = this.$overlayFilm,
                    fadeOutOptions = activeApp.options.animations.fadeOut;
                this.$overlayFilm = null;
                activeApp.animate(overlayFilm, 'opacity', 0, fadeOutOptions.duration, 'ease-out').done(function () {
                    overlayFilm.remove();
                });
            },
            /**
             * Determines based on the new app type and the requested layer, whether the active app, or preloaded app
             * need to be removed
             * @param {Class} NewAppType - the app class we need for the toUrl
             * @param {String} requestedLayerType - either 'base', 'preload', or 'overlay'
             * @param {String} fromUrl - the url we're coming from
             * @param {String} toUrl - the url we're going to
             * @returns {Deferred|null} an optional promise that will resolve when the app is fully removed
             * @private
             */
            _removeApps: function (NewAppType, requestedLayerType, fromUrl, toUrl) {
                console.log(window.cidx++, '!!!StateManager._removeApps(', NewAppType, requestedLayerType, fromUrl, toUrl, ')');

                var removalPromise = null,
                    preloadedAppInfo = this.preloadedAppInfo,
                    preloadedApp = this.preloadedAppInfo.app;
                // switching from a base app to a base app, or an overlay to another overlay
                if (this.activeAppInfo.layer === requestedLayerType) {
                    if (this._shouldRemoveApp(this.activeAppInfo.app, NewAppType)) {
                        removalPromise = this.activeAppInfo.app.removeApp(fromUrl, toUrl);
                    }
                } else if (requestedLayerType === this.LAYER_PRELOAD) {
                    // switching from a preloaded view to another preloaded view
                    if (preloadedApp && this._shouldRemoveApp(preloadedApp, NewAppType)) {
                        removalPromise = preloadedApp.removeApp(fromUrl, toUrl);
                    }
                } else if (requestedLayerType === this.LAYER_BASE) {
                    // we're changing layers from overlay to base, where there might be an app that needs to be destroyed
                    if (preloadedApp) {
                        preloadedApp.beforeOverlayRemove(toUrl);
                    }
                    // we always close overlays when going to normal, so no need to check anything
                    this._fadeOutOverlayFilm(this.activeAppInfo.app);
                    removalPromise = this.activeAppInfo.app.removeApp(fromUrl, toUrl);
                    if (preloadedApp) {
                        // so there's a preloaded app, do we need to remove it also?
                        if (this._shouldRemoveApp(preloadedApp, NewAppType)) {
                            removalPromise = $.when(removalPromise, preloadedApp.removeApp(fromUrl, toUrl));
                            this._clearPreloadedAppInfo();
                        } else {
                            // otherwise, we need to transition the preloaded app from an overlay scroll
                            removalPromise.done(_.bind(function () {
                                this._transitionFromOverlayScroll(preloadedAppInfo);
                            }, this));
                        }
                    }
                } else if (requestedLayerType === this.LAYER_OVERLAY && !this.activeAppInfo.app.isRevealed()) {
                    // opening an overlay on top of an active view, but the active view wasn't ready
                    removalPromise = this.activeAppInfo.app.removeApp(fromUrl, toUrl);
                }
                return removalPromise;
            },
            _shouldRemoveApp: function (activeApp, NewAppType) {
                console.log(window.cidx++, '!!!StateManager._shouldRemoveApp(', activeApp, NewAppType, ')');

                return Object.getPrototypeOf(activeApp) !== NewAppType.prototype || !activeApp.isRevealed();
            },
            _fetchPathHtml: function (toUrl, preload) {
                console.log(window.cidx++, '!!!StateManager._fetchPathHtml(', toUrl, preload, ')');

                var requestPromise = this.fetchHtml(toUrl, null, !preload);
                if (!preload) {
                    requestPromise.fail(_.bind(function (e) {
                        if (e) {
                            if (e === 'NOT AUTHORIZED') {
                                this._loadPath(Utils.getNested(window, 'firefly_urls', 'samSubscribeURL') || '');
                            } else {
                                var msg = this.generateRequestError(e);
                                if (msg) {
                                    Alert.showError(msg);
                                }
                                if ((e.status !== 200 && e.status) || e.statusText === 'timeout') {
                                    // if the status is 200, means the request succeeded, but the promise was rejected/aborted
                                    // status of 0 means the connection itself was aborted
                                    window.history.back();
                                }
                            }
                        }
                    }, this));
                }
                return requestPromise;
            },
            generateRequestError: function (e) {
                console.log(window.cidx++, '!!!StateManager.generateRequestError(', e, ')');

                if (e) {
                    if (e.status === 500) {
                        return 'Connection Error... (INTERNAL SERVER ERROR)';
                    } else if (e.status === 404) {
                        return 'Connection Error... (FILE NOT FOUND)';
                    } else if (e.status !== 200 && e.status) {
                        // if the status is 200, we just got canceled, otherwise we show some error message
                        return 'Connection Error... (' + (e.statusText || 'Unknown Error') + ')';
                    }
                }
                return null;
            },
            _transitionFromOverlayScroll: function (appInfo) {
                console.log(window.cidx++, '!!!StateManager._transitionFromOverlayScroll(', appInfo, ')');

                var app = appInfo.app;
                if (app) {
                    if (app.isApple) {
                        // fixed position and scrolltop don't get along
                        app.show();
                    } else {
                        this._clearFixedPosition(appInfo, app);
                    }
                    // reset z-index
                    app.$el.css('z-index', '');
                }
            },
            _transitionToOverlayScroll: function (appInfo) {
                console.log(window.cidx++, '!!!StateManager._transitionToOverlayScroll(', appInfo, ')');

                var app = appInfo.app;
                if (app) {
                    if (app.isApple) {
                        // fixed position and scrolltop don't get along
                        app.hide();
                    } else {
                        this._setFixedPosition(appInfo, app);
                    }
                    // force the active app to sit below the overlay
                    app.$el.css('z-index', '0');
                }
            },
            _clearFixedPosition: function (appInfo, app, partialCover) {
                console.log(window.cidx++, '!!!StateManager._clearFixedPosition(', appInfo, app, partialCover, ')');

                app.clearFixedPosition(partialCover);
                SiteManager.scrollTop(appInfo.scrollTop || 0);
            },
            _setFixedPosition: function (appInfo, app, partialCover) {
                console.log(window.cidx++, '!!!StateManager._setFixedPosition(', appInfo, app, partialCover, ')');

                var appPosition = app.getWindowOffset().top;
                appInfo.scrollTop = Utils.getScrollPosition();
                SiteManager.scrollTop(0);
                app.setFixedPosition(appPosition, partialCover);
            },

            /**
             * Store the timestamp of the latest activity (ie. mousemove). Used
             * to determine whether to refresh browser automatically after a
             * certain period of idle time.
             */
            updateActivityTimestamp: function () {
                //console.log(window.cidx++, '!!!StateManager.updateActivityTimestamp(', ')');

                this.lastActivityTimestamp = (new Date()).getTime();
            },

            /**
             * Gets the active page info object
             * @returns {PageInfo}
             */
            getActivePageInfo: function () {

                var activeApp = this.getActiveApp() || {};
                console.log(window.cidx++, '!!!StateManager.getActivePageInfo(', activeApp.pageInfo || {}, ')');
                return activeApp.pageInfo || {};
            },
            /**
             * Gets the preloaded page info object
             * @returns {PageInfo}
             */
            getPreloadedPageInfo: function () {
                console.log(window.cidx++, '!!!StateManager.getPreloadedPageInfo(', this.preloadedAppInfo.app && this.preloadedAppInfo.app.pageInfo || {}, ')');

                return this.preloadedAppInfo.app && this.preloadedAppInfo.app.pageInfo || {};
            },
            /**
             * Gets the current active app
             * @returns {Object}
             */
            getActiveApp: function () {
                console.log(window.cidx++, '!!!StateManager.getActiveApp(', this.activeAppInfo.app, ')');

                return this.activeAppInfo.app;
            },
            /**
             * Gets the preloaded app if one exists
             * @returns {Object}
             */
            getPreloadedApp: function () {
                console.log(window.cidx++, '!!!StateManager.getPreloadedApp(', this.preloadedAppInfo.app, ')');

                return this.preloadedAppInfo.app;
            },

            /**
             * Start refresh interval. Check current time against last activity
             * and refresh the page if it's been longer than threshold of idle
             * time.
             */
            startRefreshTimer: function () {
                console.log(window.cidx++, '!!!StateManager.startRefreshTimer(', ')');

                if (!this.refreshTimer && this.REFRESH_FREQUENCY) {
                    this.lastActivityTimestamp = 0;
                    this.refreshTimer = setInterval(_.bind(function () {
                        if (!this.fullscreenView && this.activeAppInfo.layer !== this.LAYER_OVERLAY) {
                            var currentTime = (new Date()).getTime();
                            var idleTime = currentTime - this.lastActivityTimestamp;
                            if (idleTime > this.REFRESH_FREQUENCY) {
                                PubSub.trigger('site:refresh', 'refresh:' + (this.getActivePageInfo().ssts || '').replace(/[\/:].*/, ''));
                                window.location = window.location;
                            }
                        }
                    }, this), this.REFRESH_FREQUENCY);
                }
            },

            /**
             * Stop refresh timer.
             */
            stopRefreshTimer: function () {
                console.log(window.cidx++, '!!!StateManager.stopRefreshTimer(', ')');

                if (this.refreshTimer) {
                    clearInterval(this.refreshTimer);
                    this.refreshTimer = null;
                }
            },

            /**
             * Registers a navigation animation that should defer all incoming ajax requests
             * @param {Deferred} deferred jQuery promise object
             * @param {jQuery} [el] dom element
             * @param {String} [property] name
             * @param {String|Number} [value] being animated to
             * @param {Number} [timeMs] time for animation
             * @return {Deferred} representing when all animations are done
             */
            registerAnimation: function (deferred, el, property, value, timeMs) {
                console.log(window.cidx++, '!!!StateManager.registerAnimation(', deferred, el, property, value, timeMs, ')');

                return TrafficCop.addAnimation(deferred, el, property, value, timeMs);
            },

            /**
             * Helper function that auto populates fetchData with the isHtml flag being true
             * @param {String} path The path to the ajax endpoint.
             * @param {Object} [options] jQuery ajax option.
             * @param {Boolean} [isNavigation] specifies if this request is a navigation request
             *                  or a background loading request.
             * @param {Boolean} [isStatic] tells the ajax request whether to add
             *      the pjax headers or not
             * @return {Deferred} jQuery promise object
             */
            fetchHtml: function (path, options, isNavigation, isStatic) {
                console.log(window.cidx++, '!!!StateManager.fetchHtml(', path, options, isNavigation, isStatic, ')');

                return RequestManager.fetchHtml(path, options, isNavigation, isStatic, true);
            },

            /**
             * Fetch data from server via AJAX. Takes a path to fetch and a
             * callback to parse the data and initialize views.
             * @param {String} path The path to the ajax endpoint.
             * @param {Object} [options] jQuery ajax option.
             * @param {Boolean} [isNavigation] specifies if this request is a navigation request
             *                  or a background loading request.
             * @param {Boolean} [isStatic] tells the ajax request whether to add
             *      the pjax headers or not
             * @param {Boolean} [isHtml] will return a quickly built jQuery dom object.
             * @return {Deferred} jQuery promise object
             */
            fetchData: function (path, options, isNavigation, isStatic, isHtml) {
                console.log(window.cidx++, '!!!StateManager.fetchData(', path, options, isNavigation, isStatic, isHtml, ')');

                return RequestManager.fetchData(path, options, isNavigation, isStatic, isHtml);
            },

            /**
             * repeatedly calls fetchHtml at a specified interval and passing the results to a callback
             * @param {String} path The path to the ajax endpoint.
             * @param {Object} options ajax options
             * @param {Number} interval time in ms to repeat
             * @param {Function} callback function to call when fetchHtml succeeds
             * @param {Boolean} [isStatic] tells the ajax request whether to add the pjax headers or not
             * @return {Number} setInterval id
             */
            recurringFetchHtml: function (path, options, interval, callback, isStatic) {
                console.log(window.cidx++, '!!!StateManager.recurringFetchHtml(', path, options, interval, callback, isStatic, ')');

                return RequestManager.recurringFetchHtml(path, options, interval, callback, isStatic, true);
            },

            /**
             * repeatedly calls fetchData at a specified interval and passing the results to a callback
             * @param {String} path The path to the ajax endpoint.
             * @param {Object} options ajax options
             * @param {Number} interval time in ms to repeat
             * @param {Function} callback function to call when fetchHtml succeeds
             * @param {Boolean} [isStatic] tells the ajax request whether to add the pjax headers or not
             * @param {Boolean} [isHtml] will return a quickly built jQuery dom object
             * @return {Number} setInterval id
             */
            recurringFetchData: function (path, options, interval, callback, isStatic, isHtml) {
                console.log(window.cidx++, '!!!StateManager.recurringFetchData(', path, options, interval, callback, isStatic, isHtml, ')');

                return RequestManager.recurringFetchData(path, options, interval, callback, isStatic, isHtml);
            }
        };

        /**
         * @global
         */
        window.stateManager = new StateManager();
        return window.stateManager;
    });
