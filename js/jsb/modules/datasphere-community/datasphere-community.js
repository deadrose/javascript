/**
 * @fileoverview Datasphere Community module view.
 * @author Trey Eckels (teckels@gannett.com)
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'utils',
    'state',
    'admanager'
],
function(
    $,
    _,
    BaseView,
    Utils,
    StateManager,
    AdManager
) {
    'use strict';
        /**
         * View class.
         */
        var DatasphereCommunityView = BaseView.extend({

            /**
             * Events
             */
            events: {
                'click .datasphere-community-link' : 'select'
            },

            classNames: {
                show: 'show',
                selected: 'selected',
                list: 'clst-unordered-items'
            },


            /**
             * Initialize view.
             * @param {Object} options View options passed in during init.
             */
            initialize: function(options) {
                _.bindAll(this, 'widgetLoaded');

                var config = window.site_config.DATASPHERE = window.site_config.DATASPHERE || {};
                //check to see if DS master switch has been turned off
                if (!config.SWITCH) { return false; }

                //this.contentType = false;
                this.contentType = this._getContentType();

                // DATASPHERE is only supported on front and story pages, it should not have been initialized
                if (!this.contentType) return;

                this.options = $.extend({
                    apiBase: 'http://content.secondspace.com/widget/',
                    site : config.SITE,
                    type: config.TYPE,
                    preview : Utils.getUrlParam('preview') ? "-preview" : ""
                }, options);


                this.templateInfo = {
                    tabs: {
                        news:{
                            title: 'News',
                            url: config.SITE,
                            id: 'news'
                        },
                        events:{
                            title: 'Events',
                            url: 'events.' + config.SITE,
                            id: 'events'
                        }
                    },
                    template:
                        '<li class="datasphere-community-item<%= selected %>">' +
                            '<a class="datasphere-community-link" data-id="datasphere-community-<%= id %>" href="http://www.<%= url %>.com"' +
                                'data-ht="datasphere-community-<%= id %>" data-vr-contentbox="datasphere-community-<%= id %>"><%= title %></a>' +
                        '</li>'
                };


                //add callback for DS script to call to open the widget
                if(!window.__dsWidget__){
                    window.__dsWidget__ = {
                        dsWidgetLoaded : this.widgetLoaded
                    };
                }

                if (!DatasphereCommunityView.prototype.DSisLoaded && !!config.TYPE && !!config.SITE){
                    var url = this.options.apiBase + this.options.type + '/' + this.options.site + this.options.preview + '.js';
                    var success = _.bind(this._JSloaded,this);
                    StateManager.fetchData(url,{
                        cache: true,
                        dataType: 'script',
                        success: success
                    });
                } else if (!!config.TYPE && !!config.SITE){
                    this._callDSapi();
                } else {
                    return;
                }

                if(this.contentType === 'homepage'){
                    this.$galleries = this.$('.datasphere-community-section');
                }

                // call base class initialize
                BaseView.prototype.initialize.call(this, this.options);
            },

            _getContentType: function(){
                var contentType = false;
                var pageInfo = StateManager.getActivePageInfo() || {};
                var contenttype = pageInfo.contenttype || '';
                var sectionName = pageInfo.section_name || '';
                if (sectionName === 'home') {
                    contentType = 'homepage';
                } else if (-1 !== contenttype.indexOf('front')) {
                    contentType = 'adfront';
                } else if (-1 !== contenttype.indexOf('story')) {
                    contentType = 'story';
                }
                return contentType;
            },

            _JSloaded: function(){
                DatasphereCommunityView.prototype.DSisLoaded = true;
                this._callDSapi();
            },

            _callDSapi: function(){
                if(window.dsapi){
                    if(window.dsapi.pageLoad) window.dsapi.pageLoad(this.contentType);
                    //call modal function
                    if(window.dsapi.allowModal){
                        $.when(this._allowModal()).then(
                          //done and successful
                          function( status ) {
                            window.dsapi.allowModal(status);
                          },
                          //rejected
                          function( status ) {
                            window.dsapi.allowModal(status);
                          }
                        );
                    }
                }
            },

            _allowModal: function(){
                var allowModal = false;
                var deferred = new $.Deferred();
                var counter = 0;
                var self = this;

                if(this.contentType === 'homepage' && AdManager.activeSlotStatistics){
                    if(!AdManager.activeSlotStatistics.unknown){
                        deferred.resolve(this._determineIfHighImpact());
                    } else {
                         this.timer = setInterval(function() {
                            if(!AdManager.activeSlotStatistics.unknown){
                                window.clearInterval(this.timer);
                                deferred.resolve(self._determineIfHighImpact());
                            } else {
                                if(counter < 11){
                                    counter++;
                                } else {
                                    //not waiting any longer, let's move on
                                    window.clearInterval(this.timer);
                                    deferred.reject(allowModal);
                                }
                            }
                        }, 500 );
                    }
                }
                // Return the results/promise
                return deferred.promise();
            },

            _determineIfHighImpact: function(){
                var allowModal = true;
                if(AdManager.activeSlotStatistics.high_impact){
                    allowModal = false;
                }
                return allowModal;
            },

            destroy : function(element){
                if(window.__dsWidget__){
                    window.__dsWidget__ = undefined;
                    try {
                        delete window.__dsWidget__;
                    } catch(e) {} // guard against IE throwing exceptions
                }
                if(window.dsapi && window.dsapi.pageUnload) window.dsapi.pageUnload(this.contentType);
                if(this.timer) window.clearInterval(this.timer);
                // call base class destroy
                BaseView.prototype.destroy.call(this, element);
            },

            widgetLoaded : function(data,writeTabs){
                if(!data.events && !data.news) return;
                var isFront = (this.contentType === 'homepage');

                if(isFront && writeTabs){
                    var $navList = this.$el.find('.' + this.classNames.list),
                        i = 0,
                        vars = {},
                        templInfo = this.templateInfo;
                    $.each(data,function(k,v){
                       if(v){
                           vars = templInfo.tabs[k];
                           vars.selected = (i === 0) ? ' selected' : "";
                           $navList.append(_.template(templInfo.template, vars));
                           i++;
                       }
                    });
                }
                this.$navItems = this.$('.datasphere-community-item');
                this.$el.addClass(this.classNames.show);
                if (isFront) this.refreshSidebar();
            },

            refreshSidebar: function(){
                if (StateManager.getActiveApp().refreshSidebarScroll) {
                    StateManager.getActiveApp().refreshSidebarScroll();
                }
            },

            /**
             * Toggle selected class and load gallery data.
             * @param {Event} event View click event.
             */
            select: function(event) {
                if (event) event.preventDefault();
                if (this.$navItems.length === 1) return;

                var targetLink = $(event.currentTarget),
                    item = targetLink.parent();
                // Heattracking
                Utils.setTrack(targetLink);

                if(window.dsapi && window.dsapi.toggleContent) window.dsapi.toggleContent(targetLink.text().toLowerCase());

                // Highlight clicked navigation item.
                this.$navItems.removeClass(this.classNames.selected);
                item.addClass(this.classNames.selected);
            }

        });

        /**
         * Return view class.
         */
        return DatasphereCommunityView;
    }
);
