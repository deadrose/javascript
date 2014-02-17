{
    "version": 2,
    "apps": {
        "Overlay-with-arrows": {
            "path": "apps/overlay/overlay",
            "overlay": true,
            "init_modules": [
                {
                    "name": "utility-bar"
                },
                {
                    "name": "recommended-flyout"
                }
            ]
        },
        "Overlay-with-utility-bar": {
            "path": "apps/simple-overlay",
            "overlay": true,
            "css": ["utility-bar"],
            "init_modules": [
                {
                    "name": "utility-bar"
                }
            ]
        },
        "Overlay-with-footer": {
            "path": "apps/simple-overlay",
            "overlay": true,
            "init_modules": [
                {
                    "name": "footer"
                }
            ]
        },
        "Overlay": {
            "path": "apps/simple-overlay",
            "css": ["story-article", "story-grid", "story-navbar", "stories/sponsored-series", "stories/story-right-rail"],
            "overlay": true
        }
    }
}