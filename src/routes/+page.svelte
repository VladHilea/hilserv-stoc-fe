<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { FilterOptions } from '$lib/types';
	import SearchFilters from '$lib/components/stoc/SearchFilters.svelte';
	import TireGrid from '$lib/components/stoc/TireGrid.svelte';
	import EnlargedImageModal from '$lib/components/stoc/EnlargedImageModal.svelte';

	const initialState = {
		search: '',
		brand: [],
		source: [],
		model: '',
		width: '',
		height: '',
		radius: '',
		load_index: '',
		speed_index: '',
		season: '',
		quantity: 4,
		include_no_stoc: false,
		include_old_dot: false
	};

	let loading = $state(false);
	let brands = $state<string[]>([]);
	let filterOptions = $state<FilterOptions>({
		widths: [],
		heights: [],
		radiuses: [],
		load_indices: [],
		speed_indices: []
	});

	let totalResults = $state(0);
	let selectedImage = $state<string | null>(null);

	// Derived queryParams based on URL
	const queryParams = $derived.by(() => {
		const params: any = { ...initialState };
		const searchParams = page.url.searchParams;

		Object.keys(initialState).forEach((key) => {
			if (Array.isArray((initialState as any)[key])) {
				const values = searchParams.getAll(key);
				params[key] = values.length > 0 ? values : [];
			} else {
				const value = searchParams.get(key);
				if (value === null) return;

				const defaultValue = (initialState as any)[key];
				if (typeof defaultValue === 'boolean') {
					params[key] = value === 'true';
				} else if (typeof defaultValue === 'number') {
					const num = Number(value);
					params[key] = isNaN(num) ? defaultValue : num;
				} else {
					params[key] = value;
				}
			}
		});

		return params;
	});

	// Persist to localStorage for "back" navigation
	$effect(() => {
		const queryString = page.url.searchParams.toString();
		if (queryString) {
			localStorage.setItem('last_search_params', `?${queryString}`);
		}
	});

	onMount(async () => {
		try {
			const brandsRes = await fetch('/api/v1/brands');
			brands = await brandsRes.json();

			const filtersRes = await fetch('/api/v1/filters');
			filterOptions = await filtersRes.json();
		} catch (err) {
			console.error('Failed to fetch initial data', err);
		}
	});

	function handleSearchTrigger(newParams: any) {
		const params = new URLSearchParams();

		const apiParams: any = {
			search: newParams.searchTerm,
			brand: newParams.brand,
			source: newParams.source,
			model: newParams.model,
			min_price: newParams.minPrice,
			max_price: newParams.maxPrice,
			quantity: newParams.quantity,
			season: newParams.season,
			include_old_dot: newParams.includeOldDot,
			include_no_stoc: newParams.includeNoStoc,
			width: newParams.width,
			height: newParams.height,
			radius: newParams.radius,
			load_index: newParams.loadIndex,
			speed_index: newParams.speedIndex
		};

		Object.entries(apiParams).forEach(([key, value]) => {
			if (value === undefined || value === null) return;
			if (typeof value === 'string' && value === '') return;

			if (Array.isArray(value)) {
				value.forEach((v) => {
					if (v !== undefined && v !== null && v !== '') {
						params.append(key, String(v));
					}
				});
			} else if (typeof value === 'boolean') {
				params.set(key, value ? 'true' : 'false');
			} else {
				params.set(key, String(value));
			}
		});

		const queryString = params.toString();
		goto(queryString ? `?${queryString}` : '/', { replaceState: true, noScroll: true });
	}

	// Update the total results in the layout header via DOM if element exists
	$effect(() => {
		const el = document.getElementById('total-results-count');
		if (el) {
			el.textContent = totalResults.toLocaleString();
		}
	});
</script>

<svelte:head>
	<title>Căutare Stoc - Hilserv WMS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Top Welcome row -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
				Căutare Catalog & Stoc
				<span class="text-sm font-normal text-slate-500 dark:text-slate-400 font-mono">
					({totalResults.toLocaleString()} produse găsite)
				</span>
			</h2>
			<p class="text-xs text-slate-500 dark:text-slate-450">Vizualizează stocurile interne Hilserv și ofertele furnizorilor în timp real.</p>
		</div>
	</div>

	<SearchFilters
		onSearch={handleSearchTrigger}
		{loading}
		{brands}
		{filterOptions}
		searchParams={queryParams}
	/>

	<TireGrid
		searchParams={queryParams}
		onImageClick={(url) => (selectedImage = url)}
		onTotalCountUpdate={(count) => (totalResults = count)}
		onLoadingUpdate={(l) => (loading = l)}
	/>

	<EnlargedImageModal url={selectedImage} onClose={() => (selectedImage = null)} />
</div>
