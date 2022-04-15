mbtiles-server
==============

This is a fork of Christopher Helm's and RGWood's awesome [mbtiles-server](https://github.com/chelm/mbtiles-server). All credit should be flung to them. The changes in this fork are:

* The first path argument is the mbtiles file, so multiple mbtiles tile sets can be served with the same service.
* Vector tiles are supported.
* Some niceties on the return header (CORS, expiration, etc.).
* Docker Image
* Landing page shows all tiles available on system use /?json=true if you would prefer an JSON array.
* Ability to download mbtiles from server, can be disabled via Env varable (NO_DOWNLOAD = true).

Map a volume for the tiles to your local docker host such as
./data/tiles:/app/tiles

Requests look like this:

``` text
http://localhost/<mbtiles-name>/3/1/2.png.

http://localhost/*/3/1/2.png  to scan all files in system. If you add new tiles you must restart the docker image.
```
