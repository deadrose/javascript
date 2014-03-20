/**
 * @fileoverview Utility Bar module view.
 * @author Erik Kallevig <ekallevig@gannett.com>
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'pubsub',
    'utils',
    'state',
    'baseview',
    'site-manager',
    'third-party-apis/firefly/firefly',
    'user-manager',
    'modules/stories/utility-bar-modules-popups'
],
function (
    $,
    _,
    Backbone,
    PubSub,
    Utils,
    StateManager,
    BaseView,
    SiteManager,
    Firefly,
    UserManager,
    UtilityBarModulePopups
) {

    /**
     * View class.
     */
        var UtilityBarView = BaseView.extend({

        // View element.
        el: '.utility-bar-wrap',

        // Events.
        events: {
            'click .util-bar-btn': 'onClickUtilityBtn'
        },

        /**
         * Initialize view.
         * @param {Object} options View options passed during init.
         */
        initialize: function(options) {
            _.bindAll(this, 'onDestroySubview');
            this.pubSub = {
                'header:fixed': this.onHeaderFixed,
                'header:unfixed': this.onHeaderUnfixed,
                'user:statuschange': this._loginStatus
            };
            this.$primaryModules = this.$('.util-bar-primary-modules');
            this.$secondaryModules = this.$('.util-bar-secondary-modules');

            var header = SiteManager.getHeader();
            if (header && header.isFixed()) {
                this.onHeaderFixed();
            }

            BaseView.prototype.initialize.call(this, options);

            this.autoPopoutComments();
            this.setupFireflyout();
        },

        autoPopoutComments: function() {
            this.$commentsBtn = this.$('.util-bar-btn-comments');

            // See if the current URL indicates it is trying to show a particular FB comment
            if (window.location.search.search('[?&]fb_comment_id=.+') > -1) {
                _.defer(_.bind(function(){
                    this.openComments();
                }, this));                
            }
        },

        setupFireflyout: function() {
            this.$fireflyModule = this.$('.util-bar-modules-firefly');
            this.$fireflyBtn = this.$('.util-bar-btn-firefly');

            if (this.$fireflyModule.length) {
                this._checkUserAccount();
            }
        },

        _checkUserAccount: function() {
            var userAccount = UserManager.getAccount('firefly');
            if (userAccount) {
                userAccount.getUserInfo().always(_.bind(function(userInfo) {
                    this._loginStatus('firefly', userAccount.getLoginStatus(), userInfo);
                }, this));                
            }
        },
        
        _loginStatus: function(accountName, loginStatus, userData) {
            if (accountName !== 'firefly') {
                return;
            }

            // When logged in but not subscribed, don't show the login button anymore.
            if (loginStatus === 'loggedIn') {
                this.$fireflyModule.addClass('util-bar-modules-firefly-authenticated');
            } else if (loginStatus !== 'loggingIn') {
                this.$fireflyModule.removeClass('util-bar-modules-firefly-authenticated');
            }

            var protectedState = StateManager.getActivePageInfo().content_protection_state;
            var isContentFree = !protectedState || protectedState === 'free';
            if ((loginStatus === 'loggedIn' && userData && userData.hasMarketAccess) || isContentFree) {
                this.$fireflyModule.removeClass('util-bar-modules-firefly-visible');
            } else if (loginStatus !== 'loggingIn') {
                this.$fireflyModule.addClass('util-bar-modules-firefly-visible');

                // Firefly cookie check for auto-opening Fireflyout.
                var viewsCookie = Firefly.getFireflyViewsCookie();
                if (viewsCookie && (viewsCookie.viewCount === 1 || viewsCookie.viewsRemaining < 2)) {
                    _.delay(_.bind(function(){
                        this.openFireflyout();
                    }, this), 0);
                }
            }
        },

        openFireflyout: function() {
            this.$fireflyBtn.trigger('click');
        },

        openComments: function() {
            this.$commentsBtn.trigger('click');
        },

        onHeaderFixed: function(){
            this.$primaryModules.css({position: 'fixed', top: 'auto'});
        },

        onHeaderUnfixed: function(){
            this.$primaryModules.css({position: 'absolute', top: ''});
        },

        onClickUtilityBtn: function(e){
            var $btn = $(e.currentTarget);

            // Custom popup code that must be triggered as a
            // direct result of click to avoid popup blocking.
            if ($btn.data('popup-callback')) {
                var popupCallback = $btn.data('popup-callback');
                UtilityBarModulePopups[popupCallback]();

            // Init util-bar-modules
            } else if ($btn.prop('tagName') !== 'A') {
                e.preventDefault();
                var moduleName = $btn.data('modules-name');
                var moduleSection = $btn.data('modules-section') || '';
                if (this.subviews[moduleName]) {
                    if (moduleSection && moduleSection !== this.subviews[moduleName].activeSection) {
                        this.subviews[moduleName].open(moduleSection);
                    } else {
                        if (this.subviews[moduleName].close) {
                            this.subviews[moduleName].close();
                        }
                    }
                } else {
                    _.each(this.subviews, function(subview) {
                        if (subview && subview.close) {
                            subview.close();
                        }
                    });
                    StateManager.resourceManager.getSiteModuleByName(moduleName).done(_.bind(function(module){
                        if (!this.destroyed) {
                            this.subviews[module.name] = new module.ModuleClass(_.extend({
                                'el': module.selector,
                                'onDestroy': this.onDestroySubview
                            }, module.options));
                            if (this.subviews[module.name].open) {
                                this.subviews[module.name].open(moduleSection);
                            }
                        }
                    }, this)).fail(function(){
                        console.error('Failed to load utility bar modules: ' + moduleName + '.js');
                    });
                }
            }
        },

        onDestroySubview: function(destroyedSubview) {
            _.each(this.subviews, function(iterSubview, i) {
                if (iterSubview === destroyedSubview) {
                    this.subviews[i] = null;
                }
            }, this);
        },

        /**
         * Adds show class to el.
         */
        show: function() {
            this.$el.addClass('show');
        },

        /**
         * Removes show class from el.
         */
        hide: function() {
            this.$el.removeClass('show');
        },

        /*
         * Destroy view.
         */
        destroy: function(removeEl){
            this.destroyed = true;

            // Avoid jumpiness in Chrome due to fixed position bug.
            this.$el.css('padding-top', Utils.getScrollPosition());
            this.$primaryModules.css('position', 'absolute');
            this.$secondaryModules.css('position', 'absolute');
            BaseView.prototype.destroy.call(this, removeEl);
        }
    });

    /**
     * Return view class.
     */
    return UtilityBarView;
});
