/**
 * @fileoverview Search view.
 * @author stephen.burgess@f-i.com (Stephen Burgess)
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'pubsub',
    'utils',
    'base-app',
    'state',
    'site-manager',
    'global/document-write'
],
function(
    $,
    _,
    Backbone,
    PubSub,
    Utils,
    BaseApp,
    StateManager,
    SiteManager
)
    {
        /**
         * View class.
         */
        var SearchApp = BaseApp.extend({

            // View element.
            el: '.search-results',

            // Events.
            events: {
                'click .grid-btn': 'gridView',
                'click .list-btn': 'listView',
                'click .close-search-btn': 'closeSearch'
            },

            /**
             * Initialize view.
             */
            initialize: function(options) {
                options = $.extend(true, {
                        delay: {
                            playlistAutoClose: 250
                        },
                        animations: {
                            open: {
                                duration: 250,
                                easing: 'ease-in-out'
                            },
                            close: {
                                duration: 250,
                                easing: 'ease-in-out'
                            }
                        }
                    }, options);

                // Cache references to common elements/calculations.
                this.win = Utils.get('win');
                this.body = Utils.get('body');
                this.scrollEl = Utils.get('scrollEl');
                this.header = SiteManager.getHeader();

                // Scopes 'this' to window
                _.bindAll(this, 'lazyload');

                // Set initial view state.
                this.currentView = 'view-grid';

                this.init = false;
                this.requestInProgress = false;

                // Load initial images and set layload on scroll
                this.win.on('scroll.' + this.cid, _.throttle(this.lazyload, 200));
                $('.site-masthead-search-close-btn').addClass('site-masthead-search-close-btn-visible');

                // call base class initialize
                BaseApp.prototype.initialize.call(this, options);
            },

            getRevealAppLoader: function(){
                return '<article class="search-results ui-loading dark-medium"></article>';
            },

            isSearchPage: true,

            animateRevealApp: function(fromUrl, toUrl){
                if(fromUrl === null){
                    return $.Deferred().resolve();
                }else{
                    this.$('#search-form').css('height','');
                    this.header.setOpenFixed();
                    this.$el.css({opacity: 1, display: 'block', top: '-100%', height: '100%'});
                    var promise = this.animate(this.$el, 'top', '0%',
                        this.options.animations.open.duration,
                        this.options.animations.open.easing);
                    promise.done(_.bind(function(){
                        this.body.addClass('show-search');
                        this.$el.css({'height': '', top: ''});
                    }, this));
                    return promise;
                }
            },

            animateRemoveApp: function(fromUrl, toUrl){
                var scrollPosition = Utils.getScrollPosition();
                this.$el.css({marginTop: -1 * scrollPosition,
                                height: this.win.height() + scrollPosition});
                this.$('.summary').css('position', 'absolute');
                this.header.scrollTop(0);
                this.body.removeClass('show-search');
                return this.animate(this.$el, 'top', '-100%',
                    this.options.animations.close.duration,
                    this.options.animations.close.easing);
            },

            beforeOverlayRemove: function(toUrl){
                this.header.setOpenFixed();
            },

            afterOverlayReveal: function(offset) {
                this.header.setFixingScroller(true);
                this.header.scrollTop(0);
            },


            afterAppRemove: function(fromUrl, toUrl){
                this.header.restoreDefaultState();
                $('.site-masthead-search-close-btn').removeClass('site-masthead-search-close-btn-visible');
                PubSub.trigger('uotrack','searchResultsclose');
            },

            afterPageReveal: function(fromUrl, toUrl){
                if (!this.init){
                    this.init = true;
                    // stash the original path so we know where we came from
                    this.originalPath = fromUrl;
                }
                this.moreResultsPlacer = this.$('.more-results');
                this.lazyload();
                this.searchWrap = this.$('#search-form');
                this.searchTextInput = this.searchWrap.find('.text-input');
                this.setup();
                this.setupTextAd();
            },

            /**
             * Get more search results
             */
            getMoreResults: function(fetchUrl) {
                this.requestInProgress = true;
                this.moreResultsPlacer.show();
                StateManager.fetchHtml(fetchUrl).done(_.bind(function(htmlFrag){
                    this.moreResultsPlacer.parent().append(htmlFrag);
                    this.moreResultsPlacer.remove();
                    this.moreResultsPlacer = this.$('.more-results');
                }, this)).fail(_.bind(function(){
                    this.moreResultsPlacer.remove();
                    this.moreResultsPlacer = null;
                }, this)).always(_.bind(function(){
                    this.requestInProgress = false;
                }, this));
                return false;
            },

            getTerm: function() {
                return $('.search-term .term', this.$el).attr('data-term');
            },

            /**
             * Setup
             */
            setup: function() {
                this.results = this.$('.results');
                this.summary = this.$('.summary');

                this.sidebar = this.$('.sidebar');
                this.viewGrid = this.$('.grid-btn');
                this.viewList = this.$('.list-btn');

                if(this.currentView === 'view-list') {this.listView();}
            },

            setupTextAd : function() {
                // grab term
                var term = this.getTerm();
                // grab element
                var id = 'partner_search_text_ads' + new Date().getTime();
                $('.tile.ad', this.$el).attr('id', id);
                var pageOptions = { 
                  'pubId': 'partner-usatoday_js',
                  'query': term,
                  'hl': 'en'
                };

                var adblock1 = { 
                  'container': id,
                  //'number': '3', // Let Google decide
                  'lines': '3',
                  'fontFamily': 'arial',
                  'fontSizeTitle': '13px',
                  'fontSizeDescription': '12px',
                  'fontSizeDomainLink': '12px',
                  'colorTitleLink': '1EA3FF',
                  'colorText': 'FFFFFF',
                  'colorDomainLink': '00C641',
                  'colorBackground': '2C2C2C'
                };

                this.loadGoogleSearchAds(pageOptions, adblock1);
            },

            /**
             * Grid view
             */
            gridView: function() {
                this.viewGrid.addClass('active');
                this.viewList.removeClass('active');
                this.summary.removeClass('list').addClass('grid');
                this.results.removeClass('view-list').addClass('view-grid');
                this.currentView = 'view-grid';
                //Moving Google ads to bottom of sidebar in grid view
                $('.ad').appendTo('.sidebar');
                return false;
            },

            /**
             * List view
             */
            listView: function() {
                this.viewList.addClass('active');
                this.viewGrid.removeClass('active');
                this.summary.removeClass('grid').addClass('list');
                this.results.removeClass('view-grid').addClass('view-list');
                this.currentView = 'view-list';
                //Moving Google ads to top of main content in list view
                $('.ad').prependTo('.list-content');
                return false;
            },

            lazyload: function(){
                if (!this.init || !this.moreResultsPlacer || !this.moreResultsPlacer.length || this.requestInProgress){
                    // resize handler hit too soon, we haven't loaded yet
                    // there's no more results (no placer)
                    // there's already a request in progress
                    return;
                }
                var scrollY = Utils.getScrollPosition();
                var bodyH = this.body.height();
                if(this.moreResultsPlacer.offset().top <= (scrollY + bodyH)){
                    this.getMoreResults(this.moreResultsPlacer.data('href'));
                }
            },

            closeSearch: function(){
                StateManager.navigateToPreloadedUrl(this.originalPath);
            },

            /*
             * Massive hack to work around google's use of document.write (because document.write's spec is a massive hack)
             * redefined document.write is in main
             */
            loadGoogleSearchAds: function(pageOptions, adblock1) {
                var done = false;
                var ads = function() {
                        if (done) {
                            document.delOnWrite('searchads');
                            document.delOnScript('searchads');
                            return;
                        }
                        if (window.google && window.google.ads && window.google.ads.search && window.google.ads.search.Ads){
                            done = new window.google.ads.search.Ads(pageOptions, adblock1);
                            document.delOnWrite('searchads');
                            document.delOnScript('searchads');
                        }
                    };
                if (!ads()) {
                    document.addOnWrite('searchads', ads);
                    document.addOnScript('searchads', ads);
                    StateManager.fetchData('http://www.google.com/adsense/search/ads.js',
                        {
                            cache: true,
                            dataType: 'script',
                            success: ads
                        });
                }
            },

            destroy: function() {
                document.delOnWrite('searchads');
                document.delOnScript('searchads');
                this.win.off('.' + this.cid);
                BaseApp.prototype.destroy.apply(this, arguments);
            }
        });

        /**
         * Return app class.
         */
        return SearchApp;
    }
);
