define(['jquery', 'underscore'],
    function($, _) {
        'use strict';

		var cidx = window.cidx = window.cidx || 0;

        /**
         * Resource Manager that handles loading modularized javascript and css
         * For CSS, it maintains a state of what's currently loaded so it can unload files as need be.
         * @exports managers/resourcemanager
         * @param options
         * @constructor
         * @author Jay Merrifield <jmerrifiel@gannett.com>
         */
        var ResourceManager = function(options){
            this._initialize(options);
        };
        ResourceManager.prototype = {
            /**
             * private function that sets up resource manager
             * @private
             */
            _initialize: function(options) {
            	console.log(window.cidx++, '!!!ResourceManager._initialize(', options, ')');

                this.siteModules = options.siteModules || {};
                this.$stylesheets = $([]);
                this.stylesheets = [];
                this.staticUrl = window.site_static_url || '/static/';
                this.staticVersion = window.site_static_version || 'off';
                // build up existing stylesheets
                $('link[data-identifier]').each(_.bind(function(idx, itm) {
                    var identifier = $(itm).data('identifier');
                    if (identifier != 'main') {
                        this.stylesheets.push($(itm).data('identifier'));
                        this.$stylesheets.push(itm);
                    }
                }, this));
            },
            /**
             * This function is used to add/remove stylesheets from the page
             * @param {Array} stylesheets array of stylesheets that should be on the page
             * @param {Deferred} removalPromise promise that will resolve when it's safe to remove the unneeded stylesheets
             * @param {Boolean} [log] boolean to log the changes to the stylesheets
             */
            fetchStyles: function(stylesheets, removalPromise, log) {
            	console.log(window.cidx++, '!!!ResourceManager.fetchStyles(', stylesheets, removalPromise, log, ')');

                var newStyles = _.difference(stylesheets, this.stylesheets);
                var stylesToRemove = _.difference(this.stylesheets, stylesheets);
                if (log && stylesToRemove.length){
                    console.log('removing styles from dom: ', stylesToRemove);
                }
                if (log && newStyles.length){
                    console.log('adding styles to dom: ', newStyles);
                }
                var $stylesToRemove = this._findStyleTags(stylesToRemove);
                this.stylesheets = stylesheets;
                // _.without doesn't work on jquery objects
                this.$stylesheets = $(_.filter(this.$stylesheets, function(value){ return !_.include($stylesToRemove, value); }));
                this._addStylesToHead(newStyles);
                if ($stylesToRemove.length){
                    removalPromise.done(function(){
                        $stylesToRemove.remove();
                    });
                }
            },
            /**
             * Fetches javascript code and returns a promise that can be used to retrieve the class
             * Modules are bundled code that should contain the view
             * @param {String} [requirePackage] r.js module name that contains the view
             * @param {String} [view] name of the view class that should be returned by the promise
             * @param {Array} [pageModules] any modules that are needed for the page view
             * @return {Deferred} promise object
             */
            fetchJavascript: function(requirePackage, view, pageModules) {
            	console.log(window.cidx++, '!!!ResourceManager.fetchJavascript(', requirePackage, view, pageModules, ')');

                return $.Deferred(_.bind(function(deferred){
                    if (requirePackage && view) {
                        require([requirePackage], _.bind(function(){
                            // the view SHOULD be included in the module, if not, something went wrong
                            require([view], _.bind(function(ViewClass){
                                this._resolveFetchJavascript(deferred, ViewClass, pageModules);
                            }, this));
                        }, this));
                    } else if (view) {
                        require([view], _.bind(function(ViewClass){
                            this._resolveFetchJavascript(deferred, ViewClass, pageModules);
                        }, this));
                    } else {
                        this._resolveFetchJavascript(deferred, null, pageModules);
                    }
                }, this)).promise();
            },
            /**
             *
             * @param {Deferred} deferred
             * @param {Object} ViewClass
             * @param {Array} [pageModules]
             * @private
             */
            _resolveFetchJavascript: function(deferred, ViewClass, pageModules) {
            	console.log(window.cidx++, '!!!ResourceManager._resolveFetchJavascript(', deferred, ViewClass, pageModules, ')');

                this.fetchPageModules(pageModules).done(function(moduleList){
                    deferred.resolve(ViewClass, moduleList);
                });
            },

            /**
             * Given a list of page modules, will fetch the code for the modules and generate a selector if need be
             * @param {Array.<Object>} pageModules
             * @returns {Deferred} jQuery Promise that will resolve when all resources are found
             */
            fetchPageModules: function(pageModules) {
            	console.log(window.cidx++, '!!!ResourceManager.fetchPageModules(', pageModules, ')');

                pageModules = pageModules || [];
                return $.Deferred(_.bind(function(defer) {
                    var numWaiting = pageModules.length,
                        retrievedModules = [];
                    if (!numWaiting) {
                        defer.resolve(retrievedModules);
                        return;
                    }
                    _.each(pageModules, function(pageModule) {
                        // assume we're going to succeed, but more importantly we need to preserve the ordering
                        retrievedModules.push(pageModule);
                        this.getSiteModuleByName(pageModule.name).done(function(siteModule){
                            pageModule.selector = siteModule.selector || '.' + siteModule.name + '-module';
                            pageModule.ModuleClass = siteModule.ModuleClass;
                        }).fail(function(){
                            retrievedModules = _.reject(retrievedModules, function(module){
                                return module.name === pageModule.name;
                            });
                        }).always(function(){
                            numWaiting--;
                            if (numWaiting === 0){
                                defer.resolve(retrievedModules);
                            }
                        });
                    }, this);
                }, this)).promise();
            },

            /**
             * Given a site module name, will retrieve the code for said module
             * @param {String} moduleName
             * @returns {Deferred} jQuery Promise that will resolve when the code is found, or reject if no such module exists
             */
            getSiteModuleByName: function(moduleName) {
            	console.log(window.cidx++, '!!!ResourceManager.getSiteModuleByName(', moduleName, ')');

                return $.Deferred(_.bind(function(defer){
                    var siteModule = this.siteModules[moduleName];
                    if (!siteModule) {
                        defer.reject("No Such Module Found");
                    } else {
                        if (siteModule.ModuleClass) {
                            defer.resolve(siteModule);
                        } else if (siteModule.path) {
                            require([siteModule.path], function(ModuleClass) {
                                siteModule.ModuleClass = ModuleClass;
                                siteModule.name = moduleName;
                                defer.resolve(siteModule);
                            }, function(err) {
                                console.error('Failed loading ' + siteModule.path + ': ' + err.message, err);
                                defer.reject(err);
                            });
                        } else {
                            defer.reject();
                        }
                    }
                }, this)).promise();
            },

            /**
             * Helper function that will return a jQuery array of the stylesheet links that match
             * the passed in array
             * @param {Array} stylesNames names of style tags we wish to find
             * @return {jQuery} link tags
             * @private
             */
            _findStyleTags: function(stylesNames) {
            	console.log(window.cidx++, '!!!ResourceManager._findStyleTags(', stylesNames, ')');

                return $(_.filter(this.$stylesheets, function(itm) {
                    var section = $(itm).data('identifier');
                    return _.find(stylesNames, function(style) {
                        return section === style;
                    });
                }));
            },
            /**
             * Helper function to add new style tags to the head
             * @param {Array} newStyles names of styles we want to add
             * @private
             */
            _addStylesToHead: function(newStyles) {
            	console.log(window.cidx++, '!!!ResourceManager._addStylesToHead(', newStyles, ')');

                if (newStyles && newStyles.length > 0) {
                    var $newStyles = $([]);
                    _.each(newStyles, function(itm) {
                        var link = $('<link rel="stylesheet" data-identifier="' + itm + '" href="' + this.staticUrl + 'css/bundles/' + itm + (window.use_minified_css ? '.min' : '') + '.css?v=' + this.staticVersion + '">')[0];
                        $newStyles.push(link);
                        this.$stylesheets.push(link);
                    }, this);
                    $('head').append($newStyles);
                }
            }
        };
        return ResourceManager;
    }
);