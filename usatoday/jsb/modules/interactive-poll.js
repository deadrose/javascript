/**
 * @fileoverview Interactive Poll
 * @author Jonathan Hensley <jhensley@gannett.com>
 */
define([
    'jquery',
    'underscore',
    'baseview',
    'pubsub',
    'utils',
    'state',
    'cookie'
],
function(
    $,
    _,
    BaseView,
    PubSub,
    Utils,
    StateManager
) {

    /**
     * View class.
     */
    var PollView = BaseView.extend({

        // Events.
        events: {
            'click .story-poll-choices .story-poll-vote-btn' : 'registerVote',
            'click .story-poll-results-btn' : 'revealResults',
            'click .poll-vote-results .story-poll-vote-btn' : 'revealChoices'
        },

        /**
         * Initialize view.
         */
        initialize: function() {
            this.poll_id = this.$el.attr('data-pollid');

            // replace with user-auth
            this.user_id = 'unauthenticated';

            if ($.cookie(this.poll_id)) {
                this.revealResults();
            }
            BaseView.prototype.initialize.apply(this, arguments);
        },

        /**
         * Reveal the poll results
         */
        revealResults: function(vote_id) {
            var $template = this.$('.quickpoll-results'),
                $choices = this.$('.story-poll-choices'),
                $results = this.$('.story-poll-chart'),
                url = '/polls/get/' + this.poll_id + '/';

            StateManager.fetchData(url).done(_.bind(function(data){
                var votes = _.pluck(data[0].answer, 'count'),
                    total = _.reduce(votes, function(memo, num) {
                        return memo + parseFloat(num);
                    }, 0),
                    zero_flag = (total === 0) ? true : false,
                    total_percent = 0;

                // if being called from registerVote(), add 1 to the total.
                if (!isNaN(vote_id)) {
                    total += 1;
                    $.cookie(this.poll_id, true);
                }

                _.each(data[0].answer, function(answer, i){
                    var percent;
                    // if zero total votes, avoid division by zero
                    // if being called from registerVote(), add 1 to that vote.
                    if (!zero_flag) {
                        if (vote_id == i + 1) {
                            answer.count += 1;
                        }
                        percent = Math.round((parseFloat(answer.count) / total) * 100);
                    } else {
                        percent = (vote_id == i) ? 100 : 0;
                    }

                    total_percent += percent;
                    answer.percent = percent;

                    answer.percent_width = percent * 0.8;
                });

                var compiled = _.template($template.html(),{ data: data[0], total: total});

                $choices.hide();
                $results.html(compiled).fadeIn();

                if ($.cookie(this.poll_id)) {
                    $('.poll-vote-results .story-poll-vote-wrapper').hide();
                }
                $results.css('height', 'auto');
            }, this));
        },

        /**
         * Reveal the Snapshot teaser pane where you can vote
         * @param {MouseEvent} e is the element triggering this function
         */
        registerVote: function(e) {
            var answer_id = this.$('.story-poll-answer:checked').val(),
                url = '/polls/save/' + this.poll_id + '/' + this.user_id + '/' + answer_id + '/';

            StateManager.fetchData(url, {'method':'post'}).done(_.bind(function(data){
                if (data) {
                    //track the poll vote
                    PubSub.trigger('uotrack', 'pollvote');
                    this.revealResults(answer_id);
                }
            }, this));

            return false;
        },

        /**
         * Hides the results and shows the choices.
         */
        revealChoices: function() {
            var $choices = this.$('.story-poll-choices'),
            $results = this.$('.story-poll-chart');

            $results.hide();
            $choices.fadeIn();
        }

    });

    /**
     * Return view class.
     */
    return PollView;
});
