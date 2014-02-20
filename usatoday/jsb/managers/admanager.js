/*global googletag:true*/
define([
    'jquery',
    'underscore',
    'pubsub',
    'state',
    'utils',
    'partner/ad-slot',
    'adLogger',
    'cookie'
],
    function ($, _, PubSub, StateManager, Utils, AdSlot, AdLogger) {
        'use strict';
        /**
         * @exports admanager
         */
        var AdManager = function () {
            this.initialize();
        };
        AdManager.prototype = {

            adSizes: {
                'pushdown': [1200, 615],
                'elastic': [1080, 810],
                'outofpage': [1080, 810],
                'cinematicvideoskin': [2600, 1400],
                'heroflip': [720, 524],
                'livefeed': [300, 800],
                'videotakeover': [720, 405],
                'coverviewfullpage': [1, 1],
                'bigpageflex': [1, 1],
                'mediumrectangle': [300, 250],
                'halfpage': [300, 600],
                'sponsor_logo_medium': [100, 50],
                'leaderboard': [728, 90], // FERCKIN SPERTS
                'generic': [1, 2], // Used for Rovion and one off ad call that spawn their own interactions
                // rising star ad types
                'filmstrip': [300, 600],
                'iabpushdown': [970, 90],
                'iabpushdown2': [970, 66],
                'billboard': [970, 250],
                'portrait': [300, 1050],
                'sponsor_logo': [100, 30]
            },

            // Flexible ads (ie. not constrained to a fixed size in all placements).
            flexibleAds: [
                'pushdown',
                'elastic',
                'outofpage',
                'cinematicvideoskin',
                'heroflip',
                'livefeed',
                'videotakeover',
                'coverviewfullpage',
                'generic'
            ],
            noAds: false,
            // map of adUnit to a list of placements
            activeAdPlacements: {},

            /**
             * Retrieves a shared ad slot that has multiple possible output positions
             * @param {String} adPlacement name of the dfp placement targeting
             * @param {Object} targeting key/value custom targeting map
             * @param {Object} positionMap key/value mapping of adType{String} -> adPosition
             * @param {Object} defaultPosition the default position if no high impact ad is delivered
             * @param {String} [slotType=in] google slot type, either 'out' or 'in'
             * @return {Object} new AdSlot
             */
            getSharedAdSlot: function (adPlacement, targeting, positionMap, defaultPosition, slotType) {
                var adSizes = this._buildAdSizesFromPlacements(positionMap),
                    adUnit = this.buildAdUnit(adPlacement),
                    adPosition = (defaultPosition && defaultPosition.$el) || this.globalStaging;
                this.activeSlotStatistics.unknown++;
                return new AdSlot({
                    adUnit: adUnit,
                    targeting: targeting,
                    overrideTargeting: this.getOverrideTargeting(),
                    sizes: adSizes,
                    type: slotType || (defaultPosition && defaultPosition.getSlotType()) || 'in',
                    position: adPosition,
                    onSlotEmpty: _.bind(function () {
                        this._onSlotEmpty();
                        _.each(positionMap, function (position) {
                            position.noAd();
                        }, this);
                    }, this),
                    onSlotRender: _.bind(function (adData, adType) {
                        this._onSlotRender(adData, adType);
                        if (!adType) {
                            defaultPosition.render();
                        } else {
                            var adPosition = positionMap[adType];
                            if (!adPosition) {
                                AdLogger.logError('AdSlot(' + adUnit + '): ad delivered to unknown ad position/type: ' + adType);
                                return;
                            }
                            adPosition.render(adData, adType);
                        }
                    }, this)
                });
            },
            /**
             * Builds an ad slot wrapper around google's ad slots
             * @param {String} adPlacement name of the dfp placement targeting
             * @param {Object} targeting key/value custom targeting map
             * @param {String[]} adPlacementSizes ad size names
             * @param {Object} adPosition Object that will handle the ad slot
             * @param {String} [slotType=out] google slot type, either 'out' or 'in'
             * @return {Object} new AdSlot
             */
            getAdSlot: function (adPlacement, targeting, adPlacementSizes, adPosition, slotType) {
                var adUnit = this.buildAdUnit(adPlacement),
                    adRequestSizes = this._mapAdSizeNamesToActualSizes(adPlacementSizes);
                this.activeSlotStatistics.unknown++;
                return new AdSlot({
                    adUnit: adUnit,
                    targeting: targeting,
                    sizes: adRequestSizes,
                    overrideTargeting: this.getOverrideTargeting(),
                    type: slotType || 'out',
                    position: adPosition.$el,
                    onSlotEmpty: _.bind(function () {
                        this._onSlotEmpty();
                        adPosition.noAd();
                    }, this),
                    onSlotRender: _.bind(function (adData, adType) {
                        this._onSlotRender(adData, adType);
                        adPosition.render(adData, adType);
                    }, this)
                });
            },

            /**
             * Updates statics for an ad delivery, fires callbacks if necessary
             * @param {HighImpactAdData} [adData] dfp high impact ad data
             * @param {String} [adType] normalized ad type that was delivered (without any special characters, pushdown+ => pushdown)
             * @private
             */
            _onSlotRender: function (adData, adType) {
                this.activeSlotStatistics.unknown--;
                if (!adType) {
                    this.activeSlotStatistics.iab++;
                } else {
                    this.activeSlotStatistics.high_impact++;
                }
                this._resolveStatistics();
            },

            /**
             * Updates statistics for a noad result, fires callbacks if necessary
             * @private
             */
            _onSlotEmpty: function () {
                this.activeSlotStatistics.unknown--;
                this.activeSlotStatistics.noad++;
                this._resolveStatistics();
            },

            /**
             * Resolves the active statistic promises if we're not between page loads, and the unknown ads is 0
             * @private
             */
            _resolveStatistics: function () {
                if (!this.betweenPageLoad && !this.activeSlotStatistics.unknown) {
                    _.each(this.activeStatisticRequests, function (info) {
                        clearTimeout(info.timeout);
                        if (info.defer) {
                            try {
                                info.defer.resolve($.extend({}, this.activeSlotStatistics));
                            } catch (ex) {
                                console.error('active slot statistic promise crashed', (ex.stack || ex.stacktrace || ex.message));
                            }
                        }
                    }, this);
                    this.activeStatisticRequests = [];
                }
            },

            /**
             * Returns the override targetting key/value map to be added to all slots
             * @returns {Object}
             */
            getOverrideTargeting: function () {
                var overrideTargetting = {};
                if (this.override && this.override.usatl) {
                    overrideTargetting.adlabel = this.override.usatl;
                }
                return overrideTargetting;
            },

            /**
             * Given an ad placement and optional custom targeting map, will build an ad unit string
             * with either the current accountId and Name, or the overridden ones.
             * If an ad label override is supplied, it'll be added to the targeting map
             * @param {String} adPlacement name of the ad placement for the ad unit
             * @return {String}
             */
            buildAdUnit: function (adPlacement) {
                // Build the adUnit Path
                var args = {
                    'accountId': window.site_config.ADS.DFP.ACCOUNTID,
                    'accountName': window.site_config.ADS.DFP.ACCOUNTNAME,
                    'adUnit': adPlacement
                };
                if (this.override) {
                    args.accountId = this.override.usatai;
                    args.accountName = this.override.usatan;
                }
                return args.accountId + '/' + args.accountName + '/' + args.adUnit;
            },

            /**
             * Returns the size array for an ad unit
             * @param adUnit - name of an ad unit
             */
            getSize: function (adSizeName) {
                var size = this.adSizes[$.trim(adSizeName)];
                if (!size) {
                    AdLogger.logWarn('Size not found for ' + adSizeName);
                    return null;
                }
                return size;
            },

            isFlexibleAdSize: function (adSizeName) {
                return _.indexOf(this.flexibleAds, adSizeName) !== -1;
            },

            /**
             * Gets the size for the vCE tag
             * @param adType (Pushdown, Hero Flip, Live Feed Takeover, Elastic)
             */
            getVCESize: function (adType) {
                var sa = this.getSize(adType);
                if (!sa) {
                    return '1x1';
                }
                return sa.join('x');
            },

            /**
             * Kickoff
             */
            initialize: function () {
                this._resetActiveSlotStatistics();

                if (!window.googletag) {
                    this.noAds = true;
                    // turn off between page load since we're not listening to pub subs and we still want getActiveSlotStatistics to work
                    this.betweenPageLoad = false;
                    return;
                }

                AdLogger.logGroup('AdManager initialize');

                PubSub.on('page:load', this.onPageLoad, this);
                PubSub.on('page:unload', this.onPageUnload, this);

                var usatai = Utils.getUrlParam('usatai'),
                    usatan = Utils.getUrlParam('usatan'),
                    usatl = Utils.getUrlParam('usatl');
                if (usatai && usatan && usatl) {
                    this.override = {
                        usatai: usatai,
                        usatan: usatan,
                        usatl: usatl
                    };
                }

                this.globalStaging = $('#ad-staging');

                // init the Google stuff
                this._initializeGoogletag();
                window.adManager = this;

                // init base targeting
                this._initializeBaseTargeting();

                AdLogger.logDebug('AdManager initialized');
                AdLogger.logGroupEnd();
            },

            /**
             * Resets the active slot statistics to their initial state
             * @private
             */
            _resetActiveSlotStatistics: function () {
                this.activeSlotStatistics = {
                    high_impact: 0,
                    iab: 0,
                    noad: 0,
                    unknown: 0
                };
                this.betweenPageLoad = true;
                if (this.activeStatisticRequests) {
                    _.each(this.activeStatisticRequests, function (info) {
                        clearTimeout(info.timeout);
                        // don't resolve promises, anyone listening on them should be dead
                    });
                }
                this.activeStatisticRequests = [];
            },

            /**
             * Returns a promise that will resolve when we are reasonably certain that all the ads have been
             * requested and delivered or the specified timeout has occurred.
             * @param {Number} timeout - time in ms to return regardless of the whether we know all the ads have been delivered
             * @returns {Deferred} This deferred will resolve with a map of statistics. ex: { high_impact: 0, iab: 0, noad: 0, unknown: 0 }
             */
            getActiveSlotStatistics: function (timeout) {
                if (!this.betweenPageLoad && !this.activeSlotStatistics.unknown) {
                    // we've loaded the page, and there's no waiting ad slots (doesn't mean more might be created)
                    // but for now we're pretty certain we have all the statistics
                    return $.Deferred().resolve($.extend({}, this.activeSlotStatistics));
                }
                return $.Deferred(_.bind(function (defer) {
                    var entry = {
                        timeout: 0,
                        defer: defer
                    };
                    this.activeStatisticRequests.push(entry);
                    if (timeout) {
                        entry.timeout = setTimeout(_.bind(function () {
                            AdLogger.logDebug('getActiveSlotStatistics timed out after ' + timeout + 'ms');
                            this.activeStatisticRequests = _.reject(this.activeStatisticRequests, function (request) {
                                return request === entry;
                            });
                            defer.reject(this.activeSlotStatistics);
                        }, this), timeout);
                    }
                }, this)).promise();
            },

            /**
             * Configures the Google services
             * @private
             */
            _initializeGoogletag: function () {
                googletag.cmd.push(function () {
                    AdLogger.logInfo('Collapses the empty divs. Used for the asset pages where the slot and placement are the same');
                    googletag.pubads().collapseEmptyDivs();

                    // this forces us to call refresh on each slot, so we get a unique correlator value
                    AdLogger.logInfo('Disabling initial load of slots');
                    googletag.pubads().disableInitialLoad();

                    AdLogger.logInfo('Enabled the ad calls');
                    googletag.enableServices();
                });
            },

            /**
             * Sets the base targeting, keywords and RevSci
             * @private
             */
            _initializeBaseTargeting: function () {
                var pubads = googletag.pubads();
                googletag.cmd.push(function () {
                    // Adobe Audience Manager
                    var aam = (($.cookie('aamusat') || '').match(/[0-9]+/g) || []).join(',');
                    var aid = $.cookie('aam_uuid') || '';
                    pubads.setTargeting('aam', aam);
                    pubads.setTargeting('u', aid);
                    // RevSci
                    var rawRs = $.cookie('rsi_segs');
                    if (rawRs) {
                        var rawRsArray = rawRs.split('|');
                        AdLogger.logInfo('set revsci targeting', rawRsArray);
                        pubads.setTargeting('segments', rawRsArray);
                    }

                    // set environment tracking
                    var environmentTarget = window.site_config.ADS.DFP.ENV;
                    AdLogger.logInfo('using env targeting: ' + environmentTarget);
                    pubads.setTargeting('env', environmentTarget);
                });
            },

            /**
             * Requests ads on {@link page:load} for the shared ad placements on page
             * @param {Object} pageInfo key value map that represents the current asset information we're targeting
             * @see page:load
             */
            onPageLoad: function (pageInfo) {
                var targeting = $.extend(this.getPageTargeting(pageInfo), StateManager.getActiveApp().getClientAdInfo());
                var aws = '/' + pageInfo.aws; // ad unit targeting to aws section

                AdLogger.logInfo('AdManager: requestAds()', targeting);
                _.each(this.activeAdPlacements, function (adPlacementInfo) {
                    if (adPlacementInfo) {
                        adPlacementInfo.slotInfo = this.getSharedAdSlot(adPlacementInfo.name + aws, targeting, adPlacementInfo.positionMap, adPlacementInfo.defaultPosition);
                    }
                }, this);
                // cover scenario where there's no active ad placements on the page
                this.betweenPageLoad = false;
                this._resolveStatistics();
            },

            /**
             * Fired on {@link page:unload} to reset internal statistics
             * @see page:unload
             */
            onPageUnload: function () {
                this._resetActiveSlotStatistics();
            },

            /**
             * Given a list of ad size names or ad size numbers, will return a list of the google tag pixel size arrays
             * @example
             * AdManager.getAdActualSizes([300,250]);
             * AdManager.getAdActualSizes('100x200');
             * AdManager.getAdActualSizes('coverview,100x200');
             * AdManager.getAdActualSizes(['pushdown','hero-flip']);
             * AdManager.getAdActualSizes([[300,250],[100,100]]);
             * AdManager.getAdActualSizes(['pushdown',[100,100],'100x200']);
             * @param {Array.<String>|Array.<Number>|Array.<Array.<Number>>|String} adSizeNames
             * @returns {Array.<Array.<Number>>}
             */
            getAdActualSizes: function (adSizeNames) {
                return this._mapAdSizeNamesToActualSizes(adSizeNames);
            },

            /**
             * Given a list of ad size names or ad size numbers, will return a list of the google tag pixel size arrays
             * @param {Array.<String>|Array.<Number>|String} adSizeNames
             * @returns {Array.<Array.<Number>>}
             * @private
             */
            _mapAdSizeNamesToActualSizes: function (adSizeNames) {
                if (_.isString(adSizeNames)) { // single entry?
                    var stringArray = adSizeNames.split(',');
                    if (stringArray.length > 1) {
                        return this._processAdSizeData(stringArray);
                    } else {
                        return this._processAdSizeData([adSizeNames]);
                    }
                } else if (_.isArray(adSizeNames)) { // multi entry ?
                    if (this._isAdSizeArray(adSizeNames)) {
                        return this._processAdSizeData([adSizeNames]);
                    } else {
                        return this._processAdSizeData(adSizeNames);
                    }
                } else { // invalid input
                    //throw error
                    return [];
                }
            },

            _processAdSizeData: function (adSizeNames) {
                return _.reduce(adSizeNames, function (memo, value) {
                    var converted;
                    // am i a string?
                    if (_.isString(value)) {
                        converted = this._getAdSizeFromString(value);
                    } else if (_.isArray(value)) {
                        // let's peek into the array and do some duck typing to see if we might have a valid num array, since this is going to be very likely, want to short-circuit the loop
                        if (this._isAdSizeArray(value)) {
                            converted = value;
                        }
                    }
                    if (converted) {
                        memo.push(converted);
                    }
                    return memo;
                }, [], this);
            },

            _isAdSizeArray: function (value) {
                return value.length === 2 && $.isNumeric(value[0]) && $.isNumeric(value[1]);
            },

            _getAdSizeFromString: function (adSizeName) {
                var size = this.getSize(adSizeName);
                if (!size) {
                    var arr = adSizeName.toLowerCase().split('x');
                    if (arr.length === 2) {
                        arr = [parseInt(arr[0], 10), parseInt(arr[1], 10)];
                        if (this._isAdSizeArray(arr)) {
                            size = arr;
                        }
                    }
                }
                return size;
            },

            _buildAdSizesFromPlacements: function (placementList) {
                var adSizes = [];
                _.each(placementList, function (placement) {
                    var sizes = this._mapAdSizeNamesToActualSizes(placement.getAdSizes());
                    $.merge(adSizes, sizes);
                }, this);
                return _.uniq(adSizes);
            },

            /**
             * Takes the pageTitle from a pageInfo object and returns a clean version of the title, stripped of
             * special characters (i.e. commas, colons, etc.), making it safe for page targeting.
             * @param {string} pageTitle a string, typically of the pageInfo object's seotitle value, that needs to
             * be stripped of special characters
             * @return {string} cleanTitle a clean version of the string, which can be used for targeting without
             * errors in the case of the seotitle from the pageInfo object
             */
            getAdSafePageTitle: function (pageTitle) {
                if (pageTitle) {
                    return pageTitle.replace(/[^\w\s]/g, '');
                }
            },

            /**
             * Takes a pageInfo object and returns a targeting map for ads
             * @param {Object} pageInfo an object representing information about the current asset the ad is targeting
             * @return {Object} the dfp targeting map
             */
            getPageTargeting: function (pageInfo) {
                var siteName = Utils.getNested(window, 'site_vars', 'aws_site_name') || 'usat';
                var sitePage = siteName + '/' + pageInfo.ssts;
                if (pageInfo.templatename === 'fronts/default' && pageInfo.section_name !== 'home') {
                    sitePage += '/front';
                }
                var targeting = {
                    'pageType': pageInfo.basePageType,
                    'referrer': document.referrer,
                    'series': pageInfo.series,
                    'sitepage': sitePage,
                    'title': this.getAdSafePageTitle(pageInfo.seotitle),
                    'topic': pageInfo.topic,
                    'url': window.location.href
                };
                return targeting;
            },

            /**
             * Refreshes a shared ad placement
             * @param {String} adPlacement name of the adPlacement to refresh
             */
            refreshSharedAdPosition: function (adPlacement) {
                var adPlacementInfo = this.activeAdPlacements[adPlacement];
                if (!adPlacementInfo) {
                    AdLogger.logError('AdManager: tried refreshing shared ad position that no longer exists');
                    return;
                }
                _.each(adPlacementInfo.positionMap, function (position) {
                    position.destroyAdPlacement();
                }, this);
                adPlacementInfo.slotInfo.refresh();
            },

            /**
             * Registers a shared ad position. Shared ad positions are a position on the page who's targeting
             * is shared with other ad positions and needs secondary information delivered by the ad
             * to target where on the page the ad is delivered.
             * @param {{getAdPlacement(): String, getAdType(): String, isDefaultPosition(): Boolean}} adObj shared ad position that has a possibility of being filled by the slot
             */
            registerSharedAdPosition: function (adObj) {
                // adUnits of the same name map to a slot
                var adPlacement = adObj.getAdPlacement(),
                    adTypes = adObj.getAdType(),
                    siteUrl = window.location.pathname.substring(1);

                if (siteUrl !== this.siteUrl) {
                    this.siteUrl = siteUrl;
                    _.each(this.activeAdPlacements, function (adPlacementInfo) {
                        if (adPlacementInfo) {
                            AdLogger.logError('Site Url changed, but ad placements were not released: ', adPlacementInfo);
                        }
                    });
                    this.activeAdPlacements = {};
                }

                if (adTypes && !_.isArray(adTypes)) {
                    adTypes = [adTypes];
                }
                if (!adPlacement || !adTypes || !adTypes.length) {
                    AdLogger.logError('AdManager: invalid ad unit registered, adUnit and adType are required', adObj);
                    return;
                }
                var adPlacementInfo = this.activeAdPlacements[adPlacement];
                if (!adPlacementInfo) {
                    this.activeAdPlacements[adPlacement] = adPlacementInfo = {
                        name: adPlacement,
                        positionMap: {},
                        defaultPosition: null,
                        slotInfo: null,
                        numPositions: 0
                    };
                }
                _.each(adTypes, function (adType) {
                    if (adPlacementInfo.positionMap[adType]) {
                        AdLogger.logError('AdManager: invalid ad unit registered, duplicate adType registered', adObj);
                        return;
                    }
                    AdLogger.logInfo('AdManager: registerSharedAdPosition for adPlacement: ' + adPlacement + ' and adType:' + adType);
                    adPlacementInfo.positionMap[adType] = adObj;
                });
                adPlacementInfo.numPositions++;
                if (adObj.isDefaultPosition()) {
                    if (adPlacementInfo.defaultPosition) {
                        AdLogger.logWarn('AdManager: multiple ad placements declared themselves default for adUnit: ' + adPlacement, adObj);
                    } else {
                        adPlacementInfo.defaultPosition = adObj;
                    }
                }
            },

            /**
             * Removes an ad position from the placement list for delivery of ads
             * @param {{getAdPlacement(): String, getAdType(): String, isDefaultPosition(): Boolean}} adObj Shared Ad Position that was registered by registerSharedAdPosition
             */
            destroySharedAdPosition: function (adObj) {
                var adPlacementName = adObj.getAdPlacement(),
                    adTypes = adObj.getAdType(),
                    adPlacementInfo = this.activeAdPlacements[adPlacementName];
                if (!adPlacementInfo) {
                    AdLogger.logError('AdManager: destruction of unknown ad unit', adObj);
                    return;
                }
                if (adTypes && !_.isArray(adTypes)) {
                    adTypes = [adTypes];
                }
                _.each(adTypes, function (adType) {
                    var position = adPlacementInfo.positionMap[adType];
                    if (!position) {
                        AdLogger.logError('AdManager: destruction of unknown ad type', adObj);
                        return;
                    }
                    AdLogger.logInfo('AdManager: destroySharedAdPosition for adPlacement: ' + adPlacementName + ' and adType:' + adType);
                    adPlacementInfo.positionMap[adType] = null;
                });

                if (adObj.isDefaultPosition()) {
                    adPlacementInfo.defaultPosition = null;
                }

                adPlacementInfo.numPositions--;
                if (!adPlacementInfo.numPositions) {
                    if (adPlacementInfo.slotInfo) {
                        adPlacementInfo.slotInfo.destroy();
                    }
                    this.activeAdPlacements[adPlacementName] = null;
                }
            },

            // legacy ad proxy calls

            /**
             * Deprecated createScript call. Left for VCE compatibility and ad calls that require it
             * @deprecated
             * @param {String} id id for the script tag
             * @param {String} src url for the script
             * @param {jQuery} $el jquery element for where the append the script tag
             */
            _createScript: function (id, src, $el) {
                AdLogger.logDebug('Creating script', id, src, $el[0]);
                var script = document.createElement('script');
                script.id = id;
                script.src = src;
                script.type = 'text/javascript';
                script.defer = false;
                // required to be appendChild for vce compatibility
                $el[0].appendChild(script);
            },

            logDebug: function () {
                AdLogger.logDebug.apply(AdLogger, arguments);
            },

            logError: function () {
                AdLogger.logError.apply(AdLogger, arguments);
            },

            logInfo: function () {
                AdLogger.logInfo.apply(AdLogger, arguments);
            },

            logWarn: function () {
                AdLogger.logWarn.apply(AdLogger, arguments);
            }
        };

        return new AdManager();

    }
);
