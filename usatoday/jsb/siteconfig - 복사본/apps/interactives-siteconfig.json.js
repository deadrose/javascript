{
    "apps": [
        {
            "name": "Interactives",
            "path": "apps/interactives",
            "pages": [
                {
                    "name": "Interactive",
                    "buildfile": {
                        "path": "buildfiles/interactives"
                    },
                    "path": "apps/overlay/pages/interactive-overlay",
                    "urls": ["^(interactive/.*)$"]
                }
            ]
        }
    ]
}