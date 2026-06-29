<script lang="ts">
	import { onMount } from 'svelte';
	import { apiRequest } from '$lib/api';
	import { auth } from '$lib/auth.svelte';
	import { toast } from 'svelte-sonner';
	import { 
		Settings, Users, Truck, Target, Plus, Trash2, 
		CheckCircle2, DollarSign, Percent, Calendar, ShieldAlert,
		Palette, Globe, Lock, Eye, Edit, MapPin, Database, RefreshCw
	} from 'lucide-svelte';

	let activeSubTab = $state<'global' | 'users' | 'suppliers' | 'targets' | 'appearance' | 'logs' | 'containers' | 'normalization'>('global');
	let loading = $state(false);
	let currentUser = $derived(auth.user);

	// Activity Logs state
	let logsList = $state<any[]>([]);
	let logsTotal = $state(0);
	let logsLimit = $state(20);
	let logsOffset = $state(0);
	let logsFilterUser = $state('');
	let logsFilterAction = $state('');
	let logsFilterStartDate = $state('');
	let logsFilterEndDate = $state('');

	const loadActivityLogs = async () => {
		try {
			const query = new URLSearchParams({
				limit: String(logsLimit),
				offset: String(logsOffset),
			});
			if (logsFilterUser) query.append('username', logsFilterUser);
			if (logsFilterAction) query.append('action', logsFilterAction);
			if (logsFilterStartDate) query.append('startDate', logsFilterStartDate);
			if (logsFilterEndDate) query.append('endDate', logsFilterEndDate);

			const data = await apiRequest(`/settings/activity-logs?${query.toString()}`);
			logsList = data.logs || [];
			logsTotal = data.total || 0;
		} catch (err: any) {
			toast.error('Eroare la încărcarea jurnalului de activități: ' + err.message);
		}
	};

	$effect(() => {
		if (activeSubTab === 'logs') {
			loadActivityLogs();
		}
	});

	// Theme preferences state
	let currentTheme = $state<'light' | 'dark' | 'system'>('dark');

	// Lists
	let usersList = $state<any[]>([]);
	let suppliersList = $state<any[]>([]);
	let targetsList = $state<any[]>([]);

	// Global Config fields
	let tva = $state(19);
	let minDotYear = $state(2025);
	let ecoAuto = $state(5.0);
	let ecoMoto = $state(3.0);
	let ecoTir = $state(15.0);

	// Container Gestiune fields
	let containersList = $state<any[]>([]);
	let newContainerName = $state('');
	let newContainerDesc = $state('');

	const handleCreateContainer = async (e: Event) => {
		e.preventDefault();
		if (!newContainerName) return;
		try {
			await apiRequest('/warehouse/sections', {
				method: 'POST',
				body: { name: newContainerName, description: newContainerDesc || undefined }
			});
			toast.success('Locație/container creat cu succes!');
			newContainerName = '';
			newContainerDesc = '';
			containersList = await apiRequest('/warehouse/sections');
		} catch (err: any) {
			toast.error('Eroare la crearea locației: ' + err.message);
		}
	};

	const handleDeleteContainer = async (id: string) => {
		if (!confirm('Ștergeți această locație de depozit?')) return;
		try {
			await apiRequest(`/warehouse/sections/${id}`, { method: 'DELETE' });
			toast.success('Locație ștearsă.');
			containersList = await apiRequest('/warehouse/sections');
		} catch (err: any) {
			toast.error(err.message || 'Ștergerea a eșuat');
		}
	};

	// Container inline edit fields
	let editingContainerId = $state('');
	let editContainerName = $state('');
	let editContainerDesc = $state('');

	const handleStartEditContainer = (c: any) => {
		editingContainerId = c.id;
		editContainerName = c.name;
		editContainerDesc = c.description || '';
	};

	const handleSaveEditContainer = async (id: string) => {
		if (!editContainerName) return;
		try {
			await apiRequest(`/warehouse/sections/${id}`, {
				method: 'PATCH',
				body: { name: editContainerName, description: editContainerDesc || undefined }
			});
			toast.success('Locație actualizată cu succes!');
			editingContainerId = '';
			containersList = await apiRequest('/warehouse/sections');
		} catch (err: any) {
			toast.error('Eroare la modificarea locației: ' + err.message);
		}
	};

	// User Form fields
	let newUsername = $state('');
	let newEmail = $state('');
	let newPassword = $state('');
	let newRole = $state<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
	let newPin = $state('');
	let newBarcode = $state('');

	// Supplier Form fields
	let supName = $state('');
	let supTransport = $state<number | null>(null);
	let supFeedUrl = $state('');
	let supEmail = $state('');
	let supImageUrl = $state('');
	let supIngestCode = $state('');
	let supEmailSubjectFilter = $state('');
	let supEmailAttachmentFilter = $state('');
	let supColEan = $state('');
	let supColPrice = $state('');
	let supColQty = $state('');
	let supColDot = $state('');
	let editingSupplierId = $state<string | null>(null);
	let syncMethod = $state<'url' | 'email' | 'manual'>('manual');

	// Preview dynamic URL feed
	let previewUrl = $derived.by(() => {
		if (!supFeedUrl) return '';
		const date = new Date();
		const yyyy = date.getFullYear().toString();
		const mm = (date.getMonth() + 1).toString().padStart(2, '0');
		const dd = date.getDate().toString().padStart(2, '0');
		return supFeedUrl
			.replace(/\{\{YYYY\}\}/g, yyyy)
			.replace(/\{\{MM\}\}/g, mm)
			.replace(/\{\{DD\}\}/g, dd)
			.replace(/\{\{YYYY_MM_DD\}\}/g, `${yyyy}_${mm}_${dd}`)
			.replace(/\{\{YYYY-MM-DD\}\}/g, `${yyyy}-${mm}-${dd}`);
	});

	// Target Form fields
	let targetSupId = $state('');
	let targetQty = $state<number | null>(null);
	let targetStart = $state('');
	let targetEnd = $state('');
	let targetBrand = $state('');
	let targetCat = $state('');
	let targetSeason = $state('');

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

	const loadSettingsData = async () => {
		loading = true;
		try {
			// Global configs
			const configs = await apiRequest('/settings/configs');
			tva = configs.tva;
			minDotYear = configs.minDotYear;
			ecoAuto = configs.ecotaxa?.AUTO || 5.0;
			ecoMoto = configs.ecotaxa?.MOTO || 3.0;
			ecoTir = configs.ecotaxa?.TIR || 15.0;

			// Lists
			usersList = await apiRequest('/users');
			suppliersList = await apiRequest('/settings/suppliers');
			targetsList = await apiRequest('/analytics/targets');
			containersList = await apiRequest('/warehouse/sections');
			await loadNormalizationData();
		} catch (err: any) {
			toast.error('Eroare la încărcarea setărilor: ' + err.message);
		} finally {
			loading = false;
		}
	};

	// Normalization States
	let normBrands = $state<any[]>([]);
	let normProfiles = $state<any[]>([]);
	let activeNormBrand = $state<string>('');
	let brandMappings = $state<any[]>([]);
	let profileMappings = $state<any[]>([]);
	
	// Modal/Form states
	let rawBrandInput = $state('');
	let normBrandInput = $state('');
	let brandForProfileInput = $state('');
	let rawProfileInput = $state('');
	let normProfileInput = $state('');

	const loadNormalizationData = async () => {
		try {
			normBrands = await apiRequest('/normalization/brands');
			brandMappings = await apiRequest('/normalization/brand-mappings');
			profileMappings = await apiRequest('/normalization/profile-mappings');
			await loadKeywordRules();
			if (activeNormBrand) {
				normProfiles = await apiRequest(`/normalization/profiles?brand=${encodeURIComponent(activeNormBrand)}`);
			}
		} catch (err: any) {
			console.error('Failed to load normalization data:', err);
		}
	};

	const selectNormBrand = async (brand: string) => {
		activeNormBrand = brand;
		brandForProfileInput = brand;
		try {
			normProfiles = await apiRequest(`/normalization/profiles?brand=${encodeURIComponent(brand)}`);
		} catch (err: any) {
			toast.error('Nu s-au putut încărca profilele pentru brandul selectat.');
		}
	};

	const handleAddBrandMapping = async (e: Event) => {
		e.preventDefault();
		if (!rawBrandInput || !normBrandInput) return;
		try {
			const res = await apiRequest('/normalization/brand-mappings', {
				method: 'POST',
				body: { rawBrand: rawBrandInput, normalizedBrand: normBrandInput }
			});
			toast.success(`Regulă creată! S-au actualizat ${res.updatedTiresCount} anvelope în catalog.`);
			rawBrandInput = '';
			normBrandInput = '';
			await loadNormalizationData();
		} catch (err: any) {
			toast.error('Eroare la crearea regulii: ' + err.message);
		}
	};

	const handleDeleteBrandMapping = async (id: string) => {
		if (!confirm('Ștergeți această regulă de normalizare a brandului?')) return;
		try {
			await apiRequest(`/normalization/brand-mappings/${id}`, { method: 'DELETE' });
			toast.success('Regulă ștearsă.');
			await loadNormalizationData();
		} catch (err: any) {
			toast.error(err.message || 'Ștergerea a eșuat');
		}
	};

	const handleAddProfileMapping = async (e: Event) => {
		e.preventDefault();
		if (!brandForProfileInput || !rawProfileInput || !normProfileInput) return;
		try {
			const res = await apiRequest('/normalization/profile-mappings', {
				method: 'POST',
				body: {
					brand: brandForProfileInput,
					rawProfile: rawProfileInput,
					normalizedProfile: normProfileInput
				}
			});
			toast.success(`Regulă creată! S-au actualizat ${res.updatedTiresCount} profile în catalog.`);
			rawProfileInput = '';
			normProfileInput = '';
			await loadNormalizationData();
		} catch (err: any) {
			toast.error('Eroare la crearea regulii: ' + err.message);
		}
	};

	const handleDeleteProfileMapping = async (id: string) => {
		if (!confirm('Ștergeți această regulă de normalizare a profilului?')) return;
		try {
			await apiRequest(`/normalization/profile-mappings/${id}`, { method: 'DELETE' });
			toast.success('Regulă ștearsă.');
			await loadNormalizationData();
		} catch (err: any) {
			toast.error(err.message || 'Ștergerea a eșuat');
		}
	};

	const handleNormalizeDimensions = async () => {
		try {
			const res = await apiRequest('/normalization/normalize-dimensions', { method: 'POST' });
			toast.success(`Normalizare finalizată! S-au scanat ${res.scanned} anvelope și s-au reparat ${res.fixed} profile.`);
		} catch (err: any) {
			toast.error('Eroare la normalizarea dimensiunilor: ' + err.message);
		}
	};

	// ============ Keyword Rules States ============
	let keywordRules = $state<any[]>([]);
	let kwKeyword = $state('');
	let kwTargetField = $state<'brand' | 'profile'>('brand');
	let kwResolvedValue = $state('');
	let kwBrandContext = $state('');
	let kwMatchMode = $state<'prefix' | 'contains' | 'exact'>('prefix');
	let kwPriority = $state(0);
	let kwTestInput = $state('');
	let kwTestField = $state<'brand' | 'profile'>('brand');
	let kwTestBrand = $state('');
	let kwTestResult = $state<any>(null);

	const loadKeywordRules = async () => {
		try {
			keywordRules = await apiRequest('/normalization/keyword-rules');
		} catch (err: any) {
			console.error('Failed to load keyword rules:', err);
		}
	};

	const handleAddKeywordRule = async (e: Event) => {
		e.preventDefault();
		if (!kwKeyword || !kwResolvedValue) return;
		try {
			await apiRequest('/normalization/keyword-rules', {
				method: 'POST',
				body: {
					keyword: kwKeyword,
					targetField: kwTargetField,
					resolvedValue: kwResolvedValue,
					brandContext: kwBrandContext || undefined,
					matchMode: kwMatchMode,
					priority: kwPriority
				}
			});
			toast.success(`Regulă keyword "${kwKeyword}" → "${kwResolvedValue}" salvată!`);
			kwKeyword = '';
			kwResolvedValue = '';
			kwBrandContext = '';
			kwPriority = 0;
			await loadKeywordRules();
		} catch (err: any) {
			toast.error('Eroare: ' + err.message);
		}
	};

	const handleDeleteKeywordRule = async (id: string) => {
		if (!confirm('Ștergeți această regulă keyword?')) return;
		try {
			await apiRequest(`/normalization/keyword-rules/${id}`, { method: 'DELETE' });
			toast.success('Regulă keyword ștearsă.');
			await loadKeywordRules();
		} catch (err: any) {
			toast.error(err.message);
		}
	};

	const handleTestKeyword = async () => {
		if (!kwTestInput) return;
		try {
			kwTestResult = await apiRequest('/normalization/keyword-rules/test', {
				method: 'POST',
				body: {
					input: kwTestInput,
					targetField: kwTestField,
					brandContext: kwTestBrand || undefined
				}
			});
		} catch (err: any) {
			toast.error('Eroare la test: ' + err.message);
		}
	};

	onMount(() => {
		if (auth.user?.role === 'EMPLOYEE') {
			activeSubTab = 'appearance';
		} else {
			loadSettingsData();
		}

		if (typeof window !== 'undefined') {
			currentTheme = (localStorage.getItem('wms_theme') as any) || 'dark';
		}
	});

	// Save global configs
	const handleSaveConfigs = async (e: Event) => {
		e.preventDefault();
		try {
			await apiRequest('/settings/configs', {
				method: 'POST',
				body: {
					tva,
					minDotYear,
					ecotaxa: {
						AUTO: Number(ecoAuto),
						MOTO: Number(ecoMoto),
						TIR: Number(ecoTir),
					},
				},
			});
			toast.success('Setările globale au fost salvate cu succes!');
			loadSettingsData();
		} catch (err: any) {
			toast.error('Eroare la salvarea setărilor: ' + err.message);
		}
	};

	// Create User
	const handleCreateUser = async (e: Event) => {
		e.preventDefault();
		if (newRole === 'EMPLOYEE') {
			if (!newPin) {
				toast.error('PIN-ul este obligatoriu pentru operatori');
				return;
			}
			if (!/^\d{6}$/.test(newPin)) {
				toast.error('Codul PIN al operatorului trebuie să conțină exact 6 cifre');
				return;
			}
		}
		try {
			await apiRequest('/users', {
				method: 'POST',
				body: {
					username: newUsername,
					email: newEmail,
					password: newRole === 'ADMIN' ? newPassword : undefined,
					role: newRole,
					pin: newRole === 'EMPLOYEE' ? newPin : undefined,
					barcode: newRole === 'EMPLOYEE' ? newBarcode : undefined,
				},
			});
			toast.success('Utilizator creat cu succes!');
			newUsername = '';
			newEmail = '';
			newPassword = '';
			newPin = '';
			newBarcode = '';
			loadSettingsData();
		} catch (err: any) {
			toast.error('Eroare la crearea utilizatorului: ' + err.message);
		}
	};

	// Delete User
	const handleDeleteUser = async (id: string, name: string) => {
		if (!confirm(`Ștergeți utilizatorul ${name}?`)) return;
		try {
			await apiRequest(`/users/${id}`, { method: 'DELETE' });
			toast.success('Utilizator eliminat.');
			loadSettingsData();
		} catch (err: any) {
			toast.error(err.message || 'Ștergerea a eșuat');
		}
	};

	// User inline edit fields
	let editingUserId = $state('');
	let editUserUsername = $state('');
	let editUserEmail = $state('');
	let editUserRole = $state<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
	let editUserPin = $state('');
	let editUserBarcode = $state('');
	let editUserPassword = $state('');

	const handleStartEditUser = (u: any) => {
		editingUserId = u.id;
		editUserUsername = u.username;
		editUserEmail = u.email;
		editUserRole = u.role;
		editUserPin = '';
		editUserBarcode = u.barcode || '';
		editUserPassword = '';
	};

	const handleSaveEditUser = async (id: string) => {
		if (!editUserUsername || !editUserEmail) return;
		try {
			await apiRequest(`/users/${id}`, {
				method: 'PATCH',
				body: {
					username: editUserUsername,
					email: editUserEmail,
					role: editUserRole,
					pin: editUserPin || undefined,
					barcode: editUserBarcode || undefined,
					password: editUserPassword || undefined
				}
			});
			toast.success('Utilizator actualizat cu succes!');
			editingUserId = '';
			loadSettingsData();
		} catch (err: any) {
			toast.error('Eroare la modificarea utilizatorului: ' + err.message);
		}
	};

	// Create/Update Supplier
	const handleSaveSupplier = async (e: Event) => {
		e.preventDefault();
		try {
			const body = {
				name: supName,
				transportCostPerTire: supTransport !== null ? Number(supTransport) : undefined,
				imageUrl: supImageUrl || undefined,
				ingestCode: supIngestCode || undefined,
				feedUrl: syncMethod === 'url' ? (supFeedUrl || null) : null,
				emailAddress: syncMethod === 'email' ? (supEmail || null) : null,
				emailSubjectFilter: syncMethod === 'email' ? (supEmailSubjectFilter || null) : null,
				emailAttachmentFilter: syncMethod === 'email' ? (supEmailAttachmentFilter || null) : null,
				columnMapping: syncMethod !== 'manual' ? {
					ean: supColEan || undefined,
					price: supColPrice || undefined,
					quantity: supColQty || undefined,
					dot: supColDot || undefined,
				} : null
			};

			if (editingSupplierId) {
				await apiRequest(`/settings/suppliers/${editingSupplierId}`, {
					method: 'PUT',
					body,
				});
				toast.success('Furnizor actualizat cu succes!');
			} else {
				await apiRequest('/settings/suppliers', {
					method: 'POST',
					body,
				});
				toast.success('Furnizor creat cu succes!');
			}

			resetSupplierForm();
			loadSettingsData();
		} catch (err: any) {
			toast.error('Eroare la salvare: ' + err.message);
		}
	};

	const resetSupplierForm = () => {
		editingSupplierId = null;
		supName = '';
		supTransport = null;
		supFeedUrl = '';
		supEmail = '';
		supImageUrl = '';
		supIngestCode = '';
		supEmailSubjectFilter = '';
		supEmailAttachmentFilter = '';
		supColEan = '';
		supColPrice = '';
		supColQty = '';
		supColDot = '';
		syncMethod = 'manual';
	};

	const startEditSupplier = (s: any) => {
		editingSupplierId = s.id;
		supName = s.name;
		supTransport = s.transportCostPerTire !== null ? Number(s.transportCostPerTire) : null;
		supFeedUrl = s.feedUrl || '';
		supEmail = s.emailAddress || '';
		supImageUrl = s.imageUrl || '';
		supIngestCode = s.ingestCode || '';
		supEmailSubjectFilter = s.emailSubjectFilter || '';
		supEmailAttachmentFilter = s.emailAttachmentFilter || '';
		supColEan = s.columnMapping?.ean || '';
		supColPrice = s.columnMapping?.price || '';
		supColQty = s.columnMapping?.quantity || '';
		supColDot = s.columnMapping?.dot || '';

		if (s.feedUrl) {
			syncMethod = 'url';
		} else if (s.emailAddress) {
			syncMethod = 'email';
		} else {
			syncMethod = 'manual';
		}
	};

	// Delete Supplier
	const handleDeleteSupplier = async (id: string, name: string) => {
		if (!confirm(`Ștergeți furnizorul ${name}?`)) return;
		try {
			await apiRequest(`/settings/suppliers/${id}`, { method: 'DELETE' });
			toast.success('Furnizor eliminat.');
			loadSettingsData();
		} catch (err: any) {
			toast.error(err.message || 'Ștergerea a eșuat');
		}
	};

	// Create Target
	const handleCreateTarget = async (e: Event) => {
		e.preventDefault();
		try {
			await apiRequest('/analytics/targets', {
				method: 'POST',
				body: {
					supplierId: targetSupId,
					targetQuantity: Number(targetQty),
					startDate: targetStart,
					endDate: targetEnd,
					brandFilter: targetBrand || undefined,
					categoryFilter: targetCat || undefined,
					seasonFilter: targetSeason || undefined,
				},
			});
			toast.success('Target bonus configurat cu succes!');
			targetSupId = '';
			targetQty = null;
			targetStart = '';
			targetEnd = '';
			targetBrand = '';
			targetCat = '';
			targetSeason = '';
			loadSettingsData();
		} catch (err: any) {
			toast.error('Eroare la crearea targetului: ' + err.message);
		}
	};

	// Delete Target
	const handleDeleteTarget = async (id: string) => {
		if (!confirm('Ștergeți acest target de furnizor?')) return;
		try {
			await apiRequest(`/analytics/targets/${id}`, { method: 'DELETE' });
			toast.success('Target eliminat.');
			loadSettingsData();
		} catch (err: any) {
			toast.error(err.message || 'Ștergerea a eșuat');
		}
	};

	// Handle Theme Saving
	const handleSaveTheme = (theme: 'light' | 'dark' | 'system') => {
		currentTheme = theme;
		localStorage.setItem('wms_theme', theme);
		window.dispatchEvent(new CustomEvent('wms-theme-updated', { detail: theme }));
		toast.success(`Preferința de temă a fost actualizată la: ${theme === 'light' ? 'Temă Deschisă' : theme === 'dark' ? 'Temă Închisă' : 'Implicită Sistem'}`);
	};
</script>

<svelte:head>
	<title>Setări WMS - Hilserv WMS</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		{#if currentUser?.role === 'ADMIN'}
			<h2 class="text-2xl font-bold tracking-tight text-white">Setări Gestiune (Admin)</h2>
			<p class="text-xs text-slate-400">Administrare utilizatori, costuri logistice de la furnizori și cote de TVA/EcoTaxă.</p>
		{:else}
			<h2 class="text-2xl font-bold tracking-tight text-white">Setări Preferințe</h2>
			<p class="text-xs text-slate-400">Personalizare temă vizuală și opțiuni de interfață.</p>
		{/if}
	</div>

	<!-- Layout settings tabs -->
	<div class="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
		<!-- Sidebar buttons -->
		<div class="lg:col-span-1 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 shadow-md space-y-1">
			{#if currentUser?.role === 'ADMIN'}
				<button
					onclick={() => activeSubTab = 'global'}
					class="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all {activeSubTab === 'global' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}"
				>
					<Settings class="w-4.5 h-4.5" />
					Configurații Globale
				</button>
				<button
					onclick={() => activeSubTab = 'users'}
					class="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all {activeSubTab === 'users' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}"
				>
					<Users class="w-4.5 h-4.5" />
					Gestiune Utilizatori
				</button>
				<button
					onclick={() => activeSubTab = 'suppliers'}
					class="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all {activeSubTab === 'suppliers' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}"
				>
					<Truck class="w-4.5 h-4.5" />
					Configurări Furnizori
				</button>
				<button
					onclick={() => activeSubTab = 'targets'}
					class="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all {activeSubTab === 'targets' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}"
				>
					<Target class="w-4.5 h-4.5" />
					Obiective / Targete
				</button>
				<button
					onclick={() => { activeSubTab = 'logs'; logsOffset = 0; }}
					class="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all {activeSubTab === 'logs' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}"
				>
					<Calendar class="w-4.5 h-4.5" />
					Istoric Activități
				</button>
				<button
					onclick={() => activeSubTab = 'containers'}
					class="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all {activeSubTab === 'containers' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}"
				>
					<MapPin class="w-4.5 h-4.5" />
					Locații / Containere
				</button>
				<button
					onclick={() => activeSubTab = 'normalization'}
					class="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all {activeSubTab === 'normalization' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}"
				>
					<Database class="w-4.5 h-4.5" />
					Normalizare Date
				</button>
			{/if}
			<button
				onclick={() => activeSubTab = 'appearance'}
				class="w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all {activeSubTab === 'appearance' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}"
			>
				<Palette class="w-4.5 h-4.5 text-indigo-400" />
				Aparență &amp; Preferințe
			</button>
		</div>

		<!-- Main tab content -->
		<div class="lg:col-span-3 space-y-6">
			{#if activeSubTab === 'global'}
				<!-- Global parameters Form -->
				<form onsubmit={handleSaveConfigs} class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-6">
					<h3 class="text-sm font-bold text-slate-200 pb-3 border-b border-slate-850">Valori Impozite și Restricții DOT</h3>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div class="space-y-1">
							<label for="conf-tva" class="text-xs font-medium text-slate-400 flex items-center gap-1">
								<Percent class="w-4 h-4 text-indigo-400" />
								Cota TVA (%)
							</label>
							<input
								type="number"
								id="conf-tva"
								bind:value={tva}
								required
								class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200 font-mono"
							/>
						</div>

						<div class="space-y-1">
							<label for="conf-dot" class="text-xs font-medium text-slate-400 flex items-center gap-1">
								<ShieldAlert class="w-4 h-4 text-rose-400" />
								Limită minimă An DOT Acceptat
							</label>
							<input
								type="number"
								id="conf-dot"
								bind:value={minDotYear}
								required
								class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200 font-mono"
							/>
							<p class="text-[10px] text-slate-500">Tire DOT sub acest an (ex: 2024 în 2026) va genera avertisment de refuz.</p>
						</div>
					</div>

					<div class="space-y-3">
						<label class="text-xs font-medium text-slate-400 flex items-center gap-1">
							<DollarSign class="w-4 h-4 text-emerald-400" />
							EcoTaxă (Environmental Tax per category)
						</label>
						
						<div class="grid grid-cols-3 gap-3">
							<div class="space-y-1">
								<span class="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Auto (RON)</span>
								<input
									type="number"
									step="0.01"
									bind:value={ecoAuto}
									required
									class="w-full bg-slate-950 border border-slate-850 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200 font-mono"
								/>
							</div>
							<div class="space-y-1">
								<span class="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Moto (RON)</span>
								<input
									type="number"
									step="0.01"
									bind:value={ecoMoto}
									required
									class="w-full bg-slate-950 border border-slate-850 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200 font-mono"
								/>
							</div>
							<div class="space-y-1">
								<span class="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">TIR / Truck (RON)</span>
								<input
									type="number"
									step="0.01"
									bind:value={ecoTir}
									required
									class="w-full bg-slate-950 border border-slate-850 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200 font-mono"
								/>
							</div>
						</div>
					</div>

					<button
						type="submit"
						class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 active:scale-95"
					>
						<CheckCircle2 class="w-4 h-4" />
						Salvează Setările Globale
					</button>
				</form>
			{/if}

			{#if activeSubTab === 'users'}
				<!-- User creation form -->
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
					<!-- Create user card -->
					<div class="lg:col-span-1 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
						<h3 class="text-sm font-bold text-slate-200 pb-2 border-b border-slate-850">Creează Cont Nou</h3>
						
						<form onsubmit={handleCreateUser} class="space-y-3">
							<div class="space-y-1">
								<label for="u-role" class="text-[10px] font-medium text-slate-400">Rol Utilizator</label>
								<select
									id="u-role"
									bind:value={newRole}
									class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none text-slate-300"
								>
									<option value="EMPLOYEE">Operator Depozit (Employee)</option>
									<option value="ADMIN">Administrator (Admin)</option>
								</select>
							</div>

							<div class="space-y-1">
								<label for="u-name" class="text-[10px] font-medium text-slate-400">Nume Utilizator (Username)</label>
								<input
									type="text"
									id="u-name"
									bind:value={newUsername}
									required
									placeholder="ex: andrei.popescu"
									class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-250"
								/>
							</div>

							<div class="space-y-1">
								<label for="u-email" class="text-[10px] font-medium text-slate-400">Adresă Email</label>
								<input
									type="email"
									id="u-email"
									bind:value={newEmail}
									required
									placeholder="ex: operator@hilserv.ro"
									class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-250"
								/>
							</div>

							{#if newRole === 'ADMIN'}
								<div class="space-y-1">
									<label for="u-pass" class="text-[10px] font-medium text-slate-400">Parolă Autentificare Admin</label>
									<input
										type="password"
										id="u-pass"
										bind:value={newPassword}
										required
										placeholder="Introduceți parola..."
										class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-250"
									/>
								</div>
							{:else}
								<div class="space-y-1">
									<label for="u-pin" class="text-[10px] font-medium text-slate-400">Cod PIN Operator (6 Cifre)</label>
									<input
										type="text"
										id="u-pin"
										bind:value={newPin}
										placeholder="ex: 123456"
										maxlength="6"
										class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-250 font-mono"
									/>
								</div>

								<div class="space-y-1">
									<label for="u-barcode" class="text-[10px] font-medium text-slate-400">Cod Ecuson Operator (Cod Bare)</label>
									<input
										type="text"
										id="u-barcode"
										bind:value={newBarcode}
										placeholder="ex: OP-1004"
										class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-250 font-mono"
									/>
								</div>
							{/if}

							<button
								type="submit"
								class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1"
							>
								<Plus class="w-4.5 h-4.5" />
								Creează Cont
							</button>
						</form>
					</div>

					<!-- View users list -->
					<div class="lg:col-span-2 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
						<h3 class="text-sm font-bold text-slate-200">Listă Utilizatori Înregistrați</h3>
						
						<div class="overflow-x-auto">
							<table class="w-full text-left border-collapse">
								<thead>
									<tr class="bg-slate-950/40 border-b border-slate-850 text-slate-400 font-bold text-[10px] uppercase">
										<th class="py-2.5 px-3">Username</th>
										<th class="py-2.5 px-3">Role</th>
										<th class="py-2.5 px-3">Ecuson (Barcode)</th>
										<th class="py-2.5 px-3 text-right">Opțiuni</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-850/40 text-xs text-slate-350">
									{#each usersList as u}
										<tr>
											{#if editingUserId === u.id}
												<td class="py-2 px-3 space-y-1.5" colspan="2">
													<div class="flex gap-2">
														<input
															type="text"
															bind:value={editUserUsername}
															placeholder="Username"
															class="bg-slate-950 border border-slate-800 rounded text-xs py-1 px-2 focus:outline-none focus:border-indigo-500 font-bold text-slate-200 w-1/2"
														/>
														<input
															type="email"
															bind:value={editUserEmail}
															placeholder="Email"
															class="bg-slate-950 border border-slate-800 rounded text-xs py-1 px-2 focus:outline-none focus:border-indigo-500 text-slate-200 w-1/2"
														/>
													</div>
													<div class="flex gap-2 items-center">
														<select
															bind:value={editUserRole}
															class="bg-slate-950 border border-slate-800 rounded text-xs py-1 px-1.5 focus:outline-none focus:border-indigo-500 text-slate-300"
														>
															<option value="ADMIN">ADMIN</option>
															<option value="EMPLOYEE">EMPLOYEE</option>
														</select>
														
														<input
															type="password"
															bind:value={editUserPassword}
															placeholder="Nouă Parolă"
															class="bg-slate-950 border border-slate-800 rounded text-xs py-1 px-2 focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-slate-650 w-28"
														/>
														
														<input
															type="text"
															bind:value={editUserPin}
															maxlength="6"
															placeholder="Nou PIN (6 cifre)"
															class="bg-slate-950 border border-slate-800 rounded text-xs py-1 px-2 focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-slate-650 w-24 font-mono"
														/>
													</div>
												</td>
												<td class="py-2 px-3">
													<input
														type="text"
														bind:value={editUserBarcode}
														placeholder="Barcode"
														class="w-20 bg-slate-950 border border-slate-800 rounded text-xs py-1 px-2 focus:outline-none focus:border-indigo-500 text-slate-200 font-mono"
													/>
												</td>
												<td class="py-2 px-3 text-right space-x-1.5">
													<button
														onclick={() => handleSaveEditUser(u.id)}
														class="text-emerald-400 hover:text-emerald-350 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold cursor-pointer"
													>
														Salvează
													</button>
													<button
														onclick={() => editingUserId = ''}
														class="text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] cursor-pointer"
													>
														Anulează
													</button>
												</td>
											{:else}
												<td class="py-3 px-3">
													<span class="font-bold text-slate-200">{u.username}</span>
													<p class="text-[10px] text-slate-500">{u.email}</p>
												</td>
												<td class="py-3 px-3">
													<span class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded {u.role === 'ADMIN' ? 'bg-rose-950/20 text-rose-400' : 'bg-slate-800 text-slate-400'}">
														{u.role}
													</span>
												</td>
												<td class="py-3 px-3 font-mono text-[10px] text-slate-500">{u.barcode || '-'}</td>
												<td class="py-3 px-3 text-right space-x-1">
													<button
														onclick={() => handleStartEditUser(u)}
														class="p-1 text-indigo-400 hover:text-indigo-350 rounded cursor-pointer transition-colors"
														title="Editează"
													>
														<Edit class="w-4 h-4" />
													</button>
													<button
														onclick={() => handleDeleteUser(u.id, u.username)}
														class="p-1 text-slate-500 hover:text-rose-455 rounded cursor-pointer transition-colors"
														title="Șterge"
													>
														<Trash2 class="w-4 h-4" />
													</button>
												</td>
											{/if}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			{/if}

			{#if activeSubTab === 'suppliers'}
				<!-- Supplier profile creation -->
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
					<!-- Create/Edit supplier config -->
					<div class="lg:col-span-1 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
						<div class="flex items-center justify-between pb-2 border-b border-slate-850">
							<h3 class="text-sm font-bold text-slate-200">
								{#if editingSupplierId}
									Modificare Furnizor
								{:else}
									Adăugare Furnizor
								{/if}
							</h3>
							{#if editingSupplierId}
								<button 
									type="button" 
									onclick={resetSupplierForm} 
									class="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors font-bold"
								>
									Anulează
								</button>
							{/if}
						</div>
						
						<form onsubmit={handleSaveSupplier} class="space-y-4">
							<!-- 1. Informații Generale -->
							<div class="space-y-3">
								<h4 class="text-[10px] uppercase tracking-wider font-bold text-indigo-400">1. Informații Generale</h4>
								
								<div class="space-y-1">
									<label for="sup-name" class="text-[10px] font-medium text-slate-400">Nume Furnizor*</label>
									<input
										type="text"
										id="sup-name"
										bind:value={supName}
										required
										placeholder="ex: AdTotal, Rotis"
										class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-250"
									/>
								</div>

								<div class="space-y-1">
									<label for="sup-cost" class="text-[10px] font-medium text-slate-400">Cost Transport per Anvelopă (RON)</label>
									<input
										type="number"
										step="0.01"
										id="sup-cost"
										bind:value={supTransport}
										placeholder="ex: 15.00"
										class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-250 font-mono"
									/>
								</div>

								<div class="space-y-1">
									<label for="sup-image" class="text-[10px] font-medium text-slate-400">URL Logo/Imagine Furnizor (Opțional)</label>
									<input
										type="url"
										id="sup-image"
										bind:value={supImageUrl}
										placeholder="https://example.com/logo.png"
										class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-250 font-mono"
									/>
								</div>

								<div class="space-y-1">
									<label for="sup-ingest" class="text-[10px] font-medium text-slate-400">Cod Ingestie Python (Opțional)</label>
									<input
										type="text"
										id="sup-ingest"
										bind:value={supIngestCode}
										placeholder="ex: adtotal, rotis, internal"
										class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-250 font-mono"
									/>
								</div>
							</div>

							<!-- Metodă Sincronizare Selection -->
							<div class="space-y-1.5 pt-2 border-t border-slate-850">
								<span class="text-[10px] font-medium text-slate-400">Metodă Sincronizare Stoc</span>
								<div class="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
									<button
										type="button"
										onclick={() => syncMethod = 'url'}
										class="py-1 px-2 text-[10px] rounded font-semibold transition-all {syncMethod === 'url' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}"
									>
										URL Feed
									</button>
									<button
										type="button"
										onclick={() => syncMethod = 'email'}
										class="py-1 px-2 text-[10px] rounded font-semibold transition-all {syncMethod === 'email' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}"
									>
										Email
									</button>
									<button
										type="button"
										onclick={() => syncMethod = 'manual'}
										class="py-1 px-2 text-[10px] rounded font-semibold transition-all {syncMethod === 'manual' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}"
									>
										Manual
									</button>
								</div>
							</div>

							<!-- 2. Import Public URL (Feed) -->
							{#if syncMethod === 'url'}
								<div class="space-y-3 pt-2 border-t border-slate-850">
									<h4 class="text-[10px] uppercase tracking-wider font-bold text-emerald-400">2. Import din URL (Public)</h4>
									
									<div class="space-y-1">
										<label for="sup-url" class="text-[10px] font-medium text-slate-400">URL Feed Public Descărcare*</label>
										<textarea
											id="sup-url"
											bind:value={supFeedUrl}
											required
											rows="2"
											placeholder={'http://example.com/anvelope_{{YYYY}}_{{MM}}_{{DD}}.xlsx'}
											class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-250 font-mono resize-none"
										></textarea>
										<p class="text-[9px] text-slate-500 leading-normal">
											Taguri suportate: <code class="text-slate-400 font-mono">{'{{YYYY}}'}</code>, <code class="text-slate-400 font-mono">{'{{MM}}'}</code>, <code class="text-slate-400 font-mono">{'{{DD}}'}</code>, <code class="text-slate-400 font-mono">{'{{YYYY_MM_DD}}'}</code>, <code class="text-slate-400 font-mono">{'{{YYYY-MM-DD}}'}</code>.
										</p>
									</div>

									{#if previewUrl}
										<div class="p-2.5 rounded-lg bg-slate-950/60 border border-slate-850 text-[10px] text-slate-450 space-y-1">
											<span class="font-bold text-slate-350 block">Previzualizare URL (Azi):</span>
											<code class="block font-mono text-emerald-500/80 break-all select-all">{previewUrl}</code>
										</div>
									{/if}
								</div>
							{/if}

							<!-- 3. Import prin Email -->
							{#if syncMethod === 'email'}
								<div class="space-y-3 pt-2 border-t border-slate-850">
									<h4 class="text-[10px] uppercase tracking-wider font-bold text-amber-400">2. Import prin Email (IMAP)</h4>
									
									<div class="space-y-1">
										<label for="sup-email" class="text-[10px] font-medium text-slate-400">Adresă Email Expeditor*</label>
										<input
											type="email"
											id="sup-email"
											bind:value={supEmail}
											required
											placeholder="feeds@supplier.com"
											class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-250"
										/>
									</div>

									<div class="space-y-1">
										<label for="sup-email-subject" class="text-[10px] font-medium text-slate-400">Filtru Subiect Email (Opțional)</label>
										<input
											type="text"
											id="sup-email-subject"
											bind:value={supEmailSubjectFilter}
											placeholder="ex: Oferta stoc anvelope"
											class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-250"
										/>
										<p class="text-[9px] text-slate-500">Se prelucrează doar dacă subiectul conține acest text.</p>
									</div>

									<div class="space-y-1">
										<label for="sup-email-attach" class="text-[10px] font-medium text-slate-400">Filtru Nume Atașament (Opțional)</label>
										<input
											type="text"
											id="sup-email-attach"
											bind:value={supEmailAttachmentFilter}
											placeholder="ex: anvelope_tot.xlsx"
											class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-250 font-mono"
										/>
										<p class="text-[9px] text-slate-500">Se descarcă doar fișierele cu acest nume/extensie.</p>
									</div>
								</div>
							{/if}

							<!-- 4. Parsare Coloane Excel -->
							{#if syncMethod !== 'manual'}
								<div class="space-y-3 pt-2 border-t border-slate-850">
									<h4 class="text-[10px] uppercase tracking-wider font-bold text-sky-400">3. Antete Coloane Excel (Mapping)</h4>
									<p class="text-[9px] text-slate-500 leading-normal">Denumirile antetelor din Excel. Lăsați gol pentru căutare automată.</p>
									
									<div class="grid grid-cols-2 gap-2">
										<div class="space-y-1">
											<label for="map-ean" class="text-[10px] font-medium text-slate-400">Antet EAN</label>
											<input
												type="text"
												id="map-ean"
												bind:value={supColEan}
												placeholder="ex: COD EAN"
												class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-1.5 px-2 focus:outline-none text-slate-250"
											/>
										</div>
										<div class="space-y-1">
											<label for="map-price" class="text-[10px] font-medium text-slate-400">Antet Preț Net</label>
											<input
												type="text"
												id="map-price"
												bind:value={supColPrice}
												placeholder="ex: Pret Achizitie"
												class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-1.5 px-2 focus:outline-none text-slate-250"
											/>
										</div>
										<div class="space-y-1">
											<label for="map-qty" class="text-[10px] font-medium text-slate-400">Antet Cantitate</label>
											<input
												type="text"
												id="map-qty"
												bind:value={supColQty}
												placeholder="ex: Stoc fizic"
												class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-1.5 px-2 focus:outline-none text-slate-250"
											/>
										</div>
										<div class="space-y-1">
											<label for="map-dot" class="text-[10px] font-medium text-slate-400">Antet DOT</label>
											<input
												type="text"
												id="map-dot"
												bind:value={supColDot}
												placeholder="ex: DOT Fab"
												class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-1.5 px-2 focus:outline-none text-slate-250"
											/>
										</div>
									</div>
								</div>
							{/if}

							<button
								type="submit"
								class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10 active:scale-95 mt-4"
							>
								{#if editingSupplierId}
									<CheckCircle2 class="w-4 h-4" />
									Actualizează Furnizor
								{:else}
									<Plus class="w-4.5 h-4.5" />
									Salvează Furnizor
								{/if}
							</button>
						</form>
					</div>

					<!-- View suppliers list -->
					<div class="lg:col-span-2 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
						<h3 class="text-sm font-bold text-slate-200">Furnizori Configurați</h3>
						
						<div class="overflow-x-auto">
							<table class="w-full text-left border-collapse">
								<thead>
									<tr class="bg-slate-950/40 border-b border-slate-850 text-slate-400 font-bold text-[10px] uppercase">
										<th class="py-2.5 px-3">Furnizor</th>
										<th class="py-2.5 px-3">Cost Trans.</th>
										<th class="py-2.5 px-3">Email Feed / URL</th>
										<th class="py-2.5 px-3 text-right">Opțiuni</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-850/40 text-xs text-slate-350">
									{#each suppliersList as s}
										<tr>
											<td class="py-3 px-3 font-bold text-slate-200">
												<div class="flex items-center gap-2.5">
													{#if s.imageUrl}
														<img src={s.imageUrl} alt={s.name} class="w-7 h-7 object-contain rounded bg-slate-950 border border-slate-800 p-0.5" />
													{:else}
														{@const badge = getSupplierBadge(s.name)}
														<div class="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold border {badge.colorClass}">
															{badge.initials}
														</div>
													{/if}
													<div class="flex flex-col">
														<span class="flex items-center gap-1">
															{s.name}
															{#if s.feedUrl}
																<span title="Feed Activ"><Globe class="w-3.5 h-3.5 text-emerald-400" /></span>
															{/if}
														</span>
														{#if s.ingestCode}
															<span class="text-[9px] text-slate-500 font-mono">Python: {s.ingestCode}</span>
														{/if}
													</div>
												</div>
											</td>
											<td class="py-3 px-3 font-mono font-bold text-indigo-400">{s.transportCostPerTire} RON</td>
											<td class="py-3 px-3">
												{#if s.emailAddress}
													<span class="block text-[10px] text-slate-400">Email: {s.emailAddress}</span>
													{#if s.emailSubjectFilter || s.emailAttachmentFilter}
														<span class="block text-[9px] text-slate-500 leading-normal mt-0.5 font-medium">
															Filtre: {s.emailSubjectFilter ? `Subiect: "${s.emailSubjectFilter}"` : ''} {s.emailAttachmentFilter ? `Fișier: "${s.emailAttachmentFilter}"` : ''}
														</span>
													{/if}
												{/if}
												{#if s.feedUrl}
													<span class="block text-[10px] text-slate-500 truncate max-w-[200px]" title={s.feedUrl}>URL: {s.feedUrl}</span>
												{/if}
												{#if s.columnMapping && (s.columnMapping.ean || s.columnMapping.price || s.columnMapping.quantity || s.columnMapping.dot)}
													<span class="block text-[9px] text-indigo-400/80 mt-1 font-mono">
														Coloane: {[
															s.columnMapping.ean ? `ean("${s.columnMapping.ean}")` : null,
															s.columnMapping.price ? `preț("${s.columnMapping.price}")` : null,
															s.columnMapping.quantity ? `stoc("${s.columnMapping.quantity}")` : null,
															s.columnMapping.dot ? `dot("${s.columnMapping.dot}")` : null
														].filter(Boolean).join(', ')}
													</span>
												{/if}
												{#if !s.emailAddress && !s.feedUrl}
													<span class="text-slate-600">-</span>
												{/if}
											</td>
											<td class="py-3 px-3 text-right">
												<div class="flex items-center justify-end gap-1.5">
													<button
														onclick={() => startEditSupplier(s)}
														class="p-1.5 text-slate-400 hover:text-indigo-400 rounded transition-colors bg-slate-950/40 border border-slate-800 hover:border-slate-700"
														title="Editează"
													>
														<Edit class="w-4 h-4" />
													</button>
													<button
														onclick={() => handleDeleteSupplier(s.id, s.name)}
														class="p-1.5 text-slate-500 hover:text-rose-400 rounded transition-colors bg-slate-950/40 border border-slate-800 hover:border-slate-700"
														title="Șterge"
													>
														<Trash2 class="w-4 h-4" />
													</button>
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			{/if}

			{#if activeSubTab === 'targets'}
				<!-- Supplier target setting -->
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
					<!-- Create Target Card -->
					<div class="lg:col-span-1 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
						<h3 class="text-sm font-bold text-slate-200 pb-2 border-b border-slate-850">Creează Target Nou</h3>
						
						<form onsubmit={handleCreateTarget} class="space-y-3">
							<div class="space-y-1">
								<label for="t-sup" class="text-[10px] font-medium text-slate-400">Furnizor*</label>
								<select
									id="t-sup"
									bind:value={targetSupId}
									required
									class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none text-slate-350"
								>
									<option value="">Alegeți Furnizorul...</option>
									{#each suppliersList as sup}
										<option value={sup.id}>{sup.name}</option>
									{/each}
								</select>
							</div>

							<div class="space-y-1">
								<label for="t-qty" class="text-[10px] font-medium text-slate-400">Cantitate Target (Bucăți)*</label>
								<input
									type="number"
									id="t-qty"
									bind:value={targetQty}
									required
									placeholder="ex: 1000"
									class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-250 font-mono"
								/>
							</div>

							<div class="grid grid-cols-2 gap-2">
								<div class="space-y-1">
									<label for="t-start" class="text-[10px] font-medium text-slate-400">Dată Început*</label>
									<input
										type="date"
										id="t-start"
										bind:value={targetStart}
										required
										class="w-full bg-slate-950 border border-slate-800 rounded-lg text-[10px] py-1.5 px-2 focus:outline-none text-slate-250 font-mono"
									/>
								</div>
								<div class="space-y-1">
									<label for="t-end" class="text-[10px] font-medium text-slate-400">Dată Sfârșit*</label>
									<input
										type="date"
										id="t-end"
										bind:value={targetEnd}
										required
										class="w-full bg-slate-950 border border-slate-800 rounded-lg text-[10px] py-1.5 px-2 focus:outline-none text-slate-250 font-mono"
									/>
								</div>
							</div>

							<div class="border-t border-slate-850 pt-2 space-y-2">
								<span class="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Filtre Produs (Opțional)</span>
								
								<div class="space-y-1">
									<label for="t-brand" class="text-[10px] font-medium text-slate-450">Filtru Brand</label>
									<input
										type="text"
										id="t-brand"
										bind:value={targetBrand}
										placeholder="Continental"
										class="w-full bg-slate-950 border border-slate-850 rounded-lg text-xs py-1.5 px-2.5 focus:outline-none text-slate-250"
									/>
								</div>

								<div class="grid grid-cols-2 gap-2">
									<div class="space-y-1">
										<label for="t-cat" class="text-[10px] font-medium text-slate-450">Tip Vehicul</label>
										<select
											id="t-cat"
											bind:value={targetCat}
											class="w-full bg-slate-950 border border-slate-850 rounded-lg text-[10px] py-1.5 px-2 focus:outline-none text-slate-300"
										>
											<option value="">Oricare</option>
											<option value="AUTO">Auto</option>
											<option value="MOTO">Moto</option>
											<option value="TIR">Tir / Truck</option>
										</select>
									</div>
									<div class="space-y-1">
										<label for="t-season" class="text-[10px] font-medium text-slate-450">Sezon</label>
										<select
											id="t-season"
											bind:value={targetSeason}
											class="w-full bg-slate-950 border border-slate-850 rounded-lg text-[10px] py-1.5 px-2 focus:outline-none text-slate-300"
										>
											<option value="">Oricare</option>
											<option value="SUMMER">Vară</option>
											<option value="WINTER">Iarnă</option>
											<option value="ALLSEASON">All Season</option>
										</select>
									</div>
								</div>
							</div>

							<button
								type="submit"
								class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1 mt-2"
							>
								<Plus class="w-4.5 h-4.5" />
								Lansează Obiectiv
							</button>
						</form>
					</div>

					<!-- View Targets List -->
					<div class="lg:col-span-2 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
						<h3 class="text-sm font-bold text-slate-200">Listă Obiective Active</h3>
						
						<div class="overflow-x-auto">
							<table class="w-full text-left border-collapse">
								<thead>
									<tr class="bg-slate-950/40 border-b border-slate-850 text-slate-400 font-bold text-[10px] uppercase">
										<th class="py-2.5 px-3">Furnizor</th>
										<th class="py-2.5 px-3">Target Cant.</th>
										<th class="py-2.5 px-3">Interval Valabilitate</th>
										<th class="py-2.5 px-3 text-right">Opțiuni</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-850/40 text-xs text-slate-350">
									{#each targetsList as t}
										<tr>
											<td class="py-3 px-3 font-bold text-slate-200">
												{t.supplierName}
												{#if t.filters.brand || t.filters.category || t.filters.season}
													<span class="block text-[9px] text-slate-550 font-normal mt-0.5">
														Filtre: {t.filters.brand || ''} {t.filters.category || ''} {t.filters.season || ''}
													</span>
												{/if}
											</td>
											<td class="py-3 px-3 font-mono font-bold text-indigo-400">{t.targetQuantity} buc</td>
											<td class="py-3 px-3 text-[10px] text-slate-450">
												{new Date(t.startDate).toLocaleDateString('ro-RO')} - {new Date(t.endDate).toLocaleDateString('ro-RO')}
											</td>
											<td class="py-3 px-3 text-right">
												<button
													onclick={() => handleDeleteTarget(t.id)}
													class="p-1.5 text-slate-500 hover:text-rose-400 rounded transition-colors"
													title="Șterge"
												>
													<Trash2 class="w-4 h-4" />
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			{/if}

			{#if activeSubTab === 'appearance'}
				<!-- Preferences & Theme Settings -->
				<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-6">
					<h3 class="text-sm font-bold text-slate-200 pb-3 border-b border-slate-850 flex items-center gap-1.5">
						<Palette class="w-4.5 h-4.5 text-indigo-400" />
						Aparență Vizuală Interfață
					</h3>

					<div class="space-y-4">
						<p class="text-xs text-slate-400">Selectați modul preferat de vizualizare a temei din aplicație. Setarea se aplică instantaneu pe acest ecran.</p>

						<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<button
								type="button"
								onclick={() => handleSaveTheme('light')}
								class="p-4 rounded-xl border flex flex-col items-center gap-2 transition-all text-center {currentTheme === 'light' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 font-bold shadow-md shadow-indigo-500/5' : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-900'}"
							>
								<div class="w-8 h-8 rounded-full bg-white border border-slate-300 shadow-sm flex items-center justify-center text-slate-850">
									☀
								</div>
								<span class="text-xs">Temă Deschisă (Light)</span>
							</button>

							<button
								type="button"
								onclick={() => handleSaveTheme('dark')}
								class="p-4 rounded-xl border flex flex-col items-center gap-2 transition-all text-center {currentTheme === 'dark' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 font-bold shadow-md shadow-indigo-500/5' : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-900'}"
							>
								<div class="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center text-white">
									🌙
								</div>
								<span class="text-xs">Temă Închisă (Dark)</span>
							</button>

							<button
								type="button"
								onclick={() => handleSaveTheme('system')}
								class="p-4 rounded-xl border flex flex-col items-center gap-2 transition-all text-center {currentTheme === 'system' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 font-bold shadow-md shadow-indigo-500/5' : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-900'}"
							>
								<div class="w-8 h-8 rounded-full bg-slate-800/40 border border-slate-700 flex items-center justify-center text-slate-350">
									⚙
								</div>
								<span class="text-xs">Implicită Sistem (Auto)</span>
							</button>
						</div>
					</div>
				</div>
			{/if}

			{#if activeSubTab === 'logs'}
				<!-- Activity Log / Audit Log Tab -->
				<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-6">
					<div class="flex items-center justify-between pb-3 border-b border-slate-850">
						<h3 class="text-sm font-bold text-slate-200">Istoric Activități Admin &amp; Operatori</h3>
						<span class="text-xs text-slate-450">{logsTotal} acțiuni înregistrate</span>
					</div>

					<!-- Filters -->
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
						<div class="space-y-1">
							<label for="filter-user" class="text-[10px] font-semibold text-slate-400">Filtrare Operator (Username)</label>
							<input
								type="text"
								id="filter-user"
								bind:value={logsFilterUser}
								oninput={loadActivityLogs}
								placeholder="ex: admin"
								class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-250 font-mono"
							/>
						</div>

						<div class="space-y-1">
							<label for="filter-action" class="text-[10px] font-semibold text-slate-400">Filtrare Acțiune</label>
							<select
								id="filter-action"
								bind:value={logsFilterAction}
								onchange={loadActivityLogs}
								class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none text-slate-300"
							>
								<option value="">Toate acțiunile</option>
								<option value="scan_in">Scan In (Recepție Stoc)</option>
								<option value="scan_out">Scan Out (Vânzare/Retur)</option>
								<option value="assign_location">Alocare Raft</option>
								<option value="hotel_check_in">Cazare Roți (Hotel)</option>
								<option value="hotel_check_out">Eliberare Roți (Hotel)</option>
								<option value="reception_create">Inițiere recepție (Doc)</option>
								<option value="reception_create_manual">Inițiere recepție (Manual)</option>
								<option value="reception_complete">Finalizare recepție</option>
								<option value="config_update">Actualizare setări globale</option>
								<option value="supplier_create">Creare furnizor</option>
								<option value="supplier_update">Actualizare furnizor</option>
								<option value="supplier_delete">Ștergere furnizor</option>
								<option value="user_create">Creare utilizator</option>
								<option value="user_delete">Ștergere utilizator</option>
							</select>
						</div>

						<div class="space-y-1">
							<label for="filter-start-date" class="text-[10px] font-semibold text-slate-400">Dată Început</label>
							<input
								type="date"
								id="filter-start-date"
								bind:value={logsFilterStartDate}
								onchange={loadActivityLogs}
								class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200"
							/>
						</div>

						<div class="space-y-1">
							<label for="filter-end-date" class="text-[10px] font-semibold text-slate-400">Dată Sfârșit</label>
							<input
								type="date"
								id="filter-end-date"
								bind:value={logsFilterEndDate}
								onchange={loadActivityLogs}
								class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200"
							/>
						</div>

						<div class="flex items-end">
							<button
								type="button"
								onclick={() => {
									logsFilterUser = '';
									logsFilterAction = '';
									logsFilterStartDate = '';
									logsFilterEndDate = '';
									logsOffset = 0;
									loadActivityLogs();
								}}
								class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-350 border border-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1.5"
							>
								Resetează Filtrele
							</button>
						</div>
					</div>

					<!-- Table -->
					<div class="overflow-x-auto border border-slate-850 rounded-xl bg-slate-950/20">
						<table class="w-full text-left border-collapse text-xs">
							<thead>
								<tr class="bg-slate-950/40 border-b border-slate-850 text-slate-400 font-semibold text-[10px] uppercase">
									<th class="py-3 px-4 w-44">Data &amp; Ora</th>
									<th class="py-3 px-4 w-36">Operator</th>
									<th class="py-3 px-4 w-44">Acțiune</th>
									<th class="py-3 px-4">Detalii</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-850/40 text-xs text-slate-300">
								{#if logsList.length === 0}
									<tr>
										<td colspan="4" class="text-center py-10 text-xs text-slate-550">Nicio acțiune înregistrată care să corespundă criteriilor.</td>
									</tr>
								{:else}
									{#each logsList as log}
										<tr class="hover:bg-slate-900/20 transition-colors">
											<td class="py-3.5 px-4 font-mono text-[11px] text-slate-450">
												{new Date(log.created_at).toLocaleString('ro-RO')}
											</td>
											<td class="py-3.5 px-4">
												<span class="font-bold text-slate-205">{log.username}</span>
											</td>
											<td class="py-3.5 px-4">
												<span class="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono 
													{log.action.includes('reception') ? 'bg-indigo-950/30 text-indigo-400 border border-indigo-900/25' : 
													 log.action.includes('supplier') ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/25' :
													 log.action.includes('user') ? 'bg-purple-950/30 text-purple-400 border border-purple-900/25' :
													 'bg-slate-800 text-slate-450 border border-slate-700/50'}"
												>
													{log.action}
												</span>
											</td>
											<td class="py-3.5 px-4 text-slate-350 leading-relaxed max-w-xs md:max-w-md break-words font-medium">
												{log.details}
											</td>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>

					<!-- Pagination -->
					{#if logsTotal > logsLimit}
						<div class="flex items-center justify-between pt-4 border-t border-slate-850">
							<span class="text-xs text-slate-500">
								Afișat {logsOffset + 1} - {Math.min(logsOffset + logsLimit, logsTotal)} din {logsTotal} jurnale
							</span>
							<div class="flex gap-2">
								<button
									disabled={logsOffset === 0}
									onclick={() => {
										logsOffset = Math.max(0, logsOffset - logsLimit);
										loadActivityLogs();
									}}
									class="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-xs font-semibold text-slate-250 border border-slate-700 rounded-lg transition-all"
								>
									Precedent
								</button>
								<button
									disabled={logsOffset + logsLimit >= logsTotal}
									onclick={() => {
										logsOffset += logsLimit;
										loadActivityLogs();
									}}
									class="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-xs font-semibold text-slate-250 border border-slate-700 rounded-lg transition-all"
								>
									Următor
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			{#if activeSubTab === 'containers'}
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
					<!-- Create container card -->
					<div class="lg:col-span-1 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
						<h3 class="text-sm font-bold text-slate-200 pb-2 border-b border-slate-850 flex items-center gap-1.5">
							<MapPin class="w-4.5 h-4.5 text-indigo-400" />
							Adaugă Locație / Container
						</h3>
						
						<form onsubmit={handleCreateContainer} class="space-y-3">
							<div class="space-y-1">
								<label for="c-name" class="text-[10px] font-medium text-slate-400 font-semibold">Nume Locație (ex: Raft A-1, C9)</label>
								<input
									type="text"
									id="c-name"
									bind:value={newContainerName}
									required
									placeholder="ex: Raft C9"
									class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-250 font-semibold"
								/>
							</div>

							<div class="space-y-1">
								<label for="c-desc" class="text-[10px] font-medium text-slate-400">Descriere opțională</label>
								<input
									type="text"
									id="c-desc"
									bind:value={newContainerDesc}
									placeholder="ex: Zona spate, anvelope mari"
									class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-250"
								/>
							</div>

							<button
								type="submit"
								class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-lg shadow-indigo-500/10"
							>
								<Plus class="w-4.5 h-4.5" />
								Adaugă Locație
							</button>
						</form>
					</div>

					<!-- View containers list -->
					<div class="lg:col-span-2 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
						<h3 class="text-sm font-bold text-slate-200">Listă Locații Depozit (Containere)</h3>
						
						<div class="overflow-x-auto">
							<table class="w-full text-left border-collapse">
								<thead>
									<tr class="bg-slate-950/40 border-b border-slate-850 text-slate-400 font-bold text-[10px] uppercase">
										<th class="py-2.5 px-3">Locație (Nume)</th>
										<th class="py-2.5 px-3">Descriere</th>
										<th class="py-2.5 px-3 text-right">Opțiuni</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-850/40 text-xs text-slate-350">
									{#each containersList as c}
										<tr>
											{#if editingContainerId === c.id}
												<td class="py-2 px-2.5">
													<input
														type="text"
														bind:value={editContainerName}
														class="w-full bg-slate-950 border border-slate-800 rounded text-xs py-1 px-2 focus:outline-none focus:border-indigo-500 font-bold text-slate-200"
													/>
												</td>
												<td class="py-2 px-2.5">
													<input
														type="text"
														bind:value={editContainerDesc}
														class="w-full bg-slate-950 border border-slate-800 rounded text-xs py-1 px-2 focus:outline-none focus:border-indigo-500 text-slate-200"
													/>
												</td>
												<td class="py-2 px-2.5 text-right space-x-1.5">
													<button
														onclick={() => handleSaveEditContainer(c.id)}
														class="text-emerald-400 hover:text-emerald-350 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold cursor-pointer"
													>
														Salvează
													</button>
													<button
														onclick={() => editingContainerId = ''}
														class="text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] cursor-pointer"
													>
														Anulează
													</button>
												</td>
											{:else}
												<td class="py-3 px-3">
													<span class="font-bold text-slate-200 flex items-center gap-1.5">
														<MapPin class="w-3.5 h-3.5 text-indigo-400" />
														{c.name}
													</span>
												</td>
												<td class="py-3 px-3 text-slate-400">
													{c.description || '-'}
												</td>
												<td class="py-3 px-3 text-right space-x-1">
													<button
														onclick={() => handleStartEditContainer(c)}
														class="text-indigo-400 hover:text-indigo-350 p-1 cursor-pointer transition-colors"
														title="Editează"
													>
														<Edit class="w-4 h-4" />
													</button>
													<button
														onclick={() => handleDeleteContainer(c.id)}
														class="text-rose-400 hover:text-rose-350 p-1 cursor-pointer transition-colors"
														title="Șterge Locație"
													>
														<Trash2 class="w-4 h-4" />
													</button>
												</td>
											{/if}
										</tr>
									{/each}
									{#if containersList.length === 0}
										<tr>
											<td colspan="3" class="py-6 text-center text-slate-500 italic">
												Nicio locație configurată. Adăugați una din stânga.
											</td>
										</tr>
									{/if}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			{/if}

			{#if activeSubTab === 'normalization'}
				<!-- Normalization Dashboard -->
				<div class="space-y-6">
					<!-- Quick Diagnostics Card -->
					<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div class="space-y-1">
							<h3 class="text-sm font-bold text-slate-200 flex items-center gap-1.5">
								🛠️ Corecții și Aliniere Catalog
							</h3>
							<p class="text-xs text-slate-400">
								Detectează anvelopele cu dimensiuni incomplete (lățime, înălțime, rază, indici) și le extrage automat din textul de dimensiune brută.
							</p>
						</div>
						<button
							type="button"
							onclick={handleNormalizeDimensions}
							class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-500/10 cursor-pointer active:scale-95 flex-shrink-0"
						>
							<RefreshCw class="w-4 h-4" />
							Autocorecție Dimensiuni
						</button>
					</div>

					<!-- Two Column Layout: Brand mappings & Model mappings -->
					<div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
						
						<!-- LEFT: Brands Mappings -->
						<div class="space-y-6">
							<!-- Brand mapping creator -->
							<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
								<h3 class="text-sm font-bold text-slate-250 border-b border-slate-850 pb-2">
									Mapează / Corectează Brand
								</h3>
								<form onsubmit={handleAddBrandMapping} class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
									<div class="space-y-1">
										<label class="text-[10px] font-semibold text-slate-450 uppercase block">Brand Brut (Găsit în DB)</label>
										<input
											type="text"
											bind:value={rawBrandInput}
											required
											placeholder="ex: BF, BFG"
											class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200"
										/>
									</div>
									<div class="space-y-1">
										<label class="text-[10px] font-semibold text-slate-450 uppercase block">Brand Normalizat (Corect)</label>
										<input
											type="text"
											bind:value={normBrandInput}
											required
											placeholder="ex: BFGOODRICH"
											class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200"
										/>
									</div>
									<div class="sm:col-span-2">
										<button
											type="submit"
											class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-lg shadow-indigo-500/10"
										>
											<Plus class="w-4 h-4" />
											Salvează Regulă Brand
										</button>
									</div>
								</form>
							</div>

							<!-- Unique Brands List -->
							<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
								<h3 class="text-sm font-bold text-slate-200">Branduri în Catalog</h3>
								<div class="overflow-x-auto max-h-[300px] border border-slate-850 rounded-lg">
									<table class="w-full text-left border-collapse text-xs">
										<thead>
											<tr class="bg-slate-950/40 border-b border-slate-850 text-slate-400 font-bold text-[10px] uppercase">
												<th class="py-2.5 px-3">Brand</th>
												<th class="py-2.5 px-3 text-center">Produse</th>
												<th class="py-2.5 px-3">Status / Mapare</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-slate-850/40 text-slate-350 bg-slate-950/10">
											{#each normBrands as b}
												<tr 
													class="hover:bg-slate-900/20 transition-colors cursor-pointer {activeNormBrand === b.brand ? 'bg-indigo-950/20' : ''}"
													onclick={() => selectNormBrand(b.brand)}
												>
													<td class="py-2.5 px-3 font-semibold text-slate-200">{b.brand}</td>
													<td class="py-2.5 px-3 text-center font-mono font-medium">{b.count}</td>
													<td class="py-2.5 px-3">
														{#if b.mappedTo}
															<span class="text-[10px] text-emerald-400 font-bold">➜ {b.mappedTo}</span>
														{:else if b.isNormalized}
															<span class="text-[10px] text-indigo-400 font-medium">Corect</span>
														{:else}
															<span class="text-[10px] text-slate-500">Nemapat</span>
														{/if}
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>

							<!-- Brand mapping rules table -->
							<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
								<h3 class="text-sm font-bold text-slate-200">Reguli de Normalizare Active</h3>
								<div class="overflow-x-auto max-h-[250px] border border-slate-850 rounded-lg">
									<table class="w-full text-left border-collapse text-xs">
										<thead>
											<tr class="bg-slate-950/40 border-b border-slate-850 text-slate-400 font-bold text-[10px] uppercase">
												<th class="py-2 px-3">Brut</th>
												<th class="py-2 px-3">Corect</th>
												<th class="py-2 px-3 text-right">Acțiuni</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-slate-850/40 text-slate-350">
											{#each brandMappings as bm}
												<tr>
													<td class="py-2 px-3 font-mono">{bm.rawBrand}</td>
													<td class="py-2 px-3 font-bold text-slate-200">{bm.normalizedBrand}</td>
													<td class="py-2 px-3 text-right">
														<button
															onclick={() => handleDeleteBrandMapping(bm.id)}
															class="p-1 text-slate-500 hover:text-rose-455 rounded transition-colors cursor-pointer"
															title="Șterge regulă"
														>
															<Trash2 class="w-4 h-4" />
														</button>
													</td>
												</tr>
											{/each}
											{#if brandMappings.length === 0}
												<tr>
													<td colspan="3" class="py-4 text-center text-slate-500 italic">Nicio regulă de brand configurată.</td>
												</tr>
											{/if}
										</tbody>
									</table>
								</div>
							</div>
						</div>

						<!-- RIGHT: Profile Mappings -->
						<div class="space-y-6">
							<!-- Profile mapping creator -->
							<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
								<h3 class="text-sm font-bold text-slate-255 border-b border-slate-850 pb-2">
									Mapează / Corectează Model (Profil)
								</h3>
								<form onsubmit={handleAddProfileMapping} class="space-y-4">
									<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div class="space-y-1">
											<label class="text-[10px] font-semibold text-slate-450 uppercase block">Brand selectat</label>
											<input
												type="text"
												bind:value={brandForProfileInput}
												required
												placeholder="Selectați un brand din stânga"
												class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200"
											/>
										</div>
										<div class="space-y-1">
											<label class="text-[10px] font-semibold text-slate-450 uppercase block">Profil Brut (Găsit în DB)</label>
											<input
												type="text"
												bind:value={rawProfileInput}
												required
												placeholder="ex: eficient g"
												class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200"
											/>
										</div>
									</div>
									<div class="space-y-1">
										<label class="text-[10px] font-semibold text-slate-450 uppercase block">Profil Normalizat (Numele Corect Complet)</label>
										<input
											type="text"
											bind:value={normProfileInput}
											required
											placeholder="ex: EfficientGrip Performance"
											class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200"
										/>
									</div>
									<button
										type="submit"
										class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-lg shadow-indigo-500/10"
									>
										<Plus class="w-4 h-4" />
										Salvează Regulă Profil
									</button>
								</form>
							</div>

							<!-- Unique Profiles List -->
							<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
								<h3 class="text-sm font-bold text-slate-200">
									Profile pentru brandul: <span class="text-indigo-400 font-mono">{activeNormBrand || '(Selectați brand)'}</span>
								</h3>
								<div class="overflow-x-auto max-h-[300px] border border-slate-850 rounded-lg">
									<table class="w-full text-left border-collapse text-xs">
										<thead>
											<tr class="bg-slate-950/40 border-b border-slate-850 text-slate-400 font-bold text-[10px] uppercase">
												<th class="py-2.5 px-3">Nume Model / Profil</th>
												<th class="py-2.5 px-3 text-center">Produse</th>
												<th class="py-2.5 px-3">Status / Mapare</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-slate-850/40 text-slate-350 bg-slate-950/10">
											{#each normProfiles as p}
												<tr class="hover:bg-slate-900/20 transition-colors">
													<td class="py-2.5 px-3 font-semibold text-slate-200">{p.profile}</td>
													<td class="py-2.5 px-3 text-center font-mono font-medium">{p.count}</td>
													<td class="py-2.5 px-3">
														{#if p.mappedTo}
															<span class="text-[10px] text-emerald-400 font-bold">➜ {p.mappedTo}</span>
														{:else if p.isNormalized}
															<span class="text-[10px] text-indigo-400 font-medium">Corect</span>
														{:else}
															<button
																onclick={() => {
																	rawProfileInput = p.profile;
																	normProfileInput = '';
																}}
																class="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[9px] hover:text-white rounded cursor-pointer transition-colors"
															>
																Mapează
															</button>
														{/if}
													</td>
												</tr>
											{/each}
											{#if normProfiles.length === 0}
												<tr>
													<td colspan="3" class="py-6 text-center text-slate-500 italic">Selectați un brand din stânga pentru a vedea profilele sale.</td>
												</tr>
											{/if}
										</tbody>
									</table>
								</div>
							</div>

							<!-- Profile mapping rules table -->
							<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-4">
								<h3 class="text-sm font-bold text-slate-200">Reguli Profile Active</h3>
								<div class="overflow-x-auto max-h-[250px] border border-slate-850 rounded-lg">
									<table class="w-full text-left border-collapse text-xs">
										<thead>
											<tr class="bg-slate-950/40 border-b border-slate-850 text-slate-400 font-bold text-[10px] uppercase">
												<th class="py-2 px-3">Brand</th>
												<th class="py-2 px-3">Brut</th>
												<th class="py-2 px-3">Corect</th>
												<th class="py-2 px-3 text-right">Acțiuni</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-slate-850/40 text-slate-350">
											{#each profileMappings as pm}
												<tr>
													<td class="py-2 px-3 text-indigo-400 font-bold">{pm.brand}</td>
													<td class="py-2 px-3 font-mono">{pm.rawProfile}</td>
													<td class="py-2 px-3 font-bold text-slate-200">{pm.normalizedProfile}</td>
													<td class="py-2 px-3 text-right">
														<button
															onclick={() => handleDeleteProfileMapping(pm.id)}
															class="p-1 text-slate-500 hover:text-rose-455 rounded transition-colors cursor-pointer"
															title="Șterge regulă"
														>
															<Trash2 class="w-4 h-4" />
														</button>
													</td>
												</tr>
											{/each}
											{#if profileMappings.length === 0}
												<tr>
													<td colspan="4" class="py-4 text-center text-slate-500 italic">Nicio regulă de profil configurată.</td>
												</tr>
											{/if}
										</tbody>
									</table>
								</div>
							</div>
						</div>

						</div>

					<!-- Keyword Training Section -->
					<div class="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl space-y-5">
						<div class="space-y-1 border-b border-slate-850 pb-3">
							<h3 class="text-sm font-bold text-slate-200 flex items-center gap-1.5">
								🧠 Antrenare Cuvinte Cheie (Prefix Matching)
							</h3>
							<p class="text-xs text-slate-400">
								Adăugați reguli de prefix: dacă un text începe cu aceste litere, se rezolvă automat la brandul sau profilul corect. De ex: <span class="font-mono text-indigo-400">"eff"</span> → <span class="font-mono text-emerald-400">"EfficientGrip"</span>.
							</p>
						</div>

						<div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
							<!-- Left: Add Rule Form -->
							<form onsubmit={handleAddKeywordRule} class="space-y-4">
								<div class="grid grid-cols-2 gap-3">
									<div class="space-y-1">
										<label class="text-[10px] font-semibold text-slate-450 uppercase block">Cuvânt Cheie / Prefix</label>
										<input
											type="text"
											bind:value={kwKeyword}
											required
											placeholder="ex: eff, cope, cont"
											class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200 font-mono"
										/>
									</div>
									<div class="space-y-1">
										<label class="text-[10px] font-semibold text-slate-450 uppercase block">Se Rezolvă În</label>
										<input
											type="text"
											bind:value={kwResolvedValue}
											required
											placeholder="ex: EfficientGrip"
											class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200"
										/>
									</div>
								</div>
								<div class="grid grid-cols-3 gap-3">
									<div class="space-y-1">
										<label class="text-[10px] font-semibold text-slate-450 uppercase block">Tip Câmp</label>
										<select bind:value={kwTargetField} class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200">
											<option value="brand">Brand</option>
											<option value="profile">Profil / Model</option>
										</select>
									</div>
									<div class="space-y-1">
										<label class="text-[10px] font-semibold text-slate-450 uppercase block">Mod Potrivire</label>
										<select bind:value={kwMatchMode} class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200">
											<option value="prefix">Prefix (Începe cu)</option>
											<option value="contains">Conține</option>
											<option value="exact">Exact</option>
										</select>
									</div>
									<div class="space-y-1">
										<label class="text-[10px] font-semibold text-slate-450 uppercase block">Prioritate</label>
										<input
											type="number"
											bind:value={kwPriority}
											class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200 font-mono"
										/>
									</div>
								</div>
								{#if kwTargetField === 'profile'}
									<div class="space-y-1">
										<label class="text-[10px] font-semibold text-slate-450 uppercase block">Context Brand (opțional — pentru care brand e regula)</label>
										<input
											type="text"
											bind:value={kwBrandContext}
											placeholder="ex: GOODYEAR (gol = universal)"
											class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200"
										/>
									</div>
								{/if}
								<button
									type="submit"
									class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-lg transition-colors flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/10"
								>
									<Plus class="w-4 h-4" />
									Salvează Regulă Keyword
								</button>
							</form>

							<!-- Right: Test Sandbox -->
							<div class="space-y-4">
								<div class="p-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-700 space-y-3">
									<h4 class="text-xs font-bold text-slate-300 flex items-center gap-1">
										🧪 Testare Live
									</h4>
									<p class="text-[10px] text-slate-500">Introduceți un text brut ca să vedeți dacă se potrivește cu o regulă.</p>
									<div class="grid grid-cols-3 gap-2">
										<input
											type="text"
											bind:value={kwTestInput}
											placeholder="Text de testat..."
											class="col-span-2 bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200 font-mono"
										/>
										<select bind:value={kwTestField} class="bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 text-slate-200">
											<option value="brand">Brand</option>
											<option value="profile">Profil</option>
										</select>
									</div>
									{#if kwTestField === 'profile'}
										<input
											type="text"
											bind:value={kwTestBrand}
											placeholder="Brand context (opțional)"
											class="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-indigo-500 text-slate-200"
										/>
									{/if}
									<button
										type="button"
										onclick={handleTestKeyword}
										class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg cursor-pointer active:scale-95 transition-colors"
									>
										Testează
									</button>
									{#if kwTestResult}
										<div class="p-3 rounded-lg border {kwTestResult.matched ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500/30'}">
											{#if kwTestResult.matched}
												<p class="text-xs font-bold text-emerald-400">
													✅ Potrivire! <span class="font-mono">"{kwTestInput}"</span> → <span class="text-white">{kwTestResult.resolvedValue}</span>
												</p>
												<p class="text-[10px] text-slate-400 mt-1">
													Regulă: <span class="font-mono">{kwTestResult.rule.keyword}</span> ({kwTestResult.rule.matchMode})
												</p>
											{:else}
												<p class="text-xs font-bold text-rose-400">
													❌ Nicio potrivire pentru <span class="font-mono">"{kwTestInput}"</span>
												</p>
											{/if}
										</div>
									{/if}
								</div>
							</div>
						</div>

						<!-- Active Rules Table -->
						<div class="overflow-x-auto max-h-[350px] border border-slate-850 rounded-lg">
							<table class="w-full text-left border-collapse text-xs">
								<thead>
									<tr class="bg-slate-950/40 border-b border-slate-850 text-slate-400 font-bold text-[10px] uppercase sticky top-0">
										<th class="py-2.5 px-3">Keyword</th>
										<th class="py-2.5 px-3">Tip</th>
										<th class="py-2.5 px-3">Mod</th>
										<th class="py-2.5 px-3">Se Rezolvă În</th>
										<th class="py-2.5 px-3">Brand Context</th>
										<th class="py-2.5 px-3 text-center">Prio</th>
										<th class="py-2.5 px-3 text-right">Acțiuni</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-850/40 text-slate-350">
									{#each keywordRules as kr}
										<tr class="hover:bg-slate-900/20 transition-colors">
											<td class="py-2.5 px-3 font-mono font-bold text-indigo-400">{kr.keyword}</td>
											<td class="py-2.5 px-3">
												<span class="px-1.5 py-0.5 rounded text-[9px] font-bold {kr.targetField === 'brand' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}">
													{kr.targetField === 'brand' ? 'Brand' : 'Profil'}
												</span>
											</td>
											<td class="py-2.5 px-3">
												<span class="text-[10px] font-mono text-slate-400">
													{kr.matchMode === 'prefix' ? '→ Prefix' : kr.matchMode === 'contains' ? '⊂ Conține' : '= Exact'}
												</span>
											</td>
											<td class="py-2.5 px-3 font-bold text-emerald-400">{kr.resolvedValue}</td>
											<td class="py-2.5 px-3 text-slate-500 font-mono">{kr.brandContext || '-'}</td>
											<td class="py-2.5 px-3 text-center font-mono">{kr.priority}</td>
											<td class="py-2.5 px-3 text-right">
												<button
													onclick={() => handleDeleteKeywordRule(kr.id)}
													class="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
													title="Șterge regulă"
												>
													<Trash2 class="w-4 h-4" />
												</button>
											</td>
										</tr>
									{/each}
									{#if keywordRules.length === 0}
										<tr>
											<td colspan="7" class="py-6 text-center text-slate-500 italic">
												Nicio regulă keyword configurată. Adăugați una din formularul de mai sus.
											</td>
										</tr>
									{/if}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
