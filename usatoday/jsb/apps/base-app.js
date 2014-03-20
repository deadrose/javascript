define(['jquery',
    'underscore',
    'baseview',
    'state',
    'managers/trafficcop',
    'utils',
    'pubsub'
],
function(
    $,
    _,
    BaseView,
    StateManager,
    TrafficCop,
    Utils,
    PubSub
) {
    'use strict';
    /**
     * @event page:load
     * @desc This event is fired on each page load including ajax loads once the page has fully initialized.
     * Is given a .pageInfo object
     * @type {PageInfo}
     */
        var BaseApp = BaseView.extend(
        /**
         * @lends base-app.prototype
         */
        {
            currentPath: '',

            /**
             * @classdesc Base App providing basic function like revealApp, removeApp, changePage
             * An app is a stateful container that could persist between url changes. When an app is active, it
             * owns all the interactions of the markup on the page. A page is a stateless child of an app, and
             * corresponds with a single unique path that will be destroyed when changing to a new path.
             * Examples:<br/>
             *     App: Cards, Page: GenericSection<br/>
             *     App: Overlay, Page: Story
             * @requires state
             * @author Jay Merrifield <jmerrifiel@gannett.com>
             * @constructs base-app
             * @param {Object} options statemanager provided backbone options object
             *      @param {jQuery|Element|String} options.el element or string selector to attach to
             */
            initialize: function(options){
                this._animId = 0;
                this.$top = Utils.get('scrollEl');
                this.appRevealed = false;
                // call base class initialize
                BaseView.prototype.initialize.call(this, options);
            },

            /**
             * This returns true or false depending on whether the app has successfully revealed itself
             * @return {Boolean}
             */
            isRevealed: function(){
                return this.appRevealed;
            },

            /**
             * This is a function that will decide how to animate the reveal of this app
             * @param {String} fromUrl path of the view going away
             * @param {String} toUrl path of the view we're going to
             * @param {Deferred} requestPromise Promise object that will resolve the ajax request is complete
             * @param {Deferred} resourcePromise Promise object that will resolve when the modules request is complete
             * @param {Boolean} [paused] variable specifying if the view should load up in a paused state
             * @private
             * @return {Deferred} promise object that will resolve when reveal is complete
             */
            revealApp: function(fromUrl, toUrl, requestPromise, resourcePromise, paused) {
                // so we are going to find ourselves in a couple of scenarios here,
                // 1: requestPromise is null, cause it's an initial render, very little to do
                // 2: requestPromise has resolved with the html we want to render, animate directly to html
                // 3: requestPromise isn't ready, but we have an Reveal App Loader, animate in the loader, cross fade to final content!
                // 4: requestPromise isn't ready, and there is no reveal app loader, wait until request is done, cross fade to final content
                var el, requestInfo = {
                    fromUrl: fromUrl,
                    toUrl: toUrl,
                    animId: this._animId,
                    resourcePromise: resourcePromise,
                    modulePromise: $.Deferred(),
                    paused: paused
                };
                this.currentPath = toUrl;
                if (!requestPromise) {
                    // scenario 1, initial load, yippy!
                    el = $('.site-header').next();
                    if (!el.length) {
                        // handle standalone pages with no header
                        el = $('body').children().eq(0);
                    }
                    this.setElement(el);
                    this._fetchPageModules($.Deferred().resolve(this.$el), resourcePromise, requestInfo, paused);
                    this._triggerBeforePageReveal(this.$el, requestInfo);
                    this._triggerAfterPageReveal(requestInfo);
                    return $.Deferred().resolve();
                } else if (requestPromise.state() === 'rejected') {
                    return requestPromise;
                } else {
                    this._fetchPageModules(requestPromise, resourcePromise, requestInfo, paused);

                    // we have a request which will eventually contain new html
                    var revealCompleteDeferred = $.Deferred();
                    if (requestPromise.state() === 'resolved') {
                        // scenario 2, we have html to render immediately, go go captain planet
                        requestPromise.done(_.bind(function(htmlFrag) {
                            this._revealAppMarkup(htmlFrag, requestInfo, revealCompleteDeferred);
                        }, this));
                    } else {
                        var loaderHtml = this.getRevealAppLoader(toUrl);
                        if (loaderHtml) {
                            // scenario 3, render reveal app loader
                            if (!(loaderHtml instanceof $)){
                                loaderHtml = $(loaderHtml);
                            }
                            this._revealAppMarkup(loaderHtml, requestInfo, revealCompleteDeferred, requestPromise);
                        } else {
                            // scenario 4, we have to wait on a generic loader, sad panda!
                            this._triggerGenericLoader(requestPromise);
                            requestPromise.done(_.bind(function(htmlFrag) {
                                this._revealAppMarkup(htmlFrag, requestInfo, revealCompleteDeferred);
                            }, this));
                        }
                        requestPromise.fail(function(){
                            revealCompleteDeferred.reject();
                        });
                    }
                    return revealCompleteDeferred.promise();
                }
            },

            _fetchPageModules: function(requestPromise, resourcePromise, requestInfo, paused) {
                $.when(requestPromise, resourcePromise).done(_.bind(function(htmlFrag) {
                    // only want to pull in the modules when the resource promise is done
                    // cause it will most likely have the js files
                    if (requestInfo.animId === this._animId) {
                        this.pageInfo = this._getPageInfo(htmlFrag);
                        if (paused) {
                            requestInfo.modulePromise.resolve();
                        } else {
                            this.fetchPageModules(this.pageInfo).done(function(moduleList) {
                                requestInfo.modulePromise.resolve(moduleList);
                            });
                        }
                    }
                }, this));
            },

            /**
             * inserts the app  markup in a hidden & undelegated state
             * @param {jQuery} htmlFrag the dom to be loaded
             * @param {Boolean} paused specifying whether the markup is being loaded in a paused/preloaded state
             * @private
             */
            _insertAppMarkup: function(htmlFrag, paused){
                var header = $('.site-header');
                htmlFrag.hide();
                this.setElement(htmlFrag, false);
                this.$el.insertAfter(header);
                if (paused) {
                    this.setFixedPosition(header.outerHeight());
                }
            },

            /**
             * Triggers an internal page transition
             * @param {String} fromUrl path of the view going away
             * @param {String} toUrl path of the view we're going to
             * @param {Deferred} requestPromise Promise object that will resolve the ajax request is complete
             * @param {Deferred} resourcePromise Promise object that will resolve when the modules request is complete
             * @param {Boolean} [paused] variable specifying if the view should load up in a paused state
             * @private
             * @return {Deferred} promise object that will resolve when changePage is complete
             */
            changePage: function(fromUrl, toUrl, requestPromise, resourcePromise, paused){
                var requestInfo = {
                    fromUrl: fromUrl,
                    toUrl: toUrl,
                    animId: ++this._animId,
                    resourcePromise: resourcePromise,
                    modulePromise: $.Deferred(),
                    paused: paused
                };
                // destroy existing modules so new ones can be instantiated
                // this function is up for debate, when does this get called? who's responsible for calling it?
                this.destroyModules();

                var animationPromise = null;
                if (requestPromise) {
                    this._fetchPageModules(requestPromise, resourcePromise, requestInfo, paused);
                    animationPromise = this.animateChangePagePreData(fromUrl, toUrl);
                } else if (paused) {
                    requestInfo.modulePromise.resolve();
                } else {
                    this.fetchPageModules(this.pageInfo).done(function(moduleList){
                        requestInfo.modulePromise.resolve(moduleList);
                    });
                }
                this.currentPath = toUrl;
                if (!animationPromise){
                    // no animationPromise, generally section -> sub section, or closing overlay/fullscreen
                    if (requestPromise){
                        // we're requesting new information that needs to be swapped in
                        this._triggerGenericLoader(requestPromise);
                        return this._finishChangePage(requestPromise, requestInfo);
                    } else {
                        // No request, no animationPromise, means markup is in the correct place for the path, just need to initialize the JS
                        this._triggerBeforePageReveal(this.$el, requestInfo);
                        return this._triggerAfterPageReveal(requestInfo);
                    }
                } else {
                    if (requestPromise){
                        animationPromise = $.when(requestPromise, animationPromise);
                    }
                    return this._finishChangePage(animationPromise, requestInfo);
                }
            },
            /**
             * Sets up the overridable global loader for the request in progress
             * @param {Deferred} requestPromise promise representing the ajax request
             * @private
             */
            _triggerGenericLoader: function(requestPromise){
                if (requestPromise.state() === 'pending'){
                    this.activateLoader();
                    requestPromise.always(_.bind(function(){
                        this.deactivateLoader();
                    }, this));
                }
            },
            /**
             * Completes an internal page transition, triggering the appropriate events after animation is done
             * @param {Deferred} transitionPromise promise that represents the current process we're waiting on
             * @param {{fromUrl: String, toUrl: String, animId: Number, paused: Boolean, resourcePromise: Deferred, modulePromise: Deferred}} requestInfo an object that represents the fromUrl, toUrl, resourcePromise, animId, and paused state
             * @return {Deferred} promise that will resolve when the transition is complete
             * @private
             */
            _finishChangePage: function(transitionPromise, requestInfo) {
                var finishChangePagePromise = $.Deferred();
                transitionPromise.done(_.bind(function(htmlFrag) {
                    if (requestInfo.animId !== this._animId) {
                        return;
                    }
                    this._triggerBeforePageReveal(htmlFrag, requestInfo);
                    var animationPromise = this.animateChangePagePostData(requestInfo.fromUrl, requestInfo.toUrl, htmlFrag, requestInfo.paused);
                    if (requestInfo.paused) {
                        this.setFixedPosition(this.$el.offset().top);
                    }
                    if (animationPromise) {
                        animationPromise.done(_.bind(function() {
                            this._triggerAfterPageReveal(requestInfo).done(function() {
                                finishChangePagePromise.resolve();
                            });
                        }, this));
                    } else {
                        this._triggerAfterPageReveal(requestInfo).done(function() {
                            finishChangePagePromise.resolve();
                        });
                    }
                }, this));
                return finishChangePagePromise.promise();
            },
            swapContent: function(fadeOut, fadeIn, immediate, hashTag) {
                if (this.isSafari5 || this.isApple || immediate) {
                    // safari and apple can't deal with the fade, so we just snap them into place
                    fadeIn.insertAfter(fadeOut);
                    fadeOut.remove();
                    return $.Deferred().resolve();
                } else {
                    var scrollPosition = fadeOut.css('top') || 0;
                    scrollPosition -= Utils.getScrollPosition();
                    fadeIn.css({'z-index': 100});
                    fadeOut.css({position: 'absolute', 'z-index': 101, opacity: 1, top: scrollPosition});
                    fadeIn.insertAfter(fadeOut);
                    if (hashTag) {
                        var offset = fadeIn.find('a[name=' + hashTag + ']').offset();
                        if (offset && offset.top) { // why scrollTop(0) twice?
                            this.$top.scrollTop(offset.top - this.$el.offset().top);
                        }
                    }
                    return this.animate(fadeOut, 'opacity', 0, this.options.animations.fadeIn.duration).always(function() {
                        fadeIn.css({'z-index': ''});
                        fadeOut.remove();
                    });
                }
            },
            pause: function() {
                this.destroyModules(false, true);
            },
            /**
             * Helper function that inserts the html markup on the page for new app reveals
             * Will call afterPageReveal when the reveal animation and request are done.
             * If requestPromise is provided, that means htmlFrag is a temporary loader, and the final
             * content is still coming
             * @param {jQuery} htmlFrag jQuery object representing either the actual content to load or a temporary loader to reveal
             * @param {{fromUrl: String, toUrl: String, animId: Number, paused: Boolean, resourcePromise: Deferred}} requestInfo an object that represents the fromUrl, toUrl, resourcePromise, animId, and paused state
             * @param {Deferred} revealCompleteDeferred this is the deferred that indicates when the entire reveal is done
             * @param {Deferred} [requestPromise] promise for the ajax request if one is still in progress
             * @private
             */
            _revealAppMarkup: function(htmlFrag, requestInfo, revealCompleteDeferred, requestPromise) {
                if (requestInfo.animId !== this._animId){
                    return;
                }
                if (!requestPromise) {
                    this._triggerBeforePageReveal(htmlFrag, requestInfo);
                }
                this._insertAppMarkup(htmlFrag, requestInfo.paused);
                var animationPromise = this.animateRevealApp(requestInfo.fromUrl, requestInfo.toUrl, requestInfo.paused);
                TrafficCop.addAnimation(animationPromise);
                animationPromise.done(_.bind(function() {
                    if (!requestPromise) {
                        // we just animated in the real content, fire the post events
                        this._triggerAfterPageReveal(requestInfo).done(function(){
                            revealCompleteDeferred.resolve();
                        });
                    } else {
                        // we're still waiting on a request to finish
                        // this means we've loaded a temporary loader and need to swap the loader with real content
                        requestPromise.done(_.bind(function(htmlFrag) {
                            if (requestInfo.animId !== this._animId) {
                                return;
                            }
                            this._triggerBeforePageReveal(htmlFrag, requestInfo);
                            var promise = this.swapContent(this.$el, htmlFrag, requestInfo.paused, this.getHash(requestInfo.toUrl));
                            this.setElement(htmlFrag, false);
                            if (requestInfo.paused) {
                                this.setFixedPosition(this.$el.offset().top);
                            }
                            promise.done(_.bind(function(){
                                this._triggerAfterPageReveal(requestInfo).done(function() {
                                    revealCompleteDeferred.resolve();
                                });
                            }, this));
                        }, this));
                    }
                }, this));
            },
            getHash: function(url) {
                var idx = url.indexOf('#');
                if (idx !== -1) {
                    return url.substring(idx + 1);
                }
                return null;
            },
            /**
             * This waits for the resource promise to be completed and calls the afterPageReveal event with the
             * correct ViewClass. This also delegates Events if the fromUrl is not null
             * @param {{fromUrl: String, toUrl: String, animId: Number, paused: Boolean, resourcePromise: Deferred, modulePromise: Deferred}} requestInfo an object that represents the fromUrl, toUrl, resourcePromise, animId, and paused state
             * @return {Deferred} jquery promise object
             * @private
             */
            _triggerAfterPageReveal: function(requestInfo) {
                this.appRevealed = true;
                return $.Deferred(_.bind(function(defer) {
                    $.when(requestInfo.resourcePromise, requestInfo.modulePromise).done(_.bind(function(resourceResult, prestoModules) {
                        if (requestInfo.animId !== this._animId) {
                            return;
                        }
                        if (!requestInfo.paused) {
                            if (requestInfo.fromUrl !== null){
                                this.delegateEvents();
                                this._updatePageTitle();
                            }
                            if (resourceResult && resourceResult.length > 1) {
                                // load resources first, then presto modules
                                this._initModules(resourceResult[1].concat(prestoModules || []));
                            } else {
                                this._initModules(prestoModules);
                            }
                        }
                        try {
                            this.afterPageReveal(requestInfo.fromUrl, requestInfo.toUrl, requestInfo.paused, resourceResult && resourceResult[0]);
                        } catch (ex) {
                            console.error('View threw an exception on afterPageReveal event: ', (ex.stack || ex.stacktrace || ex.message));
                        }
                        if (!requestInfo.paused) {
                            this.trackPageLoad(this.pageInfo);
                        }
                        defer.resolve();
                    }, this));
                }, this)).promise();
            },
            /**
             * Fires callback to beforePageReveal
             * @param {jQuery} htmlFrag object with the html fragment we're rendering
             * @param {{fromUrl: String, toUrl: String, animId: Number, paused: Boolean, resourcePromise: Deferred}} requestInfo an object that represents the fromUrl, toUrl, resourcePromise, animId, and paused state
             * @private
             */
            _triggerBeforePageReveal: function(htmlFrag, requestInfo) {
                try {
                    this.beforePageReveal(requestInfo.fromUrl, requestInfo.toUrl, htmlFrag, requestInfo.paused);
                } catch (ex) {
                    console.error('View threw an exception on beforePageReveal event: ', (ex.stack || ex.stacktrace || ex.message));
                }
            },
            /**
             * Update the current title from the pageInfo object
             * @private
             */
            _updatePageTitle: function(){
                // reset the old pageInfo object
                // this is set to broken so if setPage fails, we have a record of it being bad
                if('None' === (this.pageInfo.seotitle || 'None')) {
                    //Site_config guard
                    var display_name = window.site_config.display_name;

                    if(display_name) {
                        document.title = display_name;
                    }
                } else {
                    document.title = this.pageInfo.seotitle;
                }
            },
            /**
             * This is a function that will decide how to animate the removal of this app
             * @param {String} fromUrl path of where we're transitioning from
             * @param {String} toUrl path of the view we're going to
             * @private
             * @return {Deferred} promise object that will resolve when removal is complete
             */
            removeApp: function(fromUrl, toUrl){
                var removalPromise = $.Deferred();
                try{
                    this._animId++;
                    this.beforeAppRemove(fromUrl, toUrl);
                    this.destroyModules(false);
                    // defer the animation, to give the dom time to settle down
                    _.defer(_.bind(function(){
                        this._triggerAnimateRemoveApp(fromUrl, toUrl, removalPromise);
                    }, this));
                }catch(ex){
                    console.error('View threw an exception trying to removeApp: ', (ex.stack || ex.stacktrace || ex.message));
                    removalPromise.resolve();
                }
                removalPromise.always(_.bind(function(){
                    try{
                        this.afterAppRemove(fromUrl, toUrl);
                    }catch(ex){
                        console.error('View threw an exception on afterAppRemove event: ', (ex.stack || ex.stacktrace || ex.message));
                    }
                    this._safeDestroy();
                }, this));
                return removalPromise.promise();
            },
            _triggerAnimateRemoveApp: function(fromUrl, toUrl, removalPromise){
                try{
                    var animationPromise = this.animateRemoveApp(fromUrl, toUrl);
                    TrafficCop.addAnimation(animationPromise).always(function(){
                        removalPromise.resolve();
                    });
                }catch(ex){
                    console.error('View threw an exception on animateRemoveApp: ', (ex.stack || ex.stacktrace || ex.message));
                    removalPromise.resolve();
                }
            },
            /**
             * Destroys the current app, and removes the markup, will never throw an exception
             * @private
             */
            _safeDestroy: function(){
                try{
                    this.destroy(true);
                }catch(ex){
                    console.error('View threw an exception on destroy: ', (ex.stack || ex.stacktrace || ex.message));
                    this.$el.remove();
                }
            },

            _getPageInfo: function(htmlFrag) {
                var pageInfo = {};
                try {
                    pageInfo = this.parsePageInfo(htmlFrag) || {};
                } catch(ex) {
                    console.error('Failed parsing pageInfo', (ex.stack || ex.stacktrace || ex.message));
                }
                return pageInfo;
            },

            getWindowOffset: function(){
                if (this.el) {
                    return this.el.getBoundingClientRect();
                }
                return {top: 0, left: 0};
            },

            /**************************************************************
             * Action functions (animation, fixed positioning)
             **************************************************************/

            /**
             * Overridable function that can change how the current app animates in
             * @param {String} fromUrl path we're animating from
             * @param {String} toUrl path we're animating to
             * @param {Boolean} paused specifying if the web load is a preload or not
             * @return {Deferred} jQuery promise object that will resolve when reveal animation is complete
             */
            animateRevealApp: function(fromUrl, toUrl, paused){
                if (this.isApple && paused){
                    return $.Deferred().resolve();
                }else{
                    return this.show(true);
                }
            },

            /**
             * Overridable function that can change how the current view animates out
             * @param {String} fromUrl path we're animating from
             * @param {String} toUrl path we're animating to
             * @return {Deferred} Promise object that will resolve when removal animation is complete
             */
            animateRemoveApp: function(fromUrl, toUrl){
                return this.hide(true);
            },

            /**
             * animates page to page within an app
             * @param {String} fromUrl path we're leaving
             * @param {String} toUrl path we're about to go to
             * @return {Deferred} a promise object that resolves when the animation is complete
             */
            animateChangePagePreData: function(fromUrl, toUrl){
                // no op, defaults to no animation
            },

            /**
             * Overridable, Given html fragment, animates it into place
             * @param {String} fromUrl
             * @param {String} toUrl
             * @param {jQuery} htmlFrag
             * @param {Boolean} paused
             * @return {Deferred} promise object that will resolve when the animation is done
             */
            animateChangePagePostData: function(fromUrl, toUrl, htmlFrag, paused){
                var promise = this.swapContent(this.$el, htmlFrag, paused, this.getHash(toUrl));
                this.setElement(htmlFrag, false);
                return promise;
            },
            /**
             * Sets the app into a fixed position so an overlay can be placed on top of it
             * @param {Number} offset current scroll position
             * @param {Boolean} [partialCover] specifies whether the overlay is fully covering this view
             */
            setFixedPosition: function(offset, partialCover){
                if (!partialCover && (this.isSafari5 || this.isApple)){
                    this.$el.hide();
                } else {
                    this.$el.css({position: 'fixed', 'top': offset});
                }
            },
            /**
             * Clears the fixed positioning of app
             * @param {Boolean} partialCover specifies whether the overlay is fully covering this view
             */
            clearFixedPosition: function(partialCover) {
                if (!partialCover && (this.isSafari5 || this.isApple)) {
                    this.$el.show();
                } else {
                    this.$el.css({position: '', 'top': ''});
                }
            },
            /**
             * Triggers a generic app level loader
             */
            activateLoader: function() {
            },
            /**
             * Turns off a generic app level loader
             */
            deactivateLoader: function() {
            },

            /**************************************************************
             * Event Callbacks
             **************************************************************/

            /**
             * Gets called before the transition and removal of the current app.
             * This only gets called when the current transition will trigger a removal of this app
             * @param {String} fromUrl path we're leaving
             * @param {String} toUrl path we're about to go to
             */
            beforeAppRemove: function(fromUrl, toUrl){
                //no op
            },
            /**
             * Gets called after the transition and before the removal/destruction of the current app.
             * @param {String} fromUrl path we're leaving
             * @param {String} toUrl path we're about to go to
             */
            afterAppRemove: function(fromUrl, toUrl){
                //no op
            },
            /**
             * Called before new content is animated in or revealed.
             * This can be called when this view is created, or when transitioning within the view
             * @param {String} fromUrl path we're leaving
             * @param {String} toUrl path we're about to go to
             * @param {jQuery} htmlFrag that's about to be placed on the page
             * @param {Boolean} paused variable specifying if the view should load up in a paused state
             */
            beforePageReveal: function(fromUrl, toUrl, htmlFrag, paused){
                //no op
            },
            /**
             * Called after new content has been successfully animated in or revealed.
             * This can be called when this view is created, or when transitioning within the view
             * @param {String} fromUrl path we're leaving
             * @param {String} toUrl path we're about to go to
             * @param {Boolean} paused variable specifying if the view should load up in a paused state
             * @param {function} [PageClass] optional view class, requested by overriding getPageRequirements()
             */
            afterPageReveal: function(fromUrl, toUrl, paused, PageClass){
                if (PageClass){
                    this.subviews.page = new PageClass({
                        el: this.$el
                    });
                }
            },
            /**
             * Gets the html for a temporary app reveal loader
             * @param {String} toUrl path we're going to
             */
            getRevealAppLoader: function(toUrl){
                return '<section class="ui-loading dark-medium ui-app-loader"></section>';
            },
            /**
             * Called when an overlay is about to be removed (closed) on top of this app. Added
             * @param {String} toUrl param so that the section nav could be updated properly when overlay is
             * closed.
             */
            beforeOverlayRemove: function(toUrl){

            },
            /**
             * Called when an overlay has finished animating in (opening) over this app
             * @param {Number} offset Scroll offset top of this view
             */
            afterOverlayReveal: function(offset){

            },
            /**
             * Gets custom redisClient side information from the current app
             */
            getClientAdInfo: function() {

            },
            /**
             * Overridable analytics callback on new page requests. This gets called immediately after beforePageReveal event
             */
            parsePageInfo: function(htmlFrag) {
                var pageInfo = JSON.parse(htmlFrag.find('.pageinfo').eq(0).html()) || {};
                if (!pageInfo.templatetype){
                    pageInfo.templatetype = '';
                }
                if (!pageInfo.url){
                    pageInfo.url = Utils.getPageUrl();
                }
                return pageInfo;
            },
            fetchPageModules: function(pageInfo) {
                return StateManager.fetchPageModules(pageInfo.js_modules);
            },
            /**
             * @fires page:load
             * @param {PageInfo} pageInfo
             */
            trackPageLoad: function(pageInfo) {
                // stash the pageInfo object in case it changes before we are allowed to fire page:load
                _.defer(function() {
                    TrafficCop.getAnimationCompletion().done(function() {
                        // don't fire this until all animations are complete
                        PubSub.trigger('page:load', pageInfo);
                    });
                });
            }
        });
        return BaseApp;
    }
);
