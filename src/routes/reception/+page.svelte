<script lang="ts">
	import { onMount } from 'svelte';
	import { apiRequest } from '$lib/api';
	import { toast } from 'svelte-sonner';
	import { 
		Upload, FileText, CheckCircle2, AlertTriangle, 
		XCircle, Eye, Play, Sparkles, RefreshCw, Calendar,
		Plus, Trash2, ChevronDown, ChevronUp
	} from 'lucide-svelte';

	// Sessions list & parsed items
	let sessions = $state<any[]>([]);
	let parsedItems = $state<any[]>([]);
	let loading = $state(false);

	// File upload state
	let uploadedFile = $state<File | null>(null);
	let fileInputEl = $state<HTMLInputElement | null>(null);
	let sessionName = $state('');

	// Active inspection session details
	let selectedSessionId = $state<string | null>(null);
	let sessionDetails = $state<any | null>(null);
	let detailsLoading = $state(false);
	let refreshInterval = $state<any>(null);

	// OCR & Multi-Aviz state
	let ocrMethod = $state<'pdf-text' | 'tesseract-ocr' | null>(null);
	let rawText = $state<string>('');
	let showOcrDebug = $state(false);

	let parsedSessions = $state<any[]>([]);
	let selectedSessionFlags = $state<boolean[]>([]);
	let selectedSessionIdx = $state<number>(0);

	// Manual session creation state
	let showManualModal = $state(false);
	let manualSessionName = $state('');
	let manualRows = $state<Array<{ ean: string; brand: string; model: string; dimension: string; quantity: number }>>([]);
	let debounceTimers: Record<number, any> = {};

	const loadSessions = async () => {
		try {
			sessions = await apiRequest('/reception/sessions');
		} catch (err: any) {
			toast.error('Nu s-au putut încărca sesiunile: ' + err.message);
		}
	};

	onMount(() => {
		loadSessions();
		return () => {
			if (refreshInterval) clearInterval(refreshInterval);
		};
	});

	// Handle file upload selection
	const handleFileChange = (e: Event) => {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			uploadedFile = target.files[0];
			sessionName = `Receptie_${uploadedFile.name.replace(/\.[^/.]+$/, "")}_${new Date().getDate()}_${new Date().getMonth() + 1}`;
		}
	};

	// Trigger PDF/Excel parser in backend
	const parseDocument = async () => {
		if (!uploadedFile) return;
		loading = true;
		parsedItems = [];
		parsedSessions = [];
		selectedSessionFlags = [];
		ocrMethod = null;
		rawText = '';

		const formData = new FormData();
		formData.append('file', uploadedFile);

		try {
			const res = await fetch('/api/v1/reception/parse', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${localStorage.getItem('wms_token')}`
				},
				body: formData,
			});

			if (!res.ok) {
				const errData = await res.json();
				throw new Error(errData.message || 'Eroare la procesarea fișierului');
			}

			const data = await res.json();
			parsedSessions = data.sessions || [];
			selectedSessionFlags = parsedSessions.map(() => true);
			ocrMethod = data.ocrMethod || 'pdf-text';
			rawText = data.rawText || '';

			if (parsedSessions.length > 0) {
				selectedSessionIdx = 0;
				parsedItems = parsedSessions[0].expectedItems;
				sessionName = parsedSessions[0].name;
				toast.success(`Fișier procesat cu succes! S-au extras ${parsedSessions.length} avize/sesiuni.`);
			} else {
				toast.error('Nu s-au putut extrage date din document.');
			}
		} catch (err: any) {
			toast.error('Eroare la citirea documentului: ' + err.message);
		} finally {
			loading = false;
		}
	};

	// Create a new reception session
	const startSessions = async () => {
		const selected = parsedSessions.filter((_, idx) => selectedSessionFlags[idx]);
		if (selected.length === 0) {
			toast.error('Vă rugăm să selectați cel puțin o sesiune pentru a lansa procesul.');
			return;
		}

		try {
			let firstSessionId = '';
			for (const session of selected) {
				const res = await apiRequest('/reception/sessions', {
					method: 'POST',
					body: {
						name: session.name,
						expectedItems: session.expectedItems,
					},
				});
				if (!firstSessionId) firstSessionId = res.id;
			}
			toast.success('Sesiunile de recepție selectate au fost inițiate!');
			parsedSessions = [];
			parsedItems = [];
			uploadedFile = null;
			if (fileInputEl) fileInputEl.value = '';
			await loadSessions();
			if (selected.length === 1 && firstSessionId) {
				viewSession(firstSessionId);
			}
		} catch (err: any) {
			toast.error('Eroare la inițierea sesiunilor: ' + err.message);
		}
	};

	// View details of an active session
	const viewSession = async (id: string) => {
		selectedSessionId = id;
		detailsLoading = true;
		if (refreshInterval) clearInterval(refreshInterval);

		try {
			await fetchSessionProgress();
			// Auto refresh every 5 seconds while viewing session
			refreshInterval = setInterval(fetchSessionProgress, 5000);
		} catch (err: any) {
			toast.error('Eroare la încărcarea progresului: ' + err.message);
		} finally {
			detailsLoading = false;
		}
	};

	const fetchSessionProgress = async () => {
		if (!selectedSessionId) return;
		try {
			const res = await apiRequest(`/reception/sessions/${selectedSessionId}`);
			sessionDetails = res;
		} catch (err: any) {
			console.error('Failed to poll session progress', err);
		}
	};

	// Close session details view
	const closeSessionView = () => {
		selectedSessionId = null;
		sessionDetails = null;
		if (refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = null;
		}
		loadSessions();
	};

	// Mark session as complete
	const completeSession = async () => {
		if (!selectedSessionId) return;
		try {
			await apiRequest(`/reception/sessions/${selectedSessionId}/complete`, {
				method: 'POST',
			});
			toast.success('Recepția transportului a fost finalizată și salvată.');
			closeSessionView();
		} catch (err: any) {
			toast.error('Eroare la finalizarea recepției: ' + err.message);
		}
	};

	// Manual row EAN/SAP change handler with autocomplete
	const handleEanInput = (idx: number, val: string) => {
		manualRows[idx].ean = val;
		if (debounceTimers[idx]) {
			clearTimeout(debounceTimers[idx]);
		}
		
		if (!val || val.length < 5) return;
		
		debounceTimers[idx] = setTimeout(async () => {
			try {
				const response = await fetch(`/api/v1/warehouse/tires/${val}`, {
					headers: {
						'Authorization': `Bearer ${localStorage.getItem('wms_token')}`
					}
				});
				if (response.ok) {
					const tire = await response.json();
					manualRows[idx].brand = tire.brand || '';
					manualRows[idx].model = tire.model || '';
					manualRows[idx].dimension = tire.dimension || '';
					toast.success(`Anvelopă identificată: ${tire.brand} ${tire.dimension}`);
				}
			} catch (err) {
				console.warn('Tire autocomplete not found for EAN/SAP', val);
			}
		}, 500);
	};

	// Submit manual reception session
	const submitManualSession = async () => {
		if (!manualSessionName.trim()) {
			toast.error('Vă rugăm să introduceți un nume pentru sesiune.');
			return;
		}
		const validRows = manualRows.filter(r => r.ean.trim() || r.brand.trim());
		if (validRows.length === 0) {
			toast.error('Adăugați cel puțin un articol valid.');
			return;
		}

		try {
			const res = await apiRequest('/reception/manual', {
				method: 'POST',
				body: {
					name: manualSessionName,
					expectedItems: validRows,
				},
			});
			toast.success('Sesiune manuală inițiată cu succes!');
			showManualModal = false;
			await loadSessions();
			viewSession(res.id);
		} catch (err: any) {
			toast.error('Eroare la crearea sesiunii manuale: ' + err.message);
		}
	};
</script>

<svelte:head>
	<title>Recepție Descărcări - Hilserv WMS</title>
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<div>
		<h2 class="text-2xl font-bold tracking-tight text-white">Recepție Descarcări Courier</h2>
		<p class="text-xs text-slate-400">Verifică conformitatea produselor livrate prin scanare directă din aviz / factură.</p>
	</div>

	{#if selectedSessionId === null}
		<!-- Session Launcher and Archive Layout -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
			<!-- Upload and Launch Column -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Upload Box -->
				<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
					<div class="flex items-center justify-between">
						<h3 class="text-sm font-bold text-slate-200 flex items-center gap-2">
							<Upload class="w-4.5 h-4.5 text-indigo-400" />
							Încarcă Aviz / Document Transport
						</h3>
						<button
							onclick={() => {
								showManualModal = true;
								manualSessionName = `Receptie_Manual_${new Date().getDate()}_${new Date().getMonth() + 1}`;
								manualRows = [{ ean: '', brand: '', model: '', dimension: '', quantity: 4 }];
							}}
							class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 border border-slate-700 rounded-lg transition-colors flex items-center gap-1"
						>
							<Sparkles class="w-3.5 h-3.5" />
							Creare Manuală
						</button>
					</div>

					<div class="border-2 border-dashed border-slate-850 hover:border-indigo-500/50 rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all bg-slate-950/40">
						<input
							bind:this={fileInputEl}
							type="file"
							accept=".pdf,.xlsx,.xls"
							onchange={handleFileChange}
							class="hidden"
							id="file-uploader"
						/>
						<label for="file-uploader" class="cursor-pointer flex flex-col items-center gap-3">
							<div class="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
								<FileText class="w-6 h-6" />
							</div>
							{#if uploadedFile}
								<span class="text-xs font-semibold text-slate-200">{uploadedFile.name}</span>
								<span class="text-[10px] text-slate-500 font-mono">Size: {(uploadedFile.size / 1024).toFixed(1)} KB</span>
							{:else}
								<span class="text-xs text-slate-350">Trageți sau faceți click pentru a selecta documentul</span>
								<span class="text-[10px] text-slate-500">Formate acceptate: PDF sau Excel (.xlsx, .xls)</span>
							{/if}
						</label>
					</div>

					{#if uploadedFile}
						<div class="flex gap-3">
							<button
								onclick={parseDocument}
								disabled={loading}
								class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-2"
							>
								<Sparkles class="w-4 h-4" />
								{loading ? 'Se analizează...' : 'Citește Documentul automat'}
							</button>
						</div>
					{/if}
				</div>

				<!-- OCR Debugging Console -->
				{#if ocrMethod}
					<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-3">
						<button
							onclick={() => showOcrDebug = !showOcrDebug}
							class="w-full flex items-center justify-between text-xs font-semibold text-slate-350 hover:text-white transition-colors"
						>
							<span class="flex items-center gap-2">
								<Sparkles class="w-4.5 h-4.5 text-yellow-500" />
								Consolă Debugging Text Extras (OCR)
								<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold {ocrMethod === 'tesseract-ocr' ? 'bg-amber-950/40 text-amber-400 border border-amber-800/30' : 'bg-indigo-950/40 text-indigo-400 border border-indigo-800/30'}">
									{ocrMethod === 'tesseract-ocr' ? 'Tesseract OCR' : 'Direct Text PDF'}
								</span>
							</span>
							{#if showOcrDebug}
								<ChevronUp class="w-4 h-4" />
							{:else}
								<ChevronDown class="w-4 h-4" />
							{/if}
						</button>
						
						{#if showOcrDebug}
							<div class="space-y-2 pt-2 transition-all">
								<p class="text-[10px] text-slate-500">Textul brut extras prin motorul de parsare:</p>
								<textarea
									readonly
									value={rawText}
									rows={8}
									class="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-[10px] font-mono text-slate-400 focus:outline-none select-all resize-y"
								></textarea>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Multi-Aviz Selection & Reviews -->
				{#if parsedSessions.length > 0}
					{#if parsedSessions.length > 1}
						<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
							<div>
								<h3 class="text-sm font-bold text-slate-200">Avize Splituite Detectate</h3>
								<p class="text-xs text-slate-400 mt-1">Am găsit mai multe note de livrare în document. Selectați avizele pe care doriți să le lansați în recepție:</p>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								{#each parsedSessions as session, idx}
									<div 
										class="p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 bg-slate-950/40 hover:bg-slate-950/60 {selectedSessionFlags[idx] ? 'border-indigo-500/80 shadow-indigo-500/5' : 'border-slate-850'}"
										onclick={() => {
											selectedSessionFlags[idx] = !selectedSessionFlags[idx];
											selectedSessionIdx = idx;
										}}
									>
										<input 
											type="checkbox" 
											checked={selectedSessionFlags[idx]} 
											onclick={(e) => e.stopPropagation()}
											onchange={(e) => { selectedSessionFlags[idx] = (e.target as HTMLInputElement).checked; }}
											class="mt-1 accent-indigo-500 cursor-pointer"
										/>
										<div class="space-y-1 flex-1">
											<h4 class="text-xs font-bold text-slate-200 break-all">{session.name}</h4>
											<p class="text-[10px] text-slate-400 font-semibold">{session.expectedItems.length} repere distincte</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Parsed expected items review list -->
					<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
						<div class="flex items-center justify-between gap-4">
							<div>
								<h3 class="text-sm font-bold text-slate-200 flex flex-wrap gap-1 items-center">
									Revizuire Articole pentru: 
									<span class="text-indigo-400 font-mono text-xs break-all">{parsedSessions[selectedSessionIdx]?.name}</span>
								</h3>
								{#if parsedSessions.length > 1}
									<p class="text-[10px] text-slate-500 mt-1">Faceți click pe un aviz mai sus pentru a-i previzualiza și edita articolele.</p>
								{/if}
							</div>
							<span class="text-xs text-indigo-400 font-semibold shrink-0">{parsedSessions[selectedSessionIdx]?.expectedItems.length || 0} repere</span>
						</div>

						<div class="space-y-3 max-h-96 overflow-y-auto pr-1">
							{#each parsedSessions[selectedSessionIdx]?.expectedItems || [] as item, idx}
								<div class="p-4 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between gap-4">
									<div class="space-y-1">
										<h4 class="text-xs font-bold text-slate-200">{item.brand}</h4>
										<p class="text-[10px] text-slate-400 font-mono">EAN/SAP: {item.ean} | Dim: {item.dimension || 'N/A'}</p>
									</div>
									<div class="flex items-center gap-2">
										<span class="text-xs text-slate-400">Cantitate:</span>
										<input
											type="number"
											bind:value={item.quantity}
											class="w-16 bg-slate-900 border border-slate-850 rounded py-1 px-2 text-xs text-center text-slate-250 font-bold focus:outline-none focus:border-indigo-500"
										/>
									</div>
								</div>
							{/each}
						</div>

						<div class="pt-4 border-t border-slate-850 space-y-3">
							{#if parsedSessions.length === 1}
								<div class="space-y-1">
									<label for="session-name" class="text-xs font-medium text-slate-400">Nume Sesiune / Identificator Recepție</label>
									<input
										type="text"
										id="session-name"
										bind:value={parsedSessions[0].name}
										placeholder="ex: Receptie_Furnizor_Data"
										class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200"
									/>
								</div>
							{/if}

							<button
								onclick={startSessions}
								class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-lg text-xs text-white transition-all flex items-center justify-center gap-1.5 active:scale-95"
							>
								<Play class="w-4 h-4" />
								Lansează Proces de Verificare
							</button>
						</div>
					</div>
				{/if}
			</div>

			<!-- Archive Sessions Column -->
			<div class="lg:col-span-1 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
				<h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Istoric Sesiuni Recepție</h3>

				{#if sessions.length === 0}
					<div class="text-center py-10 text-xs text-slate-550">Nicio sesiune de recepție lansată anterior.</div>
				{:else}
					<div class="space-y-3 max-h-[500px] overflow-y-auto pr-1">
						{#each sessions as ses}
							<div class="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-3">
								<div class="flex items-start justify-between gap-2">
									<div>
										<h4 class="text-xs font-bold text-slate-250 break-all">{ses.name}</h4>
										<span class="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
											<Calendar class="w-3.5 h-3.5" />
											{new Date(ses.created_at).toLocaleDateString('ro-RO')}
										</span>
									</div>
									<span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded {ses.status === 'completed' ? 'bg-emerald-950/30 text-emerald-400' : 'bg-amber-950/30 text-amber-400'}">
										{ses.status === 'completed' ? 'Finalizat' : 'Activ'}
									</span>
								</div>

								<button
									onclick={() => viewSession(ses.id)}
									class="w-full py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-[10px] font-semibold text-slate-200 rounded-md transition-colors flex items-center justify-center gap-1"
								>
									<Eye class="w-3.5 h-3.5" />
									Vezi Detalii
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<!-- Session Verification Screen (Real-time checks) -->
		<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-6">
			<!-- Header -->
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-850">
				<div>
					<span class="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Sesiune activă</span>
					<h3 class="text-lg font-bold text-slate-200">{sessionDetails?.session?.name || 'Se încarcă...'}</h3>
					<p class="text-[10px] text-slate-500">
						Inițiată la: {sessionDetails?.session?.created_at ? new Date(sessionDetails.session.created_at).toLocaleString('ro-RO') : ''}
					</p>
				</div>

				<div class="flex gap-2">
					{#if sessionDetails?.session?.status !== 'completed'}
						<button
							onclick={completeSession}
							class="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors active:scale-95"
						>
							Finalizează Recepție
						</button>
					{/if}
					<button
						onclick={closeSessionView}
						class="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-350 border border-slate-700 rounded-lg transition-colors"
					>
						Închide Vizualizare
					</button>
				</div>
			</div>

			<!-- Comparison table -->
			{#if detailsLoading && !sessionDetails}
				<div class="text-center py-20 text-xs text-slate-550 flex items-center justify-center gap-2">
					<RefreshCw class="w-4 h-4 animate-spin text-indigo-400" />
					Se citește stadiul descărcării...
				</div>
			{:else if sessionDetails}
				<div class="overflow-x-auto">
					<table class="w-full text-left border-collapse">
						<thead>
							<tr class="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
								<th class="py-3 px-4">Brand / Dimensiuni</th>
								<th class="py-3 px-4">Cod EAN</th>
								<th class="py-3 px-4 text-center">Așteptat</th>
								<th class="py-3 px-4 text-center">Scanate (Descărcat)</th>
								<th class="py-3 px-4 text-center">Diferență</th>
								<th class="py-3 px-4 text-center">Status</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-850/40 text-xs text-slate-300">
							{#each sessionDetails.items as item}
								<tr>
									<td class="py-4 px-4">
										<span class="font-bold text-slate-205">{item.brand}</span>
										<p class="text-[10px] text-slate-500 mt-0.5">{item.dimension || 'Dimensiune nespecificată'}</p>
									</td>
									<td class="py-4 px-4 font-mono text-[11px] text-slate-450">{item.ean}</td>
									<td class="py-4 px-4 text-center font-bold text-slate-400">{item.quantity}</td>
									<td class="py-4 px-4 text-center font-extrabold text-slate-200 font-mono">{item.scanned}</td>
									<td class="py-4 px-4 text-center font-bold font-mono {item.discrepancy < 0 ? 'text-rose-400' : item.discrepancy > 0 ? 'text-amber-400' : 'text-emerald-400'}">
										{item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}
									</td>
									<td class="py-4 px-4 text-center">
										{#if item.discrepancy === 0}
											<span class="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-450">
												<CheckCircle2 class="w-3.5 h-3.5" /> Complet
											</span>
										{:else if item.discrepancy < 0}
											<span class="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-450">
												<XCircle class="w-3.5 h-3.5" /> Incomplet
											</span>
										{:else}
											<span class="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-450">
												<AlertTriangle class="w-3.5 h-3.5" /> Surplus
											</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				
				<div class="p-4 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between text-xs text-slate-550">
					<span>Actualizat automat în timp real la scanarea anvelopelor.</span>
					<span class="flex items-center gap-1.5 text-indigo-400 font-semibold">
						<RefreshCw class="w-3.5 h-3.5 animate-spin" /> Auto-update activ
					</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Manual Entry Modal -->
{#if showManualModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
		<div class="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[85vh]">
			<!-- Header -->
			<div class="flex items-center justify-between pb-4 border-b border-slate-850">
				<div>
					<h3 class="text-base font-bold text-white">Inițiere Sesiune Recepție Manuală</h3>
					<p class="text-xs text-slate-400">Adaugă detalii despre livrare dacă documentul nu a putut fi citit automat.</p>
				</div>
				<button 
					onclick={() => showManualModal = false}
					class="text-slate-400 hover:text-white transition-colors"
				>
					<XCircle class="w-6 h-6" />
				</button>
			</div>

			<!-- Form -->
			<div class="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="space-y-1">
						<label for="manual-session-name" class="text-xs font-semibold text-slate-350">Identificator Recepție / Nume Sesiune</label>
						<input
							type="text"
							id="manual-session-name"
							bind:value={manualSessionName}
							class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200 font-bold"
							placeholder="ex: Recepție_Furnizor_Manual"
						/>
					</div>
				</div>

				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold text-slate-350">Articole Așteptate</span>
						<button
							onclick={() => manualRows = [...manualRows, { ean: '', brand: '', model: '', dimension: '', quantity: 4 }]}
							class="px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1"
						>
							<Plus class="w-3.5 h-3.5" /> Adaugă Rând
						</button>
					</div>

					<div class="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/20">
						<table class="w-full text-left border-collapse text-xs">
							<thead>
								<tr class="bg-slate-950/40 border-b border-slate-850 text-slate-400 font-semibold text-[10px] uppercase">
									<th class="py-2.5 px-3">EAN / Cod SAP (Auto-completare)</th>
									<th class="py-2.5 px-3">Brand</th>
									<th class="py-2.5 px-3">Dimensiune</th>
									<th class="py-2.5 px-3">Model</th>
									<th class="py-2.5 px-3 w-20 text-center">Bucăți</th>
									<th class="py-2.5 px-3 w-10"></th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-850/30 text-slate-300">
								{#each manualRows as row, idx}
									<tr>
										<td class="py-2 px-2">
											<input
												type="text"
												value={row.ean}
												oninput={(e) => handleEanInput(idx, (e.target as HTMLInputElement).value)}
												placeholder="ex: 594..."
												class="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
											/>
										</td>
										<td class="py-2 px-2">
											<input
												type="text"
												bind:value={row.brand}
												placeholder="ex: Michelin"
												class="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-bold"
											/>
										</td>
										<td class="py-2 px-2">
											<input
												type="text"
												bind:value={row.dimension}
												placeholder="ex: 205/55 R16"
												class="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
											/>
										</td>
										<td class="py-2 px-2">
											<input
												type="text"
												bind:value={row.model}
												placeholder="ex: Pilot Sport"
												class="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
											/>
										</td>
										<td class="py-2 px-2">
											<input
												type="number"
												bind:value={row.quantity}
												min="1"
												class="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1.5 text-xs text-center focus:outline-none focus:border-indigo-500 font-bold"
											/>
										</td>
										<td class="py-2 px-2 text-center">
											{#if manualRows.length > 1}
												<button
													onclick={() => manualRows = manualRows.filter((_, i) => i !== idx)}
													class="text-rose-400 hover:text-rose-300 p-1 transition-colors"
												>
													<Trash2 class="w-4 h-4" />
												</button>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-850">
				<button
					onclick={() => showManualModal = false}
					class="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-350 border border-slate-700 rounded-lg transition-colors"
				>
					Renunță
				</button>
				<button
					onclick={submitManualSession}
					class="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
				>
					Inițializează Recepție
				</button>
			</div>
		</div>
	</div>
{/if}
