{
    "require": {
        "paths": {
            "touchswipe": "libs/jquery/plugins/jquery.touchSwipe"
        },
        "shim": {
            "libs/flot/jquery.flot": ["libs/flot/excanvas"],
            "libs/flot/jquery.flot.multibars": ["libs/flot/jquery.flot"],
            "libs/flot/jquery.flot.usat.style": ["libs/flot/jquery.flot"],
            "libs/flot/jquery.flot.usat.pie": ["libs/flot/jquery.flot"]
        }
    },
    "siteModules": {
        "interactive_barchart": {
            "path": "modules/interactives/bar-chart",
            "selector": ".interactive.bar-chart"
        },
        "interactive_linechart": {
            "path": "modules/interactives/line-chart",
            "selector": ".interactive.line-chart"
        },
        "interactive_piechart": {
            "path": "modules/interactives/pie-chart",
            "selector": ".interactive.pie-chart"
        },
        "interactive_beforeandafter": {
            "path": "modules/interactives/before-after",
            "selector": ".interactive.before-after"
        },
        "interactive_overview": {
            "path": "modules/interactives/overview",
            "selector": ".interactive.overview"
        },
        "interactive_timeline": {
            "path": "modules/interactives/timeline",
            "selector": ".interactive.timeline"
        },
        "interactive_sequencer": {
            "path": "modules/interactives/sequencer",
            "selector": ".interactive.sequencer"
        }
    }
}