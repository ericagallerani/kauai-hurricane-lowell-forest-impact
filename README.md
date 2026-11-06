# kauai-hurricane-lowell-forest-impact
Google Earth Engine workflow for assessing hurricane-related forest impacts across Kauaʻi using season-matched Sentinel-2 composites and vegetation change metrics.
Overview

This repository contains a Google Earth Engine (GEE) script developed to evaluate forest condition changes associated with Hurricane Lowell, which made landfall on Kauaʻi during the night of September 8, 2026.

Rather than comparing single pre- and post-storm satellite images, this workflow creates cloud-masked season-matched median composites from Sentinel-2 imagery. This approach minimizes the effects of cloud cover and reduces potential bias from comparing images acquired under substantially different seasonal conditions.

The workflow produces:

Enhanced Vegetation Index (EVI) composites
Normalized Difference Infrared Index (NDII) composites
Change in EVI (dEVI)
Change in NDII (dNDII)
Observation density layers showing the number of clear observations contributing to each pixel

These outputs can be visualized within Google Earth Engine or exported as GeoTIFFs for additional analysis in GIS software such as ArcGIS Pro or QGIS.


Data Sources
Sentinel-2 Surface Reflectance Harmonized

Dataset:

JavaScript
COPERNICUS/S2_SR_HARMONIZED

Provides multispectral surface reflectance imagery at 10–20 m resolution.

Google Cloud Score+

Dataset:

JavaScript
GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED

Used to identify and mask cloudy and low-quality pixels prior to composite generation.

Hawaiʻi State Forest Reserve Boundaries

The script displays Hawaiʻi Department of Land and Natural Resources (DLNR) Division of Forestry and Wildlife (DOFAW) reserve boundaries for reference. Available here: https://geoportal.hawaii.gov/datasets/6c4ad137c0e54d398712fd2e3e68e50e_1/about

Users will need to provide their own reserve boundary dataset or asset.

Vegetation Metrics
Enhanced Vegetation Index (EVI)

EVI is used as an indicator of vegetation greenness and photosynthetic activity.

Formula:

EVI = 2.5 × ((NIR − RED) / (NIR + 6 × RED − 7.5 × BLUE + 1))

Normalized Difference Infrared Index (NDII)

NDII is used as an indicator of vegetation moisture content and canopy stress.

Formula:

NDII = (NIR − SWIR) / (NIR + SWIR)


This workflow uses Sentinel-2 Band 11 (SWIR1), consistent with methods commonly applied in hurricane and typhoon damage studies.

Workflow
1. Build pre-storm composite
Filter Sentinel-2 imagery to the pre-storm period.
Apply Cloud Score+ masking.
Calculate EVI and NDII.
Generate a median composite.
2. Build post-storm composite
Repeat the same workflow for the post-storm period.
3. Calculate change products
dEVI = EVIpost − EVIpre

dNDII = NDIIpost − NDIIpre


Interpretation:

Value	Meaning
Negative	Potential vegetation loss or canopy damage
Near zero	Little detectable change
Positive	Increased greenness or moisture relative to pre-storm conditions
4. Generate observation density layer

An observation count raster records how many cloud-free observations contributed to each composite pixel.

This layer can be used to identify areas with limited image support.

5. Export results

GeoTIFF exports are generated for:

dEVI
dNDII
Pre-storm RGB composite
Post-storm RGB composite
Observation counts
Required Inputs

The script assumes the following Earth Engine variables are already defined:

Area of Interest (AOI)
JavaScript
var aoi = ...


Running the Script
Open the Google Earth Engine Code Editor.
Create a new script.
Copy the contents of Kauai_Lowell_Forest_Impact.js.
Define the AOI and reserve boundary assets.
Run the script.
Review:
Pre-storm composite
Post-storm composite
dEVI
dNDII
Observation count layers
Open the Tasks tab.
Start the export tasks manually.

Google Earth Engine export tasks do not execute automatically.

Output Files

The script exports the following files to Google Drive:

Output	Description
Kauai_Lowell_dEVI_composite	Change in vegetation greenness
Kauai_Lowell_dNDII_composite	Change in vegetation moisture/canopy condition
Kauai_preStorm_composite_RGB	Pre-storm true-color composite
Kauai_postStorm_composite_RGB	Post-storm true-color composite
Kauai_Lowell_obsCount	Observation count layers
Limitations

This workflow provides a rapid assessment of hurricane-related vegetation change and should not be interpreted as a direct measure of tree mortality or damage severity.

Potential sources of uncertainty include:

Residual cloud contamination
Seasonal vegetation variability
Differences in illumination and atmospheric conditions
Delayed vegetation responses occurring after the post-storm imagery window

If you use this workflow, please cite:

Gallerani, E. (2026). Kauaʻi Forest Impact Assessment Following Hurricane Lowell: Google Earth Engine Workflow. GitHub repository.
