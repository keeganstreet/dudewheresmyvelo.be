/*globals require, module, __dirname */

// Module dependencies.
var express = require("express"),
  http = require("http"),
  Database = require("./lib/db");

var app = module.exports = express.createServer(), db, loadAllStationsData;

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
  db = new Database("/Users/keegan/Projects/velo/public/js/velo.js");
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure("production", function() {
  db = new Database("/Users/keegan/Projects/velo.db");
  app.use(express.errorHandler());
});

app.configure(function() {
  db.load();
});

// Routes

app.get("/", function(req, res) {
  res.render("index", {
    title: "Fietsen Antwerpen",
    script: db.stations.toString()
  });
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

// Load the velo station data
// Request data for all stations every x minutes

loadAllStationsData = function() {
  console.log("Loading station data");

  var requestOptions = {
      host:    "www.velo-antwerpen.be",
      port:    80,
      path:    "/CallWebService/StationBussinesStatus.php",
      method:  "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" }
    },
    stationNameRegex = /[0-9]+\s+[0-9]{3} - ([^<]+)/,
    stationValuesRegex = /\s[a-z ]+: ([0-9]+)<br>\s+[a-z ]+: ([0-9]+)\s/,
    stationLastUpdateRegex = /:\s+([0-9]{2}:[0-9]{2}:[0-9]{2})/,
    loadStationData, numStations, numResponses = 0;

  loadStationData = function(station) {
    var req = http.request(requestOptions, function(res) {
      var matches;
      res.setEncoding("utf8");
      res.on("data", function(chunk) {
        if (stationNameRegex.test(chunk)) {
          station.name = chunk.match(stationNameRegex)[1];
        }
        console.log(station.name);
        if (stationValuesRegex.test(chunk)) {
          var matches = chunk.match(stationValuesRegex);
          station.bikes = parseInt(matches[1], 10);
          station.lockers = parseInt(matches[2], 10);
        }
        if (stationLastUpdateRegex.test(chunk)) {
          station.lastUpdate = chunk.match(stationLastUpdateRegex)[1];
        }
        numResponses += 1;
        console.log("Loaded station " + numResponses.toString() + " / " + numStations.toString());
        if (numResponses === numStations) {
          db.lastUpdate = new Date();
          db.save();
        }
      });
    });
    req.write(station.data);
    req.end();
  };

  db.load(function() {
    var i;
    for (i = 0, numStations = db.stations.length; i < numStations; i += 1) {
      loadStationData(db.stations[i]);
    }
  });

  setTimeout(loadAllStationsData, 1000 * 60 * 10);
};
loadAllStationsData();

