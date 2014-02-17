/*
 * Flot plugin for customizing USA Today Bar Charts 
 * Built to accept canvas patterns
 * Created by Brian Stan Wilson Jr, August 2012
 */

(function ($) {
    function init(plot) {

        // Add hook to determine if pie plugin in enabled, and then perform necessary operations
        plot.hooks.draw.push(addStyle);
        //plot.hooks.bindEvents.push(bindEvents);   

        // Check to see if the pie plugin is enabled
        function addStyle(plot) {

            var elem = document.createElement('canvas');

            if (!!(elem.getContext && elem.getContext('2d'))) {     
                 var ctx = plot.getCanvas().getContext("2d"),
                    canvasWidth =  plot.width()+ 100,
                    canvasHeight  =  plot.height()+50;
            }
        }
     
     
    }
    
    // Define pie specific options and their default values
    var options = {};
    
    $.plot.plugins.push({
        init: init,
        options: options,
        name: "style ",
        version: "0.05"
    });
})(jQuery);
