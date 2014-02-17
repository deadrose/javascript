define(['jquery', 'underscore', 'backbone'],
    function($, _, Backbone) {
		var cidx = window.cidx = window.cidx || 0;

        var RouteManager = Backbone.Router.extend({
            initialize: function(options) {
            	console.log(window.cidx++, '!!!RouteManager.initialize(', options, ')');

                this.options = $.extend(true, {
                    appMap: {},
                    pageList: [],
                    onRouteChange: function(app, route, path) {
                    	console.log(window.cidx++, '!!!RouteManager.onRouteChange(', app, route, path, ')');
}
                }, options);
                this.urls = [];
                this._preloadRoutes(this.options.pageList, this.options.appMap);
            },
            destroy: function() {
            	console.log(window.cidx++, '!!!RouteManager.destroy(', ')');

                Backbone.history.stop();
            },
            getRouteInfoForUrl: function(path) {
            	console.log(window.cidx++, '!!!RouteManager.getRouteInfoForUrl(', path, ')');

                return _.find(this.urls, function(url){
                    return url.url.test(path);
                });
            },
            _preloadRoutes: function(pageList, appMap) {
            	console.log(window.cidx++, '!!!RouteManager._preloadRoutes(', pageList, appMap, ')');

                var numAppsLoading = _.size(appMap);
                var _this = this;
                // we preload all apps so we can load them quickly, pages are lazy
                _.each(appMap, function(app, appName) {
                    require([app.path], function(AppClass) {
                        app.AppClass = AppClass;
                        numAppsLoading--;
                        if (!numAppsLoading) {
                            // now that we have all the apps, register the routes and start the history
                            _this._loadBackboneRoute(pageList, appMap);
                        }
                    });
                });
            },
            _loadBackboneRoute: function(pageList, appMap) {
            	console.log(window.cidx++, '!!!RouteManager._loadBackboneRoute(', pageList, appMap, ')');

                // backbone matches last to first to allow for new routes to overwrite old routes,
                // but we're loading siteconfigs in python order which is first match, so we reverse the list
                // to get the right order

				// app: appMap
				// page: pageList
                var _this = this;
                pageList.reverse();

                _.each(pageList, function(page) {
					// page.appName: Search, Overlay-with-footer ...
					// 페이지리스트에 있는 appName에 해당하는 모듈정보를 appmap에서 찾아서 실행
                    var app = appMap[page.appName];
                    if (!app) {
                        console.error('Invalid appName for Page ' + page.name);
                    } else {
                        page.modules = (page.init_modules || []).concat(app.init_modules || []);
                        var urls = (page.hosturls && page.hosturls[location.hostname]) || page.urls;
                        _.each(urls, function(url) {
                            var regEx = new RegExp(url);
                            // later urls are matched first to match backbone's route matcher
                            _this.urls.unshift({url: regEx, app: app, page: page});
                            _this.route(regEx, app.name, function onRouteChange() {
                                _this.options.onRouteChange(app, page, Backbone.history.getFragment(window.location.pathname + window.location.search));
                            });
                        });
                    }
                });

                // Special route to handle Facebook Connect #_=_ mess.  Won't be necessary after Backbone 1.1.0.
                // See https://developers.facebook.com/blog/post/552/ under "Change in Session Redirect Behavior".
                _this.route('_=_', 'facebook-connect-login-fragment', function() {
                        // keep the path, modulo the preceeding slash and the stuff we're trying to remove
                        var fixedpath = window.location.pathname.replace(/^\//, '').replace(/_=_$/, '');

                        // Remove it from the URL while we're at it.
                        _this.navigate(fixedpath + window.location.search, {trigger: true, replace: true});
                    });

                Backbone.history.start({pushState: true, hashChange: false});
                console.log("Site Loaded");
            }
        });
        return RouteManager;
    }
);
