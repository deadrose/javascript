/**
* @fileoverview More Teams module.
* @author mdkennedy@gannett.com (Mark Kennedy)
*/
define([
    'jquery',
    'underscore',
    'backbone',
    'baseview',
    'utils',
    'easing'
],
function(
    $,
    _,
    Backbone,
    BaseView,
    Utils
) {

    /**
     * View class.
     */
    var MoreTeams = BaseView.extend({

        events: {
            'click .sp-more-teams-next-arrow': 'onArrowClick',
            'click .sp-more-teams-prev-arrow': 'onArrowClick',
            'click .sp-more-teams-nav-item-link': 'onPaginationLinkClick'
        },

        initialize: function() {
            BaseView.prototype.initialize.call(this, this.options);

            _.bindAll(this, 'setup', 'update');

            // cache items
            this.$viewport = this.$('.sp-more-teams-viewport');
            this.$divisions = this.$viewport.find('.sp-more-teams-division');
            this.divisionsCount = this.$divisions.length;
            this.$scroller = this.$('.sp-more-teams-scroll');
            this.$arrows = this.$('.sp-more-teams-next-arrow, .sp-more-teams-prev-arrow');
            this.$indicator = this.$('.sp-more-teams-nav-indicator');
            this.$paginationLinks = this.$('.sp-more-teams-nav-item-link');
            this.$navBelt = this.$('.sp-more-teams-nav-belt');
            this.$navItemWrapper = this.$('.sp-more-teams-nav-item-wrap');
            this.$navItems = this.$navItemWrapper.find('.sp-more-teams-nav-item');

            this.$win = Utils.get('win');

            // add event that will update the module on browser resize
            var throttledResize = _.throttle(this.update, 1000);
            this.$win.on('resize.' + this.cid, throttledResize);

            // set initial index
            this.currentDivisionIndex = this.$divisions.index(this.$divisions.filter('.current'));

            this.setup();
        },

        /**
         * Sets up module
         */
        setup: function(){
            this._addTileSpacing();
            this._addNavItemSpacing();
            this._setupTicks();
            this.scrollTo(this.currentDivisionIndex);
        },

        /**
         * Updates module contents
         */
        update: function(){
            this._addTileSpacing();
            this._addNavItemSpacing();
            this._setupTicks();
            this.moveScroller(this.getAnimPosition(this.currentDivisionIndex));
            this.moveIndicator(this.currentDivisionIndex);
        },

        /**
         * Adds correct spacing to items and distributes them horizontally
         * @private
         */
        _addNavItemSpacing: function(){
            var containerWidth = this.$navItemWrapper.width(),
                navItemCount = this.$navItems.length,
                navItemsWidth = 0,
                marginVal;

            // calc width of all nav items
            this.$navItems.each(function(){
                navItemsWidth = navItemsWidth + $(this).outerWidth();
            });

            // get margin value
            marginVal = (containerWidth - navItemsWidth) / ((navItemCount * 2) - 2);
            marginVal = parseInt(marginVal, 0); //round to nearest integer

            // add margins
            _.each(this.$navItems, function(item, idx){
                var $item = $(item),
                    itemNum = idx + 1,
                    marginValWithUnit = marginVal + 'px';
                if (itemNum === 1) {
                    // first item!
                    $item.css('margin-right', marginValWithUnit);
                } else if (itemNum === this.$navItems.length) {
                    // last item!
                    $item.css('margin-left', marginValWithUnit);
                } else {
                    $item.css('margin-right', marginValWithUnit);
                    $item.css('margin-left', marginValWithUnit);
                }
            }, this);
        },
        /**
         * Adds correct spacing to team tiles within each division wrapper.
         * @private
         */
        _addTileSpacing: function(){
            _.each(this.$divisions, function(el){
                var $division = $(el),
                    teamTiles = $division.find('.sp-more-teams-division-team-tile'),
                    teamCount = teamTiles.length,
                    teamTileWidth = 100 / teamCount,
                    divisionWidth;

                // add width of division wrapper
                divisionWidth = parseInt(this.$viewport.width(), 0); //round to nearest integer
                $division.width(divisionWidth);

                // add width to tiles
                teamTiles.each(function(){
                    $(this).width(teamTileWidth + '%');
                });
            }, this);
        },

        /**
         * Sets up tick marks on bar.
         * @private
         */
        _setupTicks: function(){
            var $bar = this.$navBelt,
                $ticks = $bar.find('.sp-more-teams-nav-indicator-tick'),
                tickWidth = $ticks.eq(0).width(),
                tickIndexLength = $ticks.length - 1;
            _.each($ticks, function(el, idx){
                var pos = (($bar.width() / tickIndexLength) * idx) - (tickWidth/2);
                $(el).css('left', pos + 'px');
            }, this);
        },

        /**
         * When one of the left/right arrows are clicked.
         * @param e
         */
        onArrowClick: function(e){
            var $clickedItem = $(e.currentTarget),
                divisionsCount = this.divisionsCount - 1, //must be zero-based
                divisionIndex;
            e.preventDefault();
            if ($clickedItem.hasClass('sp-more-teams-prev-arrow')) {
                // prev arrow click!
                divisionIndex = this.currentDivisionIndex - 1;
                if (divisionIndex < divisionsCount) {
                    this.scrollTo(divisionIndex);
                }
            } else {
                // next arrow click!
                divisionIndex = this.currentDivisionIndex + 1;
                if (divisionIndex > 0) {
                    this.scrollTo(divisionIndex);
                }
            }
        },

        /**
         * When one of the pagination links are clicked
         * @param e
         */
        onPaginationLinkClick: function(e){
            var divisionIndex = this.$paginationLinks.index($(e.currentTarget));
            e.preventDefault();
            this.scrollTo(divisionIndex);
        },

        /**
         * Scrolls new section into view.
         * @param {Number} divisionIndex
         */
        scrollTo: function(divisionIndex) {
            var $view = this.$divisions.eq(divisionIndex),
                divisionsCount = this.divisionsCount - 1, //must be zero-based
                pos;

            if (!$view.hasClass('active')) {
                pos = this.getAnimPosition(divisionIndex);
                this.$divisions.removeClass('active');
                // hide arrow if applicable
                this.$arrows.show();
                if (divisionsCount === 0) {
                    this.$arrows.filter('.sp-more-teams-next-arrow').hide();
                    this.$arrows.filter('.sp-more-teams-prev-arrow').hide();
                } else if (divisionIndex === divisionsCount) {
                    this.$arrows.filter('.sp-more-teams-next-arrow').hide();
                } else if (divisionIndex === 0) {
                    this.$arrows.filter('.sp-more-teams-prev-arrow').hide();
                }

                this.moveScroller(pos).done(_.bind(function(){
                    $view.addClass('active');
                    this.moveIndicator(divisionIndex);
                }, this));

                this.currentDivisionIndex = divisionIndex;
            }
        },
        /**
         * Moves scroller to specified division.
         * @param {Number} pos Position to scroll to
         * @returns {Deferred} deferred promise
         */
        moveScroller: function(pos){
            return $.Deferred(_.bind(function(defer){
                this.$scroller.stop().animate({'left': pos+'px'}, 200, 'easeInOutQuad', function(){
                    defer.resolve();
                });
            }, this));
        },

        /**
         * Moves indicator to appropriate section.
         * @param {Number} divisionIndex
         */
        moveIndicator: function(divisionIndex){
            var pos,
                navItemsCount = this.$navItems.length - 1; // must subtract one to account for zero-based indexing
            pos = (this.$navBelt.width() / navItemsCount) * divisionIndex - (this.$indicator.width()/2);
            this.$indicator.stop().animate({'left': pos+'px'}, 100, 'linear');
            this.$paginationLinks.removeClass('sp-more-teams-nav-item-link-active');
            this.$paginationLinks.eq(divisionIndex).addClass('sp-more-teams-nav-item-link-active');
        },

        getAnimPosition: function(divisionIndex){
            return - (this.$viewport.outerWidth() * divisionIndex);
        }
    });

    return MoreTeams;
});
