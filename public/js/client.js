/*globals google */

var velo = (function(module) {

  var initialLocation,
    antwerp = new google.maps.LatLng(51.211078, 4.414272),
    browserSupportFlag = false, map, handleNoGeolocation, markerClick, i, station, marker, icon,
    infoWindow = new google.maps.InfoWindow(),
    iconPerson = '/images/person.png',
    iconRed = '/images/cycling-red.png',
    iconGray = '/images/cycling-gray.png',
    iconPurple = '/images/cycling-purple.png',
    iconGreen = '/images/cycling-green.png';

  $(document).ready(function() {

    var myOptions = {
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById('map_canvas'), myOptions);

    // Try W3C Geolocation method
    if (navigator.geolocation) {
      browserSupportFlag = true;
      navigator.geolocation.getCurrentPosition(function(position) {
        initialLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        map.setCenter(initialLocation);
        var marker = new google.maps.Marker({
          position: initialLocation,
          map: map,
          icon: iconPerson
        });
      }, function() {
        handleNoGeolocation(browserSupportFlag);
      });
    } else {
      // Browser doesn't support Geolocation
      browserSupportFlag = false;
      handleNoGeolocation(browserSupportFlag);
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
          infoWindow.setContent('<h2>' + title + '</h2>Fietsen: ' + this.bikes + '<br/>Lockers: ' + this.lockers + '<div class="update">Update: ' + this.lastUpdate + '</div>' );
          infoWindow.open(map, this);
        });
      }
    }
  });

  handleNoGeolocation = function(errorFlag) {
    initialLocation = antwerp;
    map.setCenter(initialLocation);
  };

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

