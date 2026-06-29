<script lang="ts">
	import { onMount } from 'svelte';
	import { apiRequest } from '$lib/api';
	import { toast } from 'svelte-sonner';
	import { 
		Plus, Hotel, Search, Calendar, Phone, Car, 
		Layers, ShieldCheck, CornerDownRight, AlertCircle, FileText, CheckCircle2 
	} from 'lucide-svelte';

	let activeView = $state<'list' | 'check-in'>('list');
	let activeCustodies = $state<any[]>([]);
	let sections = $state<any[]>([]);
	let searchPlate = $state('');
	let loading = $state(false);

	// Wizard fields
	let pvNumber = $state('');
	let assignManualPv = $state(false);
	let clientCode = $state('');
	let nameDelegate = $state('');
	let phoneNumber = $state('');
	let fleetName = $state('');
	let carLicensePlate = $state('');
	let selectedSectionId = $state('');

	// Tire items (up to 6)
	let setIdentical = $state(true); // Helper to copy tire 1 values
	let items = $state<any[]>([
		{ position: 'stanga_fata', brand: '', model: '', dimension: '', season: 'WINTER', hasRim: false, rimType: 'steel', dot: '', observations: '' },
		{ position: 'dreapta_fata', brand: '', model: '', dimension: '', season: 'WINTER', hasRim: false, rimType: 'steel', dot: '', observations: '' },
		{ position: 'stanga_spate', brand: '', model: '', dimension: '', season: 'WINTER', hasRim: false, rimType: 'steel', dot: '', observations: '' },
		{ position: 'dreapta_spate', brand: '', model: '', dimension: '', season: 'WINTER', hasRim: false, rimType: 'steel', dot: '', observations: '' },
	]);

	const fetchNextPv = async () => {
		if (!assignManualPv) {
			try {
				const res = await apiRequest('/hotel/next-pv');
				pvNumber = res.nextPv;
			} catch (err: any) {
				toast.error('Nu s-a putut genera numărul PV automat: ' + err.message);
			}
		}
	};

	// Auto-fetch when checking in
	$effect(() => {
		if (activeView === 'check-in' && !assignManualPv) {
			fetchNextPv();
		}
	});

	const loadData = async () => {
		loading = true;
		try {
			activeCustodies = await apiRequest('/hotel/active');
			sections = await apiRequest('/warehouse/sections');
		} catch (err: any) {
			toast.error('Eroare la încărcarea datelor: ' + err.message);
		} finally {
			loading = false;
		}
	};

	onMount(() => {
		loadData();
	});

	// Copy tire 1 data to other tires when setIdentical is checked
	$effect(() => {
		if (setIdentical && items.length > 0) {
			const root = items[0];
			for (let i = 1; i < items.length; i++) {
				items[i].brand = root.brand;
				items[i].model = root.model;
				items[i].dimension = root.dimension;
				items[i].season = root.season;
				items[i].hasRim = root.hasRim;
				items[i].rimType = root.rimType;
				items[i].dot = root.dot;
			}
		}
	});

	const addTireItem = () => {
		if (items.length < 6) {
			const positions = ['stanga_fata', 'dreapta_fata', 'stanga_spate', 'dreapta_spate', 'rezerva_1', 'rezerva_2'];
			const used = items.map(t => t.position);
			const unused = positions.find(pos => !used.includes(pos));
			
			items.push({
				position: unused || `rezerva_${items.length - 3}`,
				brand: setIdentical ? items[0].brand : '',
				model: setIdentical ? items[0].model : '',
				dimension: setIdentical ? items[0].dimension : '',
				season: setIdentical ? items[0].season : 'WINTER',
				hasRim: setIdentical ? items[0].hasRim : false,
				rimType: setIdentical ? items[0].rimType : 'steel',
				dot: setIdentical ? items[0].dot : '',
				observations: '',
			});
		}
	};

	const removeTireItem = (index: number) => {
		if (items.length > 1) {
			items.splice(index, 1);
		}
	};

	// Save check-in
	const handleCheckInSubmit = async (e: Event) => {
		e.preventDefault();
		if (!pvNumber || !nameDelegate || !phoneNumber || !carLicensePlate) {
			toast.error('Completați toate câmpurile obligatorii');
			return;
		}

		try {
			await apiRequest('/hotel/check-in', {
				method: 'POST',
				body: {
					pvNumber,
					clientCode: clientCode || undefined,
					nameDelegate,
					phoneNumber,
					fleetName: fleetName || undefined,
					carLicensePlate,
					warehouseSectionId: selectedSectionId || undefined,
					items,
				},
			});

			toast.success('Preluare în custodie înregistrată! Fișa hotel anvelope a fost salvată.');
			// Reset wizard
			pvNumber = '';
			assignManualPv = false;
			clientCode = '';
			nameDelegate = '';
			phoneNumber = '';
			fleetName = '';
			carLicensePlate = '';
			selectedSectionId = '';
			items = [
				{ position: 'stanga_fata', brand: '', model: '', dimension: '', season: 'WINTER', hasRim: false, rimType: 'steel', dot: '', observations: '' },
				{ position: 'dreapta_fata', brand: '', model: '', dimension: '', season: 'WINTER', hasRim: false, rimType: 'steel', dot: '', observations: '' },
				{ position: 'stanga_spate', brand: '', model: '', dimension: '', season: 'WINTER', hasRim: false, rimType: 'steel', dot: '', observations: '' },
				{ position: 'dreapta_spate', brand: '', model: '', dimension: '', season: 'WINTER', hasRim: false, rimType: 'steel', dot: '', observations: '' },
			];
			activeView = 'list';
			loadData();
		} catch (err: any) {
			toast.error('Eroare la check-in custodie: ' + err.message);
		}
	};

	// Perform check-out
	const handleCheckOut = async (id: string, pvNum: string) => {
		if (!confirm(`Confirmați eliberarea anvelopelor din custodie pentru PV ${pvNum}?`)) {
			return;
		}

		try {
			await apiRequest(`/hotel/check-out/${id}`, {
				method: 'POST',
			});
			toast.success(`Anvelopele pentru procesul verbal ${pvNum} au fost eliberate.`);
			loadData();
		} catch (err: any) {
			toast.error('Eroare la eliberare: ' + err.message);
		}
	};

	// Search logic
	const triggerSearch = async () => {
		if (!searchPlate) {
			loadData();
			return;
		}
		loading = true;
		try {
			activeCustodies = await apiRequest(`/hotel/plate/${searchPlate}`);
		} catch (err: any) {
			toast.error('Căutarea a eșuat: ' + err.message);
		} finally {
			loading = false;
		}
	};
</script>

<svelte:head>
	<title>Hotel Anvelope - Hilserv WMS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div>
			<h2 class="text-2xl font-bold tracking-tight text-white">Hotel Anvelope (Custodie Clienți)</h2>
			<p class="text-xs text-slate-400">Administrare depozitare roți clienți, generare procese verbale și eliberări.</p>
		</div>

		<!-- Toggles views -->
		<div class="flex gap-2">
			<button
				onclick={() => activeView = 'list'}
				class="px-4 py-2 text-xs font-semibold rounded-lg border transition-colors {activeView === 'list' ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'}"
			>
				Găsește Custodii Active
			</button>
			<button
				onclick={() => activeView = 'check-in'}
				class="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5 active:scale-95 shadow-lg shadow-indigo-500/20"
			>
				<Plus class="w-4 h-4" />
				Cazare Roți Noi
			</button>
		</div>
	</div>

	{#if activeView === 'list'}
		<!-- Search and grid view -->
		<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-6">
			<!-- Search bar -->
			<div class="max-w-md flex gap-2">
				<div class="relative flex-1">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
					<input
						type="text"
						bind:value={searchPlate}
						placeholder="Introduceți numărul auto (ex: B123ABC)..."
						class="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-slate-200"
						onkeydown={(e) => e.key === 'Enter' && triggerSearch()}
					/>
				</div>
				<button
					onclick={triggerSearch}
					class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 rounded-lg transition-colors"
				>
					Caută
				</button>
			</div>

			<!-- Custodies list -->
			{#if loading}
				<div class="text-center py-20 text-xs text-slate-500">Se încarcă custodiile...</div>
			{:else if activeCustodies.length === 0}
				<div class="flex flex-col items-center justify-center py-20 text-slate-500 text-center gap-2">
					<AlertCircle class="w-10 h-10 text-slate-650" />
					<p class="text-xs">Nu s-a găsit nicio custodie activă.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each activeCustodies as record}
						<div class="p-5 bg-slate-950/60 border border-slate-850 rounded-xl space-y-4 relative hover:border-slate-800 transition-colors">
							<!-- PV details -->
							<div class="flex items-start justify-between gap-4 pb-3 border-b border-slate-850">
								<div>
									<div class="flex items-center gap-1.5">
										<Car class="w-4 h-4 text-sky-400" />
										<span class="text-sm font-extrabold text-slate-200 tracking-wider uppercase">{record.carLicensePlate}</span>
									</div>
									<p class="text-[10px] text-slate-400 font-medium mt-0.5">PV: <b>{record.pvNumber}</b> | Client: {record.nameDelegate}</p>
								</div>
								
								<button
									onclick={() => handleCheckOut(record.id, record.pvNumber)}
									class="px-3 py-1.5 bg-rose-950/40 border border-rose-900/60 hover:bg-rose-900/30 text-[10px] font-bold text-rose-400 rounded-md transition-colors active:scale-95"
								>
									Eliberează Setul
								</button>
							</div>

							<!-- Custody info -->
							<div class="grid grid-cols-2 gap-3 text-[11px] text-slate-400">
								<div class="flex items-center gap-1">
									<Calendar class="w-3.5 h-3.5 text-slate-550" />
									Cazat la: {new Date(record.checkInDate).toLocaleDateString('ro-RO')}
								</div>
								<div class="flex items-center gap-1">
									<Layers class="w-3.5 h-3.5 text-slate-550" />
									Raft: <b>{record.section?.name || 'Nespecificat'}</b>
								</div>
								{#if record.fleetName}
									<div class="col-span-2">
										Flotă: <b class="text-slate-300">{record.fleetName}</b>
									</div>
								{/if}
							</div>

							<!-- Tires preview -->
							<div class="space-y-1">
								<span class="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Piese Depozitate ({record.items.length})</span>
								<div class="grid grid-cols-2 gap-2">
									{#each record.items as tire}
										<div class="p-2 bg-slate-900/50 rounded-lg border border-slate-850/60 text-[10px] text-slate-350 leading-tight">
											<span class="font-bold text-indigo-400 uppercase">{tire.position.replace('_', ' ')}</span>
											<p class="font-semibold text-slate-200 truncate">{tire.brand} {tire.model}</p>
											<p class="text-[9px] text-slate-450 mt-0.5">{tire.dimension} | DOT {tire.dot}</p>
											<p class="text-[9px] text-slate-450">{tire.hasRim ? `Jantă ${tire.rimType === 'alloy' ? 'Aliaj' : 'Tablă'}` : 'Fără Jantă'} | {tire.season}</p>
										</div>
									{/each}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<!-- Check-In Form Wizard -->
		<form onsubmit={handleCheckInSubmit} class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-6">
			<div class="pb-3 border-b border-slate-850">
				<h3 class="text-sm font-bold text-slate-200 flex items-center gap-2">
					<ShieldCheck class="w-4.5 h-4.5 text-indigo-400" />
					Custodie Nouă: Detalii Contract / Delegat
				</h3>
			</div>

			<!-- Customer and Car details -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div class="space-y-1">
					<label for="pv-num" class="text-xs font-medium text-slate-400">Număr Proces Verbal (Proces verbal)*</label>
					<input
						type="text"
						id="pv-num"
						bind:value={pvNumber}
						required
						disabled={!assignManualPv}
						placeholder="Se generează automat..."
						class="w-full bg-slate-950 disabled:bg-slate-900/60 border border-slate-800 disabled:border-slate-850 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200 disabled:text-slate-400"
					/>
					<label class="flex items-center gap-1.5 text-[10px] text-indigo-400 cursor-pointer mt-1 font-semibold">
						<input type="checkbox" bind:checked={assignManualPv} class="rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-0 focus:ring-offset-0" />
						Atrage PV manual (excepțional)
					</label>
				</div>
				<div class="space-y-1">
					<label for="client-code" class="text-xs font-medium text-slate-400">Cod Client (Opțional)</label>
					<input
						type="text"
						id="client-code"
						bind:value={clientCode}
						placeholder="ex: C-1250"
						class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200"
					/>
				</div>
				<div class="space-y-1">
					<label for="car-plate" class="text-xs font-medium text-slate-400">Număr Auto Înmatriculare*</label>
					<input
						type="text"
						id="car-plate"
						bind:value={carLicensePlate}
						required
						placeholder="ex: B123ABC"
						class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200 uppercase"
					/>
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div class="space-y-1">
					<label for="delegate-name" class="text-xs font-medium text-slate-400">Nume Reprezentant / Delegat*</label>
					<input
						type="text"
						id="delegate-name"
						bind:value={nameDelegate}
						required
						placeholder="Numele persoanei care predă roțile"
						class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200"
					/>
				</div>
				<div class="space-y-1">
					<label for="phone" class="text-xs font-medium text-slate-400">Număr Telefon Delegat*</label>
					<div class="relative">
						<Phone class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
						<input
							type="tel"
							id="phone"
							bind:value={phoneNumber}
							required
							placeholder="ex: 0722123456"
							class="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-200"
						/>
					</div>
				</div>
				<div class="space-y-1">
					<label for="fleet" class="text-xs font-medium text-slate-400">Denumire Flotă (ex: LeasePlan - Opțional)</label>
					<input
						type="text"
						id="fleet"
						bind:value={fleetName}
						placeholder="ex: BCR Fleet"
						class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200"
					/>
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div class="space-y-1">
					<label for="hotel-section" class="text-xs font-medium text-slate-400">Locație Alocată Depozitare (Raft)*</label>
					<select
						id="hotel-section"
						bind:value={selectedSectionId}
						required
						class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-300"
					>
						<option value="">Alegeți Raftul...</option>
						{#each sections as sec}
							<option value={sec.id}>{sec.name} ({sec.description || 'Fără descriere'})</option>
						{/each}
					</select>
				</div>
				<div class="sm:col-span-2 flex items-end pb-2">
					<label class="flex items-center gap-2 text-xs text-indigo-400 cursor-pointer font-bold">
						<input type="checkbox" bind:checked={setIdentical} class="rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-0 focus:ring-offset-0" />
						Set identic de roți (copiază prima roată la toate celelalte)
					</label>
				</div>
			</div>

			<!-- Dynamic tires setup -->
			<div class="border-t border-slate-850 pt-4 space-y-4">
				<div class="flex items-center justify-between gap-4">
					<h4 class="text-xs font-bold text-slate-450 uppercase tracking-wider">Specificații Roți ({items.length})</h4>
					
					<div class="flex gap-2">
						<button
							type="button"
							onclick={addTireItem}
							disabled={items.length >= 6}
							class="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-50 text-[10px] font-semibold text-slate-200 rounded transition-colors"
						>
							+ Adaugă Roată (max 6)
						</button>
					</div>
				</div>

				<div class="space-y-4">
					{#each items as item, idx}
						<div class="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-3 relative">
							<!-- Remove button -->
							{#if items.length > 1}
								<button
									type="button"
									onclick={() => removeTireItem(idx)}
									class="absolute top-2 right-2 text-slate-500 hover:text-rose-400 text-xs"
								>
									Elimină
								</button>
							{/if}

							<!-- Index and position -->
							<div class="flex items-center gap-2 text-xs font-bold text-indigo-400">
								<span>Piesa #{idx + 1} - </span>
								<select
									bind:value={item.position}
									class="bg-slate-900 border border-slate-850 rounded px-2 py-0.5 text-xs focus:outline-none"
								>
									<option value="stanga_fata">Stânga Față</option>
									<option value="dreapta_fata">Dreapta Față</option>
									<option value="stanga_spate">Stânga Spate</option>
									<option value="dreapta_spate">Dreapta Spate</option>
									<option value="rezerva_1">Rezervă 1</option>
									<option value="rezerva_2">Rezervă 2</option>
								</select>
							</div>

							<!-- Inputs -->
							<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
								<div class="space-y-1">
									<span class="block text-[10px] font-medium text-slate-400">Brand*</span>
									<input
										type="text"
										bind:value={item.brand}
										required
										disabled={idx > 0 && setIdentical}
										placeholder="MICHELIN, PIRELLI"
										class="w-full bg-slate-900 border border-slate-850 rounded py-1.5 px-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
									/>
								</div>
								<div class="space-y-1">
									<span class="block text-[10px] font-medium text-slate-400">Model</span>
									<input
										type="text"
										bind:value={item.model}
										disabled={idx > 0 && setIdentical}
										placeholder="Alpin 6"
										class="w-full bg-slate-900 border border-slate-850 rounded py-1.5 px-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
									/>
								</div>
								<div class="space-y-1">
									<span class="block text-[10px] font-medium text-slate-400">Dimensiune*</span>
									<input
										type="text"
										bind:value={item.dimension}
										required
										disabled={idx > 0 && setIdentical}
										placeholder="205/55 R16"
										class="w-full bg-slate-900 border border-slate-850 rounded py-1.5 px-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
									/>
								</div>
								<div class="space-y-1">
									<span class="block text-[10px] font-medium text-slate-400">DOT (4 cifre)*</span>
									<input
										type="text"
										bind:value={item.dot}
										required
										maxlength="4"
										disabled={idx > 0 && setIdentical}
										placeholder="ex: 3524"
										class="w-full bg-slate-900 border border-slate-850 rounded py-1.5 px-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
									/>
								</div>
							</div>

							<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
								<div class="space-y-1">
									<span class="block text-[10px] font-medium text-slate-400">Sezon*</span>
									<select
										bind:value={item.season}
										disabled={idx > 0 && setIdentical}
										class="w-full bg-slate-900 border border-slate-850 rounded py-1.5 px-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
									>
										<option value="SUMMER">Vară</option>
										<option value="WINTER">Iarnă</option>
										<option value="ALLSEASON">All Season</option>
									</select>
								</div>

								<div class="space-y-1">
									<label class="text-[10px] font-medium text-slate-400 flex items-center gap-1.5 cursor-pointer">
										<input
											type="checkbox"
											bind:checked={item.hasRim}
											disabled={idx > 0 && setIdentical}
											class="rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-0 focus:ring-offset-0 disabled:opacity-50"
										/>
										Are Jantă
									</label>
									
									{#if item.hasRim}
										<select
											bind:value={item.rimType}
											disabled={idx > 0 && setIdentical}
											class="w-full bg-slate-900 border border-slate-850 rounded py-1 px-2 text-[10px] text-slate-300 focus:outline-none focus:border-indigo-500 mt-1 disabled:opacity-50"
										>
											<option value="alloy">Aliaj</option>
											<option value="steel">Tablă</option>
										</select>
									{/if}
								</div>

								<div class="sm:col-span-2 space-y-1">
									<span class="block text-[10px] font-medium text-slate-400">Observații (Zgârieturi, Uzură, etc.)</span>
									<input
										type="text"
										bind:value={item.observations}
										placeholder="ex: Zgariata pe flancul drept, uzura 30%"
										class="w-full bg-slate-900 border border-slate-850 rounded py-1.5 px-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
									/>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Form Submit -->
			<div class="pt-4 border-t border-slate-850 flex justify-end gap-3">
				<button
					type="submit"
					class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white rounded-lg transition-colors flex items-center gap-1.5 active:scale-95 shadow-lg shadow-indigo-500/20"
				>
					<CheckCircle2 class="w-4.5 h-4.5" />
					Cazează Anvelopele
				</button>
				<button
					type="button"
					onclick={() => activeView = 'list'}
					class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-350 border border-slate-700 rounded-lg transition-colors"
				>
					Anulează
				</button>
			</div>
		</form>
	{/if}
</div>
