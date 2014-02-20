define([
    'jquery',
    'underscore',
    'backbone',
    'utils',
    'pubsub'
],
    function ($, _, Backbone, Utils, PubSub) {

        var cidx = window.cidx = window.cidx || 0;

        /**
         * Site-wide ajax handler, captures clicks and form submits and decides whether we can ajaxily load them
         * @exports managers/sitemanager
         * @author Chris Manning
         */
        var SiteManager = Backbone.View.extend(
            /**
             * @lends managers/sitemanager
             */
            {

                // View element.
                el: 'body',

                /**
                 * Initialize view.
                 * @param {Object} options View options passed in during init.
                 */
                initialize: function () {
                    console.log(window.cidx++, '!!!SiteManager.initialize(', ')');

                    // Event Proxy.
                    window.appViewEventProxy = PubSub;
                    window.Utils = Utils;
                    window.siteManager = this;

                    // Set global properties/lookups.
                    this.DEBUG = Utils.get('DEBUG');
                    this.$win = Utils.get('win');
                    this.$top = Utils.get('scrollEl');

                    PubSub.attach(this.pubSub, this);
                },

                start: function (Header, StateManager) {

                    console.log(window.cidx++, '!!!SiteManager.start(', Header, StateManager, ')');

                    // Initialize global header.
                    if (Header) {
                        window.header = this.header = new Header();
                    }
                    // Responsive images plugin.
                    this.$win.on('resize.' + this.cid, _.throttle(function (event) {
                        // Fire resize event.
                        PubSub.trigger('resize:app');
                    }, 50)).trigger('resize');
                    this.$el.on('click.' + this.cid, 'a,area', _.bind(this.triggerRoute, this));
                    this.$el.on('submit.' + this.cid, 'form.ui-ajax-form', _.bind(this.triggerForm, this));

                    this.stateManager = StateManager;
                    StateManager.start();
                },

                /**
                 * Returns an instance of the header
                 */
                getHeader: function () {
                    console.log(window.cidx++, '!!!SiteManager.getHeader(', ')');

                    return this.header;
                },

                /**
                 * Allows you to change the scrolltop with awareness of
                 * the current state of the header, so you don't inadvertently
                 * change from collapsed to expanded by scrolling to the top
                 */
                scrollTop: function (topValue, force) {
                    console.log(window.cidx++, '!!!SiteManager.scrollTop(', topValue, force, ')');

                    if (this.header) {
                        return this.header.scrollTop(topValue, force);
                    }
                    return 0;
                },

                stop: function () {

                    console.log(window.cidx++, '!!!SiteManager.stop(', ')');

                    this.$el.off('.' + this.cid);
                    this.$win.off('.' + this.cid);
                },

                destroy: function () {

                    console.log(window.cidx++, '!!!SiteManager.destroy(', ')');

                    this.undelegateEvents();
                    if (window.header) {
                        delete window.header;
                    }
                    delete window.appViewEventProxy;
                    delete window.Utils;
                    PubSub.unattach(this.pubSub, this);
                },

                /**
                 * Handle global links.
                 * @param {Event} e Link click event.
                 */
                triggerRoute: function (e) {
                    console.log(window.cidx++, '!!!SiteManager.triggerRoute(', e, ')');

                    var href, $targetLink = $(e.currentTarget);
                    Utils.setTrack($targetLink);
                    this.stateManager.updateActivityTimestamp();
                    if (!this._isAjaxEligibleClickEvent(e)) {
                        // not an option to use ajax, so let it hit the browser
                        return;
                    }
                    href = $.trim($targetLink.attr('href'));

                    var navWarning = this.stateManager.getActivePageInfo().navigationWarning;
                    if (navWarning && href[0] !== "#") {
                        if (!window.confirm(navWarning)) {
                            e.preventDefault();
                            return;
                        }
                    }

                    if (!Modernizr.history) {
                        if (Utils.getDefinedRoute(href) && window.chromeless) {
                            // reattach ?chromeless=true to internal urls
                            href = $.trim($targetLink.attr('href'));
                            href += ((href.indexOf('?') === -1) ? '?' : '&') + 'chromeless=true';
                            $targetLink.attr('href', href);
                        }
                    } else {
                        if (!Utils.isValidUrl(href)) {
                            e.preventDefault();
                        } else if (href[0] === '#') {
                            var offset = $('a[name=' + href.substring(1) + ']').offset();
                            if (offset && offset.top) {
                                this.$top.scrollTop(offset.top - 40);
                            }
                            e.preventDefault();
                        } else {
                            href = Utils.getDefinedRoute(href);
                            if (href !== null) {
                                if (window.chromeless) {
                                    // reattach ?chromeless=true to internal urls
                                    href += ((href.indexOf('?') === -1) ? '?' : '&') + 'chromeless=true';
                                }
                                Backbone.history.navigate(href, {trigger: true});
                                e.preventDefault();
                            }
                        }
                    }
                },

                /**
                 * Checks to see if the click event should be handled by ajax handler or not
                 * @param {MouseEvent} e click event
                 * @private
                 */
                _isAjaxEligibleClickEvent: function (e) {
                    console.log(window.cidx++, '!!!SiteManager._isAjaxEligibleClickEvent(', e, ')');

                    var target, $targetLink = $(e.currentTarget);
                    if (!$targetLink.length || e.isDefaultPrevented() || e.metaKey || e.ctrlKey || e.altKey || e.which == 2) {
                        return false;
                    }
                    target = $targetLink.attr('target');
                    if (target) {
                        // treat target=_popup (which is invalid HTML) and target=_blank with a data-popup attribute the same
                        if (target === '_popup' || (target === '_blank' && $targetLink.data('popup') !== undefined)) {
                            Utils.openPopup($.trim($targetLink.attr('href')), $targetLink.data('popup-width'), $targetLink.data('popup-height'));
                            // while we aren't ajaxing to this, we do have to preventDefault to avoid an actual navigation event
                            e.preventDefault();
                        }
                        return false;
                    }
                    return true;
                },

                /**
                 * Handle global search form submits.
                 * @param {Event} e Link click event.
                 */
                triggerForm: function (e) {
                    console.log(window.cidx++, '!!!SiteManager.triggerForm(', e, ')');

                    var form = $(e.currentTarget),
                        mappingData = form.data('mapping'),
                        templateObj = {},
                        url = form.attr('action');
                    if (e.isDefaultPrevented()) {
                        return;
                    }
                    if (mappingData) {
                        $.each(form.serializeArray(), function (index, value) {
                            templateObj[value.name] = value.value;
                        });
                        url += _.template(mappingData, templateObj);
                    }
                    if (!Utils.isValidUrl(url)) {
                        e.preventDefault();
                    } else {
                        url = Utils.getDefinedRoute(url);
                        if (url !== null) {
                            if (window.chromeless) {
                                // reattach ?chromeless=true to internal urls
                                url += ((url.indexOf('?') === -1) ? '?' : '&') + 'chromeless=true';
                            }
                            Backbone.history.navigate(url, {trigger: true});
                            e.preventDefault();
                        }
                    }

                }

            });

        /**
         * Return view class.
         */
        return new SiteManager();
    });
