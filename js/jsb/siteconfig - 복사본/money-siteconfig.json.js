{
    "version": 2,
    "pages": [
        {
            "name": "Money Overlay",
            "appName": "Overlay",
            "css": ["money"],
            "urls": [
                "^(money/(economic-calendar|etfs|funds|markets|stocks|lookup)/.*/)$"
            ],
            "preloadedUrl": "money/",
            "init_modules": [
                {
                    "name": "story-market-symbol-search"
                },
                {
                    "name": "form-dropdown"
                }
            ]
        },
        {
            "name": "Money",
            "appName": "Cards",
            "css": ["money"],
            "urls": ["^(money/[a-zA-Z0-9%\\-/\\.]*)$"]
        }
    ],
    "siteModules": {
        "job-search": {
            "path": "modules/money/job-search",
            "selector": ".job-search-module-wrap"
        },
        "market-symbol-search": {
            "path": "modules/money/market-symbol-search"
        },
        "market-summary": {
            "path": "modules/money/market-summary"
        },
        "story-market-symbol-search": {
            "path": "modules/money/market-symbol-search",
            "selector": ".static-money-markets-tool-search-form"
        }
    }
}