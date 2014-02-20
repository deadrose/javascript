define([
    'jquery',
    'underscore'
],
    function ($, _) {
        'use strict';

        /**
         * Cache Manager provides easy to use caching/expiration functionality that is backed by the browser's local and session storage
         * with in memory objects for quick access to the variables.
         * @exports managers/cachemanager
         * @author Jay Merrifield <jmerrifiel@gannett.com>
         */
        var CacheManager = function () {
            _.bindAll(this, '_updateCache');
            if (window.addEventListener) {
                window.addEventListener("storage", this._updateCache, false);
            } else {
                window.attachEvent("onstorage", this._updateCache);
            }
            this.reset();
        };
        CacheManager.prototype = {
            keyPrefix: 'wf_',
            reset: function () {
                this._cache = {};
            },
            /**
             * This handles storage updates that happen on different tabs and guarentees that the local cache is updated.
             * It's important to note that this event is only fired for tabs other than the one who changed the local storage
             * @param {StorageEvent} e
             * @private
             */
            _updateCache: function (e) {
                var cacheEntry;
                if (!e) {
                    e = window.event;
                }
                // check if it's our key
                if (e.key && e.key.indexOf(this.keyPrefix) === 0) {
                    if (e.newValue) {
                        cacheEntry = JSON.parse(e.newValue);
                        if (cacheEntry.type !== 'raw') {
                            cacheEntry.data = $.Deferred().resolve(cacheEntry.data);
                        }
                        this._setMemoryCache(e.key, cacheEntry);
                    } else {
                        delete this._cache[e.key];
                    }
                }
            },
            /**
             * Given a key and a generator function, will either retrieve the value from a cache,
             * or run the generator and save the result in the cache.
             * <b>Note!</b> Dates and functions in caching data will be converted to strings
             * @param {String} key - key for the cache value
             * @param {Function|*} generator - function that will create the cached value, or default value to return for cache
             * @param {Number} [timeoutMinutes=0] - number of minutes to cache the value, 0 means store it for the session
             * @returns {Deferred|*}
             */
            getValue: function (key, generator, timeoutMinutes) {
                var cacheEntry, result, isPromise, browserCache = this._getStorage(timeoutMinutes);
                key = this.keyPrefix + key;
                cacheEntry = this._getMemoryCache(key);
                if (!cacheEntry) {
                    cacheEntry = this._getBrowserCache(browserCache, key);
                    if (!cacheEntry) {
                        // trigger generator
                        result = this._getValue(generator);
                        isPromise = this._isPromise(result);
                        cacheEntry = this._buildCacheEntry(result, isPromise, timeoutMinutes);
                        if (isPromise) {
                            result.done(_.bind(function (value) {
                                // build a cache entry for the browser cache that's not a promise, but is labeled a promise for unwrapping later
                                var cacheEntry = this._buildCacheEntry(value, true, timeoutMinutes);
                                this._setBrowserCache(key, cacheEntry, browserCache);
                            }, this));
                        } else {
                            this._setBrowserCache(key, cacheEntry, browserCache);
                        }
                    }
                    this._setMemoryCache(key, cacheEntry);
                }
                return cacheEntry.data;
            },

            /**
             * Given a key and a value, will set that value into the browser and memory cache,
             * <b>Note!</b> Dates and functions in caching data will be converted to strings
             * @param {String} key - key for the cache value
             * @param {Object|String|Number|Date} value - value to set in the cache
             * @param {Number} [timeoutMinutes=0] - number of minutes to cache the value, 0 means store it for the session
             */
            setValue: function (key, value, timeoutMinutes) {
                var isPromise = this._isPromise(value),
                    cacheEntry = this._buildCacheEntry(value, isPromise, timeoutMinutes);
                key = this.keyPrefix + key;
                if (isPromise) {
                    value.done(_.bind(function (value) {
                        var cacheEntry = this._buildCacheEntry(value, true, timeoutMinutes);
                        this._setBrowserCache(key, cacheEntry, this._getStorage(timeoutMinutes));
                    }, this));
                } else {
                    this._setBrowserCache(key, cacheEntry, this._getStorage(timeoutMinutes));
                }
                this._setMemoryCache(key, cacheEntry);
            },

            _isPromise: function (v) {
                return $.isPlainObject(v) && $.isFunction(v.promise);
            },

            /**
             * Returns the correct browser storage for the timeout, no timeout = sessionStorage, timeout = localStorage
             * @param {Number} [timeoutMinutes=0] - number of minutes to cache the value, 0 means store it for the session
             * @returns {Storage}
             * @private
             */
            _getStorage: function (timeoutMinutes) {
                var cacheType = timeoutMinutes ? 'localStorage' : 'sessionStorage';
                return window[cacheType];
            },

            /**
             * Saves the cache entry promise into the local memory cache
             * @param {String} key - key for the cache value
             * @param {CacheEntry} cacheEntry - cache entry wrapped in a promise
             * @private
             */
            _setMemoryCache: function (key, cacheEntry) {
                this._cache[key] = cacheEntry;
            },

            /**
             * @param {String} key - key for the cache value
             * @param {Object} cacheEntry - object to put into the browser cache
             * @param {Storage} browserCache - Where to store the value
             * @private
             */
            _setBrowserCache: function (key, cacheEntry, browserCache) {
                try {
                    browserCache.setItem(key, JSON.stringify(cacheEntry));
                } catch (e) {
                    console.log('Storage Set Failed for key: ' + key);
                }
            },

            /**
             * Given a key and a value, will set that value into the browser and memory cache,
             * <b>Note!</b> Dates and functions in caching data will be converted to strings
             * @param {Object|String|Number|Date} value - value to set in the cache
             * @param {Boolean} isPromise - whether the value is a promise or not
             * @param {Number} [timeoutMinutes=0] - number of minutes to cache the value, 0 means store it for the session
             * @returns {CacheEntry}
             * @private
             */
            _buildCacheEntry: function (value, isPromise, timeoutMinutes) {
                var expirationTime,
                    cacheEntry = {
                        data: value,
                        type: isPromise ? 0 : 'raw'
                    };
                if (timeoutMinutes) {
                    expirationTime = new Date();
                    cacheEntry.expires = expirationTime.setTime(expirationTime.getTime() + (timeoutMinutes * 1000 * 60));
                }
                return cacheEntry;
            },

            /**
             * Clears a cache from browser and memory caches
             * @param {String} key - key for the cache value
             */
            clearValue: function (key) {
                key = this.keyPrefix + key;
                sessionStorage.removeItem(key);
                localStorage.removeItem(key);
                delete this._cache[key];
            },

            /**
             * Given a cache, and a key, will check whether there's a valid promise there, that hasn't expired and return the entry
             * @param {String} key - key for the cache value
             * @returns {CacheEntry}
             * @private
             */
            _getMemoryCache: function (key) {
                var cacheEntry = this._cache[key];
                if (cacheEntry) {
                    // promise checks
                    if (cacheEntry.type !== 'raw') {
                        // async promise cache type
                        if (cacheEntry.data.state() === 'pending') {
                            // always return pending cacheEntries, even if they've expired
                            return cacheEntry;
                        } else if (cacheEntry.data.state() === 'rejected') {
                            // always skip rejected cacheEntries, we don't cache rejected promises
                            return null;
                        }
                    }
                    // expiration checks
                    if (!cacheEntry.expires) {
                        // no expiration, return immediately
                        return cacheEntry;
                    } else if ((new Date()) < new Date(cacheEntry.expires)) {
                        // we have an expires, we aren't pending or rejected, check if the entry has expired
                        return cacheEntry;
                    }
                }
            },
            /**
             * Given a local or session browser cache and a key, will attempt to load up a cache entry and see if it's valid
             * and then return a cache entry
             * @param {Storage} browserCache - browser storage to look into
             * @param {String} key - key for the cache value
             * @returns {CacheEntry}
             * @private
             */
            _getBrowserCache: function (browserCache, key) {
                // check browser cache
                var cacheEntry = browserCache.getItem(key);
                if (cacheEntry) {
                    // save result in memory cache
                    cacheEntry = JSON.parse(cacheEntry);
                    if (!cacheEntry.expires || (new Date()) < new Date(cacheEntry.expires)) {
                        if (cacheEntry.type !== 'raw') {
                            cacheEntry.data = $.Deferred().resolve(cacheEntry.data);
                        }
                        return cacheEntry;
                    }
                }
            },

            /**
             * Given a function or a value, return return the result of the function or the value passed in
             * @param {Function|*} generator - function that will generate a value, or a value
             * @returns {*}
             * @private
             */
            _getValue: function (generator) {
                if (!$.isFunction(generator)) {
                    return generator;
                } else {
                    return generator();
                }
            }

        };
        return new CacheManager();
    });