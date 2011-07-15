/*globals require, module, __dirname */

// Module dependencies.
var express = require('express'),
  http = require('http'),
  Database = require('./lib/db'),
  fs = require("fs");

var app = module.exports = express.createServer(), db, loadAllStations, loadStationDetails;

// Configuration

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('view options', {
    layout: false
  });
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function() {
  db = new Database('./public/js/velo.js');
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function() {
  db = new Database('./public/js/velo.js');
  app.use(express.errorHandler());
});

app.configure(function() {
  db.load();
});

// Routes

app.get('/', function(req, res) {
  res.render('index', {
    title: 'Fietsen Antwerpen',
    stations: JSON.stringify(db.stations)
  });
});

app.listen(8080);
console.log('Express server listening on port %d in %s mode', app.address().port, app.settings.env);

/**
 * Scrape the main map page to retrieve a list of stations
 * Repeat every 60 minutes
 */
loadAllStations = function() {
  console.log('Loading a list of all stations');

  var stationRegexGlobal = /icon.image = ["']([^"']+)["'];\s+icon.iconSize = new GSize\(16, 16\);\s+icon.iconAnchor = new GPoint\(8, 8\);\s+icon.infoWindowAnchor = new GPoint\(10, 8\);\s+point = new GLatLng\(([0-9.]+),([0-9.]+)\);\s+marker\[[0-9]+\]= new GMarker\(point, icon\);\s+GEvent.addListener\(marker\[[0-9]+\],'click',function\(\) {\s+\$.ajax\({\s+async:true,\s+type: "POST",\s+dataType: "html",\s+data:"(idStation=([0-9]+)[^"]+)",/gm,
    stationRegex = /icon.image = ["']([^"']+)["'];\s+icon.iconSize = new GSize\(16, 16\);\s+icon.iconAnchor = new GPoint\(8, 8\);\s+icon.infoWindowAnchor = new GPoint\(10, 8\);\s+point = new GLatLng\(([0-9.]+),([0-9.]+)\);\s+marker\[[0-9]+\]= new GMarker\(point, icon\);\s+GEvent.addListener\(marker\[[0-9]+\],'click',function\(\) {\s+\$.ajax\({\s+async:true,\s+type: "POST",\s+dataType: "html",\s+data:"(idStation=([0-9]+)[^"]+)",/m;

  http.get({
    host: 'www.velo-antwerpen.be',
    port: 80,
    path: '/localizaciones/station_map.php'
  }, function(res) {

    // Build a response document out of the chunked responses
    var resDoc = '';
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
      resDoc += chunk;
    });

    res.on('end', function() {
      var stations = {}, matches, vars, i, len, station, id;

      // Find the stations in the response
      if (stationRegexGlobal.test(resDoc)) {
        matches = resDoc.match(stationRegexGlobal);
        for (i = 0, len = matches.length; i < len; i += 1) {
          vars = matches[i].match(stationRegex);
          id = vars[5];
          if (id) {
            station = {
              id: id,
              lat: vars[2],
              lng: vars[3],
              dataUrl: vars[4],
              inOrder: (vars[1] !== 'http://www.velo-antwerpen.be/pfw_files/tpl/web/map_icon_out16.png')
            };
            stations[id] = station;
            // Add the cached details to this station
            if (db.stations[id]) {
              stations[id] = db.stations[id];
            }
          }
        }

        // Save the new list of stations to the DB
        db.lastUpdate = new Date();
        db.stations = stations;
        db.save();
      }
    });
  });
};
setInterval(loadAllStations, 1000 * 60 * 1);

/**
 * Scrape each station detail page to retrieve the bike & locker availabilities
 * Load one station each 4 seconds (85 stations in 5 minutes)
 */
loadStationDetails = function() {
  var looper, lastLoadedStationId, loadAStation;

  // Load the next station
  looper = function() {
    var i, foundLastLoadedStation = false;
    for (i in db.stations) {
      if (db.stations.hasOwnProperty(i)) {
        if (foundLastLoadedStation) {
          loadAStation(db.stations[i]);
          return;
        }
        if (i === lastLoadedStationId) {
          foundLastLoadedStation = true;
        }
      }
    }
    // If we didnt already load a station by this point, load the first station
    for (i in db.stations) {
      if (db.stations.hasOwnProperty(i)) {
        loadAStation(db.stations[i]);
        return;
      }
    }
  };
  db.load(function() {
    setInterval(looper, 1000 * 4);
  });

  // Make the HTTP request and scrape the data for a specific station
  loadAStation = function(station) {
    var stationNameRegex = /[0-9]+\s+[0-9]{3} - ([^<]+)/,
      stationValuesRegex = /\s[a-z ]+: ([0-9]+)<br>\s+[a-z ]+: ([0-9]+)\s/,
      stationLastUpdateRegex = /:\s+([0-9]{2}:[0-9]{2}:[0-9]{2})/,
      req;

    lastLoadedStationId = station.id;
    console.log('Loading station ' + station.id + ' - ' + station.name);

    req = http.request({
      host:    'www.velo-antwerpen.be',
      port:    80,
      path:    '/CallWebService/StationBussinesStatus.php',
      method:  'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    }, function(res) {
      var matches;
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        if (stationNameRegex.test(chunk)) {
          station.name = chunk.match(stationNameRegex)[1];
          if (station.name === 'FOD Financi�n') { // The website we're scraping doesn't use UTF8 encoding
            station.name = 'FOD Financiën';
          }
        }
        if (stationValuesRegex.test(chunk)) {
          matches = chunk.match(stationValuesRegex);
          station.bikes = parseInt(matches[1], 10);
          station.lockers = parseInt(matches[2], 10);
        }
        if (stationLastUpdateRegex.test(chunk)) {
          station.lastUpdate = chunk.match(stationLastUpdateRegex)[1];
        }
        console.log('Loaded station ' + station.id + ' - ' + station.name);
        db.lastUpdate = new Date();
        db.save();
      });
    });
    req.write(station.dataUrl);
    req.end();
  };
};
loadStationDetails();

