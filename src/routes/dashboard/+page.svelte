<script lang="ts">
	import { onMount } from 'svelte';
	import { apiRequest } from '$lib/api';
	import { auth } from '$lib/auth.svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { TrendingUp, BarChart3, ScanBarcode, Truck, Hotel, AlertCircle, RefreshCw, Calendar, Tag, Layers, Globe } from 'lucide-svelte';

	// Helper for supplier fallback initials and colors
	const getSupplierBadge = (name: string) => {
		const initials = name ? name.substring(0, 2).toUpperCase() : '??';
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		const colors = [
			'bg-blue-500/10 text-blue-400 border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
			'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
			'bg-amber-500/10 text-amber-400 border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
			'bg-sky-500/10 text-sky-400 border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
			'bg-rose-500/10 text-rose-400 border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
			'bg-purple-500/10 text-purple-400 border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
			'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
			'bg-teal-500/10 text-teal-400 border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20',
		];
		const colorClass = colors[Math.abs(hash) % colors.length];
		return { initials, colorClass };
	};

	// Stats counters
	let stats = $state({ bought: 0, sold: 0 });
	let targets = $state<any[]>([]);
	let suppliers = $state<any[]>([]);
	let loading = $state(true);

	// Filters for stats query
	let selectedSupplier = $state('');
	let filterBrand = $state('');
	let filterDimension = $state('');
	let filterSeason = $state('');

	const loadDashboardData = async () => {
		loading = true;
		try {
			// Fetch stats
			const queryParams = new URLSearchParams();
			if (selectedSupplier) queryParams.set('supplierId', selectedSupplier);
			if (filterBrand) queryParams.set('brand', filterBrand);
			if (filterDimension) queryParams.set('dimension', filterDimension);
			if (filterSeason) queryParams.set('season', filterSeason);

			const statsRes = await apiRequest(`/analytics/stats?${queryParams.toString()}`);
			stats = statsRes;

			// Fetch targets
			const targetsRes = await apiRequest('/analytics/targets');
			targets = targetsRes;

			// Fetch suppliers
			const suppliersRes = await apiRequest('/settings/suppliers');
			suppliers = suppliersRes;
		} catch (err: any) {
			toast.error('Eroare la încărcarea datelor pe dashboard: ' + err.message);
		} finally {
			loading = false;
		}
	};

	onMount(() => {
		if (auth.user?.role !== 'ADMIN') {
			toast.error('Acces neautorizat. Doar administratorii pot vizualiza panoul de control.');
			goto('/');
		} else {
			loadDashboardData();
		}
	});

	const handleFilterSubmit = (e: Event) => {
		e.preventDefault();
		loadDashboardData();
	};

	const resetFilters = () => {
		selectedSupplier = '';
		filterBrand = '';
		filterDimension = '';
		filterSeason = '';
		loadDashboardData();
	};
</script>

<svelte:head>
	<title>Panou Control - Hilserv WMS</title>
</svelte:head>

<div class="space-y-8">
	<!-- Top Welcome row -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h2 class="text-2xl font-bold tracking-tight text-white">Panou de Control</h2>
			<p class="text-xs text-slate-400">Gestiune stoc, recepție și obiective furnizori în timp real.</p>
		</div>
		<button
			onclick={loadDashboardData}
			disabled={loading}
			class="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/20 active:scale-95"
		>
			<RefreshCw class="w-4.5 h-4.5 {loading ? 'animate-spin' : ''}" />
			Actualizează Datele
		</button>
	</div>

	<!-- Quick Actions Grid -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<a
			href="/scanner"
			class="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/30 transition-all duration-300 flex items-center justify-between gap-4 shadow-xl"
		>
			<div class="space-y-1">
				<h3 class="text-sm font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">Mod Scanare (Intrare/Ieșire)</h3>
				<p class="text-[11px] text-slate-400">Scanează EAN, printează etichete, plasează la raft sau vinde anvelope.</p>
			</div>
			<div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center transition-colors group-hover:bg-emerald-500 group-hover:text-slate-950">
				<ScanBarcode class="w-6 h-6" />
			</div>
		</a>

		<a
			href="/reception"
			class="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/30 transition-all duration-300 flex items-center justify-between gap-4 shadow-xl"
		>
			<div class="space-y-1">
				<h3 class="text-sm font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">Recepție Descărcări</h3>
				<p class="text-[11px] text-slate-400">Uploadează avize/facturi PDF/Excel, verifică descărcarea din camion și vezi rapoarte.</p>
			</div>
			<div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center transition-colors group-hover:bg-amber-500 group-hover:text-slate-950">
				<Truck class="w-6 h-6" />
			</div>
		</a>

		<a
			href="/hotel"
			class="group p-6 rounded-2xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 hover:border-sky-500/30 transition-all duration-300 flex items-center justify-between gap-4 shadow-xl"
		>
			<div class="space-y-1">
				<h3 class="text-sm font-semibold text-slate-200 group-hover:text-sky-400 transition-colors">Hotel Anvelope</h3>
				<p class="text-[11px] text-slate-400">Înregistrează custodii clienți, notează uzura și detaliile anvelopelor, eliberează PV.</p>
			</div>
			<div class="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center transition-colors group-hover:bg-sky-500 group-hover:text-slate-950">
				<Hotel class="w-6 h-6" />
			</div>
		</a>
	</div>

	<!-- Statistics Filtering Section -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
		<!-- Filters and Simple Stats Card -->
		<div class="lg:col-span-1 space-y-6">
			<!-- Filters Card -->
			<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl">
				<h3 class="text-sm font-bold text-slate-250 mb-4 flex items-center gap-2">
					<BarChart3 class="w-4.5 h-4.5 text-indigo-400" />
					Filtre Statistici
				</h3>
				<form onsubmit={handleFilterSubmit} class="space-y-4">
					<div class="space-y-1">
						<label for="supplier" class="text-[11px] font-medium text-slate-400">Furnizor</label>
						<select
							id="supplier"
							bind:value={selectedSupplier}
							class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-300"
						>
							<option value="">Toți Furnizorii</option>
							{#each suppliers as sup}
								<option value={sup.id}>{sup.name}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-1">
						<label for="brand" class="text-[11px] font-medium text-slate-400">Brand</label>
						<input
							type="text"
							id="brand"
							bind:value={filterBrand}
							placeholder="Continental, Michelin..."
							class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-300 placeholder-slate-650"
						/>
					</div>

					<div class="space-y-1">
						<label for="dimension" class="text-[11px] font-medium text-slate-400">Dimensiune</label>
						<input
							type="text"
							id="dimension"
							bind:value={filterDimension}
							placeholder="205/55 R16"
							class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-300 placeholder-slate-650"
						/>
					</div>

					<div class="space-y-1">
						<label for="season" class="text-[11px] font-medium text-slate-400">Sezon</label>
						<select
							id="season"
							bind:value={filterSeason}
							class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-300"
						>
							<option value="">Toate Sezoanele</option>
							<option value="SUMMER">Vară</option>
							<option value="WINTER">Iarnă</option>
							<option value="ALLSEASON">All Season</option>
						</select>
					</div>

					<div class="flex gap-2 pt-2">
						<button
							type="submit"
							class="flex-1 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
						>
							Aplică
						</button>
						<button
							type="button"
							onclick={resetFilters}
							class="px-3 py-2 text-xs font-semibold bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
						>
							Resetează
						</button>
					</div>
				</form>
			</div>

			<!-- Counters Display -->
			<div class="grid grid-cols-2 gap-4">
				<div class="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between shadow-xl">
					<span class="text-[10px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1">
						<Layers class="w-3.5 h-3.5 text-blue-400" />
						Total Cumpărate
					</span>
					<div class="mt-4">
						<span class="text-3xl font-extrabold text-blue-400 font-mono">{stats.bought}</span>
						<span class="text-xs text-slate-500 ml-1">buc</span>
					</div>
				</div>

				<div class="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between shadow-xl">
					<span class="text-[10px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1">
						<TrendingUp class="w-3.5 h-3.5 text-emerald-400" />
						Total Vândute
					</span>
					<div class="mt-4">
						<span class="text-3xl font-extrabold text-emerald-400 font-mono">{stats.sold}</span>
						<span class="text-xs text-slate-500 ml-1">buc</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Targets Progress Card -->
		<div class="lg:col-span-2 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl self-stretch">
			<h3 class="text-sm font-bold text-slate-250 mb-6 flex items-center gap-2">
				<TrendingUp class="w-4.5 h-4.5 text-amber-400" />
				Monitorizare Targete / Bonusuri Furnizori
			</h3>

			{#if targets.length === 0}
				<div class="flex flex-col items-center justify-center py-16 text-slate-500">
					<AlertCircle class="w-12 h-12 mb-3 text-slate-650" />
					<p class="text-xs">Nu există obiective de furnizor configurate în acest interval.</p>
					<p class="text-[10px] text-slate-600 mt-1">Configurați targete noi din Setări Admin.</p>
				</div>
			{:else}
				<div class="space-y-6">
					{#each targets as target}
						<div class="p-5 bg-slate-950/60 border border-slate-850 rounded-xl hover:border-slate-800 transition-colors">
							<!-- Target Header -->
							<div class="flex items-start justify-between gap-4 mb-3">
								<div class="flex items-center gap-3">
									{#if target.supplierImageUrl}
										<img src={target.supplierImageUrl} alt={target.supplierName} class="w-8 h-8 object-contain rounded bg-slate-950 border border-slate-800 p-0.5" />
									{:else}
										{@const badge = getSupplierBadge(target.supplierName)}
										<div class="w-8 h-8 rounded flex items-center justify-center text-xs font-bold border {badge.colorClass}">
											{badge.initials}
										</div>
									{/if}
									<div>
										<h4 class="text-sm font-bold text-slate-200 flex items-center gap-1">
											{target.supplierName}
											{#if target.supplierFeedUrl}
												<span title="Feed Activ"><Globe class="w-3.5 h-3.5 text-emerald-400" /></span>
											{/if}
										</h4>
										<!-- Date range badge -->
										<span class="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
											<Calendar class="w-3.5 h-3.5" />
											{new Date(target.startDate).toLocaleDateString('ro-RO')} - {new Date(target.endDate).toLocaleDateString('ro-RO')}
										</span>
									</div>
								</div>

								<div class="text-right">
									<span class="text-xs font-semibold text-slate-350">{target.currentBought} din {target.targetQuantity} buc</span>
									<div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{target.percentage}% Realizat</div>
								</div>
							</div>

							<!-- Filters list -->
							{#if target.filters.brand || target.filters.category || target.filters.season}
								<div class="flex flex-wrap gap-1.5 mb-4">
									{#if target.filters.brand}
										<span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-1">
											<Tag class="w-2.5 h-2.5" /> Brand: {target.filters.brand}
										</span>
									{/if}
									{#if target.filters.category}
										<span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
											Tip: {target.filters.category}
										</span>
									{/if}
									{#if target.filters.season}
										<span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
											Sezon: {target.filters.season}
										</span>
									{/if}
								</div>
							{/if}

							<!-- Progress Bar -->
							<div class="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-850 p-[1px]">
								<div
									class="h-full rounded-full transition-all duration-500 {target.percentage >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-r from-indigo-500 to-indigo-400'}"
									style="width: {Math.min(target.percentage, 100)}%"
								></div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
