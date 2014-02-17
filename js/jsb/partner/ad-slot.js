/**
 * @classdesc Our wrapper around gpt's ad slot, includes monitoring the slot and event capture
 * @author Jay Merrifield <jmerrifiel@gannett.com>
 */
/*global googletag:true*/
define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'adLogger'
],
function(
    $,
    _,
    BaseView,
    StateManager,
    AdLogger
) {
    'use strict';
    /**
     * View class.
     */
    var AdSlot = BaseView.extend({
        className: 'ad-slot',
        id: function() {
            return _.uniqueId('ad-slot-' + this.options.adUnit.replace(/\//g, '-') + '-');
        },

        events: {
            'partnersetup': 'onHighImpactAdLoad'
        },

        initialize: function(options) {
            options = $.extend({
                adUnit: null, // required parameter!!
                targeting: {},
                sizes: [], // ad sizes for this slot
                type: 'in',
                onSlotRender: null,
                onSlotEmpty: null,
                overrideTargeting: null,
                position: null // required!
            }, options);

            if (!this.$el.length) {
                AdLogger.logError('AdSlot(' + this.options.adUnit + '): Unable to request ad because no $el provided');
                return;
            }

            options.position.append(this.$el);
            // when you don't provide an el, delegateEvents doesn't fire by default, so fire it after placing it on the dom

            this.gptSlot = null;
            this.slotId = this.$el.prop('id');
            this.adDeliveryData = null;

            BaseView.prototype.initialize.call(this, options);

            this._buildGptSlot();
        },

        _buildGptSlot: function(){
            if (StateManager.getActivePageInfo().noadvertising) {
                AdLogger.logInfo('AdSlot(' + this.options.adUnit + '): blocked because of noadvertising flag in pageinfo');
                return;
            }

            if (this.options.type === 'in') {
                this._registerSlotWithGoogle(this.options.adUnit, this.options.sizes, this.slotId, this.options.targeting);
            } else {
                this._registerOutOfPageSlotWithGoogle(this.options.adUnit, this.slotId, this.options.targeting);
            }
        },

        destroy: function() {
            this.adData = null;
            if (this.gptSlot) {
                // break the references to us until we can tell gpt to destroy this slot
                this.gptSlot.renderEnded = this.gptSlot.origRenderEnded;
            }
            this.destroyed = true;
            this.gptSlot = null;
            BaseView.prototype.destroy.call(this, true);
        },

        refresh: function() {
            if (this.destroyed) {
                return;
            }
            this.adData = null;
            if (!this.$el.closest('body').length) {
                // if we've been removed or detached, reappend ourselves to the original position
                this.options.position.append(this.$el);
            }
            // reattach events incase our element was removed and readded to the dom
            this.delegateEvents();
            if (!this.gptSlot) {
                this._buildGptSlot();
            } else if (window.googletag && !StateManager.getActivePageInfo().noadvertising) {
                window.googletag.pubads().refresh([this.gptSlot]);
                AdLogger.logInfo('AdSlot(' + this.options.adUnit + '): Ad refreshed for slot', this.gptSlot);
            }
        },

        onHighImpactAdLoad: function(event, params) {
            var adData = null;
            if (params && params.data) {
                adData = params.data;
            } else if (event.originalEvent && event.originalEvent.data) {
                adData = event.originalEvent.data;
            } else {
                AdLogger.logError('AdSlot(' + this.options.adUnit + '): Found a high impact ad, can\'t find the data object from the iFrame', arguments);
                return;
            }
            if (!adData || !adData.adType) {
                AdLogger.logError('AdSlot(' + this.options.adUnit + '): high impact event received, but invalid data object was given', adData);
                return;
            }
            this.adData = adData;
            var adType = this._normalizeAdType(adData.adType);
            this.options.onSlotRender(adData, adType);
        },

        _normalizeAdType: function(adType) {
            if (!adType) {
                return null;
            } else if (adType === 'Live Feed Takeover') {
                return 'livefeed';
            } else {
                return adType.toLowerCase().replace(/[^a-z]/, '');
            }
        },

        _registerOutOfPageSlotWithGoogle: function(adUnit, slotId, targeting) {
            if (!window.googletag) {
                return;
            }
            googletag.cmd.push(_.bind(function() {
                AdLogger.logInfo('AdSlot(' + this.options.adUnit + '): registering out of page slot with google ' + adUnit);
                this.gptSlot = googletag.defineOutOfPageSlot(adUnit, slotId).addService(googletag.pubads());
                this._setTargeting(this.gptSlot, targeting);
                // this command makes no sense, but slots don't work without it
                googletag.display(slotId);
                this._setupSlotRenderedCallback(this.gptSlot);
                this._refreshNewSlot();
            }, this));
        },

        _refreshNewSlot: function() {
            // we add a delay to clear the callstack for initial page loads, so we don't accidentally refresh ads too soon
            _.defer(_.bind(function() {
                if (!this.destroyed) {
                    googletag.pubads().refresh([this.gptSlot]);
                }
            }, this));
        },

        _registerSlotWithGoogle: function(adUnit, sizes, slotId, targeting) {
            if (!window.googletag) {
                return;
            }
            googletag.cmd.push(_.bind(function() {
                AdLogger.logGroup('AdSlot ' + this.options.adUnit);
                AdLogger.logInfo('registering slot with google ' + adUnit + ' sizes', sizes);
                this.gptSlot = googletag.defineSlot(adUnit, sizes, slotId).addService(googletag.pubads());
                this._setTargeting(this.gptSlot, targeting);
                // this command makes no sense, but slots don't work without it
                googletag.display(slotId);
                this._setupSlotRenderedCallback(this.gptSlot);
                this._refreshNewSlot();
                AdLogger.logGroupEnd();
            }, this));
        },

        _setupSlotRenderedCallback: function(gptSlot) {
            // swap out the gpt slot's renderEnded function with our own so we're notified when the ad is delivered
            gptSlot.origRenderEnded = gptSlot.renderEnded;
            gptSlot.renderEnded = _.bind(function() {
                _.defer(_.bind(function(){
                    var iframe;
                    if (this.gptSlot && !this.adData){
                        iframe = this.$('iframe').eq(0);
                        // this is for IAB ads, gpt usually hides $el if there's no ad, but sometimes it delivers a tiny little ad we should ignore
                        if (this.$el.css('display') !== 'none' && parseInt(iframe.prop('width'), 10) > 10 && parseInt(iframe.prop('height'), 10) > 10) {
                            this.options.onSlotRender();
                        } else {
                            AdLogger.logInfo('AdSlot(' + this.options.adUnit + '): No Ad Delivered');
                            if (this.options.onSlotEmpty) {
                                this.options.onSlotEmpty();
                            }
                        }
                    }
                }, this));
                gptSlot.origRenderEnded.apply(gptSlot, arguments);
            }, this);
        },

        setTargeting: function(targeting) {
            if (this.gptSlot) {
                this.gptSlot.clearTargeting();
                this._setTargeting(this.gptSlot, targeting);
            }
        },

        _setTargeting: function(gptSlot, targeting) {
            _.each($.extend(targeting, this.options.overrideTargeting), function(value, key) {
                if (value) {
                    gptSlot.setTargeting(key, value);
                    AdLogger.logInfo('set targetting - key:' + key + ' value:' + value);
                }
            }, this);
        }
    });
    return AdSlot;
});