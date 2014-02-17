/**
 * @fileoverview Expand Static Overlay FAQ.
 * @author Jay Merrifield
 */
define(['jquery', 'baseview'],
    function($, BaseView) {
        var ExpandFaqView = BaseView.extend({
            events: {
                'click a': 'expandFaq'
            },

            expandFaq: function(e){
                var $link = $(e.target);
                var $answer = $link.next();
                if ($answer.is(':visible')){
                    $link.parent().removeClass('active');
                    $answer.slideUp(200);
                }else{
                    $link.parent().addClass('active');
                    $answer.slideDown(200);
                }
            }
        });
        return ExpandFaqView;
    }
);