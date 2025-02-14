import type {
	DatasetFeature,
	Stac,
	StacCollection,
	StacItemFeature,
	StacItemFeatureCollection,
	Tag
} from '$lib/types';
import type { LngLatBounds } from 'maplibre-gl';
import type { StacTemplate } from './StacTemplate';
import { AccessLevel } from '$lib/config/AppConfig';
import { generateHashKey } from '$lib/helper';

/**
 * References
 * https://github.com/Element84/earth-search
 * https://console.demo.filmdrop.io/
 */
export default class EarthSearchStac implements StacTemplate {
	public stacId = 'earth-search';
	public apiUrl: string;
	public stac: Stac;

	public collection: string;

	public stacCollection: StacCollection;

	constructor(colleciton: string, stac: Stac) {
		this.collection = colleciton;
		this.stac = stac;
		this.apiUrl = this.stac.url;
	}

	public cloudCoverPropName = 'eo:cloud_cover';
	public hasCloudCoverProp = false;

	public intervalFrom: string;
	public intervalTo: string;

	public getFirstAsset = async () => {
		const res = await fetch(`${this.apiUrl}/collections/${this.collection}/items?limit=1`);
		if (!res.ok) {
			return undefined;
		}

		const stacItemFeatureCollection: StacItemFeatureCollection = await res.json();
		if (stacItemFeatureCollection.features.length === 0) {
			return undefined;
		}
		const stacItemFeature = stacItemFeatureCollection.features[0];
		this.hasCloudCoverProp = this.cloudCoverPropName in stacItemFeature.properties ? true : false;
		return stacItemFeature;
	};

	public search = async (
		bounds: LngLatBounds,
		limit = 10,
		minCloudCover = 5,
		searchFrom: string = undefined,
		searchTo: string = undefined
	) => {
		// const sortby = 'datetime';

		if (!searchFrom) {
			searchFrom = this.intervalFrom;
		}
		if (!searchTo) {
			searchTo = this.intervalTo;
			if (!searchTo) {
				searchTo = new Date().toISOString();
			}
		}

		const payload = {
			datetime: [searchFrom, searchTo].join('/'),
			collections: [this.collection],
			bbox: [
				bounds.getSouthWest().lng,
				bounds.getSouthWest().lat,
				bounds.getNorthEast().lng,
				bounds.getNorthEast().lat
			],
			limit: limit,
			query: {}
		};

		if (this.hasCloudCoverProp) {
			payload.query[this.cloudCoverPropName] = { gte: 0, lte: minCloudCover };
		} else {
			delete payload.query;
		}

		const res = await fetch(`${this.apiUrl}/search`, {
			method: 'POST',
			headers: {
				accept: 'application/json',
				'content-type': 'application/json'
			},
			body: JSON.stringify(payload)
		});
		const stacItemFeatureCollection: StacItemFeatureCollection = await res.json();
		return stacItemFeatureCollection;
	};

	public getStacCollection = async () => {
		const url = `${this.apiUrl}/collections/${this.collection}`;
		const res = await fetch(url);
		const feature: StacCollection = await res.json();
		this.stacCollection = feature;

		const interval = this.stacCollection.extent.temporal.interval;
		const first = interval[0];
		const last = interval[interval.length - 1];
		this.intervalFrom = first[0];
		this.intervalTo = last[last.length - 1];

		return feature;
	};

	public getStacItem = async (itemId: string) => {
		const url = `${this.apiUrl}/collections/${this.collection}/items/${itemId}`;
		const res = await fetch(url);
		const feature: StacItemFeature = await res.json();
		return feature;
	};

	public generateDataSetFeature = async (item: StacItemFeature, assetName: string) => {
		const assetItem = item.assets[assetName];
		const assetUrl = assetItem.href;

		const providers: Tag[] = this.stacCollection.providers?.map((p) => {
			return { key: 'provider', value: p.name };
		});

		const feature: DatasetFeature = {
			type: 'Feature',
			geometry: {
				type: 'Polygon',
				coordinates: [
					[
						[item.bbox[0], item.bbox[1]],
						[item.bbox[0], item.bbox[3]],
						[item.bbox[2], item.bbox[1]],
						[item.bbox[2], item.bbox[3]],
						[item.bbox[0], item.bbox[1]]
					]
				]
			},
			properties: {
				id: generateHashKey(assetUrl),
				name: `${this.stacCollection.title} - ${assetName}`,
				description: this.stacCollection.description,
				license: this.stacCollection.license,
				url: assetUrl,
				is_raster: true,
				access_level: AccessLevel.PUBLIC,
				tags: [
					{ key: 'type', value: 'stac' },
					{ key: 'stacApiType', value: 'api' },
					{ key: 'stacType', value: 'cog' },
					{ key: 'stac', value: this.stacId },
					{ key: 'collection', value: this.collection },
					{ key: 'item', value: item.id },
					{ key: 'asset', value: assetName },
					...providers
				]
			}
		};

		if (Object.keys(item.properties).length > 0) {
			feature.properties['stac_properties'] = item.properties;
		}

		return feature;
	};

	public generateCollectionDatasetFeature = async () => {
		const providers: Tag[] = this.stacCollection.providers?.map((p) => {
			return { key: 'provider', value: p.name };
		});
		const bbox = this.getMaxExtent();

		const collectionUrl = this.stacCollection.links.find((l) => l.rel === 'items').href;

		const feature: DatasetFeature = {
			type: 'Feature',
			geometry: {
				type: 'Polygon',
				coordinates: [
					[
						[bbox[0], bbox[1]],
						[bbox[0], bbox[3]],
						[bbox[2], bbox[1]],
						[bbox[2], bbox[3]],
						[bbox[0], bbox[1]]
					]
				]
			},
			properties: {
				id: generateHashKey(collectionUrl),
				name: `${this.stacCollection.title}`,
				description: this.stacCollection.description,
				license: this.stacCollection.license,
				url: collectionUrl,
				is_raster: true,
				access_level: AccessLevel.PUBLIC,
				tags: [
					{ key: 'type', value: 'stac' },
					{ key: 'stacType', value: 'collection' },
					{ key: 'stac', value: this.stacId },
					{ key: 'collection', value: this.collection },
					...providers
				]
			}
		};
		return feature;
	};

	public getMaxExtent = () => {
		const bboxes = this.stacCollection.extent.spatial.bbox;
		let minx: number;
		let miny: number;
		let maxx: number;
		let maxy: number;
		bboxes.forEach((bbox) => {
			if (!minx || bbox[0] < minx) {
				minx = bbox[0];
			}
			if (!miny || bbox[1] < miny) {
				miny = bbox[1];
			}
			if (!maxx || bbox[2] > maxx) {
				maxx = bbox[2];
			}
			if (!maxy || bbox[3] > maxy) {
				maxy = bbox[3];
			}
		});

		return [minx, miny, maxx, maxy];
	};
}
