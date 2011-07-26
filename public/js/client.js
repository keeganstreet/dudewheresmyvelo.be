/*globals google */

var velo = (function(module) {

  var map, centerOnAntwerp, mapCentered = false, userMarker,
    antwerp = new google.maps.LatLng(51.211078, 4.414272),
    infoWindow = new google.maps.InfoWindow(),
    iconPerson = '/images/person.png',
    iconRed = '/images/cycling-red.png',
    iconGray = '/images/cycling-gray.png',
    iconPurple = '/images/cycling-purple.png',
    iconGreen = '/images/cycling-green.png';

  map = new google.maps.Map(document.getElementById('map_canvas'), {
    zoom: 15,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  centerOnAntwerp = function() {
    mapCentered = true;
    map.setCenter(antwerp);
  };

  // Center the map
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(function(position) {
      var marker, loc = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      if (!mapCentered) {
        // If they are not in Antwerp, just center the map in Antwerp
        if (position.coords.longitude > 4.449977874755859 || position.coords.longitude < 4.375820159912109 || position.coords.latitude > 51.23322501998357 || position.coords.latitude < 51.1855840469278) {
          centerOnAntwerp();
        } else {
          mapCentered = true;
          map.setCenter(loc);
        }
      }
      if (!userMarker) {
        // Create the user marker
        userMarker = new google.maps.Marker({
          position: loc,
          map: map,
          icon: iconPerson
        });
      } else {
        // Move the user marker to reflect the user's new location
        userMarker.setPosition(loc);
      }
    }, centerOnAntwerp);
  } else {
    centerOnAntwerp();
  }

  // Add markers to map
  (function() {
    var i, station, marker, icon;
    for (i in module.stations) {
      if (module.stations.hasOwnProperty(i)) {
        station = module.stations[i];
        if (!station.name) {
          break;
        } else if (!station.inOrder) {
          icon = iconRed;
        } else if (!station.bikes) {
          icon = iconGray;
        } else if (!station.lockers) {
          icon = iconPurple;
        } else {
          icon = iconGreen;
        }
        marker = new google.maps.Marker({
          position: new google.maps.LatLng(station.lat, station.lng),
          map: map,
          title: station.name + ' (' + station.bikes + '/' + (station.bikes + station.lockers).toString() + ')',
          icon: icon,
          stationName: station.name,
          bikes: station.bikes,
          lockers: station.lockers,
          lastUpdate: station.lastUpdate,
          inOrder: station.inOrder
        });
        google.maps.event.addListener(marker, 'click', function() {
          var title = this.stationName;
          if (!this.inOrder) {
            title += ' (buiten dienst)';
          }
          infoWindow.setContent('<h2>' + title + '</h2>Fietsen: ' + this.bikes + '<br/>Lockers: ' + this.lockers + '<div class="update">Update: ' + this.lastUpdate + '</div>');
          infoWindow.open(map, this);
        });
      }
    }
  }());

  module.map = map;
  return module;

}(velo || {}));

var _gaq = [['_setAccount', 'UA-9800583-13'], ['_trackPageview']];
(function(d, t) {
var g = d.createElement(t),
    s = d.getElementsByTagName(t)[0];
g.async = g.src = '//www.google-analytics.com/ga.js';
s.parentNode.insertBefore(g, s);
}(document, 'script'));

