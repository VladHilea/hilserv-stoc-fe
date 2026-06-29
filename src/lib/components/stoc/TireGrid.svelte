<script lang="ts">
	import { onMount } from 'svelte';
	import type { TireResult } from '$lib/types';
	import BrandLogo from '$lib/components/stoc/BrandLogo.svelte';
	import SeasonIcon from '$lib/components/stoc/SeasonIcon.svelte';
	import StockDisplay from '$lib/components/stoc/StockDisplay.svelte';
	import DotDisplay from '$lib/components/stoc/DotDisplay.svelte';
	import { toast } from 'svelte-sonner';

	interface Props {
		searchParams: any;
		onImageClick: (url: string) => void;
		onTotalCountUpdate: (count: number) => void;
		onLoadingUpdate?: (loading: boolean) => void;
	}

	let { searchParams, onImageClick, onTotalCountUpdate, onLoadingUpdate }: Props = $props();

	const SPEED_INDEX_MAP: Record<string, string> = {
		Q: '160 km/h',
		R: '170 km/h',
		S: '180 km/h',
		T: '190 km/h',
		U: '200 km/h',
		H: '210 km/h',
		V: '240 km/h',
		W: '270 km/h',
		Y: '300 km/h',
		ZR: '>240 km/h'
	};

	const LOAD_INDEX_MAP: Record<string, string> = {
		'60': '250 kg',
		'61': '257 kg',
		'62': '265 kg',
		'63': '272 kg',
		'64': '280 kg',
		'65': '290 kg',
		'66': '300 kg',
		'67': '307 kg',
		'68': '315 kg',
		'69': '325 kg',
		'70': '335 kg',
		'71': '345 kg',
		'72': '355 kg',
		'73': '365 kg',
		'74': '375 kg',
		'75': '387 kg',
		'76': '400 kg',
		'77': '412 kg',
		'78': '425 kg',
		'79': '437 kg',
		'80': '450 kg',
		'81': '462 kg',
		'82': '475 kg',
		'83': '487 kg',
		'84': '500 kg',
		'85': '515 kg',
		'86': '530 kg',
		'87': '545 kg',
		'88': '560 kg',
		'89': '580 kg',
		'90': '600 kg',
		'91': '615 kg',
		'92': '630 kg',
		'93': '650 kg',
		'94': '670 kg',
		'95': '690 kg',
		'96': '710 kg',
		'97': '730 kg',
		'98': '750 kg',
		'99': '775 kg',
		'100': '800 kg',
		'101': '825 kg',
		'102': '850 kg',
		'103': '875 kg',
		'104': '900 kg',
		'105': '925 kg',
		'106': '950 kg',
		'107': '975 kg',
		'108': '1000 kg',
		'109': '1030 kg',
		'110': '1060 kg',
		'111': '1090 kg',
		'112': '1120 kg',
		'113': '1150 kg',
		'114': '1180 kg',
		'115': '1215 kg',
		'116': '1250 kg',
		'117': '1285 kg',
		'118': '1320 kg',
		'119': '1360 kg',
		'120': '1400 kg',
		'121': '1450 kg',
		'122': '1500 kg',
		'123': '1550 kg',
		'124': '1600 kg',
		'125': '1650 kg',
		'126': '1700 kg',
		'127': '1750 kg',
		'128': '1800 kg',
		'129': '1850 kg',
		'130': '1900 kg'
	};

	let results = $state<TireResult[]>([]);
	let loading = $state(true);
	let loadingMore = $state(false);
	let hasMore = $state(false);
	let offset = $state(0);
	let expandedRows = $state<Set<string>>(new Set());

	const LIMIT = 20;
	let observerTarget: HTMLElement | null = $state(null);
	let lastRequestId = 0;

	async function fetchResults(currentOffset: number, isNewSearch: boolean) {
		const requestId = ++lastRequestId;

		if (isNewSearch) {
			loading = true;
			onLoadingUpdate?.(true);
		} else {
			loadingMore = true;
		}

		try {
			const query = new URLSearchParams();
			Object.entries(searchParams).forEach(([key, val]) => {
				if (val !== undefined && val !== null && val !== '') {
					if (Array.isArray(val)) {
						val.forEach((v) => query.append(key, String(v)));
					} else {
						query.append(key, String(val));
					}
				}
			});
			query.append('offset', currentOffset.toString());
			query.append('limit', LIMIT.toString());

			const response = await fetch(`/api/v1/search?${query.toString()}`);
			const data = await response.json();

			if (requestId !== lastRequestId) return;

			if (isNewSearch) {
				results = data.results;
				onTotalCountUpdate(data.total);
			} else {
				results = [...results, ...data.results];
			}

			hasMore = data.has_more;
			offset = currentOffset;
		} catch (err) {
			if (requestId === lastRequestId) {
				console.error('Fetch failed', err);
				toast.error('Eroare la încărcarea datelor. Vă rugăm să reîncercați.');
			}
		} finally {
			if (requestId === lastRequestId) {
				loading = false;
				loadingMore = false;
				onLoadingUpdate?.(false);
			}
		}
	}

	// Trigger search when params change
	$effect(() => {
		const _params = JSON.stringify(searchParams);
		const handler = setTimeout(() => {
			offset = 0;
			fetchResults(0, true);
		}, 150);

		return () => clearTimeout(handler);
	});

	// Infinite Scroll logic
	$effect(() => {
		if (!observerTarget) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
					fetchResults(offset + LIMIT, false);
				}
			},
			{ threshold: 0.1 }
		);

		observer.observe(observerTarget);

		return () => {
			observer.disconnect();
		};
	});

	function toggleRow(id: string) {
		if (expandedRows.has(id)) {
			expandedRows.delete(id);
		} else {
			expandedRows.add(id);
		}
		expandedRows = new Set(expandedRows);
	}

	function handleDownloadLabels(eprelCode: string) {
		window.open(`https://eprel.ec.europa.eu/labels/tyres/Labels_${eprelCode}.zip`, '_blank');
	}

	const EuLabelBadge = ({
		label,
		type
	}: {
		label: string | null;
		type: 'fuel' | 'wet' | 'noise';
	}) => {
		if (!label || label === 'nan') return { text: '-', class: 'text-slate-400 dark:text-slate-650' };

		const colors: Record<string, string> = {
			A: 'bg-emerald-600',
			B: 'bg-emerald-550 dark:bg-emerald-500',
			C: 'bg-amber-500',
			D: 'bg-orange-500',
			E: 'bg-rose-500'
		};

		return {
			text: label.toUpperCase(),
			class: `${colors[label.toUpperCase()] || 'bg-slate-500'} flex items-center justify-center w-6 h-6 rounded text-white font-black text-xs shadow-sm`
		};
	};
</script>

<div class="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 shadow-xl backdrop-blur-md">
	<div class="overflow-x-auto">
		<table class="w-full border-collapse text-left">
			<thead>
				<tr class="border-b border-slate-850 bg-slate-900/50 dark:bg-slate-950/60">
					<th
						class="w-12 px-4 py-4 text-center text-[10px] font-black uppercase text-slate-400 dark:text-slate-500"
						>#</th
					>
					<th class="w-32 px-4 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Sursa</th>
					<th class="px-4 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400"
						>Brand / Model</th
					>
					<th class="w-40 px-4 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400"
						>Dimensiune</th
					>
					<th
						class="w-20 px-4 py-4 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400"
						>Sezon</th
					>
					<th class="w-40 px-4 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Stoc</th>
					<th
						class="w-32 px-4 py-4 text-right text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400"
						>Preț (RON)</th
					>
					<th class="w-32 px-4 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">DOT</th>
					<th class="w-32 px-4 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Acțiuni</th
					>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-200 dark:divide-slate-800/80">
				{#if loading}
					{#each Array.from({ length: 5 }) as _}
						<tr class="animate-pulse">
							<td colSpan={9} class="px-4 py-8"
								><div class="h-12 w-full rounded bg-slate-50 dark:bg-slate-950/40"></div></td
							>
						</tr>
					{/each}
				{:else if results.length === 0}
					<tr>
						<td colSpan={9} class="px-4 py-20 text-center">
							<div class="flex flex-col items-center justify-center gap-4">
								<div
									class="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950/60 text-3xl"
								>
									🔍
								</div>
								<div class="space-y-1">
									<h3 class="text-base font-bold text-slate-950 dark:text-slate-200">Nu am găsit rezultate</h3>
									<p class="mx-auto max-w-xs text-xs text-slate-500 dark:text-slate-450">
										Încercați să ajustați filtrele sau să căutați o altă dimensiune
										pentru a găsi ceea ce doriți.
									</p>
								</div>
							</div>
						</td>
					</tr>
				{:else}
					{#each results as item, idx}
						{@const isExpanded = expandedRows.has(item.id)}
						<tr
							class="group cursor-pointer transition-colors hover:bg-slate-900/30 dark:hover:bg-slate-800/20 {isExpanded
								? 'bg-indigo-50/20 dark:bg-indigo-950/10'
								: 'text-slate-900 dark:text-slate-100'}"
							onclick={() => toggleRow(item.id)}
						>
							<td class="px-4 py-4 text-center">
								<div class="flex flex-col items-center gap-1">
									<span class="font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500"
										>{idx + 1}</span
									>
									<span
										class="text-[8px] transition-transform duration-200 {isExpanded
											? 'rotate-90 text-indigo-600 dark:text-indigo-400'
											: 'text-slate-300 dark:text-slate-650'}">▶</span
									>
								</div>
							</td>
							<td class="px-4 py-4">
								<div class="flex flex-col gap-1.5">
									{#if item.source_summaries.find((s) => s.source === 'internal' && s.total > 0)}
										<div class="flex items-center">
											<img
												src="/logo-hilserv.png"
												alt="Hilserv"
												class="h-6 w-auto object-contain"
											/>
										</div>
									{/if}
									<div class="flex flex-wrap gap-1">
										{#each item.source_summaries.filter((s) => s.source !== 'internal' && s.total > 0) as s}
											<span
												class="rounded border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tighter {s.source ===
												'adtotal'
													? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
													: 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-350'}"
											>
												{s.source === 'adtotal' ? 'Ad Total' : 'Rotis'}
											</span>
										{/each}
									</div>
								</div>
							</td>
							<td class="px-4 py-4">
								<div class="flex items-center gap-4">
									<BrandLogo brand={item.brand} />
									{#if item.image_url}
										<div
											class="group relative flex-shrink-0 cursor-pointer"
											onclick={(e) => {
												e.stopPropagation();
												onImageClick(item.image_url!);
											}}
											role="button"
											tabindex="0"
											onkeydown={(e) => e.key === 'Enter' && onImageClick(item.image_url!)}
										>
											<img
												src={item.image_url}
												alt={item.brand}
												class="h-14 w-14 rounded border border-slate-100 dark:border-slate-800 bg-white object-contain shadow-sm"
											/>
											<div
												class="absolute inset-0 flex items-center justify-center bg-black/10 text-xs opacity-0 transition-opacity group-hover:opacity-100"
											>
												🔍
											</div>
										</div>
									{/if}
									<div class="min-w-0 flex-1">
										<div
											class="text-sm font-black uppercase leading-tight tracking-tight text-slate-900 dark:text-slate-100"
										>
											{item.brand}
										</div>
										<div
											class="mb-0.5 text-[11px] font-medium leading-tight text-slate-500 dark:text-slate-400"
										>
											{item.model}
										</div>
									</div>
								</div>
							</td>
							<td
								class="whitespace-nowrap px-4 py-4 font-mono text-sm font-black text-slate-800 dark:text-slate-200"
							>
								<div class="flex flex-col">
									<span>
										{item.width && item.height && item.radius
											? `${item.width}/${item.height}R${item.radius}`
											: item.dimension}
										{(item.load_index || item.speed_index) &&
											` ${item.load_index || ''}${item.speed_index || ''}`}
									</span>
									{#if item.load_version}
										<span class="text-[10px] font-black tracking-widest text-indigo-600 dark:text-indigo-400"
											>{item.load_version === 'XL'
												? 'EXTRA LOAD'
												: 'STANDARD LOAD'}</span
										>
									{/if}
								</div>
							</td>
							<td class="px-4 py-4 text-center text-xl">
								<SeasonIcon s={item.season} />
							</td>
							<td class="px-4 py-4">
								<StockDisplay {item} />
							</td>
							<td class="px-4 py-4 text-right">
								<div class="text-lg font-black leading-none text-slate-900 dark:text-slate-100">
									{parseFloat(item.min_price).toFixed(2)}
								</div>
								<span
									class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500"
									>RON (min)</span
								>
							</td>
							<td class="px-4 py-4">
								<div class="flex flex-col gap-1">
									<DotDisplay
										dot={item.stocks[0].dot}
										dotYear={item.stocks[0].dot_year}
										totalQty={item.stocks[0].quantity}
									/>
									{#if item.stocks.length > 1}
										<span class="text-[9px] font-bold text-slate-400 dark:text-slate-500"
											>+ {item.stocks.length - 1} variații</span
										>
									{/if}
								</div>
							</td>
							<td class="px-4 py-4">
								<div class="flex items-center gap-2">
									<a
										href="/tire/{item.id}"
										class="inline-flex rounded bg-indigo-600 dark:bg-indigo-700 px-3 py-1.5 text-[9px] font-black uppercase text-white shadow-sm transition-all active:scale-95 hover:bg-indigo-500 dark:hover:bg-indigo-650"
										onclick={(e) => e.stopPropagation()}
									>
										Detalii
									</a>
								</div>
							</td>
						</tr>

						{#if isExpanded}
							<tr class="border-l-4 border-indigo-600 dark:border-indigo-500 bg-slate-950/50 dark:bg-slate-950/40 shadow-inner">
								<td colSpan={9} class="px-8 py-8">
									<div class="grid grid-cols-1 gap-12 lg:grid-cols-4">
										<!-- Group 1: Codes -->
										<div class="space-y-4">
											<div class="flex flex-col gap-2">
												<span
													class="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500"
													>Coduri Identificare</span
												>
												<div class="mt-1 flex flex-col gap-3">
													<div class="group/copy flex items-center gap-2">
														<span class="min-w-[40px] text-xs font-bold text-slate-500"
															>EAN:</span
														>
														<span
															class="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-1 font-mono text-sm font-bold text-slate-700 dark:text-slate-350 shadow-sm"
															>{item.ean || '-'}</span
														>
														{#if item.ean}
															<button
																onclick={(e) => {
																	e.stopPropagation();
																	navigator.clipboard.writeText(item.ean!);
																	toast.success('EAN copiat!');
																}}
																class="cursor-pointer rounded border border-transparent p-1 text-indigo-600 dark:text-indigo-400 transition-all hover:bg-indigo-50/50 dark:hover:bg-indigo-950/50"
																title="Copiază EAN"
															>
																📋
															</button>
														{/if}
													</div>
													<div class="flex items-center gap-2">
														<span class="min-w-[40px] text-xs font-bold text-slate-500"
															>SAP:</span
														>
														<span
															class="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-1 font-mono text-sm font-bold text-slate-700 dark:text-slate-350 shadow-sm"
															>{item.sap_code || '-'}</span
														>
														{#if item.sap_code}
															<button
																onclick={(e) => {
																	e.stopPropagation();
																	navigator.clipboard.writeText(item.sap_code!);
																	toast.success('Cod SAP copiat!');
																}}
																class="cursor-pointer rounded border border-transparent p-1 text-indigo-600 dark:text-indigo-400 transition-all hover:bg-indigo-50/50 dark:hover:bg-indigo-950/50"
																title="Copiază SAP"
															>
																📋
															</button>
														{/if}
													</div>
													<div class="flex items-center gap-2">
														<span class="min-w-[40px] text-xs font-bold text-slate-500"
															>EPREL:</span
														>
														<span
															class="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-1 font-mono text-sm font-bold text-slate-700 dark:text-slate-350 shadow-sm"
															>{item.eprel || '-'}</span
														>
														{#if item.eprel}
															<button
																onclick={(e) => {
																	e.stopPropagation();
																	navigator.clipboard.writeText(item.eprel!);
																	toast.success('Cod EPREL copiat!');
																}}
																class="cursor-pointer rounded border border-transparent p-1 text-indigo-600 dark:text-indigo-400 transition-all hover:bg-indigo-50/50 dark:hover:bg-indigo-950/50"
																title="Copiază EPREL"
															>
																📋
															</button>
														{/if}
													</div>
													<div class="mt-1 flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
														<span class="text-xs font-bold text-slate-500"
															>Cod Furnizor:</span
														>
														<span
															class="rounded border border-indigo-100 dark:border-indigo-950 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 font-mono text-sm font-bold text-indigo-750 dark:text-indigo-400"
															>{item.supplier_internal_code || '-'}</span
														>
														{#if item.supplier_internal_code}
															<button
																onclick={(e) => {
																	e.stopPropagation();
																	navigator.clipboard.writeText(item.supplier_internal_code!);
																	toast.success('Cod Furnizor copiat!');
																}}
																class="cursor-pointer rounded border border-transparent p-1 text-indigo-600 dark:text-indigo-400 transition-all hover:bg-indigo-50/50 dark:hover:bg-indigo-950/50"
																title="Copiază Cod Furnizor"
															>
																📋
															</button>
														{/if}
													</div>
												</div>
											</div>
										</div>

										<!-- Group 2: Technical Indices -->
										<div class="space-y-4">
											<div class="flex flex-col gap-1">
												<span
													class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500"
													>Indici Performanță</span
												>
												<div class="mt-1 flex flex-col gap-3">
													<div class="flex flex-col">
														<span class="text-[10px] font-bold uppercase text-slate-500"
															>Indice Viteză</span
														>
														<span class="text-sm font-black text-slate-700 dark:text-slate-300">
															{item.speed_index || '-'}
															<span class="ml-1.5 font-bold text-indigo-600 dark:text-indigo-400">
																({SPEED_INDEX_MAP[item.speed_index || ''] || 'N/A'})
															</span>
														</span>
													</div>
													<div class="flex flex-col">
														<span class="text-[10px] font-bold uppercase text-slate-500"
															>Indice Greutate</span
														>
														<span class="text-sm font-black text-slate-700 dark:text-slate-300">
															{item.load_index || '-'}
															<span class="ml-1.5 font-bold text-indigo-600 dark:text-indigo-400">
																({LOAD_INDEX_MAP[item.load_index || ''] || 'N/A'})
															</span>
														</span>
													</div>
												</div>
											</div>
										</div>

										<!-- Group 3: EU Label -->
										<div class="space-y-4">
											<div class="flex flex-col gap-1">
												<span
													class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500"
													>Etichetă Europeană</span
												>
												<div class="mt-2 grid grid-cols-2 gap-4">
													<div
														class="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-2 shadow-sm"
													>
														<span class="text-[10px] font-bold uppercase text-slate-550 dark:text-slate-450"
															>Consum</span
														>
														{#if item.fuel_efficiency && item.fuel_efficiency !== 'nan'}
															{@const b = EuLabelBadge({
																label: item.fuel_efficiency,
																type: 'fuel'
															})}
															<div class={b.class}>{b.text}</div>
														{:else}
															<span class="text-slate-300 dark:text-slate-700">-</span>
														{/if}
													</div>
													<div
														class="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-2 shadow-sm"
													>
														<span class="text-[10px] font-bold uppercase text-slate-550 dark:text-slate-450"
															>Umed</span
														>
														{#if item.wet_grip && item.wet_grip !== 'nan'}
															{@const b = EuLabelBadge({
																label: item.wet_grip,
																type: 'wet'
															})}
															<div class={b.class}>{b.text}</div>
														{:else}
															<span class="text-slate-300 dark:text-slate-700">-</span>
														{/if}
													</div>
													<div
														class="col-span-2 flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-2 shadow-sm"
													>
														<div class="flex flex-col">
															<span
																class="text-[10px] font-bold uppercase leading-none text-slate-500 dark:text-slate-450"
																>Zgomot</span
															>
															<span class="text-xs font-black text-slate-700 dark:text-slate-300"
																>{item.noise_db} dB</span
															>
														</div>
														<div class="flex items-center gap-2">
															<span
																class="rounded border border-slate-250 dark:border-slate-850 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-black text-slate-600 dark:text-slate-350"
																>{item.noise_class || '-'}</span
															>
															<span class="text-lg">🔊</span>
														</div>
													</div>
												</div>
											</div>
										</div>

										<!-- Group 4: Actions & More -->
										<div class="flex flex-col justify-between py-1">
											<div class="flex flex-col gap-2">
												<span
													class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500"
													>Documentație Tehnică</span
												>
												{#if item.eprel}
													<div class="mt-1 flex flex-col gap-2">
														<button
															onclick={(e) => {
																e.stopPropagation();
																handleDownloadLabels(item.eprel!);
															}}
															class="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-650 hover:bg-indigo-600 px-5 py-3 text-xs font-black uppercase tracking-tight text-white shadow-lg transition-all active:scale-95"
														>
															📥 ZIP Etichete
														</button>

														<a
															href="https://eprel.ec.europa.eu/screen/product/tyres/{item.eprel}"
															target="_blank"
															rel="noopener noreferrer"
															class="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-5 py-2 text-[10px] font-black uppercase tracking-tight text-indigo-600 dark:text-indigo-400 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40"
															onclick={(e) => e.stopPropagation()}
														>
															🌐 Pagina EPREL
														</a>

														<a
															href="https://eprel.ec.europa.eu/fiches/tyres/Fiche_{item.eprel}_RO.pdf"
															target="_blank"
															rel="noopener noreferrer"
															class="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-5 py-2 text-[10px] font-black uppercase tracking-tight text-slate-700 dark:text-slate-350 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40"
															onclick={(e) => e.stopPropagation()}
														>
															📄 Fișă PDF (RO)
														</a>
													</div>
												{:else}
													<span class="text-xs italic text-slate-400 dark:text-slate-600"
														>EPREL ID indisponibil</span
													>
												{/if}
											</div>

											<div class="mt-4 flex items-center gap-4 text-sm">
												{#if item.snow_grip}
													<span
														title="Destinat pentru zăpadă"
														class="rounded-lg border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50 dark:bg-indigo-950/20 p-2 text-indigo-600 dark:text-indigo-400 shadow-sm"
														>❄️</span
													>
												{/if}
												{#if item.ice_grip}
													<span
														title="Destinat pentru polei"
														class="rounded-lg border border-cyan-150 dark:border-cyan-950/60 bg-cyan-50 dark:bg-cyan-950/20 p-2 text-cyan-600 dark:text-cyan-400 shadow-sm"
														>🏔️</span
													>
												{/if}
												{#if item.load_version}
													<span
														class="rounded bg-slate-800 dark:bg-slate-950 px-2 py-1 text-[10px] font-black text-white"
														>{item.load_version}</span
													>
												{/if}
											</div>
										</div>
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				{/if}

				<!-- Infinite Scroll Trigger -->
				<tr bind:this={observerTarget} class="h-20">
					<td colSpan={9} class="py-8 text-center">
						{#if loadingMore}
							<div
								class="flex items-center justify-center gap-2 text-sm font-medium text-slate-450"
							>
								<div
									class="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
								></div>
								Se încarcă mai multe rezultate...
							</div>
						{/if}
						{#if !hasMore && results.length > 0}
							<span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600"
								>Sfârșitul listei</span
							>
						{/if}
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</div>
