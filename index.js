var express = require("express"),
  app = express(),
  MBTiles = require("node-mbtiles"),
  p = require("path"),
  fs = require("fs"),
  compression = require("compression"),
  helmet = require("helmet");
app.use(compression()); //Compress all routes
app.use(helmet());

var BreakPoint = {};

// path to the mbtiles; default is the server.js directory
var tilesDir = __dirname + "/tiles/";

var allTiles = null;

// Set return header
function getContentType(t) {
  var header = {};

  // CORS
  header["Access-Control-Allow-Origin"] = "*";
  header["Access-Control-Allow-Headers"] = "Origin, X-Requested-With, Content-Type, Accept";

  // Cache
  header["Cache-Control"] = "public, max-age=3600";

  // request specific headers
  if (t === "png") {
    header["Content-Type"] = "image/png";
  } else if (t === "jpg") {
    header["Content-Type"] = "image/jpeg";
  } else if (t === "pbf") {
    header["Content-Type"] = "application/x-protobuf";
    header["Content-Encoding"] = "gzip";
  }

  return header;
}

app.get("/", function (req, res) {
  if (req.query.json) {
    let body = new Array();
    allTiles = findFilesInDir(tilesDir, ".mbtiles");

    for (var i = 0; i < allTiles.length; i++) {
      body.push(p.basename(allTiles[i]));
    }

    let header = {};
    header["Access-Control-Allow-Origin"] = "*";
    header["Access-Control-Allow-Headers"] = "Origin, X-Requested-With, Content-Type, Accept";
    header["Content-Type"] = "text/json";
    res.set(header);
    res.send(body);
  } else {
    let body = "<h1>Mapnik Tile Server</h1><h2>Files on Server</h2>";
    allTiles = findFilesInDir(tilesDir, ".mbtiles");

    if (allTiles.length > 0) {
      body = body + "<ul>";
      for (var i = 0; i < allTiles.length; i++) {
        body = body + "<li>" + p.basename(allTiles[i]) + "</li>";
      }
      body = body + "</ul>";
    } else {
      body = body + "<p>No tiles found... Please add some to the volume and refresh this page.</p>";
    }

    let header = {};
    header["Access-Control-Allow-Origin"] = "*";
    header["Access-Control-Allow-Headers"] = "Origin, X-Requested-With, Content-Type, Accept";
    header["Content-Type"] = "text/html";
    res.set(header);
    res.send(body);
  }
});

app.get("/:s.:t", function (req, res) {
  let download = process.env.NO_DOWNLOAD || "false";
  if (download === "true") {
    let header = {};
    header["Access-Control-Allow-Origin"] = "*";
    header["Access-Control-Allow-Headers"] = "Origin, X-Requested-With, Content-Type, Accept";
    header["Content-Type"] = "text/plain";
    res.set(header);
    res.status(401).send("MBTile downloading has been disabled on this server.");
  } else {
    if (allTiles == null) {
      allTiles = findFilesInDir(tilesDir, ".mbtiles");
    }

    let file = p.join(tilesDir, req.params.s + ".mbtiles");
    if (fs.existsSync(file)) {
      res.sendFile(file);
    } else {
      let header = {};
      header["Access-Control-Allow-Origin"] = "*";
      header["Access-Control-Allow-Headers"] = "Origin, X-Requested-With, Content-Type, Accept";
      header["Content-Type"] = "text/plain";
      res.set(header);
      res.status(404).send("File Not Found");
    }
  }
});

// tile system cannon
app.get("/:s/:z/:x/:y.:t", function (req, res) {
  if (req.params.s === "*") {
    if (allTiles == null) {
      allTiles = findFilesInDir(tilesDir, ".mbtiles");
    }

    let success = false;
    let requests = allTiles.map((item) => {
      return new Promise((resolve) => {
        new MBTiles(item, function (err, mbtiles) {
          mbtiles.getTile(req.params.z, req.params.x, req.params.y, function (err, tile, headers) {
            if (!err) {
              if (!success) {
                success = true;
                res.set(getContentType(req.params.t));
                res.send(tile);
              }
            }
            resolve();
          });
          if (err) console.log("error opening database");
        });
      });
    });
    Promise.all(requests).then(() => {
      if (!success) {
        let header = {};
        header["Access-Control-Allow-Origin"] = "*";
        header["Access-Control-Allow-Headers"] = "Origin, X-Requested-With, Content-Type, Accept";
        header["Content-Type"] = "text/plain";
        res.set(header);
        res.status(404).send("Tile not found");
      }
    });
  } else {
    new MBTiles(p.join(tilesDir, req.params.s + ".mbtiles"), function (err, mbtiles) {
      mbtiles.getTile(req.params.z, req.params.x, req.params.y, function (err, tile, headers) {
        if (err) {
          let header = {};
          header["Access-Control-Allow-Origin"] = "*";
          header["Access-Control-Allow-Headers"] = "Origin, X-Requested-With, Content-Type, Accept";
          header["Content-Type"] = "text/plain";
          res.set(header);
          res.status(404).send("Tile rendering error: " + err + "\n");
        } else {
          res.set(getContentType(req.params.t));
          res.send(tile);
        }
      });
      if (err) console.log("error opening database");
    });
  }
});

function findFilesInDir(startPath, filter) {
  var results = [];
  if (!fs.existsSync(startPath)) {
    console.log("Directory Not Found", startPath);
    return;
  }

  var files = fs.readdirSync(startPath);
  for (var i = 0; i < files.length; i++) {
    var filename = p.join(startPath, files[i]);
    var stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      results = results.concat(findFilesInDir(filename, filter));
    } else if (filename.indexOf(filter) >= 0) {
      results.push(filename);
    }
  }
  return results;
}

// start up the server
console.log("Starting Tile Server");
const PORT = process.env.PORT || 5000;
app.listen(PORT);
