{
    "version": 2,
    "pages": [
        {
            "name": "Travel",
            "appName": "Cards",
            "urls": [
                "^(travel/[a-zA-Z0-9%\\-/\\.#]*)$"
            ],
            "init_modules": [
                {
                    "name": "footer"
                }
            ]
        }
    ],
    "siteModules": {
        "hotelme": {
            "path": "modules/travel/hotelme",
            "selector": ".hotelme-wrapper"
        },
        "kayak-widget": {
            "path": "modules/travel/kayak-modules",
            "css": "modules/travel/kayak-modules"
        },
        "travel-experience": {
            "path": "modules/travel/travel-experience",
            "css": "modules/travel/travel-experience"
        },
        "tripology": {
            "path": "modules/travel/tripology",
            "css": "modules/travel/tripology"
        },
        "shermans-deals": {
            "path": "modules/travel/shermans",
            "css": "modules/travel/shermans"
        }
    }
}