/*globals google */

var velo = (function(module) {

  var map, markerClick, i, station, marker, icon,
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

  // Center the map
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var marker, initialLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
      // If they are not in Antwerp, just center the map in Antwerp
      if (initialLocation.lat > 4.449977874755859 || initialLocation.lat < 4.375820159912109 || initialLocation.lng > 51.23322501998357 || initialLocation.lng < 51.1855840469278) {
        map.setCenter(antwerp);
      } else {
        map.setCenter(initialLocation);
      }
      marker = new google.maps.Marker({
        position: initialLocation,
        map: map,
        icon: iconPerson
      });
    }, function() {
      map.setCenter(antwerp);
    });
  } else {
    map.setCenter(antwerp);
  }

  // Add markers to map
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

