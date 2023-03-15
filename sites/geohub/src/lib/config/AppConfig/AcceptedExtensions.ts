import type { AcceptedExtension } from '$lib/types'

export const AccepedExtensions: AcceptedExtension[] = [
  {
    name: 'GeoTIFF',
    extensions: ['tif', 'tiff'],
    href: 'https://gdal.org/drivers/raster/gtiff.html#raster-gtiff',
  },
  {
    name: 'NetCDF',
    extensions: ['nc'],
    href: 'https://gdal.org/drivers/raster/netcdf.html#raster-netcdf',
  },
  {
    name: 'Arc/Info ASCII Grid File',
    extensions: ['aig', 'asc', 'sgr', 'grd'],
    href: 'https://gdal.org/drivers/raster/aaigrid.html',
  },
  { name: 'Erdas Imagine', extensions: ['raw', 'bl'], href: 'https://gdal.org/drivers/raster/eir.html' },
  { name: 'ESRI Shapefile (zipped)', extensions: ['zip'], href: 'https://gdal.org/drivers/vector/shapefile.html' },
  { name: 'GeoJSON', extensions: ['geojson'], href: 'https://gdal.org/drivers/vector/geojson.html' },
  { name: 'PMTILES', extensions: ['pmtiles'], href: 'https://protomaps.com/docs/pmtiles' },
  { name: 'MBTILES', extensions: ['mbtiles'], href: 'https://github.com/mapbox/mbtiles-spec' },
  {
    name: 'ESRI File Geodatabase (OpenFileGDB)',
    extensions: ['gdb'],
    href: 'https://gdal.org/drivers/vector/openfilegdb.html#esri-file-geodatabase-openfilegdb',
  },
  {
    name: 'ESRI File Geodatabase (FileGDB)',
    extensions: ['gdb'],
    href: 'https://gdal.org/drivers/vector/filegdb.html',
  },
  { name: 'ESRI Personal GeoDatabase', extensions: ['mdb'], href: 'https://gdal.org/drivers/vector/pgeo.html' },
  { name: 'GeoPackage', extensions: ['gpkg'], href: 'https://gdal.org/drivers/vector/gpkg.html' },
]