{
    "version": 2,
    "pages": [
        {
            "name": "Flight Tracker",
            "appName": "Overlay-with-utility-bar",
            "path": "apps/overlay/pages/flight-tracker-overlay",
            "preloadedUrl": "travel/",
            "urls": [
                "^(travel/flight-tracker/.*)$"
            ]
        }
    ],
    "siteModules": {
        "flight-tracker": {
            "path": "modules/travel/flight-search"
        }
    }
}