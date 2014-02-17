/**
 * @fileoverview Snapshots view.
 * @author Jonathan Hensley <jhensley@gannett.com>
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'state',
    'cookie'
],
function(
    $,
    _,
    BaseView,
    StateManager
) {


    /**
     * View class.
     */
    var SnapshotsView = BaseView.extend({

        el: '.front-galleries-module',

        // Events.
        events: {
            'click a.vote' : 'revealQuickQuestion',
            'click .snap-vote a.cancel' : 'revealSnapshotTeaser',
            'click a.snap-vote-btn' : 'registerVote'
        },

        /**
         * Initialize view.
         */
        initialize: function() {
            BaseView.prototype.initialize.apply(this, arguments);

            this.render();
        },

        /**
         * Render the module.
         */
        render: function() {
            //check for if snapshots already exisits
            if($("#snapshots").length <= 0){
                var injectLoc = this.$('.front-galleries-suspender li:first-child');
                injectLoc.after('<li data-id="gallery" id="snapshots" class="front-gallery-item" data-href="/services/snapshots/gallery/"><a class="front-gallery-link" href="/services/snapshots/gallery/" data-href="/services/snapshots/gallery/">Snapshots</a></li>');
            }
        },

        /**
         * Reveal the QuickQuestion pane where you can vote
         * @param {object} e is the element triggering this function
         */
        revealQuickQuestion: function(e) {
            var $question = $(e.currentTarget).closest('.snapshot-card');

            $('.snapshot', $question).hide();
            $('.snap-vote', $question).not('.results').fadeIn();
        },

        /**
         * Reveal the Snapshot teaser pane where you can vote
         * @param {object} e is the element triggering this function
         */
        revealSnapshotTeaser: function(e) {
            var $question = $(e.currentTarget).closest('.snapshot-card');

            $('.snap-vote', $question).hide();
            $('.snapshot', $question).fadeIn();
        },

        /**
         * Reveal the Snapshot teaser pane where you can vote
         * @param {object} e is the element triggering this function
         * @param {string} htmlFrag is the javascript rendered template fragment
         */
        revealResults: function(e, htmlFrag) {
            var $question = $(e.currentTarget).closest('.snapshot-card');

            if ($question.find('.snap-vote.results').length) {
                $question.find('.snap-vote.results').replaceWith(htmlFrag);
            } else {
                $question.append(htmlFrag);
            }

            $('.snap-vote', $question).hide();
            $('.snap-vote.results', $question).fadeIn();
        },

        /**
         * Reveal the Snapshot teaser pane where you can vote
         * @param {object} e is the element triggering this function
         */
        registerVote: function(e) {
            var $question = $(e.currentTarget).closest('.snapshot-card'),
                answer = $(e.currentTarget).attr('data-answer-id'),
                url = '/services/snapshots/vote/' + answer + '/';

            $(e.currentTarget).addClass('loading');

            var snapID = $('.slide.active[data-qqid]', this.el).attr('data-qqid');

            if ($.cookie(snapID)) {
                url = '/services/snapshots/get/' + snapID + '/';
            }

            this.ajax = StateManager.fetchData(url).done(_.bind(function(data){
                var votes = _.pluck(data.question[0].location[0].answer, 'answerCount'),
                    total = _.reduce(votes, function(memo, num) {
                        return memo + parseFloat(num);
                    }, 0),
                    length = data.question[0].location[0].answer.length - 1,
                    total_percent = 0;

                _.each(data.question[0].location[0].answer, function(answer, i){

                    var percent = Math.round((parseFloat(answer.answerCount) / total) * 100);

                    // if on the last iteration - the percentage is all the others minus 100
                    // guaranteeing we never end up over 100 (i can haz math!)
                    if (i === length) {
                        percent = 100 - total_percent;
                    // otherwise increment the total percentage point
                    } else {
                        total_percent += percent;
                    }

                    answer.answerPercent = percent;
                });

                var $template = $('#snapshot-results'),
                    compiled = _.template($template.html(),{ data: data.question[0]});

                this.revealResults(e, compiled);

                $(e.currentTarget).removeClass('loading');

                $.cookie(snapID, true);

            }, this));

        }

    });

    /**
     * Return view class.
     */
    return SnapshotsView;
});
