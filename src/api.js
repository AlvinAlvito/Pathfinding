const highWayExclude = ["footway", "street_lamp", "steps", "pedestrian", "track", "path"];
/**
 * 
 * @param {Array} boundingBox 
 * @returns {Promise<Response>}
 */
export function fetchOverpassData(boundingBox) {
    const exclusion = highWayExclude.map(e => `[highway!="${e}"]`).join("");
    const query = `
    [out:json];(
        way[highway]${exclusion}[footway!="*"]
        (${boundingBox[0].latitude},${boundingBox[0].longitude},${boundingBox[1].latitude},${boundingBox[1].longitude});
        node(w);
    );
    out skel;`;

    return fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query
    });
}

// https://overpass-api.de/api/interpreter?data=[out:json];(way[highway][highway!="footway"][highway!="street_lamp"][highway!="steps"][highway!="pedestrian"][highway!="track"][highway!="path"][footway!="*"](-7.7956,110.3695,-7.7925,110.3777);node(w););out skel;
// [out:json];
// (
//   node(around:10, 3.5482131, 98.6627623);
//   node(around:10, 3.5485234, 98.6614430);
//   node(around:10, 3.5487161, 98.6613142);
// );
// out body;
