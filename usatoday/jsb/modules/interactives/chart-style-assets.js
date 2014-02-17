/**
 * @fileoverview Chart Styles (interactive) view.
 * @author Stan Wilson Jr
 */
define([
],
function(
){
    return {
        createPattern : function(color){
            var elem = document.createElement('canvas');
            if( !! ( elem.getContext && elem.getContext('2d')  ) ){
                var pattern = document.createElement('canvas');
                pattern.width = 6;
                pattern.height = 6;
                pattern.setAttribute("id","chart-pattern");
                var pctx = pattern.getContext('2d');
                pctx.moveTo(0, 0);
                pctx.lineTo(200, 200);
                pctx.strokeStyle = (color)? color : "rgba(256,256,256,0.5)";
                pctx.stroke();
                return pattern;
            }
        },
        color :  {
            news : [
                'rgb(14,81,136)',
                'rgb(36,121,188)',
                'rgb(53,149,225)',
                'rgb(121,188,243)',
                'rgb(169,215,249)',
                'rgb(173,222,253)',
                'rgb(204,238,255)'
            ],
            money : [
                'rgb(9,96,17)',
                'rgb(28,129,35)',
                'rgb(68,164,75)',
                'rgb(112,187,118)',
                'rgb(152,212,159)',
                'rgb(173,226,192)',
                'rgb(209,237,218)'
            ],
            sports : [
                'rgb(114,15,0)',
                'rgb(156,20,0)',
                'rgb(184,24,0)',
                'rgb(207,88,71)',
                'rgb(215,130,116)',
                'rgb(247,181,172)',
                'rgb(249,229,228)'
            ],
            life : [
                'rgb(81,7,100)',
                'rgb(109,14,134)',
                'rgb(150,0,190)',
                'rgb(191,120,209)',
                'rgb(206,159,219)',
                'rgb(223,173,232)',
                'rgb(236,211,242)'
            ],
            tech : [
                'rgb(154,60,2)',
                'rgb(206,80,2)',
                'rgb(237,108,20)',
                'rgb(250,132,60)',
                'rgb(242,168,123)',
                'rgb(254,205,173)',
                'rgb(255,232,220)'
            ],
            weather : [
                'rgb(186,140,0)',
                'rgb(225,169,0)',
                'rgb(245,188,13)',
                'rgb(250,210,88)',
                'rgb(249,219,130)',
                'rgb(254,237,175)',
                'rgb(252,242,214)'
            ],
            travel : [
                "rgb(9,132,132)",
                "rgb(1,168,168)",
                "rgb(0,195,195)",
                "rgb(106,211,211)",
                "rgb(147,211,211)",
                "rgb(173,235,234)",
                "rgb(215,244,242)"
            ],
            opinion : [
                "rgb(65,65,65)",
                "rgb(81,81,81)",
                "rgb(102,102,102)",
                "rgb(156,156,156)",
                "rgb(188,188,188)",
                "rgb(210,210,210)",
                "rgb(238,238,238)"
            ]
        }
    };
});
