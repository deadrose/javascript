{
    "version": 2,
    "apps": {
        "Error": {
            "path": "apps/404",
            "overlay": true,
            "css": "404"
        }
    },
    "pages": [
        {
            "name": "CatchAll",
            "appName": "Error",
            "urls": ["^(errors/.*)$", "^(404.html)$"]
        }
    ]
}