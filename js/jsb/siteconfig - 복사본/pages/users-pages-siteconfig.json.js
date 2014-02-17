{
    "version": 2,
    "apps": {
        "Users": {
            "path": "base-app",
            "selector": ".something"
        }
    },
    "pages": [
        {
            "name": "Profile Page",
            "appName": "Users",
            "urls": [
                "^(profile/[0-9]+/)$"
            ],
            "css": ["users"]
        }
    ]
}