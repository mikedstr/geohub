<script lang="ts">
	import type { AlgorithmLayerSpec } from '$components/maplibre/raster/RasterAlgorithmExplorer.svelte';
	import RasterBandSelectbox from '$components/pages/data/datasets/RasterBandSelectbox.svelte';
	import AddLayerButton from '$components/pages/map/data/AddLayerButton.svelte';
	import DataCardInfo from '$components/pages/map/data/DataCardInfo.svelte';
	import DataVectorCard from '$components/pages/map/data/DataVectorCard.svelte';
	import StacExplorerButton from '$components/pages/map/data/StacExplorerButton.svelte';
	import MiniMap from '$components/util/MiniMap.svelte';
	import { RasterTileData } from '$lib/RasterTileData';
	import { VectorTileData } from '$lib/VectorTileData';
	import { AccessLevel } from '$lib/config/AppConfig';
	import { getFirstSymbolLayerId, isRgbRaster, loadMap } from '$lib/helper';
	import type {
		DatasetFeature,
		Layer,
		LayerCreationInfo,
		RasterTileMetadata,
		VectorLayerTileStatLayer,
		VectorTileMetadata
	} from '$lib/types';
	import {
		LAYERLISTSTORE_CONTEXT_KEY,
		MAPSTORE_CONTEXT_KEY,
		type LayerListStore,
		type MapStore
	} from '$stores';
	import { Accordion, initTooltipTippy } from '@undp-data/svelte-undp-components';
	import type { RasterLayerSpecification, RasterSourceSpecification } from 'maplibre-gl';
	import { getContext } from 'svelte';
	import { v4 as uuidv4 } from 'uuid';
	import RasterAlgorithmExplorerButton from './RasterAlgorithmExplorerButton.svelte';

	const map: MapStore = getContext(MAPSTORE_CONTEXT_KEY);
	const layerListStore: LayerListStore = getContext(LAYERLISTSTORE_CONTEXT_KEY);

	export let feature: DatasetFeature;
	export let isExpanded: boolean;
	export let isStarOnly = false;

	const tippyTooltip = initTooltipTippy();

	let nodeRef: HTMLElement;
	let clientWidth: number;
	let layerLoading = false;
	$: width = `${clientWidth * 0.95}px`;

	let metadata: RasterTileMetadata | VectorTileMetadata;
	let selectedBand: string;
	let bands: string[];
	let isRgbTile = false;

	const is_raster: boolean = feature.properties.is_raster as unknown as boolean;
	const tags: [{ key: string; value: string }] = feature.properties.tags as unknown as [
		{ key: string; value: string }
	];
	const stacType = tags?.find((tag) => tag.key === 'stac');

	let expanded: { [key: string]: boolean } = {};
	let expandedDatasetAssetId: string;

	let tilestatsLayers: VectorLayerTileStatLayer[] = [];
	let showSTACDialog = false;
	let showAlgoDialog = false;

	let layerCreationInfo: LayerCreationInfo;

	const isCatalog =
		feature.properties.tags?.find((t) => t.key === 'stacApiType')?.value === 'catalog';

	const getMetadata = async () => {
		if (is_raster) {
			const rasterTile = new RasterTileData(feature);
			const rasterInfo = await rasterTile.getMetadata();
			if (rasterInfo) {
				metadata = rasterInfo;
				isRgbTile = isRgbRaster(rasterInfo.colorinterp);
				if (!isRgbTile) {
					if (metadata.band_metadata.length > 0) {
						bands = metadata.band_metadata.map((meta) => meta[0]) as string[];
						selectedBand = bands[0];
					}
				}
			}
		} else {
			const vectorTile = new VectorTileData(feature);
			metadata = await vectorTile.getMetadata();
			tilestatsLayers = (metadata as VectorTileMetadata).json?.tilestats?.layers;
		}
	};

	$: {
		let expandedDatasets = Object.keys(expanded).filter(
			(key) => expanded[key] === true && key !== expandedDatasetAssetId
		);
		if (expandedDatasets.length > 0) {
			expandedDatasetAssetId = expandedDatasets[0];
			Object.keys(expanded)
				.filter((key) => key !== expandedDatasetAssetId)
				.forEach((key) => {
					expanded[key] = false;
				});
			expanded[expandedDatasets[0]] = true;
		}
	}

	const addLayer = async () => {
		try {
			layerLoading = true;

			if (is_raster) {
				if (stacType) {
					// STAC
					return;
				} else {
					// COG
					if (!layerCreationInfo) {
						const rasterTile = new RasterTileData(feature);
						const bandIndex = parseInt(selectedBand) - 1;
						layerCreationInfo = await rasterTile.add($map, bandIndex);
					} else {
						const layerId = uuidv4();
						const sourceId = layerId;
						$map.addSource(sourceId, layerCreationInfo.source);

						const firstSymbolId = getFirstSymbolLayerId($map.getStyle().layers);
						layerCreationInfo.layer.id = layerId;
						layerCreationInfo.layer.source = sourceId;
						$map.addLayer(layerCreationInfo.layer, firstSymbolId);

						// eslint-disable-next-line @typescript-eslint/ban-ts-comment
						// @ts-ignore
						$map.fitBounds(layerCreationInfo.metadata.bounds);
					}

					$layerListStore = [
						{
							id: layerCreationInfo.layer.id,
							name: feature.properties.name,
							info: layerCreationInfo.metadata,
							dataset: feature,
							colorMapName: layerCreationInfo.colormap_name,
							classificationMethod: layerCreationInfo.classification_method
						},
						...$layerListStore
					];
				}

				await loadMap($map);
			}
		} finally {
			layerLoading = false;
		}
	};

	const addStacLayer = async (e: {
		detail: {
			layers: [
				{
					geohubLayer: Layer;
					layer: RasterLayerSpecification;
					source: RasterSourceSpecification;
					sourceId: string;
					metadata: RasterTileMetadata;
					colormap: string;
				}
			];
		};
	}) => {
		try {
			if (!e.detail) return;
			let dataArray = e.detail.layers;

			const rasterInfo = dataArray[0].metadata;
			for (const data of dataArray) {
				if (!$map.getSource(data.sourceId)) {
					$map.addSource(data.sourceId, data.source);
				}

				if (!$map.getLayer(data.layer.id)) {
					const firstSymbolId = getFirstSymbolLayerId($map.getStyle().layers);
					$map.addLayer(data.layer, firstSymbolId);
				}

				$layerListStore = [data.geohubLayer, ...$layerListStore];
			}

			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			$map.fitBounds(rasterInfo.bounds);
		} finally {
			layerLoading = false;
			showSTACDialog = false;
		}
		await loadMap($map);
	};

	const addAlgoLayer = async (e) => {
		try {
			let layerSpec: AlgorithmLayerSpec = e.detail;

			if (!$map.getSource(layerSpec.sourceId)) {
				$map.addSource(layerSpec.sourceId, layerSpec.source);
			}

			if (!$map.getLayer(layerSpec.layer.id)) {
				const firstSymbolId = getFirstSymbolLayerId($map.getStyle().layers);
				$map.addLayer(layerSpec.layer, firstSymbolId);
			}

			const rasterTile = new RasterTileData(feature);
			const rasterInfo = await rasterTile.getMetadata(layerSpec.algorithmId);

			rasterInfo.active_band_no = Object.keys(rasterInfo.stats)[0];

			$layerListStore = [
				{
					id: layerSpec.layerId,
					name: feature.properties.name,
					info: rasterInfo,
					dataset: feature,
					colorMapName: layerSpec.colormap_name
				},
				...$layerListStore
			];

			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			$map.fitBounds(rasterInfo.bounds);
		} finally {
			layerLoading = false;
			showAlgoDialog = false;
		}
		await loadMap($map);
	};

	const handleStarDeleted = () => {
		if (isStarOnly === true) {
			nodeRef.parentNode.removeChild(nodeRef);
		}
	};

	const handleLayerAdded = (e: { detail: LayerCreationInfo }) => {
		layerCreationInfo = e.detail;
	};

	$: if (isExpanded === true) {
		if (is_raster && !stacType) {
			getMetadata();
		}
	}
</script>

<div bind:this={nodeRef}>
	{#if tilestatsLayers?.length === 1}
		<DataVectorCard
			bind:layer={tilestatsLayers[0]}
			bind:feature
			bind:isExpanded
			bind:metadata
			on:starDeleted={handleStarDeleted}
			isShowInfo={true}
		/>
	{:else}
		{@const accessLevel = feature.properties.access_level ?? AccessLevel.PUBLIC}
		<Accordion title={feature.properties.name} bind:isExpanded>
			<div class="is-flex is-align-items-center" slot="buttons">
				{#if accessLevel !== AccessLevel.PUBLIC}
					<div
						class="action-button mr-2"
						use:tippyTooltip={{
							content: `This dataset has limited data accesibility. It only has ${
								accessLevel === AccessLevel.PRIVATE ? 'private' : 'organisation'
							} access.`
						}}
					>
						<span class="icon is-small">
							<i class="fa-solid fa-circle-exclamation has-text-grey-dark"></i>
						</span>
					</div>
				{/if}

				{#await getMetadata() then}
					{#if tilestatsLayers?.length < 2}
						{#if !isExpanded}
							{#if is_raster && !stacType && !isRgbTile}
								<RasterAlgorithmExplorerButton
									bind:feature
									isIconButton={true}
									on:added={addAlgoLayer}
									bind:showDialog={showAlgoDialog}
								/>
							{/if}
							{#if stacType}
								<StacExplorerButton
									bind:feature
									isIconButton={true}
									on:clicked={addStacLayer}
									bind:showDialog={showSTACDialog}
								/>
							{:else}
								<AddLayerButton
									bind:isLoading={layerLoading}
									title="Add layer"
									isIconButton={true}
									on:clicked={addLayer}
								/>
							{/if}
						{/if}
					{/if}
				{/await}
			</div>
			<div slot="content" class="card-container px-1" bind:clientWidth>
				{#if !is_raster && tilestatsLayers?.length > 1}
					<DataCardInfo bind:feature bind:metadata on:starDeleted={handleStarDeleted} />

					{#each tilestatsLayers as layer}
						<DataVectorCard
							bind:layer
							bind:feature
							bind:isExpanded={expanded[`${feature.properties.id}-${layer.layer}`]}
							bind:metadata
							isShowInfo={false}
						/>
					{/each}
				{:else}
					<DataCardInfo bind:feature bind:metadata on:starDeleted={handleStarDeleted}>
						{#if isRgbTile || selectedBand}
							{#key selectedBand}
								<div class="map">
									<MiniMap
										bind:feature
										bind:width
										height={'150px'}
										bind:isLoadMap={isExpanded}
										bind:metadata
										band={isRgbTile ? undefined : selectedBand}
										on:layerAdded={handleLayerAdded}
									/>
								</div>
							{/key}
						{/if}
					</DataCardInfo>

					{#if is_raster && !isCatalog && metadata && !isRgbTile && bands.length > 1}
						<div class="field">
							<!-- svelte-ignore a11y-label-has-associated-control -->
							<label class="label">Please select a raster band</label>
							<div class="control">
								<RasterBandSelectbox bind:metadata bind:selectedBand />
							</div>
						</div>
					{/if}

					{#if stacType}
						<StacExplorerButton
							bind:feature
							isIconButton={false}
							on:clicked={addStacLayer}
							bind:showDialog={showSTACDialog}
						/>
					{:else if layerCreationInfo}
						<AddLayerButton bind:isLoading={layerLoading} title="Add layer" on:clicked={addLayer} />
					{/if}

					{#if is_raster && !stacType && !isRgbTile}
						<div class="mt-2">
							<RasterAlgorithmExplorerButton
								bind:feature
								isIconButton={false}
								on:added={addAlgoLayer}
								bind:showDialog={showAlgoDialog}
							/>
						</div>
					{/if}
				{/if}
			</div>
		</Accordion>
	{/if}
</div>

<style lang="scss">
	.card-container {
		display: flex;
		flex-direction: column;
		margin-bottom: 0.5rem;

		.map {
			padding-bottom: 0.5rem;
		}
	}

	.action-button {
		cursor: pointer;
	}
</style>
