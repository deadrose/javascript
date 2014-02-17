{
    "apps": [
        {
            "name": "Cards",
            "path": "apps/cards/cards",
            "pages": [
                {
                    "name": "Weather",
                    "path": "apps/cards/pages/weather-card",
                    "css": ["weather"],
                    "urls": ["^(weather/[a-zA-Z0-9%\\-/\\.]*)$"]
                }
            ],
            "init_modules": [
                {
                    "name": "footer"
                }
            ]
        }
    ]
}