<script lang="ts">
	import { page } from '$app/stores';
	import { algorithmCategory } from '$components/maplibre/raster/RasterAlgorithmExplorer.svelte';
	import { HeroHeader, Notification, type BreadcrumbPage } from '@undp-data/svelte-undp-components';
	import { Card } from '@undp-data/svelte-undp-design';
	import type { PageData } from './$types';

	export let data: PageData;

	let algorithms = data.algorithms;

	let breadcrumbs: BreadcrumbPage[] = [
		{ title: 'home', url: '/' },
		{ title: 'Tools', url: $page.url.href }
	];
</script>

<HeroHeader title="Tools" bind:breadcrumbs />

<div class="mx-5 my-6">
	{#if Object.keys(algorithms).length === 0}
		<Notification showCloseButton={false}>No tools registered</Notification>
	{:else}
		<div class="columns is-multiline is-mobile">
			{#each Object.keys(algorithms) as name}
				{@const algo = algorithms[name]}
				<div class="column is-one-third-tablet is-one-quarter-desktop is-full-mobile">
					<Card
						linkName="Explore datasets"
						url="/data?algorithm={name}"
						tag={algorithmCategory[name.toLowerCase()] ?? 'geohub'}
						title={algo.title}
						description={algo.description}
					/>
				</div>
			{/each}
		</div>
	{/if}
</div>
