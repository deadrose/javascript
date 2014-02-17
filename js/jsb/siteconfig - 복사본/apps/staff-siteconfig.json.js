{
    "version": 2,
    "apps": {
        "StaffBio": {
            "path": "apps/stag-front",
            "css": ["pages/staff"],
            "init_modules": [
                {
                    "name": "footer"
                },
                {
                    "name": "headline-grid"
                }
            ]
        }
    },
    "pages": [
        {
            "name": "Default",
            "appName": "StaffBio",
            "urls": ["^(staff/.*)$"]
        }
    ]
}