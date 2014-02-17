/*global L:true*/
define([
    'jquery',
    'underscore',
    'state',
    'baseview',
    'leaflet'
],
function(
    $,
    _,
    StateManager,
    BaseView
) {
    "use strict";

    /**
     * View class.
     */
    var Map = BaseView.extend({

        /**
         * @classdesc Map
         * @author Mark Kennedy <mdkennedy@gannett.com>
         */
        initialize: function(options) {

            options = $.extend(true, {
                latitude: 0,
                longitude: 0,
                currentLocationMarker: true,
                addMapLabel: false,
                mapLabelClass: null,
                defaultZoom: null,
                mapUrl: null,
                mapOptions: {
                    trackResize: false,
                    scrollWheelZoom: false,
                    zoomControl: false,
                    attributionControl: false // turn off 'powered by leaflet' attribution
                }
            }, options);

            BaseView.prototype.initialize.call(this, options);

            _.bindAll(this, '_onGetMapTilesSuccess');

            this.createMap(options.latitude, options.longitude);
        },

        /**
         * Takes a location object and renders the map.
         * @param {Number} latitude
         * @param {Number} longitude
         */
        createMap: function(latitude, longitude) {
            var zoom, mapData = this.$el.data() || {},
                url = mapData.attrMapurl || this.options.mapUrl,
                lat = parseFloat(mapData.latitude) || latitude,
                lon = parseFloat(mapData.longitude) || longitude;

            if (!url) {
                // maps aren't very good without map data urls
                return;
            }

            zoom = parseInt(mapData.attrZoom, 10) || this.options.defaultZoom;
            if (mapData.attrSize === "L") {
                this.options.mapOptions.zoomControl = true;
            }
            this.map = this.buildMap();

            this.setLocation(lat, lon, zoom);
            this.getMapTiles(url);
        },
        /**
         * Builds map element and instance.
         * @returns {L.Map} Returns the map instance
         */
        buildMap: function() {
            this.$mapEl = $('<div class="standard-app-map"></div>');
            this.$el.html(this.$mapEl);
            if (this.options.addMapLabel) {
                this.$mapLabel = this.buildMapLabel();
                this.$el.append(this.$mapLabel);
            }
            return new L.Map(this.$mapEl[0], this.options.mapOptions);
        },

        /**
         * Adds map label and map empty divs to the current el
         * @returns {jQuery} $label Returns the label element
         */
        buildMapLabel: function(){
            var $label = $('<span class="standard-app-map-location-label">');
            // add custom label class if exists
            if (this.options.mapLabelClass) {
                $label.addClass(this.options.mapLabelClass);
            }
            return $label;
        },

        /**
         * Sets current location for marker
         * @param lat
         * @param lon
         */
        setCurrentLocationMarker: function(lat, lon) {
            if (!this.options.currentLocationMarker) {
                return;
            }
            var latLng = new L.LatLng(lat, lon);
            if (this.currentLocationMarker){
                this.currentLocationMarker.setLatLng(latLng);
            } else {
                var staticPath = window.site_static_url;
                var MyIcon = L.Icon.extend({
                    options: {
                        iconUrl: staticPath + '/images/modules/maps/marker.png',
                        shadowUrl: staticPath + '/images/modules/maps/marker-shadow.png',
                        iconSize:     [25, 41], // size of the icon
                        shadowSize:   [41, 41], // size of the shadow
                        iconAnchor:   [11, 41], // point of the icon which will correspond to marker's location
                        shadowAnchor: [11, 41]  // the same for the shadow
                    }
                });
                var icon = new MyIcon();
                this.currentLocationMarker = new L.Marker(latLng, {icon: icon, zIndexOffset: 1000});
                this.map.addLayer(this.currentLocationMarker);
            }
        },

        /**
         * Removes the location marker.
         */
        removeCurrentLocationMarker: function() {
            if (this.currentLocationMarker) {
                this.map.removeLayer(this.currentLocationMarker);
                this.currentLocationMarker = null;
            }
        },

        /**
         * Sets map location using a location object.
         * @param {Number} lat
         * @param {Number} lon
         * @param {Number} zoom zoom level
         */
        setLocation: function(lat, lon, zoom) {
            var latLng = new L.LatLng(lat, lon);

            // Update map center.
            zoom = zoom || this.map.getZoom();
            this.map.setView(latLng, zoom, true);

            this.setCurrentLocationMarker(lat, lon);
        },

        /**
         * Loads map tiles.
         * The MapBox jsonp response is hardcoded to grid (yuck).
         * When multiple map instances are being created rapidly,
         * this code prevents concurrent requests from colliding (they all
         * try to use the same window.grid function -- jQuery always assumes
         * the jsonpCallback is undefined and throws a type error).
         * @param {String} url URL to map tiles
         */
        getMapTiles: function(url) {
            StateManager.fetchData(url, {
                dataType: 'jsonp'
            }).done(this._onGetMapTilesSuccess);
        },

        /**
         * When map fetches map tiles successfully.
         * @param {Object} tilejson
         */
        _onGetMapTilesSuccess: function(tilejson){
            var Connector = L.TileLayer.extend({
                initialize: function(options) {
                    options = options || {};
                    options.minZoom = options.minzoom || 0;
                    options.maxZoom = options.maxzoom || 22;
                    L.TileLayer.prototype.initialize.call(this, options.tiles[0], options);
                }
            });
            this.tiles = new Connector(tilejson);
            this.map.addLayer(this.tiles);
        },

        /**
         * Updates map label.
         * @param {String} text Text to set
         */
        setMapLabel: function(text){
            if (this.$mapLabel) {
                this.$mapLabel.text(text);
            }
        },

        /**
         * Destroys the view.
         * @param removeEl
         */
        destroy: function(removeEl) {
            if (this.tiles) {
                this.map.removeLayer(this.tiles);
                this.tiles = null;
            }
            if (this.$mapLabel) {
                this.$mapLabel.remove();
            }
            if (this.$mapEl) {
                this.$mapEl.remove();
            }
            this.map = null;
            BaseView.prototype.destroy.call(this, removeEl);
        }

    });


    /**
     * Return view class.
     */
    return Map;
});
