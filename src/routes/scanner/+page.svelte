<script lang="ts">
	import { onMount } from 'svelte';
	import { apiRequest } from '$lib/api';
	import { playSuccessBeep, playWarningBeep } from '$lib/audio';
	import { printHtmlLabel } from '$lib/print';
	import { toast } from 'svelte-sonner';
	import { 
		ScanBarcode, Plus, ChevronRight, AlertTriangle, CheckCircle, 
		Printer, CornerDownRight, HelpCircle, MapPin, ArrowRightLeft, DollarSign, Globe 
	} from 'lucide-svelte';

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

	// Scanning mode: 'check-in' | 'check-out' | 'move' | 'check'
	let activeMode = $state<'check-in' | 'check-out' | 'move' | 'check'>('check-in');

	// Dropdown lists
	let suppliers = $state<any[]>([]);
	let sections = $state<any[]>([]);
	let configs = $state<any>({ tva: 19, minDotYear: 2025 });

	// Check-In fields
	let ean = $state('');
	let dot = $state('');
	let countryOfOrigin = $state('');
	let selectedSupplierId = $state('');
	let purchasePrice = $state<number | null>(null);
	let forceCheckIn = $state(false);
	let autoPrint = $state(true);

	// Verification (Check) fields
	let checkInputVal = $state('');
	let checkResult = $state<any>(null);
	let checking = $state(false);
	let checkInputEl = $state<HTMLInputElement | null>(null);

	// Scanner UI response messages
	let successMsg = $state('');
	let warningMsg = $state('');
	let lastScannedTire = $state<any>(null);
	let lastGeneratedSerial = $state<any>(null);

	// New Tire Modal fields (shown when EAN is missing from DB)
	let showNewTireModal = $state(false);
	let newTireEan = $state('');
	let newTireBrand = $state('');
	let newTireModel = $state('');
	let newTireDimension = $state('');
	let newTireCategory = $state('AUTO');
	let newTireSeason = $state('SUMMER');

	// Check-Out / Move fields
	let serialNumberInput = $state('');
	let exitType = $state<'sold' | 'returned_to_supplier'>('sold');
	let selectedSectionId = $state('');

	// Focus helpers
	let eanInputEl = $state<HTMLInputElement | null>(null);
	let serialInputEl = $state<HTMLInputElement | null>(null);

	const loadConfigs = async () => {
		try {
			configs = await apiRequest('/settings/configs');
			suppliers = await apiRequest('/settings/suppliers');
			sections = await apiRequest('/warehouse/sections');
		} catch (err: any) {
			toast.error('Eroare la încărcarea setărilor: ' + err.message);
		}
	};

	onMount(() => {
		loadConfigs();
		focusInput();
	});

	const focusInput = () => {
		setTimeout(() => {
			if (activeMode === 'check-in' && eanInputEl) {
				eanInputEl.focus();
			} else if (activeMode === 'check' && checkInputEl) {
				checkInputEl.focus();
			} else if (activeMode !== 'check-in' && activeMode !== 'check' && serialInputEl) {
				serialInputEl.focus();
			}
		}, 100);
	};

	const handleCheckSubmit = async (e: Event) => {
		e.preventDefault();
		if (!checkInputVal) return;

		successMsg = '';
		warningMsg = '';
		checkResult = null;
		checking = true;

		try {
			const res = await apiRequest(`/warehouse/check/${checkInputVal}`);
			playSuccessBeep();
			checkResult = res;
			successMsg = `Anvelopă identificată: ${res.tire.brand} ${res.tire.model} (${res.tire.dimension})`;
			checkInputVal = '';
			focusInput();
		} catch (err: any) {
			playWarningBeep();
			toast.error(err.message || 'Codul scanat nu a fost găsit în depozit.');
		} finally {
			checking = false;
		}
	};

	// Perform Scan-In entry
	const handleCheckInSubmit = async (e: Event) => {
		e.preventDefault();
		if (!ean || !dot) {
			toast.error('Introduceți EAN și DOT');
			return;
		}

		successMsg = '';
		warningMsg = '';

		try {
			const res = await apiRequest('/warehouse/scan-in', {
				method: 'POST',
				body: {
					ean,
					dot,
					countryOfOrigin: countryOfOrigin || undefined,
					supplierId: selectedSupplierId || undefined,
					purchasePrice: purchasePrice || undefined,
					force: forceCheckIn,
				},
			});

			if (res.allowed === false) {
				// Rejection / Old DOT warning
				playWarningBeep();
				warningMsg = res.message;
				lastScannedTire = res.tireDetails;
				toast.warning('Atenție: Obiectiv DOT neîndeplinit!');
			} else {
				// Success
				playSuccessBeep();
				successMsg = `Anvelopă scanată cu succes! Serial generat: ${res.serialRecord.serialNumber}`;
				lastGeneratedSerial = res.serialRecord;
				
				// Calculate range pricing display (consultant margin range 15%-20%)
				const basePrice = Number(res.serialRecord.purchasePrice) + getEcoTaxa(res.serialRecord.tire.category);
				const tvaFactor = 1 + (configs.tva / 100);
				const price15 = basePrice * 1.15 * tvaFactor;
				const price20 = basePrice * 1.20 * tvaFactor;
				
				lastScannedTire = {
					...res.serialRecord.tire,
					dot: res.serialRecord.dot,
					purchasePrice: res.serialRecord.purchasePrice,
					sellingPriceRange: `${price15.toFixed(2)} - ${price20.toFixed(2)} RON`
				};

				// Trigger print if active
				if (autoPrint && res.htmlLabel) {
					printHtmlLabel(res.htmlLabel);
					toast.success('Etichetă trimisă la printat');
				}

				// Reset scanner EAN field for next tire, preserving DOT/Origin/Price/Supplier for batch reception
				ean = '';
				forceCheckIn = false;
				focusInput();
			}
		} catch (err: any) {
			playWarningBeep();
			if (err.message.includes('not found in catalog')) {
				// EAN not found in catalog -> trigger new tire modal
				toast.info('Anvelopa nu este în catalog. Introduceți detaliile mai jos.');
				newTireEan = ean;
				showNewTireModal = true;
			} else {
				toast.error(err.message || 'Eroare la scanare');
			}
		}
	};

	const getEcoTaxa = (category: string) => {
		const eco = configs.ecotaxa || {};
		return Number(eco[category?.toUpperCase()] || 0);
	};

	// Save new tire catalog profile
	const handleCreateTireCatalog = async (e: Event) => {
		e.preventDefault();
		try {
			await apiRequest('/warehouse/tires', {
				method: 'POST',
				body: {
					ean: newTireEan,
					brand: newTireBrand,
					model: newTireModel,
					dimension: newTireDimension,
					category: newTireCategory,
					season: newTireSeason,
				},
			});
			toast.success('Anvelopă adăugată cu succes în catalog!');
			showNewTireModal = false;
			ean = newTireEan;
			newTireBrand = '';
			newTireModel = '';
			newTireDimension = '';
			focusInput();
		} catch (err: any) {
			toast.error('Nu s-a putut adăuga anvelopa: ' + err.message);
		}
	};

	// Check-Out scan
	const handleCheckOutSubmit = async (e: Event) => {
		e.preventDefault();
		if (!serialNumberInput) return;

		successMsg = '';
		warningMsg = '';

		try {
			const res = await apiRequest('/warehouse/scan-out', {
				method: 'POST',
				body: {
					serialNumber: serialNumberInput,
					exitType,
				},
			});

			playSuccessBeep();
			successMsg = `Bifă ieșire înregistrată! Serialul ${res.serialNumber} (${res.tire.brand} ${res.tire.model}) a ieșit ca fiind ${exitType === 'sold' ? 'VÂNDUT' : 'RETURNARE'}.`;
			serialNumberInput = '';
			focusInput();
		} catch (err: any) {
			playWarningBeep();
			toast.error(err.message || 'Eroare la checkout serial');
		}
	};

	// Shelf Location Assignment scan
	const handleMoveSubmit = async (e: Event) => {
		e.preventDefault();
		if (!serialNumberInput || !selectedSectionId) {
			toast.error('Scanați serialul și alegeți secțiunea depozit');
			return;
		}

		successMsg = '';
		warningMsg = '';

		try {
			const res = await apiRequest('/warehouse/assign-location', {
				method: 'POST',
				body: {
					serialNumber: serialNumberInput,
					sectionId: selectedSectionId,
				},
			});

			playSuccessBeep();
			successMsg = `Plasare confirmată! Serialul ${res.serialNumber} este acum în secțiunea "${res.section.name}".`;
			serialNumberInput = '';
			focusInput();
		} catch (err: any) {
			playWarningBeep();
			toast.error(err.message || 'Eroare la plasarea la raft');
		}
	};

	const triggerManualLabelPrint = () => {
		if (lastGeneratedSerial && lastGeneratedSerial.htmlLabel) {
			printHtmlLabel(lastGeneratedSerial.htmlLabel);
			toast.success('Printează din nou eticheta curentă.');
		} else {
			toast.error('Nu există nicio etichetă generată recent.');
		}
	};
</script>

<svelte:head>
	<title>Scanare Depozit - Hilserv WMS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Tab operations selector -->
	<div class="flex flex-wrap border-b border-slate-800">
		<button
			onclick={() => { activeMode = 'check-in'; focusInput(); }}
			class="px-6 py-3 border-b-2 text-sm font-semibold transition-colors duration-200 {activeMode === 'check-in' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}"
		>
			<div class="flex items-center gap-1.5">
				<Plus class="w-4 h-4" />
				Scanare Intrare (Recepție)
			</div>
		</button>
		<button
			onclick={() => { activeMode = 'move'; focusInput(); }}
			class="px-6 py-3 border-b-2 text-sm font-semibold transition-colors duration-200 {activeMode === 'move' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}"
		>
			<div class="flex items-center gap-1.5">
				<MapPin class="w-4 h-4" />
				Alocare Locație Raft
			</div>
		</button>
		<button
			onclick={() => { activeMode = 'check-out'; focusInput(); }}
			class="px-6 py-3 border-b-2 text-sm font-semibold transition-colors duration-200 {activeMode === 'check-out' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}"
		>
			<div class="flex items-center gap-1.5">
				<ArrowRightLeft class="w-4 h-4" />
				Scanare Ieșire (Livrări/Retur)
			</div>
		</button>
		<button
			onclick={() => { activeMode = 'check'; checkResult = null; focusInput(); }}
			class="px-6 py-3 border-b-2 text-sm font-semibold transition-colors duration-200 {activeMode === 'check' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}"
		>
			<div class="flex items-center gap-1.5">
				<ScanBarcode class="w-4 h-4" />
				Verificare Anvelopă
			</div>
		</button>
	</div>

	<!-- System Alerts -->
	{#if successMsg}
		<div class="p-4 rounded-xl bg-emerald-950/35 border border-emerald-500/20 text-emerald-350 flex items-start gap-3 shadow-lg">
			<CheckCircle class="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
			<div>
				<p class="text-xs font-semibold">{successMsg}</p>
			</div>
		</div>
	{/if}

	{#if warningMsg}
		<div class="p-4 rounded-xl bg-rose-950/35 border border-rose-500/20 text-rose-350 flex items-start gap-3 shadow-lg">
			<AlertTriangle class="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
			<div>
				<p class="text-xs font-semibold">{warningMsg}</p>
				<p class="text-[11px] text-rose-400/80 mt-1">Dacă doriți totuși să acceptați anvelopa, bifați caseta de bypass de mai jos.</p>
			</div>
		</div>
	{/if}

	<!-- Action Layout Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
		<!-- Scanner Input Form Column -->
		<div class="lg:col-span-2 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-6">
			{#if activeMode === 'check-in'}
				<form onsubmit={handleCheckInSubmit} class="space-y-4">
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div class="space-y-1">
							<label for="scan-ean" class="text-xs font-medium text-slate-400">Cod EAN Anvelopă (Scanabil)</label>
							<div class="relative">
								<ScanBarcode class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
								<input
									bind:this={eanInputEl}
									type="text"
									id="scan-ean"
									bind:value={ean}
									placeholder="Scanați EAN..."
									required
									class="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm placeholder-slate-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-200"
								/>
							</div>
						</div>

						<div class="space-y-1">
							<label for="scan-dot" class="text-xs font-medium text-slate-400">DOT (4 cifre e.g. 1225)</label>
							<input
								type="text"
								id="scan-dot"
								bind:value={dot}
								placeholder="ex: 1225"
								required
								maxlength="4"
								class="w-full bg-slate-950 border border-slate-800 rounded-lg text-sm py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-slate-650"
							/>
						</div>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div class="space-y-1">
							<label for="scan-country" class="text-xs font-medium text-slate-400">Țară Fabricație</label>
							<input
								type="text"
								id="scan-country"
								bind:value={countryOfOrigin}
								placeholder="ex: Romania, Germany"
								class="w-full bg-slate-950 border border-slate-800 rounded-lg text-sm py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-slate-650"
							/>
						</div>

						<div class="space-y-1">
							<label for="scan-supplier" class="text-xs font-medium text-slate-400">Furnizor (Achiziție)</label>
							<div class="flex items-center gap-2">
								<select
									id="scan-supplier"
									bind:value={selectedSupplierId}
									class="flex-1 bg-slate-950 border border-slate-800 rounded-lg text-sm py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-300"
								>
									<option value="">Alegeți Furnizorul...</option>
									{#each suppliers as sup}
										<option value={sup.id}>{sup.name}</option>
									{/each}
								</select>

								{#if selectedSupplierId}
									{@const selectedSup = suppliers.find(s => s.id === selectedSupplierId)}
									{#if selectedSup}
										<div class="w-9 h-9 rounded bg-slate-950 border border-slate-800 flex items-center justify-center p-0.5 flex-shrink-0" title={selectedSup.name}>
											{#if selectedSup.imageUrl}
												<img src={selectedSup.imageUrl} alt={selectedSup.name} class="w-full h-full object-contain" />
											{:else}
												{@const badge = getSupplierBadge(selectedSup.name)}
												<div class="w-full h-full rounded flex items-center justify-center text-[10px] font-bold border {badge.colorClass}">
													{badge.initials}
												</div>
											{/if}
										</div>
									{/if}
								{/if}
							</div>
						</div>

						<div class="space-y-1">
							<label for="scan-price" class="text-xs font-medium text-slate-400">Preț Net Achiziție (Fără TVA)</label>
							<div class="relative">
								<DollarSign class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
								<input
									type="number"
									step="0.01"
									id="scan-price"
									bind:value={purchasePrice}
									placeholder="ex: 285.50"
									class="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-slate-200"
								/>
							</div>
						</div>
					</div>

					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-850">
						<div class="flex flex-col gap-2">
							<label class="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
								<input type="checkbox" bind:checked={autoPrint} class="rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-0 focus:ring-offset-0" />
								Printează automat eticheta la scanare
							</label>

							{#if warningMsg}
								<label class="flex items-center gap-2 text-xs text-rose-400 cursor-pointer font-bold">
									<input type="checkbox" bind:checked={forceCheckIn} class="rounded border-slate-800 bg-slate-950 text-rose-500 focus:ring-0 focus:ring-offset-0" />
									Forțează check-in (Bypass eroare DOT anulat)
								</label>
							{/if}
						</div>

						<button
							type="submit"
							class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/20 active:scale-95"
						>
							<ScanBarcode class="w-4.5 h-4.5" />
							Înregistrează Intrare
						</button>
					</div>
				</form>
			{/if}

			{#if activeMode === 'move'}
				<form onsubmit={handleMoveSubmit} class="space-y-4">
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div class="space-y-1">
							<label for="move-serial" class="text-xs font-medium text-slate-400">Scanați Serialul Intern (etichetă lipită)</label>
							<div class="relative">
								<ScanBarcode class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
								<input
									bind:this={serialInputEl}
									type="text"
									id="move-serial"
									bind:value={serialNumberInput}
									placeholder="AUTO-10001, TRUCK-10042..."
									required
									class="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-slate-200"
								/>
							</div>
						</div>

						<div class="space-y-1">
							<label for="move-section" class="text-xs font-medium text-slate-400">Alegeți Secțiunea Depozit (Raft/Rând)</label>
							<select
								id="move-section"
								bind:value={selectedSectionId}
								required
								class="w-full bg-slate-950 border border-slate-800 rounded-lg text-sm py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-300"
							>
								<option value="">Alegeți Raftul...</option>
								{#each sections as sec}
									<option value={sec.id}>{sec.name} ({sec.description || 'Fără descriere'})</option>
								{/each}
							</select>
						</div>
					</div>

					<button
						type="submit"
						class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/20 active:scale-95"
					>
						<MapPin class="w-4.5 h-4.5" />
						Alocă Secțiune Depozit
					</button>
				</form>
			{/if}

			{#if activeMode === 'check-out'}
				<form onsubmit={handleCheckOutSubmit} class="space-y-4">
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div class="space-y-1">
							<label for="exit-serial" class="text-xs font-medium text-slate-400">Scanați Serialul Intern (Ieșire)</label>
							<div class="relative">
								<ScanBarcode class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
								<input
									bind:this={serialInputEl}
									type="text"
									id="exit-serial"
									bind:value={serialNumberInput}
									placeholder="AUTO-10001, TRUCK-10042..."
									required
									class="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-slate-200"
								/>
							</div>
						</div>

						<div class="space-y-1">
							<label for="exit-type" class="text-xs font-medium text-slate-400">Tip Tranzacție / Destinație</label>
							<select
								id="exit-type"
								bind:value={exitType}
								class="w-full bg-slate-950 border border-slate-800 rounded-lg text-sm py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-300"
							>
								<option value="sold">Vânzare client (Sold)</option>
								<option value="returned_to_supplier">Retur către Furnizor (Returned)</option>
							</select>
						</div>
					</div>

					<button
						type="submit"
						class="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-sm font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/20 active:scale-95"
					>
						<ArrowRightLeft class="w-4.5 h-4.5" />
						Înregistrează Ieșire
					</button>
				</form>
			{/if}

			{#if activeMode === 'check'}
				<form onsubmit={handleCheckSubmit} class="space-y-4">
					<div class="space-y-1">
						<label for="check-barcode" class="text-xs font-medium text-slate-400">Scanați EAN, Cod SAP, Serial sau Cod Intern HIL</label>
						<div class="relative">
							<ScanBarcode class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
							<input
								bind:this={checkInputEl}
								type="text"
								id="check-barcode"
								bind:value={checkInputVal}
								placeholder="Introduceți EAN, SAP, AUTO-XXXXX, HIL-XXXXX..."
								required
								class="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-slate-200"
							/>
						</div>
					</div>

					<button
						type="submit"
						disabled={checking}
						class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-55 text-sm font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/20 active:scale-95 cursor-pointer"
					>
						{#if checking}
							<div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
							Se verifică...
						{:else}
							<ScanBarcode class="w-4.5 h-4.5" />
							Verifică Barcode / EAN
						{/if}
					</button>
				</form>

				{#if checkResult}
					<div class="mt-6 p-6 rounded-xl bg-slate-950/60 border border-slate-850 space-y-6">
						<!-- Product summary -->
						<div class="flex items-start justify-between border-b border-slate-850 pb-4">
							<div class="space-y-2">
								<span class="px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-400 border border-indigo-900/30 text-[10px] font-bold uppercase">
									{checkResult.tire.category}
								</span>
								<h3 class="text-base font-bold text-slate-200 mt-1.5">
									{checkResult.tire.brand} {checkResult.tire.model}
								</h3>
								<p class="font-mono text-xs text-slate-450 mt-0.5">
									Dimensiune: <span class="text-indigo-400 font-bold">{checkResult.tire.dimension}</span>
								</p>
								<div class="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] text-slate-455">
									<p>EAN: <span class="font-mono text-slate-200">{checkResult.tire.ean || '-'}</span></p>
									<p>Cod SAP: <span class="font-mono text-slate-200">{checkResult.tire.sap_code || '-'}</span></p>
									<p>EPREL: <span class="font-mono text-slate-200">{checkResult.tire.eprel || '-'}</span></p>
									<p>Sezon: <span class="text-slate-200 uppercase font-semibold">{checkResult.tire.season}</span></p>
								</div>
							</div>
						</div>

						<!-- Internal Stock list -->
						<div class="space-y-3">
							<div class="flex items-center justify-between border-b border-slate-850 pb-2">
								<h4 class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
									📦 Stoc Intern în depozit
								</h4>
								<div class="text-right">
									<div class="flex items-baseline justify-end gap-1">
										<span class="text-2xl font-black text-indigo-400 font-mono">{checkResult.ledgerQty}</span>
										<span class="text-xs font-bold text-slate-350">BUC în stoc</span>
									</div>
									<span class="text-[10px] text-slate-500 font-medium block">
										({checkResult.ledgerQty} în registru SAP / {checkResult.activeSerials.length} scanate în locații)
									</span>
								</div>
							</div>

							{#if checkResult.activeSerials.length > 0 || checkResult.ledgerQty > 0}
								<div class="overflow-x-auto border border-slate-850 rounded-lg">
									<table class="w-full text-left border-collapse text-[11px]">
										<thead>
											<tr class="bg-slate-900/60 border-b border-slate-850 text-slate-500 uppercase font-bold">
												<th class="py-2 px-2.5">Serial</th>
												<th class="py-2 px-2.5">Cod Intern</th>
												<th class="py-2 px-2.5">DOT</th>
												<th class="py-2 px-2.5">Țară</th>
												<th class="py-2 px-2.5">Locație (Raft)</th>
												<th class="py-2 px-2.5 text-right">Preț Achiziție</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-slate-850/40 text-slate-350">
											{#each checkResult.activeSerials as s}
												<tr class={s.serialNumber === checkResult.searchedCode || s.internal_code?.internalCode === checkResult.searchedCode ? 'bg-indigo-950/20 text-indigo-300 font-semibold' : ''}>
													<td class="py-2.5 px-2.5 font-mono">{s.serialNumber}</td>
													<td class="py-2.5 px-2.5 font-mono text-indigo-400 font-bold">{s.internal_code?.internalCode || '-'}</td>
													<td class="py-2.5 px-2.5 font-mono">{s.dot || '-'}</td>
													<td class="py-2.5 px-2.5">{s.countryOfOrigin || '-'}</td>
													<td class="py-2.5 px-2.5">
														{#if s.section}
															<span class="px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 font-bold">
																{s.section.name}
															</span>
														{:else}
															<span class="text-rose-450 italic">Nelocalizat</span>
														{/if}
													</td>
													<td class="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-400">{parseFloat(s.purchasePrice).toFixed(2)} RON</td>
												</tr>
											{/each}
											{#if checkResult.ledgerQty > checkResult.activeSerials.length}
												{@const unscannedQty = checkResult.ledgerQty - checkResult.activeSerials.length}
												{#each Array.from({ length: unscannedQty }) as _, i}
													<tr class="bg-amber-950/10 text-amber-350/80 italic font-medium">
														<td class="py-2.5 px-2.5 font-mono opacity-65">? (Nescanat)</td>
														<td class="py-2.5 px-2.5 font-mono opacity-65">-</td>
														<td class="py-2.5 px-2.5 opacity-65">-</td>
														<td class="py-2.5 px-2.5 opacity-65">-</td>
														<td class="py-2.5 px-2.5">
															<span class="px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-900/30 font-bold">
																? Nu știm ce container
															</span>
														</td>
														<td class="py-2.5 px-2.5 text-right opacity-65">-</td>
													</tr>
												{/each}
											{/if}
										</tbody>
									</table>
								</div>
							{:else}
								<p class="text-xs text-slate-500 italic p-3 rounded-lg border border-dashed border-slate-850 text-center">
									Nicio anvelopă în stocul intern.
								</p>
							{/if}
						</div>

						<!-- External buy options -->
						<div class="space-y-3 pt-3 border-t border-slate-850">
							<h4 class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
								🛒 Posibilități Achiziție Furnizori Externi ({checkResult.externalItems.length} oferte active)
							</h4>

							{#if checkResult.externalItems.length > 0}
								<div class="overflow-x-auto border border-slate-850 rounded-lg">
									<table class="w-full text-left border-collapse text-[11px]">
										<thead>
											<tr class="bg-slate-900/60 border-b border-slate-850 text-slate-500 uppercase font-bold">
												<th class="py-2 px-2.5">Sursă</th>
												<th class="py-2 px-2.5">Locație (Furnizor)</th>
												<th class="py-2 px-2.5">DOT</th>
												<th class="py-2 px-2.5">Stoc</th>
												<th class="py-2 px-2.5">Timp Livrare</th>
												<th class="py-2 px-2.5 text-right">Preț Achiziție</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-slate-850/40 text-slate-350">
											{#each checkResult.externalItems as ext}
												<tr>
													<td class="py-2.5 px-2.5 font-bold uppercase">{ext.source}</td>
													<td class="py-2.5 px-2.5">{ext.warehouse_location}</td>
													<td class="py-2.5 px-2.5 font-mono">{ext.dot || '-'}</td>
													<td class="py-2.5 px-2.5 font-bold">{ext.stock_quantity ?? ext.stock_raw ?? 0} BUC</td>
													<td class="py-2.5 px-2.5 text-slate-400">{ext.delivery_time || '24h'}</td>
													<td class="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-400">{parseFloat(ext.price_buy).toFixed(2)} RON</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							{:else}
								<p class="text-xs text-slate-500 italic p-3 rounded-lg border border-dashed border-slate-850 text-center">
									Nicio ofertă de la furnizori externi disponibilă în catalog.
								</p>
							{/if}
						</div>
					</div>
				{/if}
			{/if}
		</div>

		<!-- Scanned Tire Information Column -->
		<div class="lg:col-span-1 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4 min-h-[300px]">
			<h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Informații Anvelopă Scanată</h3>
			
			{#if lastScannedTire}
				<div class="space-y-4">
					<div class="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2">
						<span class="text-[10px] font-semibold text-slate-500">Profil Anvelopă</span>
						<h4 class="text-lg font-bold text-indigo-400 leading-tight">{lastScannedTire.brand}</h4>
						<p class="text-sm font-semibold text-slate-200">{lastScannedTire.model}</p>
						<div class="text-xs text-slate-350 font-mono mt-1">
							Dimensiune: <b class="text-slate-100">{lastScannedTire.dimension || 'N/A'}</b>
						</div>
					</div>

					{#if lastScannedTire.sellingPriceRange}
						<div class="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-1">
							<span class="text-[10px] font-semibold text-slate-500">Ghid Preț Vânzare (Adaos 15%-20% + EcoTaxă + TVA)</span>
							<p class="text-md font-extrabold text-emerald-400 font-mono">{lastScannedTire.sellingPriceRange}</p>
							<p class="text-[9px] text-slate-500">Preț calculat pe baza prețului net de {lastScannedTire.purchasePrice} RON.</p>
						</div>
					{/if}

					<div class="p-4 bg-slate-950/60 border border-slate-850 rounded-xl grid grid-cols-2 gap-3">
						<div>
							<span class="text-[9px] font-semibold text-slate-500">An DOT</span>
							<p class="text-sm font-bold text-slate-200 font-mono">{lastScannedTire.dotYear || 'N/A'}</p>
						</div>
						<div>
							<span class="text-[9px] font-semibold text-slate-500">Sezon</span>
							<p class="text-sm font-bold text-slate-200">{lastScannedTire.season || 'N/A'}</p>
						</div>
					</div>

					{#if lastGeneratedSerial}
						<button
							onclick={triggerManualLabelPrint}
							class="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
						>
							<Printer class="w-4 h-4" />
							Retipărește Eticheta (${lastGeneratedSerial.serialNumber})
						</button>
					{/if}
				</div>
			{:else}
				<div class="flex flex-col items-center justify-center py-20 text-slate-500 text-center gap-2">
					<HelpCircle class="w-10 h-10 text-slate-650" />
					<p class="text-xs">Nicio anvelopă scanată recent.</p>
					<p class="text-[10px] text-slate-600">Scanați un cod EAN pentru a afișa datele tehnice și intervalul de preț.</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Modal: Adăugare anvelopă nouă în catalog -->
{#if showNewTireModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
		<div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
			<div class="flex items-center gap-2.5 pb-3 border-b border-slate-800">
				<Plus class="w-5 h-5 text-indigo-400" />
				<h3 class="text-md font-bold text-slate-200">Adăugare Anvelopă în Catalog</h3>
			</div>

			<form onsubmit={handleCreateTireCatalog} class="space-y-4">
				<div class="space-y-1">
					<label for="new-ean" class="text-xs font-medium text-slate-400">Cod EAN</label>
					<input
						type="text"
						id="new-ean"
						bind:value={newTireEan}
						required
						class="w-full bg-slate-950 border border-slate-850 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-300"
					/>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label for="new-brand" class="text-xs font-medium text-slate-400">Brand (Producător)</label>
						<input
							type="text"
							id="new-brand"
							bind:value={newTireBrand}
							required
							placeholder="ex: CONTINENTAL"
							class="w-full bg-slate-950 border border-slate-850 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-350"
						/>
					</div>
					<div class="space-y-1">
						<label for="new-model" class="text-xs font-medium text-slate-400">Model</label>
						<input
							type="text"
							id="new-model"
							bind:value={newTireModel}
							required
							placeholder="ex: PremiumContact"
							class="w-full bg-slate-950 border border-slate-850 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-355"
						/>
					</div>
				</div>

				<div class="space-y-1">
					<label for="new-dim" class="text-xs font-medium text-slate-400">Dimensiune (lățime/înălțime Rrază)</label>
					<input
						type="text"
						id="new-dim"
						bind:value={newTireDimension}
						required
						placeholder="ex: 205/55 R16"
						class="w-full bg-slate-950 border border-slate-850 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-300"
					/>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label for="new-cat" class="text-xs font-medium text-slate-400">Categorie Vehicul</label>
						<select
							id="new-cat"
							bind:value={newTireCategory}
							class="w-full bg-slate-950 border border-slate-850 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-300"
						>
							<option value="AUTO">Auto</option>
							<option value="MOTO">Moto</option>
							<option value="TIR">TIR / Truck</option>
						</select>
					</div>
					<div class="space-y-1">
						<label for="new-season" class="text-xs font-medium text-slate-400">Sezon</label>
						<select
							id="new-season"
							bind:value={newTireSeason}
							class="w-full bg-slate-950 border border-slate-850 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-300"
						>
							<option value="SUMMER">Vară</option>
							<option value="WINTER">Iarnă</option>
							<option value="ALLSEASON">All Season</option>
						</select>
					</div>
				</div>

				<div class="flex gap-3 pt-3 border-t border-slate-800">
					<button
						type="submit"
						class="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-lg text-xs text-white"
					>
						Salvează în Catalog
					</button>
					<button
						type="button"
						onclick={() => showNewTireModal = false}
						class="px-4 py-2 bg-slate-800 hover:bg-slate-700 font-bold rounded-lg text-xs text-slate-300 border border-slate-700"
					>
						Anulează
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
