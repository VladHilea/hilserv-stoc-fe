<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import BrandLogo from '$lib/components/stoc/BrandLogo.svelte';
	import SeasonIcon from '$lib/components/stoc/SeasonIcon.svelte';
	import DotDisplay from '$lib/components/stoc/DotDisplay.svelte';
	import { toast } from 'svelte-sonner';
	import { apiRequest } from '$lib/api';
	import { auth } from '$lib/auth.svelte';
	import { Lock, Unlock, MessageSquare, Clock, User, Calendar } from 'lucide-svelte';

	let id = $derived(page.params.id);
	let data = $state<any>(null);
	let loading = $state(true);

	// WMS detail state for active serials / reservations
	let wmsTireDetails = $state<any>(null);
	let loadingWms = $state(false);

	// Reservation form state
	let showReserveModal = $state(false);
	let reservingSerial = $state<any>(null);
	let reserveReason = $state('');
	let reserveDuration = $state<'1_day' | '1_week'>('1_day');
	let submittingReservation = $state(false);

	async function loadWmsDetails(ean: string) {
		if (!ean) return;
		loadingWms = true;
		try {
			wmsTireDetails = await apiRequest(`/warehouse/check/${ean}`);
		} catch (err: any) {
			console.error('Failed to load WMS tire details:', err);
		} finally {
			loadingWms = false;
		}
	}

	$effect(() => {
		if (!id) return;
		loading = true;
		fetch(`/api/v1/tires?id=${id}`)
			.then((res) => {
				if (!res.ok) throw new Error('API request failed');
				return res.json();
			})
			.then((d) => {
				if (!d || !d.tire) throw new Error('Invalid tire data received');
				data = d;
				if (d.tire.ean) {
					loadWmsDetails(d.tire.ean);
				}
			})
			.catch((err) => {
				console.error('Fetch error:', err);
				toast.error('Eroare la încărcarea detaliilor produsului.');
				data = null;
			})
			.finally(() => (loading = false));
	});

	function handleBack() {
		if (window.history.length > 1) {
			history.back();
		} else {
			const savedParams = localStorage.getItem('last_search_params') || '';
			goto(`/${savedParams}`);
		}
	}

	const eprelId = $derived.by(() => {
		if (!data?.tire?.eprel) return null;
		let eid = data.tire.eprel;
		if (eid.endsWith('.0')) return eid.slice(0, -2);
		return eid;
	});

	async function handleImageUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		if (!target.files || target.files.length === 0) return;
		if (!data || !data.tire) return;

		const file = target.files[0];
		const formData = new FormData();
		formData.append('file', file);

		try {
			const res = await fetch(`/api/v1/tires/${data.tire.id}/image`, {
				method: 'POST',
				body: formData
			});

			if (!res.ok) {
				const errData = await res.json();
				throw new Error(errData.detail || 'Upload failed');
			}

			const resData = await res.json();
			data.tire.image_url = resData.image_url;
			toast.success('Imaginea a fost încărcată cu succes!');
		} catch (err: any) {
			console.error('Upload error:', err);
			toast.error('Încărcarea imaginii a eșuat: ' + err.message);
		}
	}

	async function handleCreateReservation() {
		if (!reservingSerial || !reserveReason.trim()) {
			toast.error('Vă rugăm să introduceți motivul rezervării.');
			return;
		}
		submittingReservation = true;
		try {
			await apiRequest('/reservations', {
				method: 'POST',
				body: {
					serialId: reservingSerial.id,
					reason: reserveReason.trim(),
					duration: reserveDuration
				}
			});
			toast.success('Anvelopa a fost rezervată cu succes!');
			showReserveModal = false;
			reservingSerial = null;
			reserveReason = '';
			if (data?.tire?.ean) {
				await loadWmsDetails(data.tire.ean);
			}
		} catch (err: any) {
			toast.error('Rezervarea a eșuat: ' + err.message);
		} finally {
			submittingReservation = false;
		}
	}

	async function handleReleaseReservation(serialId: string) {
		if (!confirm('Sigur doriți să anulați rezervarea pentru această anvelopă?')) return;
		try {
			await apiRequest(`/reservations/serial/${serialId}`, {
				method: 'DELETE'
			});
			toast.success('Rezervarea a fost anulată, anvelopa este din nou în stoc.');
			if (data?.tire?.ean) {
				await loadWmsDetails(data.tire.ean);
			}
		} catch (err: any) {
			toast.error('Anularea rezervării a eșuat: ' + err.message);
		}
	}
</script>

<svelte:head>
	<title>{data?.tire ? `${data.tire.brand} ${data.tire.model}` : 'Detalii Anvelopă'} - Hilserv WMS</title>
</svelte:head>

<div class="space-y-8">
	<!-- Navigation -->
	<button
		onclick={handleBack}
		class="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors"
	>
		← ÎNAPOI LA CĂUTARE
	</button>

	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div
				class="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"
			></div>
		</div>
	{:else if !data || !data.tire}
		<div class="flex flex-col items-center justify-center gap-4 py-16 text-center">
			<div class="text-4xl">❌</div>
			<h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">Produsul nu a fost găsit</h2>
			<p class="text-sm text-slate-500 dark:text-slate-450">ID-ul anvelopei este invalid sau a expirat din stoc.</p>
			<button
				onclick={() => goto('/')}
				class="mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 font-bold text-white shadow-md transition-all"
			>
				REVENIRE LA CĂUTARE
			</button>
		</div>
	{:else}
		{@const { tire, stocks, total_stock } = data}
		
		<!-- Main Content Grid -->
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
			<!-- Left Column: Image and Label -->
			<div class="space-y-6">
				<div class="flex flex-col items-center gap-3">
					<div
						class="w-full flex min-h-[350px] items-center justify-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 p-8 shadow-md"
					>
						{#if tire.image_url}
							<img
								src={tire.image_url}
								alt={tire.brand}
								class="h-auto max-h-[320px] max-w-full rounded-xl object-contain"
							/>
						{:else}
							<div class="text-6xl text-slate-300 dark:text-slate-700">🛞</div>
						{/if}
					</div>

					<label
						class="w-full text-center py-2.5 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-850/60 bg-indigo-50/20 dark:bg-indigo-950/10 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-xs font-bold text-indigo-700 dark:text-indigo-400 cursor-pointer transition-all active:scale-98 shadow-sm"
					>
						📸 Urcă Poză Model
						<input
							type="file"
							accept="image/*"
							class="hidden"
							onchange={handleImageUpload}
						/>
					</label>
				</div>

				<!-- EU Label Embed -->
				{#if eprelId}
					<div class="space-y-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-6 shadow-md backdrop-blur-md">
						<h3 class="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-550">
							Etichetă Energetică Oficială
						</h3>
						<div
							class="aspect-[2/3] w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950"
						>
							<iframe
								src="https://eprel.ec.europa.eu/screen/product/tyres/{eprelId}?iframe=true"
								class="h-full w-full border-0"
								title="EPREL Label"
							></iframe>
						</div>
						<p class="text-center text-[9px] font-medium italic text-slate-400 dark:text-slate-500">
							Sursă: European Product Registry for Energy Labelling
						</p>
					</div>
				{/if}
			</div>

			<!-- Right Columns: Info and Stock -->
			<div class="space-y-8 lg:col-span-2">
				<!-- Title Section -->
				<div class="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-8 md:p-10 shadow-md backdrop-blur-md">
					<div class="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
						<div>
							<div class="mb-3 flex items-center gap-4">
								<BrandLogo brand={tire.brand} />
								<span
									class="rounded bg-indigo-600 dark:bg-indigo-800 px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter text-white"
									>{tire.category || 'AUTO'}</span
								>
							</div>
							<h1
								class="mb-2 text-3xl font-black uppercase leading-tight tracking-tight text-slate-900 dark:text-slate-100"
							>
								{tire.brand}
								{tire.model}
							</h1>
							<p class="font-mono text-xl md:text-2xl font-black text-indigo-650 dark:text-indigo-400">
								{tire.width}/{tire.height}R{tire.radius}
								{tire.load_index}{tire.speed_index}
							</p>
						</div>
						<div class="flex items-center gap-3">
							<SeasonIcon s={tire.season} />
							<div class="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
								{tire.season === 'summer' ? 'Vară' : tire.season === 'winter' ? 'Iarnă' : tire.season === 'allseason' ? 'All Season' : 'Nespecificat'}
							</div>
						</div>
					</div>

					<div
						class="mt-10 grid grid-cols-2 gap-6 border-t border-slate-200 dark:border-slate-800/80 pt-10 md:grid-cols-4"
					>
						<div>
							<p class="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
								EAN CODE
							</p>
							<div class="flex items-center gap-2">
								<p
									class="w-fit rounded border border-slate-250 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 py-1 font-mono text-xs font-bold text-slate-700 dark:text-slate-300"
								>
									{tire.ean || '-'}
								</p>
								{#if tire.ean}
									<button
										onclick={() => {
											navigator.clipboard.writeText(tire.ean);
											toast.success('EAN copiat!');
										}}
										class="cursor-pointer rounded p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-850"
										title="Copiază EAN"
									>
										📋
									</button>
								{/if}
							</div>
						</div>
						<div>
							<p class="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
								SAP CODE
							</p>
							<div class="flex items-center gap-2">
								<p
									class="w-fit rounded border border-slate-250 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 py-1 font-mono text-xs font-bold text-slate-700 dark:text-slate-300"
								>
									{tire.sap_code || '-'}
								</p>
								{#if tire.sap_code}
									<button
										onclick={() => {
											navigator.clipboard.writeText(tire.sap_code);
											toast.success('Cod SAP copiat!');
										}}
										class="cursor-pointer rounded p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-850"
										title="Copiază SAP"
									>
										📋
									</button>
								{/if}
							</div>
						</div>
						<div>
							<p class="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
								EPREL ID
							</p>
							<div class="flex items-center gap-2">
								<p
									class="w-fit rounded border border-slate-250 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 py-1 font-mono text-xs font-bold text-slate-700 dark:text-slate-300"
								>
									{eprelId || '-'}
								</p>
								{#if eprelId}
									<button
										onclick={() => {
											navigator.clipboard.writeText(eprelId);
											toast.success('Cod EPREL copiat!');
										}}
										class="cursor-pointer rounded p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-850"
										title="Copiază EPREL ID"
									>
										📋
									</button>
								{/if}
							</div>
						</div>
						<div>
							<p class="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
								MARCAJ OE
							</p>
							<p class="text-sm font-black text-indigo-600 dark:text-indigo-400">{tire.oe_mark || 'Standard'}</p>
						</div>
					</div>

					<!-- Download Buttons Section -->
					{#if eprelId}
						<div class="mt-8 flex flex-wrap gap-3 border-t border-slate-200 dark:border-slate-800/80 pt-8">
							<button
								onclick={() =>
									window.open(
										`https://eprel.ec.europa.eu/labels/tyres/Labels_${eprelId}.zip`,
										'_blank'
									)}
								class="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-950 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md transition-all active:scale-95 hover:bg-slate-800 dark:hover:bg-slate-900"
							>
								📥 ZIP ETICHETE
							</button>
							<button
								onclick={() =>
									window.open(
										`https://eprel.ec.europa.eu/fiches/tyres/Fiche_${eprelId}_RO.pdf`,
										'_blank'
									)}
								class="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-850 dark:text-slate-350 shadow-sm transition-all active:scale-95 hover:bg-slate-50 dark:hover:bg-slate-800/45"
							>
								📄 FIȘĂ TEHNICĂ (PDF)
							</button>
						</div>
					{/if}
				</div>

				<!-- Stock Breakdown -->
				<div class="rounded-3xl bg-indigo-900 dark:bg-slate-900/85 p-8 md:p-10 text-white border border-indigo-950 dark:border-slate-800 shadow-xl">
					<div class="mb-8 flex items-center justify-between">
						<h2 class="text-lg font-black uppercase tracking-wider">Disponibilitate Stoc</h2>
						<div
							class="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-2"
						>
							<span class="text-[10px] font-black uppercase tracking-widest opacity-60"
								>Total</span
							>
							<span class="text-2xl font-black">{total_stock}</span>
						</div>
					</div>

					<div class="space-y-4">
						{#each stocks as s}
							<div
								class="flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/5 p-6 transition-colors hover:bg-white/10 md:flex-row md:items-center md:justify-between"
							>
								<div class="flex items-center gap-6">
									<div
										class="rounded px-2.5 py-1 text-[9px] font-black uppercase tracking-wide shadow-sm {s.source ===
										'internal'
											? 'bg-blue-700 text-yellow-450'
											: s.source === 'adtotal'
												? 'bg-emerald-600 text-white'
												: 'bg-amber-600 text-white'}"
									>
										{s.source === 'internal' ? 'HILSERV' : s.source === 'adtotal' ? 'AD TOTAL' : s.source.toUpperCase()}
									</div>
									<div>
										<p class="text-base font-black">
											{s.source === 'internal'
												? 'DEPO HILSERV'
												: s.source === 'adtotal' && s.location === 'Main'
													? 'IMGB'
													: s.location}
										</p>
										<div class="mt-1">
											<DotDisplay
												dot={s.dot}
												dotYear={s.dot_year}
												totalQty={s.quantity}
												variant="dark"
											/>
										</div>
										{#if s.supplier_internal_code}
											<p
												class="mt-2 text-[9px] font-bold uppercase tracking-widest text-slate-400"
											>
												Cod Furnizor: <span class="text-slate-200"
													>{s.supplier_internal_code}</span
												>
											</p>
										{/if}
									</div>
								</div>
								<div class="flex items-center gap-8">
									<div class="text-right">
										<p class="text-xl font-black">{s.stock_raw || s.quantity} BUC</p>
										<p class="text-xs font-bold text-emerald-450 dark:text-emerald-400">
											{parseFloat(s.price_buy).toFixed(2)} RON
										</p>
									</div>
									{#if s.source !== 'internal'}
										<a
											href={s.source === 'adtotal'
												? `https://www3.eoriginal.ro/anvelope/#/?term=${s.supplier_internal_code}`
												: '#'}
											target="_blank"
											rel="noopener noreferrer"
											class="cursor-pointer rounded-xl bg-emerald-650 hover:bg-emerald-600 px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-white shadow-lg transition-all active:scale-95"
											onclick={(e) => s.source !== 'adtotal' && e.preventDefault()}
										>
											CUMPĂRĂ
										</a>
									{/if}
								</div>
							</div>
						{/each}
						{#if stocks.length === 0}
							<div class="py-10 text-center font-bold italic text-slate-400">
								Niciun stoc disponibil în acest moment.
							</div>
						{/if}
					</div>
				</div>

				<!-- Physical WMS Stock Serials and Reservations -->
				{#if wmsTireDetails && wmsTireDetails.activeSerials}
					<div class="rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-8 md:p-10 shadow-md backdrop-blur-md mt-6">
						<div class="mb-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-805 pb-4">
							<div>
								<h2 class="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
									📦 Seriale Depozit (Stoc Fizic Intern)
								</h2>
								<p class="text-xs text-slate-500 dark:text-slate-450 mt-1">Anvelope fizice înregistrate în sistemul WMS prin cod unic.</p>
							</div>
							<span class="rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-750 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40 px-3 py-1 text-xs font-bold font-mono">
								{wmsTireDetails.activeSerials.length} unități
							</span>
						</div>

						<div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
							<table class="w-full text-left border-collapse text-xs">
								<thead>
									<tr class="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-550 dark:text-slate-450 uppercase font-black tracking-wider text-[10px]">
										<th class="py-3 px-4">Cod Intern / Serial</th>
										<th class="py-3 px-4">DOT</th>
										<th class="py-3 px-4">Origine</th>
										<th class="py-3 px-4">Locație (Raft)</th>
										<th class="py-3 px-4">Preț Achiziție</th>
										<th class="py-3 px-4">Stare</th>
										<th class="py-3 px-4 text-right">Acțiuni</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-750 dark:text-slate-350">
									{#each wmsTireDetails.activeSerials as s}
										{@const activeRes = s.reservations?.find((r: any) => !r.releasedAt)}
										<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors {activeRes ? 'bg-amber-50/10 dark:bg-amber-950/5' : ''}">
											<td class="py-3.5 px-4 font-mono font-bold text-indigo-650 dark:text-indigo-400">
												{s.internal_code?.internalCode || s.serialNumber}
											</td>
											<td class="py-3.5 px-4 font-mono">{s.dot || '-'}</td>
											<td class="py-3.5 px-4 font-medium">{s.countryOfOrigin || '-'}</td>
											<td class="py-3.5 px-4">
												{#if s.section}
													<span class="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 font-bold">
														{s.section.name}
													</span>
												{:else}
													<span class="text-rose-500 italic">Nelocalizat</span>
												{/if}
											</td>
											<td class="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
												{parseFloat(s.purchasePrice).toFixed(2)} RON
											</td>
											<td class="py-3.5 px-4">
												{#if activeRes}
													<div class="flex flex-col gap-0.5">
														<span class="w-fit flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
															<Lock class="w-3.5 h-3.5" />
															REZERVAT
														</span>
														<span class="text-[9px] text-slate-500 dark:text-slate-400 max-w-[150px] truncate" title="Motiv: {activeRes.reason}">
															Motiv: {activeRes.reason}
														</span>
														<span class="text-[8px] text-slate-450 dark:text-slate-500">
															De: {activeRes.user.username}
														</span>
													</div>
												{:else}
													<span class="w-fit flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
														<Unlock class="w-3.5 h-3.5" />
														ÎN STOC
													</span>
												{/if}
											</td>
											<td class="py-3.5 px-4 text-right">
												{#if activeRes}
													{#if auth.user?.role === 'ADMIN' || auth.user?.username === activeRes.user.username}
														<button
															onclick={() => handleReleaseReservation(s.id)}
															class="px-2.5 py-1 rounded bg-rose-650 hover:bg-rose-600 text-white font-bold text-[10px] uppercase cursor-pointer transition-all active:scale-95 flex items-center gap-1 ml-auto"
														>
															<Unlock class="w-3 h-3" />
															Anulează
														</button>
													{/if}
												{:else}
													<button
														onclick={() => {
															reservingSerial = s;
															reserveReason = '';
															reserveDuration = '1_day';
															showReserveModal = true;
														}}
														class="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] uppercase cursor-pointer transition-all active:scale-95 flex items-center gap-1 ml-auto shadow-sm"
													>
														<Lock class="w-3 h-3" />
														Rezervă
													</button>
												{/if}
											</td>
										</tr>
									{/each}
									{#if wmsTireDetails.activeSerials.length === 0}
										<tr>
											<td colspan="7" class="py-8 text-center text-slate-400 italic">
												Nicio anvelopă înregistrată fizic în depozit.
											</td>
										</tr>
									{/if}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Modal Rezervare Anvelopă -->
{#if showReserveModal && reservingSerial}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
		<div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-200">
			<div class="flex items-center justify-between pb-3 border-b border-slate-800">
				<h3 class="text-md font-bold text-slate-100 flex items-center gap-1.5">
					<Lock class="w-4.5 h-4.5 text-amber-500" />
					Rezervare Anvelopă
				</h3>
				<button onclick={() => { showReserveModal = false; reservingSerial = null; }} class="text-slate-400 hover:text-slate-200 cursor-pointer text-sm">
					✕
				</button>
			</div>

			<div class="p-4 bg-slate-950/60 rounded-xl border border-slate-850 space-y-2 text-xs">
				<p class="text-[10px] text-slate-550 font-bold uppercase">Produs selectat</p>
				<h4 class="text-sm font-bold text-indigo-400">{data?.tire?.brand} {data?.tire?.model}</h4>
				<p class="font-mono text-slate-300">Cod Intern: <b>{reservingSerial.internal_code?.internalCode || reservingSerial.serialNumber}</b></p>
				<p class="font-mono text-slate-300">Locație: <b>{reservingSerial.section?.name || 'Nelocalizat'}</b></p>
			</div>

			<form onsubmit={(e) => { e.preventDefault(); handleCreateReservation(); }} class="space-y-4">
				<div class="space-y-1.5">
					<label for="reserve-reason" class="text-xs font-bold text-slate-400 block">Motiv Rezervare (va fi vizibil tuturor):</label>
					<textarea
						id="reserve-reason"
						bind:value={reserveReason}
						required
						placeholder="ex: Client Popescu Ion, BMW X5, vine mâine dimineață"
						class="w-full bg-slate-950 border border-slate-850 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200 h-20 resize-none"
					></textarea>
				</div>

				<div class="space-y-1.5">
					<label for="reserve-duration" class="text-xs font-bold text-slate-400 block">Durată Rezervare:</label>
					<select
						id="reserve-duration"
						bind:value={reserveDuration}
						class="w-full bg-slate-950 border border-slate-850 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200"
					>
						<option value="1_day">1 Zi (24 de ore)</option>
						<option value="1_week">1 Săptămână (7 zile)</option>
					</select>
				</div>

				<div class="flex gap-3 pt-3 border-t border-slate-800">
					<button
						type="submit"
						disabled={submittingReservation}
						class="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer active:scale-95"
					>
						{submittingReservation ? 'Se rezervă...' : 'Confirmă Rezervarea'}
					</button>
					<button
						type="button"
						onclick={() => { showReserveModal = false; reservingSerial = null; }}
						class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-350 rounded-lg cursor-pointer"
					>
						Anulează
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

