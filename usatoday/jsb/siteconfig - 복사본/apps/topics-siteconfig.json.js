{
    "version": 2,
    "apps": {
        "Topics": {
            "path": "apps/stag-front",
            "init_modules": [
                {
                    "name": "footer"
                }
            ]
        }
    },
    "pages": [
        {
            "name": "Default",
            "appName": "Topics",
            "urls": [
                "^(topic/.*)$"
            ]
        }
    ]
}