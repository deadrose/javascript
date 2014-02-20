define([
    'jquery',
    'underscore',
    'pubsub'
], function ($, _, PubSub) {
    'use strict';

    var cidx = window.cidx = window.cidx || 0;

    /**
     * SiteConfig Loading Helper Manager that will load and merge a number of site configs into one site config
     * @exports managers/siteconfig
     * @author Jay Merrifield <jmerrifiel@gannett.com>
     */
    var SiteConfig = {
        /**
         * Given a list of site configs, will return a merged copy
         * @param {Array.<Object>} siteConfigList list of site configs to load and merge
         * @returns {Object} merged site config
         */
        loadSiteConfigs: function (siteConfigList) {
            console.log(window.cidx++, '!!!SiteConfig.loadSiteConfigs(', /*siteConfigList, */')');

            return $.Deferred(function (defer) {
                var numConfigsLoaded = 0,
                    siteConfigMap = {
                    },
                    mergedSiteConfig = SiteConfig._getEmptySiteConfig();
                if (!siteConfigList.length) {
                    defer.resolve(mergedSiteConfig);
                }
                _.each(siteConfigList, function (config) {
                    require(['libs/require/text!' + config], function (siteConfig) {
                        // save the config, will process later to make certain we process all the files in a consistent order
                        try {
                            siteConfigMap[config] = $.parseJSON(siteConfig);
                        } catch (e) {
                            console.log('config error:', config, siteConfig, e);
                        }
                        numConfigsLoaded++;
                        if (numConfigsLoaded === siteConfigList.length) {
                            // parse each file in the order defined in window.site_config.JS.CONFIG
                            _.each(siteConfigList, function (config) {
                                SiteConfig._mergeSiteConfig(mergedSiteConfig, siteConfigMap[config]);
                            });
                            if (!_.isEmpty(mergedSiteConfig.require.paths) || !_.isEmpty(mergedSiteConfig.require.shim)) {
                                require.config(mergedSiteConfig.require);
                            }
                            SiteConfig._replaceEnvVariables(mergedSiteConfig);
                            defer.resolve(mergedSiteConfig);
                        }
                    });
                });
            }).promise();
        },

        _replaceEnvVariables: function (siteConfig) {

            console.log(window.cidx++, '!!!SiteConfig._replaceEnvVariables(', siteConfig, ')');

            // environment variables only are allowed in page urls at the moment
            _.each(siteConfig.pages, function (page) {
                if (page.urls) {
                    var pageUrls = [];
                    _.each(page.urls, function (url) {
                        if (url.indexOf('<%') != -1 && url.indexOf('%>') != -1) {
                            try {
                                url = _.template(url, {});
                            } catch (e) {
                                console.error("invalid url template: " + url);
                                url = undefined;
                            }
                        }
                        if (url !== undefined) {
                            pageUrls.push(url);
                        }
                    });
                    page.urls = pageUrls;
                }
            });
        },

        _getEmptySiteConfig: function () {

            console.log(window.cidx++, '!!!SiteConfig._getEmptySiteConfig(', ')');

            return {
                apps: {},
                siteModules: {},
                pages: [],
                require: {
                    paths: {},
                    shim: {}
                },
                global: {
                    pubSub: {},
                    modules: []
                },
                version: 2
            };
        },
        numMigrated: 0,

        _mergeSiteConfig: function (mergedSiteConfig, siteConfig) {

            //console.log(window.cidx++, '!!!SiteConfig._mergeSiteConfig(', mergedSiteConfig, siteConfig, ')');

            if (siteConfig.require) {
                if (siteConfig.require.paths) {
                    $.extend(mergedSiteConfig.require.paths, siteConfig.require.paths);
                }
                if (siteConfig.require.shim) {
                    $.extend(mergedSiteConfig.require.shim, siteConfig.require.shim);
                }
            }
            if (siteConfig.global) {
                if (siteConfig.global.pubSub) {
                    _.each(siteConfig.global.pubSub, function (path, key) {
                        if (!_.isArray(path)) {
                            path = [path];
                        }
                        if (!mergedSiteConfig.global.pubSub[key]) {
                            mergedSiteConfig.global.pubSub[key] = [];
                        }
                        mergedSiteConfig.global.pubSub[key] = mergedSiteConfig.global.pubSub[key].concat(path);
                    });
                }
                if (siteConfig.global.modules) {
                    mergedSiteConfig.global.modules = mergedSiteConfig.global.modules.concat(siteConfig.global.modules);
                }
            }
            if (!siteConfig.version) {
                // old format, migrate to new format
                _.each(siteConfig.apps, function (app) {
                    SiteConfig.numMigrated++;
                    app.name = app.name + SiteConfig.numMigrated;
                    if (app.pages) {
                        _.each(app.pages, function (page) {
                            page.appName = app.name;
                            mergedSiteConfig.pages = mergedSiteConfig.pages.concat(page);
                        });
                        app.pages = null;
                    }
                    if (mergedSiteConfig.apps[app.name]) {
                        console.warn("Duplicate App Name Found: " + app.name);
                    }
                    mergedSiteConfig.apps[app.name] = app;
                });
            } else {
                // new hotness
                if (siteConfig.apps) {
                    $.extend(mergedSiteConfig.apps, siteConfig.apps);
                }
                if (siteConfig.pages) {
                    mergedSiteConfig.pages = mergedSiteConfig.pages.concat(siteConfig.pages);
                }
            }
            if (siteConfig.siteModules) {
                $.extend(mergedSiteConfig.siteModules, siteConfig.siteModules);
            }
        }
    };
    return SiteConfig;
});