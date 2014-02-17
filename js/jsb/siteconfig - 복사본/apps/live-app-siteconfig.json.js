{
    "version": 2,
    "apps": {
        "LiveApp": {
            "path": "apps/live_app/live-app-app",
            "selector": ".live-app-view-content-wrapper"
        }
    },
    "pages": [
        {
            "css": ["live-app"],
            "name": "Right Now",
            "appName": "LiveApp",
            "path": "apps/live_app/live-app",
            "urls": ["^(rightnow/.*)$"]
        }
    ]
}