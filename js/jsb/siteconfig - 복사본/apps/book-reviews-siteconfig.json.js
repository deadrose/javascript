{
    "version": 2,
    "pages": [
        {
            "name": "Best Selling Book List",
            "appName": "Cards",
            "css": ["book-reviews"],
            "urls": ["^(life/books/best-selling/.*)$"]
        },
        {
            "name": "Book Review Detail Page",
            "appName": "Overlay-with-arrows",
            "path": "apps/overlay/pages/story-overlay",
            "css": ["book-reviews"],
            "urls": ["^(story/life/books/.*)$"],
            "init_modules": [
                {
                    "name": "booksAssetView"
                },
                {
                    "name": "taboola-outbrain-recommendations"
                },
                {
                    "name": "form-dropdown"
                }
            ]
        }
    ],
    "siteModules": {
        "booklist": {
            "path": "modules/book-reviews/booklist",
            "selector": ".front-booklist-page-container"
        },
        "booksthreeup": {
            "path": "modules/book-reviews/books-three-up",
            "selector": ".module-books-three-up"
        },
        "booksAssetView": {
            "path": "apps/overlay/pages/book-reviews-overlay",
            "selector": ".books-meta-comp"
        }
    }
}