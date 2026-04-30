# Electricity generation - Data package

This data package contains the data that powers the chart ["Electricity generation"](https://ourworldindata.org/grapher/electricity-generation?v=1&csvType=full&useColumnShortNames=false) on the Our World in Data website. It was downloaded on March 14, 2026.

### Active Filters

A filtered subset of the full data was downloaded. The following filters were applied:

## CSV Structure

The high level structure of the CSV file is that each row is an observation for an entity (usually a country or region) and a timepoint (usually a year).

The first two columns in the CSV file are "Entity" and "Code". "Entity" is the name of the entity (e.g. "United States"). "Code" is the OWID internal entity code that we use if the entity is a country or region. For most countries, this is the same as the [iso alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3) code of the entity (e.g. "USA") - for non-standard countries like historical countries these are custom codes.

The third column is either "Year" or "Day". If the data is annual, this is "Year" and contains only the year as an integer. If the column is "Day", the column contains a date string in the form "YYYY-MM-DD".

The final column is the data column, which is the time series that powers the chart. If the CSV data is downloaded using the "full data" option, then the column corresponds to the time series below. If the CSV data is downloaded using the "only selected data visible in the chart" option then the data column is transformed depending on the chart type and thus the association with the time series might not be as straightforward.


## Metadata.json structure

The .metadata.json file contains metadata about the data package. The "charts" key contains information to recreate the chart, like the title, subtitle etc.. The "columns" key contains information about each of the columns in the csv, like the unit, timespan covered, citation for the data etc..

## About the data

Our World in Data is almost never the original producer of the data - almost all of the data we use has been compiled by others. If you want to re-use data, it is your responsibility to ensure that you adhere to the sources' license and to credit them correctly. Please note that a single time series may have more than one source - e.g. when we stich together data from different time periods by different producers or when we calculate per capita metrics using population data from a second source.

## Detailed information about the data


## Total electricity generation
Total electricity generated in each country or region, measured in [terawatt-hours](#dod:watt-hours).
Last updated: January 26, 2026  
Next update: January 2027  
Date range: 1985–2025  
Unit: terawatt-hours  


### How to cite this data

#### In-line citation
If you have limited space (e.g. in data visualizations), you can use this abbreviated in-line citation:  
Ember (2026); Energy Institute - Statistical Review of World Energy (2025) – with major processing by Our World in Data

#### Full citation
Ember (2026); Energy Institute - Statistical Review of World Energy (2025) – with major processing by Our World in Data. “Total electricity generation” [dataset]. Ember, “Yearly Electricity Data Europe”; Ember, “Yearly Electricity Data”; Energy Institute, “Statistical Review of World Energy” [original data].
Source: Ember (2026), Energy Institute - Statistical Review of World Energy (2025) – with major processing by Our World In Data

### Sources

#### Ember – Yearly Electricity Data Europe
Retrieved on: 2026-01-26  
Retrieved from: https://ember-energy.org/data/yearly-electricity-data/  

#### Ember – Yearly Electricity Data
Retrieved on: 2026-01-09  
Retrieved from: https://ember-energy.org/data/yearly-electricity-data/  

#### Energy Institute – Statistical Review of World Energy
Retrieved on: 2025-06-27  
Retrieved from: https://www.energyinst.org/statistical-review/  

#### Notes on our processing step for this indicator
- Electricity data from 2000 onwards (and from 1990 onwards for European countries, including Turkey) comes from Ember. Earlier data comes from the Energy Institute.


    