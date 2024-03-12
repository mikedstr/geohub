<script lang="ts">
	import Header from '$components/header/Header.svelte';
	import { AdminControlOptions, MapStyles } from '$lib/config/AppConfig';
	import { HEADER_HEIGHT_CONTEXT_KEY, createHeaderHeightStore } from '$stores';
	import MaplibreCgazAdminControl from '@undp-data/cgaz-admin-tool';
	import '@undp-data/cgaz-admin-tool/dist/maplibre-cgaz-admin-control.css';
	import MaplibreStyleSwitcherControl from '@undp-data/style-switcher';
	import '@undp-data/style-switcher/dist/maplibre-style-switcher.css';
	import { Sidebar } from '@undp-data/svelte-sidebar';
	import {
		AttributionControl,
		GeolocateControl,
		Map,
		NavigationControl,
		ScaleControl
	} from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onMount, setContext } from 'svelte';
	import type { PageData } from './$types';
	import Charts from './components/Charts.svelte';
	import TimeSlider from './components/TimeSlider.svelte';
	import { ELECTRICITY_DATASETS } from './constansts';
	import type { Dataset } from './interfaces';
	import { hrea, map as mapStore, ml } from './stores';
	import { loadAdmin, setAzureUrl } from './utils/adminLayer';

	export let data: PageData;

	const headerHeightStore = createHeaderHeightStore();
	setContext(HEADER_HEIGHT_CONTEXT_KEY, headerHeightStore);

	const azureUrl = data.azureUrl;
	setAzureUrl(azureUrl);

	let styles = MapStyles;

	let mapContainer: HTMLDivElement;
	let map: Map;

	let showIntro = true;
	let electricitySelected: {
		name: string;
		icon: string;
		title: string;
	};
	let drawerWidth = '355px';

	let loadRasterLayer = () => {
		return;
	};

	onMount(() => {
		const promises = loadDatasets();
		promises.hrea.then((datasets) => {
			hrea.update(() => datasets);
		});
		promises.ml.then((datasets) => {
			ml.update(() => datasets);
		});

		map = new Map({
			container: mapContainer,
			style: styles[0].uri,
			center: [0, 0],
			zoom: 2.5,
			hash: true,
			attributionControl: false
		});

		map.addControl(new NavigationControl({}), 'top-right');
		map.addControl(
			new GeolocateControl({
				positionOptions: { enableHighAccuracy: true },
				trackUserLocation: true
			}),
			'top-right'
		);
		map.addControl(new ScaleControl({ maxWidth: 80, unit: 'metric' }), 'bottom-left');
		map.addControl(new AttributionControl({ compact: true }), 'bottom-right');
		map.getCanvas().style.cursor = 'pointer';

		const styleSwitcher = new MaplibreStyleSwitcherControl(MapStyles, {});
		map.addControl(styleSwitcher, 'bottom-left');

		map.on('load', () => {
			map.resize();

			styleSwitcher.initialise();

			const adminOptions = AdminControlOptions;
			adminOptions.isHover = true;
			map.addControl(new MaplibreCgazAdminControl(AdminControlOptions), 'top-left');
		});

		mapStore.update(() => map);

		mapStore.subscribe(() => {
			if ($mapStore) {
				$mapStore.on('load', () => {
					loadLayers();
				});
			}
		});
	});

	const loadDatasets = () => {
		const datasets = ELECTRICITY_DATASETS;

		const hrea: Promise<Dataset>[] = [];

		for (const ds of datasets.hrea) {
			hrea.push(
				new Promise<Dataset>((resolve) => {
					fetch(`/api/datasets/${ds.id}`)
						.then((res) => res.json())
						.then((data) => {
							const dataset: Dataset = ds;
							dataset.url = data.properties.url;
							resolve(dataset);
						});
				})
			);
		}

		const ml: Promise<Dataset>[] = [];

		for (const ds of datasets.ml) {
			ml.push(
				new Promise<Dataset>((resolve) => {
					fetch(`/api/datasets/${ds.id}`)
						.then((res) => res.json())
						.then((data) => {
							const dataset: Dataset = ds;
							dataset.url = data.properties.url;
							resolve(dataset);
						});
				})
			);
		}

		const hreaData = Promise.all(hrea);
		const mlData = Promise.all(ml);

		return {
			hrea: hreaData,
			ml: mlData
		};
	};

	let loadLayers = () => {
		loadRasterLayer();
		loadAdmin(true);
	};

	// new electricity dashboard -- start
	let POVERTY_ID = 'poverty';
	const HREA_ID = 'HREA';
	const ML_ID = 'ML';
	const NONE_ID = 'NONE';

	let electricityChoices = [
		{ name: HREA_ID, icon: 'fas fa-plug-circle-bolt', title: 'High Resolution Electricity Access' },
		{ name: ML_ID, icon: 'fas fa-laptop-code', title: 'Machine Learning' },
		{ name: NONE_ID, icon: 'fas fa-ban', title: 'None' }
	];
	electricitySelected = electricityChoices[2];
	let hideControls = true;
	let showElectricityContent = false;
	let showCompareContent = false;
	let showAnalyseContent = false;

	const clickElectrictyHandler = () => {
		showElectricityContent = !showElectricityContent;
		electricitySelected = showElectricityContent ? electricityChoices[0] : electricityChoices[2];
	};

	const clickCompareHandler = () => {
		showCompareContent = !showCompareContent;
	};

	const clickAnalyseHandler = () => {
		showAnalyseContent = !showAnalyseContent;
	};
	console.log(electricitySelected);
	// new electricity dashboard -- end
</script>

<Header isPositionFixed={true} />

<Sidebar show={true} position="left" bind:width={drawerWidth} bind:marginTop={$headerHeightStore}>
	<div slot="content" class="drawer-content m-0 px-4 pt-4">
		<!-- Old Code -->
		<!-- <p class="title is-4 m-0 p-0 pb-2 has-text-centered">UNDP Electricity Dashboard</p>
		<IntroductionPanel bind:showIntro />

		{#if !showIntro}
			<div class="box mx-0 my-1">
				<p class="title is-5 p-0 m-0 has-text-centered pb-2">Raw Data - Electricity Access</p>
				<ElectricityControl bind:electricitySelected bind:loadRasterLayer />
			</div>
			<div class="box mx-0 my-1">
				<p class="title is-5 p-0 m-0 has-text-centered pb-2">Overlays</p>
				<OverlayControl />
			</div>
			<div class="box mx-0 my-1">
				<p class="title is-5 p-0 m-0 has-text-centered pb-2">Statistics - Electricity Access</p>
				<Charts />
			</div>
			<div class="box mx-0 my-1">
				<p class="title is-5 p-0 m-0 has-text-centered pb-2">Statistics - Download</p>
				<DownloadData />
			</div>
		{/if} -->

		<!-- New Electricity Dashboard -->
		<div class="py-4">
			<h3 class="title is-6">DASHBOARD</h3>

			<h1 class="title is-4">Affordable and clean energy</h1>

			<div class="ed-box my-3">
				<button
					class="is-flex is-align-items-flex-start reset-element"
					type="button"
					on:click={clickElectrictyHandler}
				>
					<p class={showElectricityContent ? 'mb-3' : ''}>
						Explore the evolution of electricity access at administrative level.
					</p>
					<img src="/assets/icons/information.svg" alt="Information" />
				</button>

				{#if showElectricityContent}
					<div>
						<div class="ed-box__sub ed-box__sub--yellow has-background-light mb-1 p-2">
							Electrified
						</div>
						<div class="ed-box__sub ed-box__sub--black has-background-light p-2">
							Without electricity
						</div>
					</div>
					<div class="pos-fix has-background-white ed__slider py-1 px-3 box">
						<TimeSlider
							bind:electricitySelected
							bind:loadLayer={loadRasterLayer}
							bind:BEFORE_LAYER_ID={POVERTY_ID}
						/>
					</div>
				{/if}
			</div>

			<div class="ed-box my-3">
				<button
					class="is-flex is-align-items-flex-start reset-element"
					type="button"
					on:click={clickCompareHandler}
				>
					<p>Compare empirical with maschine learning data.</p>
					<img src="/assets/icons/information.svg" alt="Information" />
				</button>

				{#if showCompareContent}
					<div>
						<!-- content later -->
					</div>
				{/if}
			</div>

			<div class="ed-box my-3">
				<button
					class="is-flex is-align-items-flex-start reset-element"
					type="button"
					on:click={clickAnalyseHandler}
				>
					<p>Analyse bivariate data for wealth and access to electricity</p>
					<img src="/assets/icons/information.svg" alt="Information" />
				</button>

				{#if showAnalyseContent}
					<div>
						<!-- content later -->
					</div>
				{/if}
			</div>

			<div class="box">
				<Charts bind:hideControls />
			</div>
		</div>
	</div>

	<div slot="main">
		<div class="map" id="map" bind:this={mapContainer} />
	</div>
</Sidebar>

<style lang="scss">
	.map {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 100%;
	}

	.drawer-content {
		width: 100%;
		height: 100%;
		overflow: auto;
		display: flex;
		flex-direction: column;
		flex-basis: 100%;
		flex: 1;
	}

	// new electricity dashboard -- start
	.ed {
		&-box {
			border: 1px solid #d4d6d8;
			padding: 0.75rem;
			// cursor: pointer;

			&__sub {
				border-radius: 8px;

				&:before {
					display: inline-block;
					vertical-align: bottom;
					content: '';
					width: 24px;
					height: 24px;
					margin-right: 0.5rem;
					border-radius: 50%;
					background-color: #232e3d;
				}

				&--yellow:before {
					background-color: #fbc412;
				}
			}
		}

		&__slider {
			width: 300px;
			top: 165px;
			left: 367px;
		}
	}

	.pos {
		&-rel {
			position: relative;
		}

		&-fix {
			position: fixed;
			z-index: 9;
		}
	}

	.reset-element {
		all: unset;
	}
	// new electricity dashboard -- end
</style>
