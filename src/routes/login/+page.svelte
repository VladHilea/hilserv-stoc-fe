<script lang="ts">
	import { goto } from '$app/navigation';
	import { apiRequest } from '$lib/api';
	import { auth } from '$lib/auth.svelte';
	import { toast } from 'svelte-sonner';
	import { Lock, Mail, Scan, ShieldAlert, Key } from 'lucide-svelte';

	// Toggle login method: 'employee' or 'admin'
	let activeTab = $state<'employee' | 'admin'>('employee');
	
	// Admin form fields
	let email = $state('');
	let password = $state('');
	let loading = $state(false);

	// Employee PIN code (input by button clicks)
	let pin = $state('');
	
	// Employee Barcode scanner field
	let barcode = $state('');
	let barcodeInputEl = $state<HTMLInputElement | null>(null);

	// PIN pad button click handler
	const appendPin = (digit: string) => {
		if (pin.length < 6) {
			pin += digit;
		}
	};

	const clearPin = () => {
		pin = '';
	};

	const deleteLastPin = () => {
		pin = pin.slice(0, -1);
	};

	// Form submissions
	const handleAdminSubmit = async (e: Event) => {
		e.preventDefault();
		if (!email || !password) {
			toast.error('Vă rugăm să introduceți email-ul și parola');
			return;
		}

		loading = true;
		try {
			const res = await apiRequest('/auth/admin/login', {
				method: 'POST',
				body: { email, pass: password },
			});
			auth.login(res.access_token, res.user);
			toast.success('Autentificare ca Administrator reușită');
			goto('/');
		} catch (err: any) {
			toast.error(err.message || 'Date de autentificare incorecte');
		} finally {
			loading = false;
		}
	};

	// Automatically submit PIN when it reaches exactly 6 digits
	$effect(() => {
		if (pin.length === 6 && activeTab === 'employee') {
			const submitPin = async () => {
				try {
					const res = await apiRequest('/auth/employee/login-pin', {
						method: 'POST',
						body: { pin },
					});
					auth.login(res.access_token, res.user);
					toast.success(`Bine ai venit, ${res.user.username}`);
					goto('/');
				} catch (err: any) {
					toast.error('PIN incorect');
					pin = ''; // Reset PIN
				}
			};
			submitPin();
		}
	});

	const handleBarcodeSubmit = async (e: Event) => {
		e.preventDefault();
		if (!barcode) return;

		try {
			const res = await apiRequest('/auth/employee/login-barcode', {
				method: 'POST',
				body: { barcode },
			});
			auth.login(res.access_token, res.user);
			toast.success(`Bine ai venit, ${res.user.username}`);
			goto('/');
		} catch (err: any) {
			toast.error('Cod de bare invalid');
			barcode = '';
			barcodeInputEl?.focus();
		}
	};
</script>

<svelte:head>
	<title>Autentificare - Hilserv WMS</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
	<!-- Glassmorphism login card -->
	<div class="w-full max-w-md bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-8 shadow-2xl relative overflow-hidden">
		<!-- Glow effect in corner -->
		<div class="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl"></div>

		<!-- Title -->
		<div class="flex flex-col items-center mb-8 text-center">
			<img src="/logo-hilserv.png" alt="Hilserv WMS Logo" class="w-28 h-28 object-contain mb-4" />
			<h2 class="text-xl font-bold tracking-tight">HILSERV WMS</h2>
			<p class="text-xs text-slate-400">Sistem de Gestiune Depozit Anvelope</p>
		</div>

		<!-- Tab Toggles -->
		<div class="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-850 mb-6">
			<button
				onclick={() => activeTab = 'employee'}
				class="py-2.5 rounded-lg text-sm font-medium transition-all duration-200 {activeTab === 'employee' ? 'bg-slate-800 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'}"
			>
				Operator Depozit
			</button>
			<button
				onclick={() => activeTab = 'admin'}
				class="py-2.5 rounded-lg text-sm font-medium transition-all duration-200 {activeTab === 'admin' ? 'bg-slate-800 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'}"
			>
				Administrator
			</button>
		</div>

		<!-- Tab 1: Employee/Operator Login -->
		{#if activeTab === 'employee'}
			<div class="space-y-6">
				<!-- PIN Indicators -->
				<div class="flex flex-col items-center gap-3">
					<span class="text-xs text-slate-400 font-medium">Introduceți codul PIN</span>
					<div class="flex justify-center gap-3">
						{#each Array(6) as _, i}
							<div class="w-4.5 h-4.5 rounded-full border border-slate-700 flex items-center justify-center transition-all duration-200 {pin.length > i ? 'bg-indigo-500 border-indigo-400 shadow-lg shadow-indigo-500/30' : 'bg-slate-950'}"></div>
						{/each}
					</div>
				</div>

				<!-- PIN Pad -->
				<div class="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
					{#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as digit}
						<button
							onclick={() => appendPin(digit)}
							class="w-16 h-16 rounded-full border border-slate-800/80 bg-slate-900/60 hover:bg-slate-800 text-xl font-bold flex items-center justify-center active:scale-95 transition-all duration-150"
						>
							{digit}
						</button>
					{/each}
					<button
						onclick={clearPin}
						class="w-16 h-16 rounded-full text-xs font-semibold text-rose-400 flex items-center justify-center hover:bg-rose-950/20 active:scale-95 transition-all duration-150"
					>
						Șterge
					</button>
					<button
						onclick={() => appendPin('0')}
						class="w-16 h-16 rounded-full border border-slate-800/80 bg-slate-900/60 hover:bg-slate-800 text-xl font-bold flex items-center justify-center active:scale-95 transition-all duration-150"
					>
						0
					</button>
					<button
						onclick={deleteLastPin}
						class="w-16 h-16 rounded-full text-xs font-semibold text-slate-400 flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-all duration-150"
					>
						Anulează
					</button>
				</div>

				<!-- Barcode Login option -->
				<div class="border-t border-slate-850 pt-4 flex flex-col items-center">
					<form onsubmit={handleBarcodeSubmit} class="w-full flex gap-2">
						<div class="relative flex-1">
							<Scan class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
							<input
								bind:this={barcodeInputEl}
								type="text"
								bind:value={barcode}
								placeholder="Scanați ecusonul operator..."
								class="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
							/>
						</div>
						<button
							type="submit"
							class="px-4 py-2 bg-slate-800 text-xs font-semibold rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
						>
							Intră
						</button>
					</form>
				</div>
			</div>
		{/if}

		<!-- Tab 2: Admin Login -->
		{#if activeTab === 'admin'}
			<form onsubmit={handleAdminSubmit} class="space-y-4">
				<div class="space-y-1">
					<label for="email" class="text-xs font-medium text-slate-400">Email Administrator</label>
					<div class="relative">
						<Mail class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
						<input
							type="email"
							id="email"
							bind:value={email}
							placeholder="admin@hilserv.ro"
							required
							class="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
						/>
					</div>
				</div>

				<div class="space-y-1">
					<label for="password" class="text-xs font-medium text-slate-400">Parolă</label>
					<div class="relative">
						<Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
						<input
							type="password"
							id="password"
							bind:value={password}
							placeholder="••••••••"
							required
							class="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
						/>
					</div>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-lg text-sm text-white flex items-center justify-center gap-1.5 transition-colors duration-200 mt-6 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<Key class="w-4 h-4" />
					{loading ? 'Se încarcă...' : 'Conectare Admin'}
				</button>
			</form>
		{/if}
	</div>
</div>
