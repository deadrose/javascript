/**
 * @ Recommendation Flyout
 * @author Pim Linders and Jonathan Hensley
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'utils',
    'state',
    'managers/cachemanager'
],
function(
    $,
    _,
    BaseView,
    Utils,
    StateManager,
    CacheManager
) {


    /**
     * View class.
     */
    var RecommendedFlyout = BaseView.extend({

        // Events.
        events: {
            'click .closed': 'toggle',
            'click .recommended-flyout-close': 'toggle'
        },

        /**
         * Initialize view.
         */
        initialize: function() {
            _.bindAll(this, 'scroll_listener', 'fetch_trending_stories');
            this.isOpen = false;
            this.forcedStatus = false;
            this.hasOpened = false;
            this.rendered = false;
            this.$flyout = this.$('.recommended-flyout');
            this.$flyoutWrap = this.$('.recommended-flyout-wrap');
            this.$flyoutTemplate = this.$('#recommended-flyout-template');
            this.$win = Utils.get('win');
            this.winHeight = this.$win.height();
            // keep track limit small for flyout, prevents users from getting trapped
            // note this should get increased once new recommendation modules is added
            this.trackLimit = 10;
            this.trendingUrl = '/feeds/recommend/trending.json';
            this.mostPopularUrl = '/feeds/recommend/most-popular.json';
            // track asset
            this.track_asset();
            // get recommendation
            this.get_recommendation();
            BaseView.prototype.initialize.apply(this, arguments);
        },


        /**
         * bind events
         */
        bind: function() {
            var throttledScroll = _.throttle(this.scroll_listener, 100);
            this.$win.on('scroll.' + this.cid, throttledScroll);
        },

        /**
         * unbind events
         */
        unbind: function() {
            this.$win.off('.' + this.cid);
        },

        /**
         * get story trending_stories and get recommendation
         */
        get_recommendation: function() {
            var self = this;
            CacheManager.getValue('recommendation-trending_stories', this.fetch_trending_stories, 5)
                .done(function(trending_stories) {
                    self.render_recommendation(trending_stories);
                }).fail(function(){
                    self.render_fallback();
                });
        },

        /**
         * check for and render fallback story
         */
        render_fallback: function() {
            var self = this;
            // fallback story is available, render immediately
            if (this.fallback_story) {
                this.render(this.fallback_story);
            }
            else {
                // watch for fallback story to become available
                this.next_story_check = setInterval(function() {
                    if (self.collection_loaded) {
                        if (self.fallback_story) {
                            self.render(self.fallback_story);
                        }
                        clearInterval(self.next_story_check);
                    }
                }, 500);
            }
        },

        /**
         * creates fall back story, fallback story is the next story
         * @param storyCollection
         * @param storyIndex
         */
        storyCollectionLoaded: function(storyCollection, storyIndex) {
            this.collection_loaded = true;
            this.$trigger_dom = this.$el.next();
            this.trigger_dom_offset = this.$trigger_dom.offset().top;
            // bind scroll event listener
            this.bind();
            if (storyCollection && storyCollection.length > 0 && storyIndex > -1) {
                var nextStory = storyCollection[storyIndex + 1];
                this.fallback_story = {
                    image_1_1: nextStory.image,
                    title: nextStory.headline,
                    url: nextStory.links
                };
            }
        },

        /**
         * gets trending_stories json
         * @returns {*|Deferred}
         */
        fetch_trending_stories: function() {
            return StateManager.fetchData(this.trendingUrl);
        },

        /**
         * generate user preference and match it with the story trending_stories
         * @param trending_stories
         */
        render_recommendation: function(trending_stories) {
            // get tracker object, contains history array and tree
            var tracker = this.get_tracker();
            // remove viewed assets from trending stories
            this.remove_viewed_assets(tracker, trending_stories);
            // get user SSTS preference based on tracking history
            var user_ssts_preference = this.generate_user_ssts_preference(tracker),
                // find a match for user SSTS preference in the trending stories
                recommendation = this.match_trending_stories(user_ssts_preference, trending_stories);
            // recommendation was found
            if (recommendation) {
                // remove recommendation from trending_stories so it can't be recommended again in the same session
                this.remove_asset_from_trending_stories(recommendation.asset_id, trending_stories);
                // render recommendation
                this.render(recommendation);
            }
            // render fallback if recommendation failed
            else {
                this.render_fallback();
            }
        },

        /**
         * extracts ssts parts from nodes priority list
         * @param tracker, tracker object from get_tracker
         * @returns {Array}, array of ssts parts
         */
        generate_user_ssts_preference: function(tracker) {
            if (!tracker) {
                tracker = this.get_tracker();
            }
            var user_ssts_preference = [],
                nodes_priority_list = this.generate_nodes_priority_list(tracker.sstsTree);
            // extract SSTS from priority nodes list
            for (var i=0; i<nodes_priority_list.length; i+=1) {
                var priority_node = nodes_priority_list[i];
                user_ssts_preference.push(this.get_node_ssts_path(priority_node));
            }
            return user_ssts_preference;
        },

        /**
         * sorts ssts tree nodes by node weight
         * @param sstsTree
         * @returns {Array}, array of nodes
         */
        generate_nodes_priority_list: function(sstsTree) {
            var priority_nodes_list = [],
                sort_asc_weight = function(a, b) {
                    return a.weight < b.weight;
                };
            // loop through each parent node in the tree
            for (var i=0; i<sstsTree.nodes.length; i+=1) {
                var parent = sstsTree.nodes[i],
                    children = [];
                this._add_node_weight(parent);
                // add parent
                priority_nodes_list.push(parent);
                // get all children nodes for parent
                this._get_node_children(parent, children);
                // loop through all children nodes, count from lowest to highest to give the recently viewed articles a higher priority when the weights are the same
                for (var j=children.length-1; j>=0; j-=1) {
                    var child = children[j];
                    // add weight
                    this._add_node_weight(child);
                    // add node to priority nodes list
                    priority_nodes_list.push(child);
                }
            }
            // sort nodes by weight
            priority_nodes_list.sort(sort_asc_weight);
            return priority_nodes_list;
        },

        /**
         * add weight to nodes
         */
        _add_node_weight: function(node) {
            // top level node, weight is equal to count
            if (!node.parent) {
                node.weight = node.count;
            }
            else {
                var superseed_min = 0.51;
                // initial weight is equal to the count
                node.weight = node.count;
                /*
                    allow subsections to super seed the parent if the child count is higher then the super seed minimum
                 */
                if (node.count > (node.parent.count * superseed_min)) {
                   node.weight = node.count + node.parent.count;
                }
            }
        },

        /**
         * get all children nodes for a node
         */
        _get_node_children: function(base, children) {
            for (var i=0; i<base.nodes.length; i+=1) {
                var node = base.nodes[i];
                node.parent = base;
                children.push(node);
                // fetch children
                if (node.nodes.length) {
                    this._get_node_children(node, children);
                }
            }
        },

        /**
         * match user preference with article in the story trending_stories
         * @param recommend
         * @param trending_stories, data retrieved from fetch_trending_stories
         * @returns recommendation, asset object
         */
        match_trending_stories: function(user_ssts_preference, trending_stories) {
            // initial ids is set to trending
            var ids = trending_stories.trending;
            for (var i=0; i<user_ssts_preference.length; i+=1) {
                var ssts_parts = user_ssts_preference[i],
                    base = trending_stories.sections;
                // try to find end node
                for (var j=0; j<ssts_parts.length; j+=1) {
                    var ssts_part = ssts_parts[j];
                    if (base[ssts_part]) {
                        base = base[ssts_part];
                        // node is the end of the path, match found
                        if (j === ssts_parts.length-1) {
                            ids = base.ids;
                        }
                    }
                    else {
                        break;
                    }

                }
                // ids have changed since init, found new ids break
                if (ids !== trending_stories.trending) {
                    break;
                }
            }
            var recommendation = trending_stories.articles[ids[0]];
            return recommendation;
        },

        /**
         * get full ssts array by adding the current node ssts to the parent ssts's
         * @param node, ssts history tree node
         * @returns {Array}, sorted array of ssts path, i.e. ['news', 'politics']
         */
        get_node_ssts_path: function(node) {
            var ssts_path = [node.ssts];
            while(node.parent && node.parent.ssts) {
                ssts_path.unshift(node.parent.ssts);
                node = node.parent;
            }
            return ssts_path;
        },

        /**
         * add node to tracker ssts history tree
         * @param tracker_item, object in tracker array
         * @param tree, ssts history tree generated in track_asset
         */
        insert_node: function(tracker_item, tree) {
            var ssts_parts = tracker_item.ssts.split('/'),
                base = tree.nodes,
                sort_asc_count = function(a, b) {
                    return a.count < b.count;
                };
            // increase total count on first loop
            tree.count += 1;
            // loop through split ssts, section/subsection/subtopic
            for (var j=0; j<ssts_parts.length; j+=1) {
                var ssts_part = ssts_parts[j],
                    // find existing node
                    node = _.findWhere(base, {ssts: ssts_part});
                // node exist, increase node count
                if (node) {
                    node.count += 1;
                }
                else {
                    // node doesn't exist, create node
                    node = {
                        ssts: ssts_part,
                        count: 1,
                        nodes: []
                    };
                    base.push(node);
                }
                // resort nodes
                base.sort(sort_asc_count);
                // set new base
                base = node.nodes;
            }
        },

        /**
         * remove node to tracker ssts history tree
         * @param tracker_item, object in tracker array
         * @param tree, ssts history tree generated in track_asset
         */
        remove_node: function(tracker_item, tree) {
            var ssts_parts = tracker_item.ssts.split('/'),
                base = tree.nodes;
            // loop through split ssts, section/subsection/subtopic
            for (var j=0; j<ssts_parts.length; j+=1) {
                var ssts_part = ssts_parts[j],
                    // find existing node
                    node = _.findWhere(base, {ssts: ssts_part});
                // node exist
                if (node) {
                    // decrease total count on first loop
                    if (j === 0) {
                        tree.count -= 1;
                    }
                    // there's only 1 ssts for this node, remove it from the tree
                    if (node.count === 1) {
                        // remove element from tree
                        base.splice(_.indexOf(base, node), 1);
                        break;
                    }
                    else {
                        node.count -= 1;
                        // set new base
                        base = node.nodes;
                    }

                }
            }
        },

        /**
         * remove viewed assets from provided trending_stories
         * @param tracker, created in track_asset
         * @param trending_stories, data retrieved from fetch_trending_stories
         */
        remove_viewed_assets: function(tracker, trending_stories) {
            // remove viewed assets from trending_stories
            for (var i=0; i<tracker.history.length; i+=1) {
                var track_asset = tracker.history[i];
                this.remove_asset_from_trending_stories(track_asset.asset_id, trending_stories);
            }
        },

        /**
         * remove an asset id from the trending_stories tree
         * @param asset_id
         * @param trending_stories, data retrieved from fetch_trending_stories
         */
        remove_asset_from_trending_stories: function(asset_id, trending_stories) {
            var asset = trending_stories.articles[asset_id];
            // check if asset is in articles
            if (asset) {
                // remove from trending
                trending_stories.trending = _.without(trending_stories.trending, asset_id);
                // remove from sections tree
                var paths = asset.ssts.split('/'),
                    base = trending_stories.sections;
                for (var i=0; i<paths.length; i+=1) {
                    var path = paths[i];
                    // set base
                    base = base[path];
                    base.ids = _.without(base.ids, asset_id);
                }
                // remove from articles
                delete trending_stories.articles[asset_id];
            }
        },

        /**
         * track users history for recommendations
         * create local storage item with a history array and ssts history tree
         */
        track_asset: function() {
            var pageInfo = StateManager.getActivePageInfo(),
                tracker = this.get_tracker(),
                asset_id = pageInfo.assetid,
                is_unique = this.is_unique_tracking_asset(asset_id),
                ssts = pageInfo.ssts,
                track_item = {
                    asset_id: asset_id,
                    ssts: ssts
                };
            if (asset_id && ssts) {
                // limit array, FIFO
                if (tracker.history.length >= this.trackLimit) {
                    var last_item = tracker.history[tracker.history.length-1];
                    // remove last item from ssts history tree
                    this.remove_node(last_item, tracker.sstsTree);
                    // remove last item from history
                    tracker.history.splice(tracker.history.length-1, 1);
                }
                // add track item to collection, latest first
                tracker.history.unshift(track_item);
                // new asset
                if (is_unique) {
                    // add track item to ssts history tree
                    this.insert_node(track_item, tracker.sstsTree);
                }
                localStorage.setItem('recommendation', JSON.stringify(tracker));
                return tracker;
            }
            else {
                return false;
            }
        },

        /**
         * checks the tracker if the current asset_id exists
         * @param asset_id
         */
        is_unique_tracking_asset: function(asset_id) {
            var tracker = this.get_tracker(),
                is_unique = true;
            // track only unique page views
            for (var i=0; i<tracker.history.length; i+=1) {
                // remove element if found
                if (tracker.history[i].asset_id === asset_id) {
                    // remove existing element
                    tracker.history.splice(i, 1);
                    is_unique = false;
                    break;
                }
            }
            return is_unique;
        },

        /**
         * retrieve tracker object from local storage, contains history and ssts history tree
         * @returns tracker
         */
        get_tracker: function() {
            if (this.tracker) {
                return this.tracker;
            }
            else {
                this.tracker = localStorage.getItem('recommendation');
                // no local storage item, create local storage item
                if (!this.tracker) {
                    this.tracker = {
                        'history': [],
                        'sstsTree': {
                            count: 0,
                            nodes: []
                        }
                    };
                }
                // parse cookie string
                else {
                    this.tracker = JSON.parse(this.tracker);
                }
                return this.tracker;
            }
        },

        /**
         * Listen to scroller to determine when to open the recommendation flyout
         */
        scroll_listener: function(){
            var windowOffset = Utils.getScrollPosition(),
                windowBottom = windowOffset + this.winHeight;
            if ((this.trigger_dom_offset <= windowBottom)) {
                this.open_flyout();
            } else {
                this.close_flyout();
            }
        },

        /**
         * Process the story collection, render a template and deliver it to the page
         * @params {object} data
         */
        render: function(data) {
            try {
                var compiled = _.template(this.$flyoutTemplate.html(), {data: data});
                this.$flyout.html(compiled);
                this.rendered = true;
            } catch(e){
                console.error('failed rendering flyout template');
            }
        },

        /**
         * Open/close flyout on click
         */
        toggle: function(event) {
            event.preventDefault();
            if (!this.isOpen) {
                this.forcedStatus = false;
                this.open_flyout();

            } else {
                this.forcedStatus = true;
                this.close_flyout();

            }
        },

        /**
         * Open the flyout
         */
        open_flyout: function() {
            if (!this.isOpen && this.rendered && !this.forcedStatus) {
                this.animate(this.$flyoutWrap, 'width', 360, 350, 'ease-out');
                this.$flyout.removeClass('closed');
                this.isOpen = true;
                this.hasOpened = true;
            }
        },


        /**
         * Close the flyout
         */
        close_flyout: function() {
            if (this.hasOpened && this.isOpen && this.forcedStatus) {
                this.animate(this.$flyoutWrap, 'width', 24, 250, 'ease-out');
                this.$flyout.addClass('closed');
                this.isOpen = false;
            }
        },

        /**
         * Clean up view.
         * Removes event handlers and element (optionally).
         * @param {boolean} removeEl option to also remove View from DOM.
         */
        destroy: function(removeEl) {
            if (removeEl) {
                this.$el.remove();
            }
            this.unbind();
            clearInterval(this.next_story_check);
            BaseView.prototype.destroy.apply(this, arguments);
        }

    });

    /**
     * Return view class.
     */
    return RecommendedFlyout;
});