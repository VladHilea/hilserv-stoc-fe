<script lang="ts">
	import Select from 'svelte-select';
	import type { FilterOptions } from '$lib/types';

	interface Props {
		onSearch: (params: any) => void;
		loading: boolean;
		brands: string[];
		filterOptions: FilterOptions;
		searchParams: any;
	}

	let { onSearch, loading, brands, filterOptions, searchParams }: Props = $props();

	let searchTerm = $state('');
	let brandValue = $state<any[]>([]);
	let sourceValue = $state<any[]>([]);
	let model = $state('');
	let width = $state('');
	let height = $state('');
	let radius = $state('');
	let loadIndex = $state('');
	let speedIndex = $state('');
	let minPrice = $state('');
	let maxPrice = $state('');
	let quantity = $state(4);
	let season = $state('');
	let includeOldDot = $state(false);
	let includeNoStoc = $state(false);

	let models = $state<string[]>([]);

	const brandOptions = $derived(brands.map((b) => ({ value: b, label: b })));
	const sourceOptions = [
		{ value: 'internal', label: 'HILSERV (Intern)' },
		{ value: 'adtotal', label: 'AD TOTAL' },
		{ value: 'rotis', label: 'ROTIS' }
	];

	// Sync with searchParams
	$effect(() => {
		searchTerm = searchParams.search ?? '';

		const b = searchParams.brand;
		const bArr = b ? (Array.isArray(b) ? b : [b]) : [];
		brandValue = brandOptions.filter((o) => bArr.includes(o.value));

		const s = searchParams.source;
		const sArr = s ? (Array.isArray(s) ? s : [s]) : [];
		sourceValue = sourceOptions.filter((o) => sArr.includes(o.value));

		model = searchParams.model ?? '';
		width = searchParams.width ?? '';
		height = searchParams.height ?? '';
		radius = searchParams.radius ?? '';
		loadIndex = searchParams.load_index ?? '';
		speedIndex = searchParams.speed_index ?? '';
		minPrice = searchParams.min_price ?? '';
		maxPrice = searchParams.max_price ?? '';
		quantity = searchParams.quantity ?? 4;
		season = searchParams.season ?? '';
		includeOldDot = searchParams.include_old_dot === true;
		includeNoStoc = searchParams.include_no_stoc === true;
	});

	// Fetch models when brand changes
	$effect(() => {
		const currentBrands = brandValue ? brandValue.map((v: any) => v.value) : [];
		if (currentBrands.length === 1) {
			fetch(`/api/v1/models?brand=${encodeURIComponent(currentBrands[0])}`)
				.then((res) => res.json())
				.then((data) => {
					models = data;
				})
				.catch((err) => console.error('Failed to fetch models', err));
		} else {
			models = [];
			model = '';
		}
	});

	function triggerSearch(overrides?: any) {
		const currentBrands = brandValue ? brandValue.map((v: any) => v.value) : [];
		const currentSources = sourceValue ? sourceValue.map((v: any) => v.value) : [];

		const params = {
			searchTerm: overrides?.searchTerm !== undefined ? overrides.searchTerm : searchTerm,
			brand: overrides?.brand !== undefined ? overrides.brand : currentBrands,
			source: overrides?.source !== undefined ? overrides.source : currentSources,
			model: overrides?.model !== undefined ? overrides.model : model,
			minPrice: overrides?.minPrice !== undefined ? overrides.minPrice : minPrice,
			maxPrice: overrides?.maxPrice !== undefined ? overrides.maxPrice : maxPrice,
			quantity: overrides?.quantity !== undefined ? overrides.quantity : quantity,
			season: overrides?.season !== undefined ? overrides.season : season,
			includeOldDot:
				overrides?.includeOldDot !== undefined ? overrides.includeOldDot : includeOldDot,
			includeNoStoc:
				overrides?.includeNoStoc !== undefined ? overrides.includeNoStoc : includeNoStoc,
			width: overrides?.width !== undefined ? overrides.width : width,
			height: overrides?.height !== undefined ? overrides.height : height,
			radius: overrides?.radius !== undefined ? overrides.radius : radius,
			loadIndex: overrides?.loadIndex !== undefined ? overrides.loadIndex : loadIndex,
			speedIndex: overrides?.speedIndex !== undefined ? overrides.speedIndex : speedIndex
		};
		onSearch(params);
	}

	function handleClear() {
		const defaults = {
			searchTerm: '',
			brand: [],
			source: [],
			model: '',
			minPrice: '',
			maxPrice: '',
			quantity: 4,
			season: '',
			includeOldDot: false,
			includeNoStoc: false,
			width: '',
			height: '',
			radius: '',
			loadIndex: '',
			speedIndex: ''
		};

		searchTerm = defaults.searchTerm;
		brandValue = [];
		sourceValue = [];
		model = defaults.model;
		minPrice = defaults.minPrice;
		maxPrice = defaults.maxPrice;
		quantity = defaults.quantity;
		season = defaults.season;
		includeOldDot = defaults.includeOldDot;
		includeNoStoc = defaults.includeNoStoc;
		width = defaults.width;
		height = defaults.height;
		radius = defaults.radius;
		loadIndex = defaults.loadIndex;
		speedIndex = defaults.speedIndex;

		onSearch(defaults);
	}
</script>

<div class="mb-8 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-6 shadow-xl backdrop-blur-md">
	<form
		onsubmit={(e) => {
			e.preventDefault();
			triggerSearch();
		}}
		class="space-y-6"
	>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-6">
			<div class="flex flex-col gap-1.5 md:col-span-2 lg:col-span-1">
				<label for="searchInput" class="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500"
					>Căutare Rapidă</label
				>
				<input
					id="searchInput"
					type="text"
					placeholder="Brand, Model, SAP..."
					bind:value={searchTerm}
					class="h-[38px] rounded-lg border border-slate-350 dark:border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 transition-all outline-none focus:ring-2 focus:ring-indigo-500"
				/>
			</div>

			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between">
					<label for="seasonSelect" class="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Sezon</label>
					{#if season !== ''}
						<button type="button" onclick={() => { season = ''; triggerSearch(); }} class="text-[10px] font-bold text-rose-500 hover:text-rose-700">✕</button>
					{/if}
				</div>
				<select
					id="seasonSelect"
					bind:value={season}
					onchange={() => triggerSearch({ season })}
					class="h-[38px] cursor-pointer rounded-lg border border-slate-350 dark:border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
				>
					<option value="">Toate</option>
					<option value="summer">Vara</option>
					<option value="winter">Iarna</option>
					<option value="allseason">All-Season</option>
				</select>
			</div>

			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between">
					<label for="brandSelect" class="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500"
						>Brand</label
					>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={() => (brandValue = brandOptions)}
							class="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 hover:underline"
						>
							Tot
						</button>
						<button
							type="button"
							onclick={() => (brandValue = [])}
							class="text-[9px] font-bold text-rose-500 hover:underline"
						>
							Reset
						</button>
					</div>
				</div>
				<div class="custom-select-wrapper">
					<Select
						id="brandSelect"
						multiple
						items={brandOptions}
						bind:value={brandValue}
						placeholder="Toate"
						class="text-sm custom-select"
						showChevron={true}
					/>
				</div>
			</div>

			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between">
					<label for="modelSelect" class="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Model</label>
					{#if model !== ''}
						<button type="button" onclick={() => { model = ''; triggerSearch(); }} class="text-[10px] font-bold text-rose-500 hover:text-rose-700">✕</button>
					{/if}
				</div>
				<select
					id="modelSelect"
					bind:value={model}
					onchange={() => triggerSearch({ model })}
					class="h-[38px] rounded-lg border border-slate-350 dark:border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 transition-all outline-none focus:ring-2 focus:ring-indigo-500 {brandValue && brandValue.length !==
					1
						? 'cursor-not-allowed opacity-50'
						: 'cursor-pointer'}"
					disabled={!brandValue || brandValue.length !== 1}
				>
					<option value=""
						>{brandValue && brandValue.length === 1 ? 'Toate modelele' : 'Alege un brand'}</option
					>
					{#each models as m}
						<option value={m}>{m}</option>
					{/each}
				</select>
			</div>

			<div class="flex flex-col gap-1.5">
				<label for="quantityInput" class="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500"
					>Cantitate (Min)</label
				>
				<input
					id="quantityInput"
					type="number"
					bind:value={quantity}
					disabled={includeNoStoc}
					class="h-[38px] rounded-lg border border-slate-350 dark:border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 transition-all outline-none focus:ring-2 focus:ring-indigo-500 {includeNoStoc
						? 'cursor-not-allowed opacity-50'
						: ''}"
				/>
			</div>

			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between">
					<label for="sourceSelect" class="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500"
						>Sursă</label
					>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={() => (sourceValue = sourceOptions)}
							class="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 hover:underline"
						>
							Tot
						</button>
						<button
							type="button"
							onclick={() => (sourceValue = [])}
							class="text-[9px] font-bold text-rose-500 hover:underline"
						>
							Reset
						</button>
					</div>
				</div>
				<div class="custom-select-wrapper">
					<Select
						id="sourceSelect"
						multiple
						items={sourceOptions}
						bind:value={sourceValue}
						placeholder="Toate"
						class="text-sm custom-select"
						showChevron={true}
					/>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 items-end gap-4 md:grid-cols-4 lg:grid-cols-7">
			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between">
					<label for="widthSelect" class="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Lățime</label>
					{#if width !== ''}
						<button type="button" onclick={() => { width = ''; triggerSearch(); }} class="text-[10px] font-bold text-rose-500 hover:text-rose-700">✕</button>
					{/if}
				</div>
				<select
					id="widthSelect"
					bind:value={width}
					onchange={() => triggerSearch({ width })}
					class="h-[38px] cursor-pointer rounded-lg border border-slate-350 dark:border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
				>
					<option value="">Oricare</option>
					{#each filterOptions.widths as w}
						<option value={w}>{w}</option>
					{/each}
				</select>
			</div>
			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between">
					<label for="heightSelect" class="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500"
						>Înălțime</label
					>
					{#if height !== ''}
						<button type="button" onclick={() => { height = ''; triggerSearch(); }} class="text-[10px] font-bold text-rose-500 hover:text-rose-700">✕</button>
					{/if}
				</div>
				<select
					id="heightSelect"
					bind:value={height}
					onchange={() => triggerSearch({ height })}
					class="h-[38px] cursor-pointer rounded-lg border border-slate-350 dark:border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
				>
					<option value="">Oricare</option>
					{#each filterOptions.heights as h}
						<option value={h}>{h}</option>
					{/each}
				</select>
			</div>
			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between">
					<label for="radiusSelect" class="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Raza</label>
					{#if radius !== ''}
						<button type="button" onclick={() => { radius = ''; triggerSearch(); }} class="text-[10px] font-bold text-rose-500 hover:text-rose-700">✕</button>
					{/if}
				</div>
				<select
					id="radiusSelect"
					bind:value={radius}
					onchange={() => triggerSearch({ radius })}
					class="h-[38px] cursor-pointer rounded-lg border border-slate-350 dark:border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
				>
					<option value="">Oricare</option>
					{#each filterOptions.radiuses as r}
						<option value={r}>{r}</option>
					{/each}
				</select>
			</div>
			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between">
					<label for="loadIndexSelect" class="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500"
						>Indice Gr.</label
					>
					{#if loadIndex !== ''}
						<button type="button" onclick={() => { loadIndex = ''; triggerSearch(); }} class="text-[10px] font-bold text-rose-500 hover:text-rose-700">✕</button>
					{/if}
				</div>
				<select
					id="loadIndexSelect"
					bind:value={loadIndex}
					onchange={() => triggerSearch({ loadIndex })}
					class="h-[38px] cursor-pointer rounded-lg border border-slate-355 dark:border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
				>
					<option value="">Oricare</option>
					{#each filterOptions.load_indices as li}
						<option value={li}>{li}</option>
					{/each}
				</select>
			</div>
			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between">
					<label for="speedIndexSelect" class="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500"
						>Indice Vit.</label
					>
					{#if speedIndex !== ''}
						<button type="button" onclick={() => { speedIndex = ''; triggerSearch(); }} class="text-[10px] font-bold text-rose-500 hover:text-rose-700">✕</button>
					{/if}
				</div>
				<select
					id="speedIndexSelect"
					bind:value={speedIndex}
					onchange={() => triggerSearch({ speedIndex })}
					class="h-[38px] cursor-pointer rounded-lg border border-slate-355 dark:border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 uppercase outline-none focus:ring-2 focus:ring-indigo-500"
				>
					<option value="">Oricare</option>
					{#each filterOptions.speed_indices as si}
						<option value={si}>{si}</option>
					{/each}
				</select>
			</div>
			<div class="flex gap-2 md:col-span-2">
				<button
					type="button"
					onclick={handleClear}
					class="h-[38px] flex-1 cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95"
				>
					RESETEAZĂ
				</button>
				<button
					type="submit"
					disabled={loading}
					class="h-[38px] flex-[2] cursor-pointer rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest px-4 py-2 text-xs shadow-lg transition-all disabled:opacity-50 active:scale-95"
				>
					{loading ? '...' : 'Caută Produse'}
				</button>
			</div>
		</div>

		<div class="mt-2 flex gap-8 border-t border-slate-200 dark:border-slate-800 pt-4">
			<label class="group flex cursor-pointer items-center gap-3">
				<input
					type="checkbox"
					bind:checked={includeOldDot}
					onchange={() => triggerSearch({ includeOldDot })}
					class="h-5 w-5 cursor-pointer rounded border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
				/>
				<span
					class="text-xs font-bold uppercase tracking-tight text-slate-500 transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
					>Include DOT vechi (&lt;2025)</span
				>
			</label>
			<label class="group flex cursor-pointer items-center gap-3">
				<input
					type="checkbox"
					bind:checked={includeNoStoc}
					onchange={() => triggerSearch({ includeNoStoc })}
					class="h-5 w-5 cursor-pointer rounded border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
				/>
				<span
					class="text-xs font-bold uppercase tracking-tight text-slate-500 transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
					>Afișează și stoc 0</span
				>
			</label>
		</div>
	</form>
</div>

<style>
	/* Custom styles for svelte-select to work beautifully with dark/light themes */
	.custom-select-wrapper {
		--select-height: 38px;
		--select-border: 1px solid var(--color-slate-800);
		--select-border-radius: 0.5rem;
		--select-font-size: 0.875rem;
		--select-background: var(--color-slate-950);
		--select-multi-item-bg: var(--color-slate-850);
		--select-multi-item-color: var(--color-slate-100);
		--select-multi-item-outline: none;
		--select-input-color: var(--color-slate-100);
		--list-background: var(--color-slate-950);
		--list-border: 1px solid var(--color-slate-800);
		--item-color: var(--color-slate-100);
		--item-hover-bg: var(--color-slate-900);
		--item-active-bg: var(--color-slate-850);
	}

	:global(.custom-select) {
		background-color: var(--select-background) !important;
		border: var(--select-border) !important;
		border-radius: var(--select-border-radius) !important;
		font-size: var(--select-font-size) !important;
		color: var(--select-input-color) !important;
	}

	:global(.custom-select .multi-item) {
		background-color: var(--select-multi-item-bg) !important;
		color: var(--select-multi-item-color) !important;
		border-radius: 0.25rem !important;
	}

	:global(.custom-select .list-container) {
		background-color: var(--list-background) !important;
		border: var(--list-border) !important;
		border-radius: 0.5rem !important;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
	}

	:global(.custom-select .item) {
		color: var(--item-color) !important;
	}

	:global(.custom-select .item.hover) {
		background-color: var(--item-hover-bg) !important;
	}

	:global(.custom-select .item.active) {
		background-color: var(--item-active-bg) !important;
	}
</style>
