{
    "version": 2,
    "global": {
        "modules": [
            "modules/global/header",
            "raven.setup", 
            "analytics/settealium",
            "third-party-apis/facebook/facebook",
            "third-party-apis/google/google",
            "user-accounts/facebook-user-account",
            "user-accounts/googleplus-user-account"
        ]
    },
    "pages": [
        {
            "name": "ContactUs",
            "appName": "Overlay",
            "path": "apps/overlay/pages/contact-us-overlay",
            "urls": ["^(contactus.*)$"],
            "init_modules": [
                {
                    "name": "static-story-expand-faq"
                },
                {
                    "name": "footer"
                }
            ]
        },
        {
            "name": "StaticContent",
            "appName": "Overlay",
            "urls": ["^(social-player.*|shop.*|about.*|rss.*|mobile-apps.*|mediakit.*|press-bios.*|reporters.*|legal.*|editorial-policy.*|conversation-guidelines.*|interactives/tv-on-the-web.*)$"],
            "init_modules": [
                {
                    "name": "static-story-expand-faq"
                },
                {
                    "name": "footer"
                }
            ]
        },
        {
            "name": "Life",
            "appName": "Cards",
            "css": ["life"],
            "urls": ["^(life/[a-zA-Z0-9%\\-/\\.]*)$"]
        },
        {
            "name": "Puzzles Flash legacy",
            "appName": "Overlay",
            "path": "apps/overlay/pages/puzzles-overlay",
            "preloadedUrl": "http://www.usatoday.com/life/",
            "css": ["puzzles"],
            "urls": [
                "^((puzzles/legacy)(|/.*))$"
            ],
            "hosturls": {
                "puzzles.usatoday.com": [
                    "^(|crossword|dont-quote-me|minisudoku|quickcross|sudoku|upanddown|wordroundup)/*$"
                ]
            }
        },
        {
            "name": "Home",
            "appName": "Cards",
            "urls": ["^()$", "^(index.html)$"],
            "init_modules": [
                {
                    "name": "snapshots"
                }
            ]
        }
    ]
}