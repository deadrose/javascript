/**
 * @fileoverview Module Update (based on live-feed)
 * @author kklee@usatoday.com (Kent Lee)
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'utils',
    'pubsub'
],
function(
    $,
    _,
    BaseView,
    StateManager,
    Utils,
    PubSub
)
    {
        'use strict';
        var ModuleUpdate = BaseView.extend({

            initialize: function(options) {
                _.bindAll(this,
                    'initMarkup',
                    'updateMarkup',
                    'fetchUpdate'
                );
                options = $.extend({
                    getItems: 25,
                    maxItems: 50,
                    removeNewHighlight: 20, // seconds
                    updateDelay: 30, // seconds
                    dataSrcAttr: 'data-src',
                    dataSection: 'data-livefeed',
                    dataLoading: 'livefeed-loading',
                    dataTimeStamp: 'data-timestamp',
                    dataContentId: 'data-content-id',
                    moreLink: null,
                    moreLinkText: null,
                    newContentClass: 'newcontent'
                }, options);

                options.section = this.$el.attr(this.options.dataSection) || Utils.getSectionPath(window.location.pathname);
                
                BaseView.prototype.initialize.call(this, options);

                this.setupLiveFeed();
            },

            setupLiveFeed: function() {
                if (this.$el.children('li').length) {
                    // remove the new content class that might not be removed, cleanup just in case
                    this.$el.children('.'+this.options.newContentClass).removeClass(this.options.newContentClass);
                    this.fetchUpdate();
                } else {
                    StateManager.fetchHtml('/feeds/live/' + this.options.section + '/?count=' + this.options.getItems).done(this.initMarkup);
                }
            },

            initMarkup: function(markup) {
                this.$el.removeClass(this.options.dataLoading);
                this.$el.append(markup);
                this.loadLazyImages(markup.find('img'));
                this.renderMoreLink();
                PubSub.trigger('sports:modules:update');
                this.startUpdateCheck();
            },

            loadLazyImages: function(images) {
                images = images || this.$('img');
                Utils.lazyLoadImage(images, this.options.dataSrcAttr, true, this.hideBrokenHasImage);
            },

            renderMoreLink: function() {
                if (this.options.moreLink) {
                    this.$el.append('<li class="live-feed-news-item"><a href="' + this.options.moreLink + '" class="livefeed-news-item-link has-more">' + this.options.moreLinkText + '</a></li>');
                }
            },

            hideBrokenHasImage: function() {
                $(this).closest('.has-image').removeClass('has-image');
                PubSub.trigger('sports:modules:update');
            },

            fetchUpdate: function() {
                 var timestamp = this.$el.find('li:first').attr(this.options.dataTimeStamp),
                     url = '/feeds/live/' + this.options.section + '/?date=' + timestamp;
                 StateManager.fetchHtml(url).done(this.updateMarkup);
            },

            updateMarkup: function(newMarkup) {
                if (!newMarkup || newMarkup.length === 0) {
                    return;
                }
                var $li = this.$('li'),
                    contentIdMap = {},
                    $this;
                // take off the current top class, new content will get the top class
                $li.removeClass('top');
                newMarkup.each(function() {
                    contentIdMap[$(this).attr(this.options.dataContentId)] = true;
                });
                // If a duplicate is in the new markup, remove the existing one from the DOM.
                $li.each(function() {
                    $this = $(this);
                    if (contentIdMap[$this.attr(this.options.dataContentId)]) {
                        $this.remove();
                    }
                });
                // Prepend all new items.
                newMarkup.eq(0).addClass('top').append('<div class="shadow"></div>');
                this.$el.prepend(newMarkup);
                // Show updates to new content, etc.
                newMarkup.addClass(this.options.newContentClass);
                this.loadLazyImages(newMarkup.find('img'));
                $li = this.$el.children('li');
                // If there are over maxItems remove oldest.
                if ($li.length > this.options.maxItems) {
                    $li.slice(this.options.maxItems).remove();
                }
                this.renderMoreLink();
                this.afterNewContent = setTimeout(_.bind(function() {
                    newMarkup.removeClass(this.options.newContentClass);
                }, this), this.options.removeNewHighlight * 1000);
                PubSub.trigger('sports:modules:update');
            },

            startUpdateCheck: function() {
                clearInterval(this.interval);
                this.interval = setInterval(this.fetchUpdate, this.options.updateDelay * 1000);
            },

            stopUpdateCheck: function() {
                clearInterval(this.interval);
            },

            destroy: function(removeEl) {
                if (removeEl){
                    this.$el.empty();
                }
                this.stopUpdateCheck();
                clearTimeout(this.afterNewContent);
                BaseView.prototype.destroy.apply(this, arguments);
            }

        });

        return ModuleUpdate;
    }
);
