<script lang="ts">
	import { onMount } from 'svelte';
	import { apiRequest } from '$lib/api';
	import { playSuccessBeep, playWarningBeep } from '$lib/audio';
	import { printHtmlLabel } from '$lib/print';
	import { toast } from 'svelte-sonner';
	import { 
		ScanBarcode, Plus, ChevronRight, AlertTriangle, CheckCircle, 
		Printer, HelpCircle, MapPin, ClipboardList, RefreshCw, Edit2, X 
	} from 'lucide-svelte';

	// State
	let sections = $state<any[]>([]);
	let selectedSectionId = $state('');
	
	// Serials expected in this section (from DB)
	let expectedSerials = $state<any[]>([]);
	let loadingSerials = $state(false);

	// Scanned during this session
	let scannedCodes = $state<string[]>([]); // internalCode or serialNumber
	
	// Input value
	let barcodeInput = $state('');
	let barcodeInputEl = $state<HTMLInputElement | null>(null);

	// Detail overlay / edit modal for current item
	let selectedSerial = $state<any>(null);
	let editMode = $state(false);
	let editDot = $state('');
	let editPrice = $state<number | null>(null);
	let updatingSerial = $state(false);

	// EAN scan modal (for adding catalog item with DOT selector)
	let scannedEanResult = $state<any>(null);
	let selectedDot = $state('');
	let manualDot = $state('');
	let selectedPrice = $state<number | null>(null);
	let isRegisteringTire = $state(false);

	// Log of recent audit activity in this UI
	let localAuditLogs = $state<string[]>([]);

	// Derived metrics
	let totalExpected = $derived(expectedSerials.length);
	
	// Items that are expected in DB and HAVE been scanned
	let confirmedSerials = $derived(
		expectedSerials.filter(s => {
			const code = s.internal_code?.internalCode || s.serialNumber;
			return scannedCodes.includes(code);
		})
	);

	// Items that are expected in DB but NOT scanned yet
	let missingSerials = $derived(
		expectedSerials.filter(s => {
			const code = s.internal_code?.internalCode || s.serialNumber;
			return !scannedCodes.includes(code);
		})
	);

	// Items scanned in this session that are NOT in the expected list
	// (These are either relocated from another section, or brand new scans)
	let surplusCodes = $derived(
		scannedCodes.filter(code => {
			return !expectedSerials.some(s => {
				const expCode = s.internal_code?.internalCode || s.serialNumber;
				return expCode === code;
			});
		})
	);

	const loadSections = async () => {
		try {
			sections = await apiRequest('/warehouse/sections');
		} catch (err: any) {
			toast.error('Eroare la încărcarea secțiunilor: ' + err.message);
		}
	};

	const loadExpectedSerials = async () => {
		if (!selectedSectionId) {
			expectedSerials = [];
			scannedCodes = [];
			return;
		}
		loadingSerials = true;
		try {
			expectedSerials = await apiRequest(`/warehouse/sections/${selectedSectionId}/serials`);
			scannedCodes = []; // Clear session scans
			localAuditLogs = [`Început sesiune de inventar pentru: ${sections.find(s => s.id === selectedSectionId)?.name}`];
			focusInput();
		} catch (err: any) {
			toast.error('Eroare la încărcarea anvelopelor din locație: ' + err.message);
		} finally {
			loadingSerials = false;
		}
	};

	onMount(() => {
		loadSections();
		focusInput();
	});

	const focusInput = () => {
		setTimeout(() => {
			if (barcodeInputEl) barcodeInputEl.focus();
		}, 100);
	};

	const handleScanSubmit = async (e: Event) => {
		e.preventDefault();
		if (!barcodeInput) return;
		const code = barcodeInput.trim();
		barcodeInput = '';

		if (!selectedSectionId) {
			toast.warning('Selectați mai întâi containerul / locația de inventar.');
			playWarningBeep();
			return;
		}

		// Check if already scanned in this session
		if (scannedCodes.includes(code)) {
			playWarningBeep();
			toast.warning(`Codul ${code} a fost deja scanat în această sesiune.`);
			focusInput();
			return;
		}

		try {
			// Query backend to see what it is
			const res = await apiRequest(`/warehouse/check/${code}`);
			
			// Is it a serial number or internal code HIL?
			if (res.activeSerials.length > 0) {
				const matchedSerial = res.activeSerials.find((s: any) => s.serialNumber === code || s.internal_code?.internalCode === code);
				if (matchedSerial) {
					playSuccessBeep();
					const resolvedCode = matchedSerial.internal_code?.internalCode || matchedSerial.serialNumber;
					if (!scannedCodes.includes(resolvedCode)) {
						scannedCodes = [...scannedCodes, resolvedCode];
					}
					localAuditLogs = [`[OK] Confirmat: ${matchedSerial.tire.brand} ${matchedSerial.tire.model} (${resolvedCode})`, ...localAuditLogs];
					
					// Open preview overlay
					selectedSerial = matchedSerial;
					editMode = false;
				}
			} else {
				// It matched a catalog tire by EAN, or it is a general EAN
				playSuccessBeep();
				scannedEanResult = res;
				selectedDot = '';
				manualDot = '';
				selectedPrice = res.tire.purchasePrice || 300;
			}
		} catch (err: any) {
			playWarningBeep();
			toast.error(`Codul scanat "${code}" nu este în sistem.`);
		}
		
		focusInput();
	};

	const handleRegisterNewTire = async () => {
		if (!scannedEanResult) return;
		const dotCode = selectedDot === 'new' ? manualDot : selectedDot;
		if (!dotCode || dotCode.length !== 4) {
			toast.error('Vă rugăm să introduceți un DOT valid format din 4 cifre (ex: 2426)');
			return;
		}

		isRegisteringTire = true;
		try {
			// Register in database directly in this location
			const res = await apiRequest('/warehouse/scan-in', {
				method: 'POST',
				body: {
					ean: scannedEanResult.tire.ean,
					dot: dotCode,
					warehouseSectionId: selectedSectionId,
					purchasePrice: selectedPrice || undefined,
					force: true
				}
			});

			playSuccessBeep();
			toast.success('Anvelopă scanată, înregistrată și etichetă trimisă la print!');
			
			if (res.labels && res.labels.htmlLabel) {
				printHtmlLabel(res.labels.htmlLabel);
			}

			const resolvedCode = res.serial.internal_code?.internalCode || res.serial.serialNumber;
			if (!scannedCodes.includes(resolvedCode)) {
				scannedCodes = [...scannedCodes, resolvedCode];
			}

			// Refresh expected list from DB
			expectedSerials = await apiRequest(`/warehouse/sections/${selectedSectionId}/serials`);
			localAuditLogs = [`[NEW] Adăugat & Printat: ${res.serial.tire.brand} (${resolvedCode})`, ...localAuditLogs];
			scannedEanResult = null;
		} catch (err: any) {
			toast.error('Eroare la înregistrare: ' + err.message);
		} finally {
			isRegisteringTire = false;
			focusInput();
		}
	};

	const handleSaveSerialEdit = async () => {
		if (!selectedSerial) return;
		updatingSerial = true;
		try {
			const res = await apiRequest(`/warehouse/serials/${selectedSerial.id}`, {
				method: 'PATCH',
				body: {
					dot: editDot || undefined,
					purchasePrice: editPrice || undefined,
					warehouseSectionId: selectedSectionId
				}
			});

			playSuccessBeep();
			toast.success('Detalii anvelopă actualizate și etichetă retipărită!');
			
			if (res.labels && res.labels.htmlLabel) {
				printHtmlLabel(res.labels.htmlLabel);
			}

			expectedSerials = await apiRequest(`/warehouse/sections/${selectedSectionId}/serials`);
			selectedSerial = null;
			editMode = false;
		} catch (err: any) {
			toast.error('Actualizarea a eșuat: ' + err.message);
		} finally {
			updatingSerial = false;
			focusInput();
		}
	};

	const handleFinalizeReconcile = async () => {
		if (!selectedSectionId) return;
		const missingCount = missingSerials.length;

		const currentSectName = sections.find(s => s.id === selectedSectionId)?.name;

		if (!confirm(`Finalizați inventarul pentru ${currentSectName}?\n\n- Confirmat: ${confirmedSerials.length}\n- Lipsă (vor fi șterse din stoc): ${missingCount}\n- Surplus (vor fi relocate aici): ${surplusCodes.length}\n\nSigur doriți să corectați stocul?`)) {
			return;
		}

		try {
			const res = await apiRequest(`/warehouse/sections/${selectedSectionId}/reconcile`, {
				method: 'POST',
				body: {
					scannedSerials: scannedCodes
				}
			});

			playSuccessBeep();
			toast.success(`Inventar reconciliat cu succes! Lipsă: ${res.lost}, Confirmat: ${res.confirmed}, Relocat: ${res.relocated}`);
			
			await loadExpectedSerials();
		} catch (err: any) {
			toast.error('Eroare la reconcilierea stocului: ' + err.message);
		}
	};
</script>

<svelte:head>
	<title>Inventariere Depozit - Hilserv WMS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Top Bar -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 shadow-xl">
		<div class="space-y-1">
			<h2 class="text-lg font-bold text-slate-200 flex items-center gap-2">
				<ClipboardList class="w-5 h-5 text-indigo-400" />
				Mod Inventar (Audit physical stoc)
			</h2>
			<p class="text-xs text-slate-450">Sursa de adevăr pentru containere: scanați, editați, re-etichetați și reconciliați diferențele.</p>
		</div>

		<!-- Container selector dropdown -->
		<div class="flex items-center gap-3">
			<label for="select-sect" class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Locație:</label>
			<select
				id="select-sect"
				bind:value={selectedSectionId}
				onchange={loadExpectedSerials}
				class="bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200 font-bold"
			>
				<option value="">Alegeți Container / Raft...</option>
				{#each sections as sec}
					<option value={sec.id}>{sec.name} ({sec.description || 'Depozit'})</option>
				{/each}
			</select>
		</div>
	</div>

	{#if selectedSectionId}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
			<!-- Scan Input Column -->
			<div class="lg:col-span-1 space-y-6">
				<!-- Scanner widget -->
				<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
					<h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
						<ScanBarcode class="w-4 h-4 text-indigo-400" />
						Fereastră Scanare Barcode
					</h3>

					<form onsubmit={handleScanSubmit} class="space-y-3">
						<div class="relative">
							<ScanBarcode class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
							<input
								bind:this={barcodeInputEl}
								type="text"
								bind:value={barcodeInput}
								placeholder="Scanați EAN, HIL-XXXXX, AUTO-XXXXX..."
								required
								class="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm placeholder-slate-650 focus:outline-none focus:border-indigo-500 text-slate-200"
							/>
						</div>
						<button
							type="submit"
							class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
						>
							Înregistrează Scanare
						</button>
					</form>
				</div>

				<!-- Stats widget -->
				<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
					<h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Statistici Sesiune Curentă</h3>
					
					<div class="grid grid-cols-2 gap-4">
						<div class="p-3 bg-slate-950/60 rounded-xl border border-slate-850">
							<span class="text-[10px] text-slate-500 font-semibold uppercase">Înregistrate în DB</span>
							<p class="text-2xl font-bold text-slate-200 font-mono mt-1">{totalExpected}</p>
						</div>
						<div class="p-3 bg-slate-950/60 rounded-xl border border-slate-850">
							<span class="text-[10px] text-slate-500 font-semibold uppercase">Scanate Confirmat</span>
							<p class="text-2xl font-bold text-emerald-400 font-mono mt-1">{confirmedSerials.length}</p>
						</div>
						<div class="p-3 bg-slate-950/60 rounded-xl border border-slate-850">
							<span class="text-[10px] text-slate-500 font-semibold uppercase">Lipsă din raft</span>
							<p class="text-2xl font-bold text-rose-455 font-mono mt-1">{missingSerials.length}</p>
						</div>
						<div class="p-3 bg-slate-950/60 rounded-xl border border-slate-850">
							<span class="text-[10px] text-slate-500 font-semibold uppercase">Surplus / Relocate</span>
							<p class="text-2xl font-bold text-amber-400 font-mono mt-1">{surplusCodes.length}</p>
						</div>
					</div>

					<button
						onclick={handleFinalizeReconcile}
						disabled={loadingSerials}
						class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-40"
					>
						<CheckCircle class="w-4 h-4" />
						Finalizează și Corectează Stocul
					</button>
				</div>

				<!-- Live activity log inside WMS UI session -->
				<div class="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-3">
					<h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Jurnal Scanări Recente</h4>
					<div class="max-h-48 overflow-y-auto space-y-1.5 pr-2 font-mono text-[10px]">
						{#each localAuditLogs as log}
							<div class="text-slate-400 border-l-2 border-slate-800 pl-2 py-0.5">
								{log}
							</div>
						{/each}
						{#if localAuditLogs.length === 0}
							<p class="text-slate-500 italic">Nicio activitate încă.</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Expected vs Scanned Discrepancy Tables -->
			<div class="lg:col-span-2 space-y-6">
				<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-6">
					<div class="flex items-center justify-between pb-3 border-b border-slate-850">
						<h3 class="text-sm font-bold text-slate-200">Reconciliere Diferențe Stoc (Expected vs Scanned)</h3>
						<button 
							onclick={loadExpectedSerials} 
							class="text-indigo-400 hover:text-indigo-350 p-1 flex items-center gap-1 text-xs cursor-pointer"
							title="Resetează / Încarcă din nou"
						>
							<RefreshCw class="w-3.5 h-3.5" />
							Resetează Sesiune
						</button>
					</div>

					<!-- A. Confirmed Items List -->
					<div class="space-y-3">
						<h4 class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
							✅ Confirmate în raft ({confirmedSerials.length})
						</h4>
						{#if confirmedSerials.length > 0}
							<div class="overflow-x-auto border border-slate-850 rounded-lg">
								<table class="w-full text-left border-collapse text-xs">
									<thead class="bg-slate-950/60 border-b border-slate-850 text-slate-400 font-semibold text-[10px] uppercase">
										<tr>
											<th class="py-2 px-3">Cod Intern / Serial</th>
											<th class="py-2 px-3">Brand / Model</th>
											<th class="py-2 px-3">Dimensiune</th>
											<th class="py-2 px-3">DOT</th>
											<th class="py-2 px-3 text-right">Preț Net</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-850/40 text-slate-300">
										{#each confirmedSerials as s}
											<tr>
												<td class="py-2 px-3 font-mono text-indigo-400 font-bold">{s.internal_code?.internalCode || s.serialNumber}</td>
												<td class="py-2 px-3 font-bold">{s.tire.brand} <span class="text-slate-400 font-normal">{s.tire.model}</span></td>
												<td class="py-2 px-3 font-mono text-[11px]">{s.tire.dimension}</td>
												<td class="py-2 px-3 font-mono">{s.dot || '-'}</td>
												<td class="py-2 px-3 text-right font-mono text-emerald-450">{parseFloat(s.purchasePrice).toFixed(2)} RON</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{:else}
							<p class="text-xs text-slate-500 italic p-3 rounded-lg border border-dashed border-slate-850 text-center">Nicio anvelopă confirmată prin scanare încă.</p>
						{/if}
					</div>

					<!-- B. Surplus / Relocated Items List -->
					<div class="space-y-3">
						<h4 class="text-xs font-bold text-amber-400 flex items-center gap-1.5">
							⚠️ Surplus / De Relocat în această locație ({surplusCodes.length})
						</h4>
						{#if surplusCodes.length > 0}
							<div class="overflow-x-auto border border-slate-850 rounded-lg">
								<table class="w-full text-left border-collapse text-xs">
									<thead class="bg-slate-950/60 border-b border-slate-850 text-slate-400 font-semibold text-[10px] uppercase">
										<tr>
											<th class="py-2 px-3">Cod Intern / Serial</th>
											<th class="py-2 px-3">Brand / Model</th>
											<th class="py-2 px-3">Dimensiune</th>
											<th class="py-2 px-3">DOT</th>
											<th class="py-2 px-3">Locație DB</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-850/40 text-slate-300">
										{#each surplusCodes as code}
											<!-- We must find what this code refers to. It might be in the database in a different section -->
											<!-- Let's render a simple placeholder. When reconciled, it will update to this section. -->
											<tr class="bg-amber-950/5">
												<td class="py-2 px-3 font-mono text-amber-450 font-bold">{code}</td>
												<td colspan="3" class="py-2 px-3 text-slate-400 italic">Anvelopă identificată. Va fi relocată aici la finalizare.</td>
												<td class="py-2 px-3 font-semibold text-rose-455">Altă locație</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{:else}
							<p class="text-xs text-slate-500 italic p-3 rounded-lg border border-dashed border-slate-850 text-center">Niciun surplus scanat.</p>
						{/if}
					</div>

					<!-- C. Missing / Lost Items List -->
					<div class="space-y-3">
						<h4 class="text-xs font-bold text-rose-455 flex items-center gap-1.5">
							❌ Lipsă în raft / Nescănate ({missingSerials.length})
						</h4>
						{#if missingSerials.length > 0}
							<div class="overflow-x-auto border border-slate-850 rounded-lg">
								<table class="w-full text-left border-collapse text-xs">
									<thead class="bg-slate-950/60 border-b border-slate-850 text-slate-400 font-semibold text-[10px] uppercase">
										<tr>
											<th class="py-2 px-3">Cod Intern / Serial</th>
											<th class="py-2 px-3">Brand / Model</th>
											<th class="py-2 px-3">Dimensiune</th>
											<th class="py-2 px-3">DOT</th>
											<th class="py-2 px-3 text-right">Preț Net</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-850/40 text-slate-400 font-medium">
										{#each missingSerials as s}
											<tr class="bg-rose-950/5">
												<td class="py-2 px-3 font-mono text-rose-400">{s.internal_code?.internalCode || s.serialNumber}</td>
												<td class="py-2 px-3">{s.tire.brand} {s.tire.model}</td>
												<td class="py-2 px-3 font-mono text-[11px]">{s.tire.dimension}</td>
												<td class="py-2 px-3 font-mono">{s.dot || '-'}</td>
												<td class="py-2 px-3 text-right font-mono">{parseFloat(s.purchasePrice).toFixed(2)} RON</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{:else}
							<p class="text-xs text-emerald-500/80 italic p-3 rounded-lg border border-dashed border-emerald-950/50 text-center">Toate anvelopele înregistrate în DB au fost scanate!</p>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Modal: Edit Serial Detail / Reprint -->
{#if selectedSerial}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
		<div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between pb-3 border-b border-slate-800">
				<h3 class="text-md font-bold text-slate-200 flex items-center gap-1.5">
					<Edit2 class="w-4.5 h-4.5 text-indigo-400" />
					Detalii Anvelopă Scănată
				</h3>
				<button onclick={() => { selectedSerial = null; editMode = false; }} class="text-slate-400 hover:text-slate-200">
					<X class="w-5 h-5" />
				</button>
			</div>

			<div class="p-4 bg-slate-950/60 rounded-xl border border-slate-850 space-y-2 text-xs">
				<p class="text-[10px] text-slate-500 font-semibold uppercase">Model catalog</p>
				<h4 class="text-sm font-bold text-slate-200">{selectedSerial.tire.brand} {selectedSerial.tire.model}</h4>
				<p class="font-mono text-slate-400">Dim: <b class="text-slate-200">{selectedSerial.tire.dimension}</b></p>
				<p class="font-mono text-slate-400">Cod Intern: <b class="text-indigo-400 font-extrabold">{selectedSerial.internal_code?.internalCode || selectedSerial.serialNumber}</b></p>
			</div>

			{#if !editMode}
				<div class="space-y-4 pt-2">
					<div class="grid grid-cols-2 gap-3 text-xs">
						<div class="p-3 bg-slate-950/40 rounded-lg border border-slate-850/60">
							<span class="text-[10px] text-slate-500 font-bold uppercase">DOT anvelopă</span>
							<p class="text-sm font-bold text-slate-200 font-mono mt-1">{selectedSerial.dot || '-'}</p>
						</div>
						<div class="p-3 bg-slate-950/40 rounded-lg border border-slate-850/60">
							<span class="text-[10px] text-slate-500 font-bold uppercase">Preț Achiziție</span>
							<p class="text-sm font-bold text-emerald-450 font-mono mt-1">{parseFloat(selectedSerial.purchasePrice).toFixed(2)} RON</p>
						</div>
					</div>

					<div class="flex gap-3">
						<button
							onclick={() => {
								editDot = selectedSerial.dot || '';
								editPrice = parseFloat(selectedSerial.purchasePrice);
								editMode = true;
							}}
							class="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
						>
							<Edit2 class="w-3.5 h-3.5" />
							Editează Date
						</button>
						
						<button
							onclick={() => printHtmlLabel(selectedSerial.internal_code?.internalCode || selectedSerial.serialNumber)}
							class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
						>
							<Printer class="w-3.5 h-3.5" />
							Retipărește
						</button>
					</div>
				</div>
			{:else}
				<!-- Edit input form -->
				<div class="space-y-3.5 pt-2">
					<div class="grid grid-cols-2 gap-3">
						<div class="space-y-1">
							<label for="edit-dot" class="text-xs font-medium text-slate-400">DOT (4 cifre)</label>
							<input
								type="text"
								id="edit-dot"
								bind:value={editDot}
								maxlength="4"
								placeholder="ex: 1225"
								class="w-full bg-slate-950 border border-slate-850 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200 font-mono"
							/>
						</div>
						<div class="space-y-1">
							<label for="edit-price" class="text-xs font-medium text-slate-400">Preț Net (RON)</label>
							<input
								type="number"
								id="edit-price"
								bind:value={editPrice}
								step="0.01"
								class="w-full bg-slate-950 border border-slate-850 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200 font-mono"
							/>
						</div>
					</div>

					<div class="flex gap-3 pt-3 border-t border-slate-800">
						<button
							onclick={handleSaveSerialEdit}
							disabled={updatingSerial}
							class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
						>
							Salveză &amp; Printează
						</button>
						<button
							onclick={() => editMode = false}
							class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-350 rounded-lg cursor-pointer"
						>
							Anulează
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- Modal: Create physical item for scanned EAN -->
{#if scannedEanResult}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
		<div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between pb-3 border-b border-slate-800">
				<h3 class="text-md font-bold text-slate-200 flex items-center gap-1.5">
					<Plus class="w-4.5 h-4.5 text-indigo-400" />
					Tire in Catalog - Adaugă în stoc
				</h3>
				<button onclick={() => scannedEanResult = null} class="text-slate-400 hover:text-slate-200">
					<X class="w-5 h-5" />
				</button>
			</div>

			<div class="p-4 bg-slate-950/60 rounded-xl border border-slate-850 space-y-2 text-xs">
				<p class="text-[10px] text-slate-500 font-semibold uppercase">Profil Catalog Identificat</p>
				<h4 class="text-sm font-bold text-indigo-400">{scannedEanResult.tire.brand} {scannedEanResult.tire.model}</h4>
				<p class="font-mono text-slate-300">Dim: <b>{scannedEanResult.tire.dimension}</b></p>
				<p class="font-mono text-slate-300">EAN: <b>{scannedEanResult.tire.ean}</b></p>
			</div>

			<!-- Select DOT and input price -->
			<div class="space-y-4">
				<div class="space-y-2">
					<label class="text-xs font-semibold text-slate-400 block">Selectați DOT anvelopă:</label>
					<div class="grid grid-cols-2 gap-2 text-xs">
						<!-- Read active serials previous DOTs or manual -->
						{#each Array.from(new Set(scannedEanResult.activeSerials.map((s: any) => s.dot).filter(Boolean))) as dotOpt}
							<label class="flex items-center gap-2 p-2.5 rounded-lg border border-slate-850 bg-slate-950/30 cursor-pointer hover:bg-slate-950/60">
								<input type="radio" bind:group={selectedDot} value={dotOpt} />
								<span class="font-mono font-bold text-slate-250">{dotOpt}</span>
							</label>
						{/each}
						
						<label class="flex items-center gap-2 p-2.5 rounded-lg border border-slate-850 bg-slate-950/30 cursor-pointer hover:bg-slate-950/60 col-span-2">
							<input type="radio" bind:group={selectedDot} value="new" />
							<span class="text-slate-400">Alt DOT (manual):</span>
							<input
								type="text"
								bind:value={manualDot}
								maxlength="4"
								placeholder="ex: 1225"
								class="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-indigo-500 font-mono text-slate-200 w-20"
								onclick={(e) => { selectedDot = 'new'; e.stopPropagation(); }}
							/>
						</label>
					</div>
				</div>

				<div class="space-y-1">
					<label for="new-price-val" class="text-xs font-medium text-slate-400">Preț Net Achiziție (Fără TVA)</label>
					<input
						type="number"
						id="new-price-val"
						bind:value={selectedPrice}
						step="0.01"
						class="w-full bg-slate-950 border border-slate-850 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200 font-mono"
					/>
				</div>

				<div class="flex gap-3 pt-3 border-t border-slate-800">
					<button
						onclick={handleRegisterNewTire}
						disabled={isRegisteringTire}
						class="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
					>
						Printează Etichetă &amp; Adaugă în locație
					</button>
					<button
						onclick={() => scannedEanResult = null}
						class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700 rounded-lg cursor-pointer"
					>
						Anulează
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
