define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'utils',
    'modules/global/taboola'
],
function(
    $,
    _,
    BaseView,
    StateManager,
    Utils,
    Taboola
) {
    'use strict';

    var TaboolaOutbrain = BaseView.extend({

        // Events.
        events: {
            'click .headline img': 'taboolaPixelTracking'
        },

        initialize: function(options) {
            this.texttype = StateManager.getActivePageInfo().texttype || 'story';

            _.bindAll(this, 'showTaboola');

            BaseView.prototype.initialize.call(this, options);

            this.render();
        },

        /**
         * Populate more stories fragments on asset page.
         */
        render: function() {
            var moreStoriesVertical;
            if (this.texttype === 'galleries' || this.texttype.indexOf('video') !== -1) {
               // Lets keep the number of more stories from multiplying.
                if (this.$('.gallery-more .headline').length === 0) {
                    if (!this.subviews.taboola) this.subviews.taboola = new Taboola();
                    if (this.texttype === 'galleries') {
                        this.subviews.taboola.getRelated(this.showTaboola, 'photo', 'photo', null, null, StateManager.getActivePageInfo().assetid);
                    } else {
                        this.subviews.taboola.getRelated(this.showTaboola, 'video', 'video', null, null, $('.videoObject').attr('data-brightcove-video-id'));
                    }
                }
            } else {
                if (this.texttype !== 'interactive') {
                    // Determine which presentation to use based on left/right column heights.
                    var leftCol = this.$('.double-wide');
                    var rightCol = this.$('.story-right-rail');
                    if (!leftCol.length) return;
                    var leftTop = leftCol.position().top;
                    var leftH = leftCol.height();
                    var rightH = rightCol.position().top + rightCol.height() - leftTop;
                    if (leftH < rightH - 50) {
                        moreStoriesVertical = true;
                    }
                }
                if ($('.iframe-auto').length > 0){
                    moreStoriesVertical = true;
                }
                this.createTaboola(moreStoriesVertical);

            }
        },

        /**
         * constructs taboola subview
         * @param {Boolean} moreStoriesVertical - whether we render taboola as vertical or horizontal
         */

        createTaboola: function(moreStoriesVertical) {
            var taboolaOpts;
            if (moreStoriesVertical) {
                taboolaOpts = {
                    widget: [{
                        mode: 'verticalx8',
                        container: 'taboola-div-verticalx8'
                    }]
                };
                this.$('.more-stories-wrap').addClass('vertical');
            } else if (Utils.getPageUrl().indexOf('/sports/') !== -1 || Utils.getPageUrl().indexOf('/gameon/') !== -1) {
                taboolaOpts = {
                    widget: [{
                        mode: 'grid-sports',
                        container: 'taboola-div-grid-2x4'
                    }]
                };
            } else {
                taboolaOpts = {
                    widget: [{
                        mode: 'grid-2x4',
                        container: 'taboola-div-grid-2x4'
                    }]
                };
            }
            this.subviews.taboola = new Taboola(taboolaOpts);
        },

        /*
         * Find taboola templates and populate them.
         */
        showTaboola: function(data) {
            var more = this.$('#more-galleries-template');
            if (more.length === 1) {
                var compiled = _.template(more.html(), {data: data.list});
                this.$('.headlines.gallery-more').append(compiled);
            }
        },

        /*
         * Taboola pixel tracking.  Pixels created on the fly depending upon recommended resource clicked.
         */
        taboolaPixelTracking: function(e) {
            var $ele = $(e.currentTarget);
            var publisher_id = window.site_config.THIRDPARTYAPI.Taboola.publisher_id;
            var api_key = window.site_config.THIRDPARTYAPI.Taboola.apiKey;
            var response_id = Utils.get('taboolaResponseID');
            var item_type = $ele.attr('data-type');
            var item_id = $ele.attr('data-id');
            var img = $('<img/>').attr('src','http://api.taboola.com/1.0/json/' + publisher_id + '/recommendations.notify-click' + '?app.type=desktop' + '&app.apikey=' + api_key + '&response.id=' + response_id + '&item.type=' + item_type + '&item.id=' + item_id).load();
        }

    });
    return TaboolaOutbrain;
});