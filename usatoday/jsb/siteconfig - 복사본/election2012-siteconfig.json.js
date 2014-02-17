{
    "apps": [
        {
            "name": "Topics",
            "path": "apps/stag-front",
            "pages": [
                {
                    "name": "Default",
                    "urls": [
                        "^(election-2012/.*)$"
                    ]
                }
            ],
            "init_modules": [
                {
                    "name": "footer"
                },
                {
                    "name": "election-2012"
                }
            ]
        }
    ],
    "siteModules": {
        "election-2012": {
            "path": "apps/election-2012",
            "selector": "#elections-2012"
        }
    }
}