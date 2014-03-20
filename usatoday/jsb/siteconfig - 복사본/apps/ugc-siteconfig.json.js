{
    "version": 2,
    "apps": {
        "UGC": {
            "path": "apps/ugc-app",
            "selector": ".ugc-app",
            "css": ["ugc/ugc"]
        }
    },
    "pages": [
        {
            "name": "UGC Home Page",
            "appName": "UGC",
            "path": "apps/ugc/pages/ugc-front",
            "urls": ["^(yourtake/)$"],
            "init_modules" :[
                {
                    "name":"ugc-featured-content"
                },
                {
                    "name": "ugc-hero",
                    "options": {
                        "ads" : "false",
                        "thumbsSelector": ".ugc-hero-multi-up-thumbs",
                        "fullScreen": "false",
                        "track": "false",
                        "rotate": "true",
                        "autostart": "true"
                    }

                },
                {
                    "name": "ugc-live-feed"
                },
                {
                    "name": "ugc-my-contributions-links"
                }
            ],
            "css": ["ugc-home-page"]
        },
        {
            "name": "UGC Topics Home Page",
            "appName": "UGC",
            "path": "apps/ugc/pages/ugc-front",
            "urls": ["^(yourtake/topics/)$", "^(yourtake/topics/?.*)$"],
            "init_modules" :[
                {
                    "name": "ugc-live-feed"
                },
                {
                    "name":"ugc-featured-content"
                },
                {
                    "name": "ugc-topics-sortby-dropdown"
                },
                {
                    "name": "ugc-my-contributions-links"
                }
            ],
            "css": ["ugc-topics-page"]
        },
        {
            "name": "UGC Topics Page",
            "appName": "UGC",
            "path": "apps/ugc/pages/ugc-front",
            "urls": ["^(yourtake/topics/.*)$"],
            "init_modules" :[
                {
                    "name": "ugc-live-feed"
                },
                {
                    "name":"ugc-featured-content"
                },
                {
                    "name": "ugc-my-contributions-links"
                }
            ],
            "css": ["ugc-topics-page"]
        },
        {
            "name": "UGC Posts",
            "appName": "Overlay-with-utility-bar",
            "css": ["ugc-asset-page"],
            "preloadedUrl": "/yourtake/",
            "init_modules": [
                {
                    "name": "ugc-report-abuse",
                    "options": {
                        "tooltipOptions": {
                            "customPanelClass": "ugc-asset-page-media-item-report-abuse-tooltip-panel",
                            "customTextClass": "ugc-asset-page-media-item-report-abuse-tooltip-text",
                            "position": "left"
                        }
                    }
                },
                {
                    "name": "ugc-asset-gallery",
                    "options": {
                        "ads": "false",
                        "fullScreen": "false",
                        "track": "false"
                    }
                },
                {
                    "name": "ugc-asset-video",
                    "options": {
                        "autostart": "true"
                    }
                }
            ],
            "urls": ["^(yourtake/asset/posts/[a-zA-Z0-9%\\-/\\.]*)$"]
        },
        {
            "name": "UGC Profile",
            "appName": "Users",
            "path": "apps/ugc/pages/ugc-front",
            "css": ["ugc-user-profile-page"],
            "urls": ["^yourtake/profile/[a-zA-Z0-9%\\-/\\.]*$"],
            "init_modules" :[
                {
                    "name":"ugc-featured-content"
                }
            ]
        },
        {
            "name": "UGC FAQ",
            "appName": "Overlay-with-footer",
            "urls": ["^(yourtake/faq/)$"],
            "preloadedUrl": "/yourtake/"
        }
    ],
    "siteModules": {
        "utility-bar-modules-ugc": {
            "path": "modules/stories/utility-bar-modules-ugc",
            "selector": ".util-bar-modules-ugc",
            "css": "ugc/utility-bar"
        },
        "ugc-featured-content": {
            "path": "modules/fronts/featured-content",
            "selector": ".ugc-featured-content-modules",
            "css": "modules/ugc-featured-content/ugc-featured-content"
        },
        "ugc-headline-grid": {
            "css": "modules/ugc-headline-grid/ugc-headline-grid"
        },
        "ugc-live-feed": {
            "css": "modules/ugc-live-feed/ugc-live-feed"
        },
        "ugc-hero": {
            "path": "modules/carousel/carousel",
            "selector": ".ugc-hero",
            "css": "modules/ugc-hero/ugc-hero"
        },
        "ugc-report-abuse": {
            "path": "modules/ugc/report-abuse",
            "selector": ".ugc-asset-page"
        },
        "ugc-asset-gallery": {
            "path": "modules/carousel/carousel",
            "selector": ".ugc-asset-page-gallery"
        },
        "ugc-asset-video": {
            "path": "modules/global/brightcove-video",
            "selector": ".video"
        },
        "ugc-topics-sortby-dropdown": {
            "path": "ui/dropdown",
            "selector": ".ugc-topics-filter-sortby-dropdown"
        },
        "ugc-my-contributions-links": {
            "path": "modules/ugc/my-contributions-links",
            "selector": ".ugc-page-container"
        }
    }

}