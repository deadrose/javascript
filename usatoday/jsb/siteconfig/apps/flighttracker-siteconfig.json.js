
define('libs/require/text!siteconfig/apps/flighttracker-siteconfig.json',[],function () { return '{\n    "version": 2,\n    "pages": [\n        {\n            "name": "Flight Tracker",\n            "appName": "Overlay-with-utility-bar",\n            "path": "apps/overlay/pages/flight-tracker-overlay",\n            "preloadedUrl": "travel/",\n            "urls": [\n                "^(travel/flight-tracker/.*)$"\n            ]\n        }\n    ],\n    "siteModules": {\n        "flight-tracker": {\n            "path": "modules/travel/flight-search"\n        }\n    }\n}';});