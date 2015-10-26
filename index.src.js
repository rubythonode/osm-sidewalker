var tilebelt = require('tilebelt');
var _ = require('lodash');

mapboxgl.accessToken = 'pk.eyJ1IjoidGNxbCIsImEiOiJaSlZ6X3JZIn0.mPwXgf3BvAR4dPuBB3ypfA';

module.exports = function() {
  var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/tcql/ciftz3vmh0015tgkpfyy0rn4l', //stylesheet location
    center: [-73.95706884246236, 40.77904734050378], // starting position
    zoom: 14 // starting zoom
  });


  map.on('style.load', function () {
    var currTile = [];
    var selectedWays = [];

    var selectedTileSource = new mapboxgl.GeoJSONSource({
      data: {
        "type": "Feature", 
        "properties": {}, 
        "geometry": {
          "type": "Point", 
          "coordinates": [0,0]
        }
      }
    });
    map.addSource('selected-tile', selectedTileSource);
    map.addLayer({
        "id": "selected-tile",
        "type": "line",
        "source": "selected-tile",
        "layout": {
            "line-join": "round",
            "line-cap": "round"
        },
        "paint": {
            "line-color": "#d00",
            "line-width": 8
        }
    });


    map.on('mousemove', function (e) {
      var tile = tilebelt.pointToTile(e.lngLat.lng, e.lngLat.lat, 15);

      if (!tilebelt.tilesEqual(tile, currTile)) {
        currTile = tile.slice();
        tile = tilebelt.tileToGeoJSON(tile); 

        selectedTileSource.setData(tile);
        
        var bbox = tilebelt.tileToBBOX(currTile);
        var pxbbox = [map.project([bbox[0], bbox[1]]), map.project([bbox[2], bbox[3]])];

        map.featuresIn(pxbbox, {layer: 'sidewalks-multiregion'}, function (err, features) {
          var selectedFeatures = features.filter(function(elem) {
            return elem.layer.id === 'sidewalks-multiregion'
          });
          var wayIds = selectedFeatures.map(function (elem) {
            return elem.properties._osm_way_id;
          });
          selectedWays = _.uniq(wayIds);

          $("#selected-features-count").text(selectedWays.length);
          $("#selected-features-json").text(JSON.stringify(selectedWays, null, 2));
        });
      }
    });


    map.on('click', function (e) {
      map.featuresAt(e.point, {radius: 5, layer: 'sidewalks-multiregion'}, function (err, sidewalks) {
        if (err) throw err;
        console.log(selectedWays)
        if (selectedWays.length === 0) return;
 
        var btnHtml = "<button id='open_in_josm'>Open in JOSM</button>" + 
          "<hr />" + 
          "<p>Note: JOSM Remote Control must <a href='http://josm.openstreetmap.de/wiki/Help/Preferences/RemoteControl#PreferencesRemoteControl'>be enabled and have HTTPS support turned on</a></p>"


        var tooltip = new mapboxgl.Popup()
          .setLngLat(e.lngLat)

        if (sidewalks.length === 0) {
          tooltip
            .setHTML("<p>This tile has "+selectedWays.length+" unique footways to edit</p>" + btnHtml)
            .addTo(map);
       
          var ways = selectedWays.slice();
          var bounds = tilebelt.tileToBBOX(currTile);

        } else {
          var ways = [sidewalks[0].properties._osm_way_id];
          var bounds = map.getBounds();
          bounds = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
          tooltip
            .setHTML("<pre>" + JSON.stringify(sidewalks[0].properties, null, 2) + "</pre>" + btnHtml)
            .addTo(map);
        }

        $("#open_in_josm").on('click', function () {
          openInJOSM(ways, bounds);
        });
      });
    });
  });
};


function openInJOSM(ways, bounds) {
  var left = bounds[0],
    bottom = bounds[1],
    right = bounds[2],
    top = bounds[3];
  var url = "https://127.0.0.1:8112/load_and_zoom?new_layer=true&left=" + left + "&right=" + right + "&top=" + top + "&bottom=" + bottom + "&select=";
  ways.forEach(function(id) {
    url += "way"+id+","
  });
  window.open(url);
}