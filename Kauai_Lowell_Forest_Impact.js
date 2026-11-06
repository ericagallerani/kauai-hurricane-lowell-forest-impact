/**
 * ============================================================================
 * Hurricane Lowell (landfall night of Sept 8, 2026) — Kaua'i Forest Impact
 * Season-matched composite EVI + NDII change map — Sentinel-2 SR Harmonized
 * ============================================================================
 *
 * WHY A COMPOSITE, AND WHY THIS DATE WINDOW
 *   A single "best" cloud-free image pre-storm turned out to be Feb 2026 —
 *   wet-season conditions, ~7 months removed from the storm. Pairing that
 *   against a Sept post-storm image confounds normal wet-to-dry seasonal
 *   dry-down with storm damage. Sept 2025 avoids that but introduces a
 *   different confound: this dry season was anomalously wet (per your
 *   observation), so a "normal" Sept 2025 isn't a valid stand-in for what
 *   Sept 2026 would have looked like without the storm.
 *
 *   The fix used here: build a PRE-STORM COMPOSITE from many Sentinel-2
 *   scenes across this year's dry season (May 1 - Sept 7, 2026) instead of
 *   one image. A per-pixel median across ~15-20 candidate scenes fills
 *   cloud gaps no single date can, while staying within the same season
 *   AND the same (anomalous) year as the storm — so you're not importing
 *   a different year's climate or a different season's phenology. This
 *   mirrors what the Hurricane Maria/Puerto Rico study did (multi-month
 *   pre/post windows rather than single-date pairs), not a shortcut.
 *
 *   FOR THE LATER STUDY: the fully rigorous version is a multi-year
 *   Sept climatology (median + spread across several past Septembers) so
 *   the post-storm signal can be expressed as an anomaly relative to a
 *   normal range, statistically separating "storm" from "unusual year."
 *   Not built here — flagged at the bottom of getSeasonComposite() as the
 *   next step once this becomes a real manuscript.
 *
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------------------
// Pre-storm: this year's dry season, ending the day before landfall.
var PRE_START  = '2026-05-01';
var PRE_END    = '2026-09-07';

// Post-storm: widen POST_END as clearer scenes accumulate over time.
var POST_START = '2026-09-09';
var POST_END   = '2026-11-30';

var CS_BAND      = 'cs_cdf';     // Cloud Score+ band ('cs' or 'cs_cdf')
var CS_THRESHOLD = 0.60;         // higher = stricter clear-sky requirement (0-1)

var SWIR_BAND = 'B11';           // B11 -> NDII (moisture/defoliation)
                                  // swap to 'B12' for a fire-style NBR instead


Map.centerObject(aoi, 10);
Map.addLayer(aoi, {color: 'white'}, "Kaua'i County boundary", false);

// ----------------------------------------------------------------------------
// 2. SENTINEL-2 SR + CLOUD SCORE+ helpers
// ----------------------------------------------------------------------------
var s2Raw  = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED');
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');

// Scale reflectance bands to 0-1 and compute EVI + NDII on one image.
function scaleAndIndex(img) {
  var bands = img.select(['B2', 'B3', 'B4', 'B8', SWIR_BAND])
    .multiply(0.0001)
    .copyProperties(img, img.propertyNames());
  bands = ee.Image(bands);

  var evi = bands.expression(
    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))',
    {
      NIR:  bands.select('B8'),
      RED:  bands.select('B4'),
      BLUE: bands.select('B2')
    }).rename('EVI');

  var ndii = bands.normalizedDifference(['B8', SWIR_BAND]).rename('NDII');

  return bands.addBands(evi).addBands(ndii)
    .copyProperties(img, ['system:time_start', 'CLOUDY_PIXEL_PERCENTAGE']);
}

// Build a season-matched, cloud-masked MEDIAN COMPOSITE over [start, end).
// Returns the composite image plus an 'obsCount' band (how many clear
// looks contributed per pixel) so you can report/screen data density.
//
function getSeasonComposite(start, end, label) {
  var filtered = s2Raw.filterBounds(aoi).filterDate(start, end);

  var linked = filtered.linkCollection(csPlus, [CS_BAND]);

  var masked = linked.map(function (img) {
    var clearMask = img.select(CS_BAND).gte(CS_THRESHOLD);
    return img.updateMask(clearMask);
  });

  var indexed = masked.map(scaleAndIndex);

  print(label + ' — candidate scenes in window:', indexed.size());

  var obsCount = indexed.select('EVI').count().rename('obsCount');

  var composite = indexed.median()
    .addBands(obsCount)
    .clip(aoi);

  var meanObs = obsCount.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: aoi, scale: 60, maxPixels: 1e9, bestEffort: true
  }).get('obsCount');
  print(label + ' — mean clear observations per pixel over AOI:', meanObs);

  return composite;
}

// ----------------------------------------------------------------------------
// 3. BUILD PRE- AND POST-STORM COMPOSITES
// ----------------------------------------------------------------------------
var preComp  = getSeasonComposite(PRE_START, PRE_END, 'Pre-storm (2026 dry season)');
var postComp = getSeasonComposite(POST_START, POST_END, 'Post-storm');

// ----------------------------------------------------------------------------
// 4. TRUE-COLOR CONTEXT LAYERS — always eyeball these before trusting dEVI/dNDII
// ----------------------------------------------------------------------------
var rgbVis = {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3};
Map.addLayer(preComp,  rgbVis, 'Pre-storm composite true color');
Map.addLayer(postComp, rgbVis, 'Post-storm composite true color');
Map.addLayer(postComp.select('obsCount'), {min: 0, max: 10, palette: ['440154','3b528b','21918c','5ec962','fde725']},
  'Post-storm clear-observation count', false);

// ----------------------------------------------------------------------------
// 5. CHANGE IMAGES
// ----------------------------------------------------------------------------
var dEVI  = postComp.select('EVI').subtract(preComp.select('EVI')).rename('dEVI');
var dNDII = postComp.select('NDII').subtract(preComp.select('NDII')).rename('dNDII');

var diffVis = {
  min: -0.4,
  max: 0.4,
  palette: ['67001f', 'b2182b', 'f4a582', 'f7f7f7', '92c5de', '2166ac', '053061']
  // dark red = biggest loss, dark blue = biggest gain; tweak min/max after
  // you see the percentiles printed below
};

Map.addLayer(dEVI,  diffVis, 'Change in EVI (post - pre)');
Map.addLayer(dNDII, diffVis, 'Change in NDII (post - pre)');
Map.addLayer(reserves.style({color: 'green', fillColor: '00000000', width: 1
}),
  {},
  'HI reserves');


print('dEVI percentiles over AOI:', dEVI.reduceRegion({
  reducer: ee.Reducer.percentile([2, 25, 50, 75, 98]),
  geometry: aoi, scale: 20, maxPixels: 1e9, bestEffort: true
}));
print('dNDII percentiles over AOI:', dNDII.reduceRegion({
  reducer: ee.Reducer.percentile([2, 25, 50, 75, 98]),
  geometry: aoi, scale: 20, maxPixels: 1e9, bestEffort: true
}));

// ----------------------------------------------------------------------------
// 6. SIMPLE LEGEND (for screenshotting straight out of the Code Editor)
// ----------------------------------------------------------------------------
var legend = ui.Panel({style: {position: 'bottom-left', padding: '8px 15px'}});
legend.add(ui.Label('Change (post − pre)', {fontWeight: 'bold'}));
var makeRow = function (color, label) {
  var box = ui.Label('', {
    backgroundColor: color, padding: '8px', margin: '0 0 4px 0'
  });
  var desc = ui.Label(label, {margin: '0 0 4px 6px'});
  return ui.Panel([box, desc], ui.Panel.Layout.Flow('horizontal'));
};
legend.add(makeRow('67001f', 'Strong loss'));
legend.add(makeRow('f7f7f7', 'No change'));
legend.add(makeRow('053061', 'Strong gain'));
Map.add(legend);

// ----------------------------------------------------------------------------
// 7. EXPORTS — pull GeoTIFFs into your figure/GIS tool of choice
// ----------------------------------------------------------------------------
Export.image.toDrive({
  image: dEVI,
  description: 'Kauai_Lowell_dEVI_composite',
  folder: 'GEE_exports',
  region: aoi,
  scale: 10,
  maxPixels: 1e9
});

Export.image.toDrive({
  image: dNDII,
  description: 'Kauai_Lowell_dNDII_composite',
  folder: 'GEE_exports',
  region: aoi,
  scale: 10,
  maxPixels: 1e9
});

Export.image.toDrive({
  image: preComp.select(['B4', 'B3', 'B2']).multiply(3000).uint8(),
  description: 'Kauai_preStorm_composite_RGB',
  folder: 'GEE_exports',
  region: aoi,
  scale: 10,
  maxPixels: 1e9
});

Export.image.toDrive({
  image: postComp.select(['B4', 'B3', 'B2']).multiply(3000).uint8(),
  description: 'Kauai_postStorm_composite_RGB',
  folder: 'GEE_exports',
  region: aoi,
  scale: 10,
  maxPixels: 1e9
});

Export.image.toDrive({
  image: postComp.select('obsCount').addBands(preComp.select('obsCount').rename('obsCount_pre')),
  description: 'Kauai_Lowell_obsCount',
  folder: 'GEE_exports',
  region: aoi,
  scale: 10,
  maxPixels: 1e9
});

// Run the five tasks from the "Tasks" tab in the Code Editor (top right) —
// they don't execute automatically.
