# Advanced `FencingAgentProfile` example
Here we'll walk through a `FencingAgentProfile` as we configure it property by property.
``` javascript
var profile = new FencingAgentProfile({
    "geodomain": "smartcity.geofrenzy.place"
});
```

Fencing Agents make two kind of queries: Region of Interest (ROI) queries, and Tile of Interest (TOI) queries. Best practice is to set both of these values, since iOS uses TOI, and Android uses ROI.
Region of Interest queries use an integer to specify how many kilometers around the Fencing Agent should be searched for SmartFences.
Tile of Interest queries use a [zoomlevel](https://wiki.openstreetmap.org/wiki/Zoom_levels), and find all fences sharing the Fencing Agent's tile on the specified zoomlevel.
``` javascript
profile.range = 20;
profile.zoomLevel = 14;
```

When `false`, a Geodomain's requirements will be applicable when the agent is outside of all of the Geodomain's SmartFences. The default value for this is `true`.
This will invert the status of GeoDomains (DWELLING will become AMBIENT, EXITING will become ENTERING, etc), but not individual fences.
``` javascript
profile.interiorFocus = false;
```
