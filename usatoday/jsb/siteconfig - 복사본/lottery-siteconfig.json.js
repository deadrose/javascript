{
    "version": 2,
    "pages": [
        {
            "name": "Lottery Overlay",
            "appName": "Overlay-with-arrows",
            "css": ["life"],
            "urls": [
                "^(lottery/.*/)$"
            ],
            "init_modules": [
                {
                    "name": "form-dropdown"
                },
                {
                    "name": "poster-ad-asset"
                }
            ]
        }
    ],
    "siteModules": {
        "lottery": {
            "path": "modules/fronts/lottery",
            "selector": ".lottery-module-content"
        }
    }
}
