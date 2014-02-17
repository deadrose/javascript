/*global google:true*/
define([
    'jquery',
    'underscore',
    'third-party-apis/google/google'
],
function(
    $,
    _,
    GoogleApi
)
    {
    "use strict";
        /**
         * Wrapper for Google Maps API service interactions.
         * @author Mark Kennedy <mdkennedy@gannett.com>
         */
        var GoogleMaps = GoogleApi.extend({

            initialize: function(){
                GoogleApi.prototype.initialize.call(this);
            },

            /**
             * Loads the Google Map API.
             * @returns {Deferred} Resolves true when the script has successfully loaded.
             */
            loadApi: function(){
                return this.loadGoogleApi('maps', '3', {other_params:'sensor=false'});
            },

            /**
             * Gets the location of the user's client (their computer).
             * @returns {*}
             */
            getClientLocation: function() {
                var defer = $.Deferred();
                this.loadScript().done(_.bind(function(data){
                    defer.resolve(data.loader.ClientLocation);
                }, this));
                return defer.promise();
            },

            /**
             * Takes a latitude and longitude and converts it into human-readable form.
             * @param {Number} lat Latitude
             * @param {Number} lon Longitude
             * @returns {Deferred} Returns a promise that resolves when done
             */
            getGeolocation: function(lat, lon){
                var deferred = $.Deferred();
                this.loadApi().done(_.bind(function(){
                    var googleLocationObj = {
                        latLng: this._formatLatLng(lat, lon)
                    };
                    if (!this.geocoder) {
                        this.geocoder = new google.maps.Geocoder();
                    }
                    // fetch location
                    this.geocoder.geocode(googleLocationObj, function(resp){
                        deferred.resolve(resp);
                    });
                }, this));
                return deferred.promise();
            },

            /**
             * Converts a latitude and longitude into a LatLng object that Google understands
             * @param {Number} lat Latitude
             * @param {Number} lon Longitude
             * @private
             */
            _formatLatLng: function(lat, lon){
                return new google.maps.LatLng(lat, lon);
            },

            /**
             * Helper function that normalizes the location into a clean location object
             * @param {Object} locationData location data to format
             * @returns {Object} Returns a location object
             * @private
             */
            formatGeolocationResponse: function(locationData){
                locationData = locationData[0] || locationData;
                var locationObj = {};
                if (locationData) {
                    var addressComponents = locationData.formatted_address.split(', '),
                        address = addressComponents[0],
                        city = addressComponents[1],
                        state_postalCode = addressComponents[2].split(' '),
                        state = state_postalCode[0],
                        postalCode = state_postalCode[1],
                        country = addressComponents[3],
                        latitude = locationData.geometry.location.lat() || "",
                        longitude = locationData.geometry.location.lng() || "";

                    locationObj = {
                        latitude: latitude,
                        longitude: longitude,
                        city: city,
                        state: state,
                        country: country,
                        address: address,
                        postalCode: postalCode
                    };
                }
                return locationObj;
            }

        });

        return new GoogleMaps();
    }
);