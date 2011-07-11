/*globals require, module, __dirname */

// Module dependencies.
var express = require("express"),
  http = require("http"),
  Database = require("./lib/db");

var app = module.exports = express.createServer(), db, loadAllStations;

// Configuration

app.configure(function() {
  app.set("views", __dirname + "/views");
  app.set("view engine", "jade");
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + "/public"));
});

app.configure("development", function() {
  db = new Database("./public/js/velo.js");
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure("production", function() {
  db = new Database("./public/js/velo.js");
  app.use(express.errorHandler());
});

app.configure(function() {
  db.load();
});

// Routes

app.get("/", function(req, res) {
  res.render("index", {
    title: "Fietsen Antwerpen"
  });
});

app.listen(8080);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

/**
 * Load the Velo station data
 * First scrape the main map page to retrieve a list of stations
 * Then scrape each station detail page to retrieve the bike & locker availabilities
 * Repeat every x minutes
 */
loadAllStations = function() {
  console.log("Loading station data");

  var 
    stationRegexGlobal = /icon.image = ["']([^"']+)["'];\s+icon.iconSize = new GSize\(16, 16\);\s+icon.iconAnchor = new GPoint\(8, 8\);\s+icon.infoWindowAnchor = new GPoint\(10, 8\);\s+point = new GLatLng\(([0-9.]+),([0-9.]+)\);\s+marker\[[0-9]+\]= new GMarker\(point, icon\);\s+GEvent.addListener\(marker\[[0-9]+\],'click',function\(\) {\s+\$.ajax\({\s+async:true,\s+type: "POST",\s+dataType: "html",\s+data:"(idStation=([0-9]+)[^"]+)",/gm,
    stationRegex = /icon.image = ["']([^"']+)["'];\s+icon.iconSize = new GSize\(16, 16\);\s+icon.iconAnchor = new GPoint\(8, 8\);\s+icon.infoWindowAnchor = new GPoint\(10, 8\);\s+point = new GLatLng\(([0-9.]+),([0-9.]+)\);\s+marker\[[0-9]+\]= new GMarker\(point, icon\);\s+GEvent.addListener\(marker\[[0-9]+\],'click',function\(\) {\s+\$.ajax\({\s+async:true,\s+type: "POST",\s+dataType: "html",\s+data:"(idStation=([0-9]+)[^"]+)",/m,
    stationNameRegex = /[0-9]+\s+[0-9]{3} - ([^<]+)/,
    stationValuesRegex = /\s[a-z ]+: ([0-9]+)<br>\s+[a-z ]+: ([0-9]+)\s/,
    stationLastUpdateRegex = /:\s+([0-9]{2}:[0-9]{2}:[0-9]{2})/,
    loadStationDetails, stations = [], numStations = 0, numResponses = 0;

  // Load the list of stations
  http.get({
    host: "www.velo-antwerpen.be",
    port: 80,
    path: "/localizaciones/station_map.php"
  }, function(res) {
    // Build a response document out of the chunked responses
    var resDoc = "";
    res.setEncoding("utf8");
    res.on("data", function(chunk) {
      resDoc += chunk;
    });
    res.on("end", function() {
      // Find the stations in the response
      var matches, vars, i, station;
      if (stationRegexGlobal.test(resDoc)) {
        matches = resDoc.match(stationRegexGlobal);
        numStations = matches.length;
        for (i = 0; i < numStations; i += 1) {
          vars = matches[i].match(stationRegex);
          station = {
            id: vars[5],
            lat: vars[2],
            lng: vars[3],
            dataUrl: vars[4],
            inOrder: (vars[1] !== "http://www.velo-antwerpen.be/pfw_files/tpl/web/map_icon_out16.png")
          };
          stations.push(station);
        }
      }
      // Now load details for each individual station
      for (i = 0; i < numStations; i += 1) {
        loadStationDetails(stations[i]);
      }
    });
  });

  loadStationDetails = function(station) {
    var req = http.request({
      host:    "www.velo-antwerpen.be",
      port:    80,
      path:    "/CallWebService/StationBussinesStatus.php",
      method:  "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" }
    }, function(res) {
      var matches;
      res.setEncoding("utf8");
      res.on("data", function(chunk) {
        if (stationNameRegex.test(chunk)) {
          station.name = chunk.match(stationNameRegex)[1];
          if (station.name === "FOD Financi�n") { // The website we're scraping doesn't use UTF8 encoding
            station.name = "FOD Financiën";
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
        numResponses += 1;
        console.log("Loaded station " + station.name + " (" + numResponses.toString() + " / " + numStations.toString() + ")");
        if (numResponses === numStations) {
          db.lastUpdate = new Date();
          db.stations = stations;
          db.save();
        }
      });
    });
    req.write(station.dataUrl);
    req.end();
  };

  setTimeout(loadAllStations, 1000 * 60 * 5);
};
loadAllStations();

