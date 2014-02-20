{
    "version": 2,
    "apps": {
        "Cards": {
            "path": "apps/cards/cards",
            "css": ["cards", "sidebar"],
            "init_modules": [
                {
                    "name": "footer"
                }
            ]
        }
    },
    "pages": [
        {
            "name": "Generic Section",
            "appName": "Cards",
            "urls": [
                "^(<%=site_vars.sections%>)/.*$",
                "^()$",
                "^(index.php)$",
                "^(section/[a-zA-Z0-9%\\-/\\.]*)$"
            ]
        }
    ]
}