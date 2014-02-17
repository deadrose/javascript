{
    "version": 2,
    "pages": [
        {
            "name": "Story",
            "path": "apps/overlay/pages/story-overlay",
            "appName": "Overlay-with-arrows",
            "urls": [
                "^((story|article)/.*/)$"
            ],
            "init_modules": [
                {
                    "name": "iframe-auto-height"
                },
                {
                    "name": "taboola-outbrain-recommendations"
                }
            ]
        }
    ]
}