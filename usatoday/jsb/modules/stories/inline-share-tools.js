/**
 * @fileoverview inline share icons.
 * @author Robert Huhn
 */
define([
    'jquery',
    'baseview',
    'pubsub',
    'state'
],
function(
    $,
    BaseView,
    PubSub,
    StateManager
) {
    var InlineShareTools = BaseView.extend({

        events: {
            'click .inline-share-btn' : 'onClickInlineShareBtn'
        },

        onClickInlineShareBtn: function(e) {
            var $btn = $(e.currentTarget);
            if ($btn.prop('tagName') !== 'A') {
                e.preventDefault();
                var shareMethod = $(e.currentTarget).data('share-method');
                StateManager.getActiveApp().$('.util-bar-btn-' + shareMethod).trigger('click');
            }
        }
    });
    return InlineShareTools;
});
