{
    "version": 2,
    "apps": {
        "Blog": {
            "path": "apps/stag-front",
            "css": "blog",
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
            "appName": "Blog",
            "urls": ["^(blog/.*)$"]
        }
    ]
}