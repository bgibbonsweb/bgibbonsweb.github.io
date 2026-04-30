# Gross domestic product (GDP) - Data package

This data package contains the data that powers the chart ["Gross domestic product (GDP)"](https://ourworldindata.org/grapher/gdp-penn-world-table?v=1&csvType=full&useColumnShortNames=false) on the Our World in Data website. It was downloaded on March 05, 2026.

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


## GDP
Total economic output of a country or region per year. This data is adjusted for inflation and differences in living costs between countries.
Last updated: October 9, 2025  
Next update: April 2027  
Date range: 1950–2023  
Unit: international-$ in 2021 prices  


### How to cite this data

#### In-line citation
If you have limited space (e.g. in data visualizations), you can use this abbreviated in-line citation:  
Feenstra et al. - Penn World Table (2025) – with major processing by Our World in Data

#### Full citation
Feenstra et al. - Penn World Table (2025) – with major processing by Our World in Data. “GDP – Penn World Table – In constant international-$” [dataset]. Feenstra et al., “Penn World Table 11.0” [original data].
Source: Feenstra et al. - Penn World Table (2025) – with major processing by Our World In Data

### What you should know about this data
* Gross domestic product (GDP) is a measure of the total value added from the production of goods and services in a country or region each year.
* This indicator provides information on economic growth and income levels in the _medium run_. Some country estimates are available as far back as 1950.
* This data is adjusted for inflation and differences in living costs between countries.
* This data is expressed in [international-$](#dod:int_dollar_abbreviation) at 2021 prices, using a multiple benchmark approach that incorporates PPP estimates from all available benchmark years.
* For GDP estimates in the very long run, see the [Maddison Project Database's indicator](https://ourworldindata.org/grapher/gdp-maddison-project-database).
* For more regularly updated estimates of GDP since 1990, see the [World Bank's indicator](https://ourworldindata.org/grapher/gdp-worldbank).

### How is this data described by its producer - Feenstra et al. - Penn World Table (2025)?
Output-side real GDP at chained PPPs (in mil. 2021US$)

### Source

#### Feenstra et al. – Penn World Table
Retrieved on: 2025-10-09  
Retrieved from: https://www.rug.nl/ggdc/productivity/pwt/  

#### Notes on our processing step for this indicator
We excluded values considered outliers in the original dataset (`i_outlier = "Outlier"`), due to implausible relative prices (PPPs divided by exchange rates).

We replaced GDP values for Bermuda with different estimates (output side, single price benchmark) due to the unusual changes on prices in this country.


    