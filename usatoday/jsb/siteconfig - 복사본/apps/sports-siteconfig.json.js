{
    "version": 2,
    "require": {
        "paths": {
            "chosen": "libs/jquery/plugins/chosen.jquery.min",
            "bxslider": "libs/jquery/plugins/jquery.bxslider.min"
        },
        "shim": {
            "chosen": ["jquery"],
            "bxslider": ["jquery"]
        }
    },
    "pages": [
        {
            "name": "Sports Player",
            "appName": "Overlay-with-utility-bar",
            "path": "apps/overlay/pages/player-overlay",
            "preloadedUrl": "sports/",
            "css": [ "sports", "sports-logos" ],
            "urls": [ "^(sports/[a-zA-Z]+/player/.*)$" ],
             "init_modules": [
                {
                    "name": "gallery"
                },
                {
                    "name": "sports-datatables"
                },
                {
                    "name": "sports-more-teams-college"
                }
            ]
        },
        {
            "name": "Sports BoxScores",
            "appName": "Overlay",
            "buildfile": {
                "path": "buildfiles/sports-boxscore"
            },
            "path": "apps/overlay/pages/boxscore-overlay",
            "preloadedUrl": "sports/",
            "css": [ "sports", "sports-logos" ],
            "urls": [ "^(sports/[a-zA-Z]+/game/.*)$" ],
            "init_modules": [
                {
                    "name": "gallery"
                }
            ]
        },
        {
            "name": "Final Four Bracket",
            "appName": "Overlay-with-utility-bar",
            "path": "apps/overlay/pages/finalfourbracket-overlay",
            "preloadedUrl": "sports/",
            "css": [ "sports", "sports-logos" ],
            "urls": [ "^(sports/[a-zA-Z]+/bracket/.*)$" ]
        },
        {
            "name": "Sports Story Overlay",
            "appName": "Overlay-with-arrows",
            "path": "apps/overlay/pages/sports-story-overlay",
            "preloadedUrl": "sports/",
            "css": [ "sports", "sports-logos" ],
            "urls": [ "^(story/sports/.*)" ],
            "init_modules": [
                {
                    "name": "iframe-auto-height"
                },
                {
                    "name": "taboola-outbrain-recommendations"
                },
                {
                    "name": "nfl-unitedway"
                }
            ]
        },
        {
            "name": "Sports",
            "appName": "Cards",
            "buildfile": {
                "path": "buildfiles/sports",
                "modules": [
                    "sports-scores-suspender"
                ]
            },
            "path": "apps/cards/pages/sports-card",
            "css": [ "sports", "sports-logos" ],
            "urls": [ "^(sports/[a-zA-Z0-9%\\-/\\.#]*)$" ],
            "init_modules": [
                {
                    "name": "sports-filters"
                },
                {
                    "name": "scores-page"
                },
                {
                    "name": "sports-leagues"
                },
                {
                    "name": "sports-nav"
                },
                {
                    "name": "sports-player-news"
                },
                {
                    "name": "sports-popup"
                },
                {
                    "name": "sports-jumptotop"
                },
                {
                    "name": "sports-datatables"
                },
                {
                    "name": "sports-leader-rotate"
                },
                {
                    "name": "utility-bar"
                },
                {
                    "name": "sports-event-tool"
                },
                {
                    "name": "sports-ballots"
                }
            ]
        },
        {
            "name": "Video Big Board",
            "appName": "Topics",
            "css": [ "sports", "sports-logos" ],
            "urls": [ "^(topic/.*/video-big-board/)$" ],
            "init_modules": [
                {
                    "name": "sports-video"
                },
                {
                    "name": "sports-featured-content"
                },
                {
                    "name": "utility-bar"
                }
            ]
        },
        {
            "name": "Fantasy Football Draft Kit",
            "appName": "Topics",
            "css": [ "sports", "sports-logos" ],
            "urls": [ "^(topic/.*/fantasy-football-draft-kit/)$" ]
        },
        {
            "name": "Fantasy Football Week In America",
            "appName": "Topics",
            "css": [ "sports", "sports-logos" ],
            "urls": [ "^(topic/.*/fantasy-football-week-in-america/)$" ],
            "init_modules": [
                {
                    "name": "sports-video"
                }
            ]
        },
        {
            "name": "Spanning the SEC",
            "appName": "Topics",
            "css": [ "sports", "sports-logos" ],
            "urls": [ "^(topic/.*/spanning-the-sec/)$" ]
        }
    ],
    "siteModules": {
        "sports-nav": {
            "path": "modules/sports/sports-nav",
            "selector": ".sp-nav-wrap"
        },
        "sports-filters": {
            "path": "modules/sports/sports-filters",
            "selector": ".sp-filter-bar-wrap"
        },
        "sports-scores-suspender": {
            "path": "modules/sports/sports-scores-suspender",
            "selector": "#scores"
        },
        "scores-page": {
            "path": "modules/sports/scorespage",
            "selector": "#scorespage"
        },
        "sports-leagues": {
            "path": "modules/sports/leagues",
            "selector": "#section_sports"
        },
        "sports-galleries": {
            "path": "modules/fronts/front-galleries"
        },
        "sports-team-matchup": {
            "path": "modules/sports/sports-team-matchup"
        },
        "sports-more-teams": {
            "path": "modules/sports/sports-more-teams"
        },
         "sports-more-teams-college": {
            "path": "modules/sports/sports-more-teams-college",
            "selector": "#sp-more-teams-slider"
        },
        "sports-jumptotop": {
            "path": "modules/sports/sports-jumptotop",
            "selector": "#section_sports"
        },
        "sports-player-news": {
            "path": "modules/sports/sports-player-news",
            "selector": "#player-news-page"
        },
        "sports-latest-player-news": {
            "path": "modules/sports/sports-latest-player-news"
        },
        "sports-team-statistics": {
            "path": "modules/sports/sports-team-statistics"
        },
        "sports-team-leaders": {
            "path": "modules/sports/sports-team-leaders"
        },
        "sports-popup": {
            "path": "modules/sports/popup-details",
            "selector": "#section_sports"
        },
        "sports-datatables": {
            "path": "modules/sports/sports-datatables",
            "selector": "#section_sports"
        },
        "sports-front-galleries": {
            "path": "modules/sports/sports-front-galleries"
        },
        "sports-featured-content": {
            "path": "modules/fronts/featured-content"
        },
        "sports-video": {
            "path": "modules/sports/sports-video",
            "selector": ".hero-3up"
        },
        "sports-leader-rotate": {
            "path": "modules/sports/sports-leader-rotate",
            "selector": ".sp-leader-rotate"
        },
        "sports-countdown": {
            "path": "modules/sports/sports-countdown"
        },
        "sports-multipurpose-promo": {
            "path": "modules/sports/sports-multipurpose-promo"
        },
        "sports-twitter": {
            "path": "modules/sports/sports-twitter"
        },
        "nfl-unitedway": {
            "path": "modules/sports/nfl-unitedway",
            "selector": "#nfl-unitedway-subscribe"
        },
        "sports-headline-grid": {
            "css": "modules/headlines"
        },
        "sports-news": {
            "path": "modules/sports/sports-news"
        },
        "sports-front-video": {
            "path": "modules/sports/sports-front-video"
        },
        "sports-story-video": {
            "path": "modules/sports/sports-story-video"
        },
        "sports-event-tool": {
            "path": "modules/sports/sports-event-tool",
            "selector": "#section_sports"
        },
        "sports-video-ooyala": {
            "path": "modules/sports/sports-video-ooyala",
            "selector": ".sports-ooyala"
        },
        "sports-ballots": {
            "path": "modules/sports/sports-ballots",
            "selector": ".sports-coaches-ballots"
        }
    }
}
