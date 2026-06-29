<script lang="ts">
	import './layout.css';
	import { Toaster } from 'svelte-sonner';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getStoredToken, getStoredUser, logout, type User } from '$lib/api';
	import { auth } from '$lib/auth.svelte';
	import { LogOut, Home, ScanBarcode, Truck, Hotel, Settings as SettingsIcon, Search, BarChart3, ClipboardList } from 'lucide-svelte';

	let { children } = $props();

	let currentPath = $derived(page.url.pathname);

	function applyTheme(theme: 'light' | 'dark' | 'system') {
		if (!browser) return;
		const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
		if (isDark) {
			document.documentElement.classList.add('dark');
			document.documentElement.classList.remove('light');
			document.body.classList.add('dark');
			document.body.classList.remove('light');
		} else {
			document.documentElement.classList.add('light');
			document.documentElement.classList.remove('dark');
			document.body.classList.add('light');
			document.body.classList.remove('dark');
		}
	}

	$effect(() => {
		if (browser) {
			// Trigger a refresh on load/navigation
			auth.refresh();

			if (!auth.token && currentPath !== '/login') {
				goto('/login');
			}

			// Apply stored appearance preference
			const storedTheme = localStorage.getItem('wms_theme') as 'light' | 'dark' | 'system' || 'dark';
			applyTheme(storedTheme);

			// Listen for theme preference changes from Settings page
			const handleThemeChange = (e: Event) => {
				const detail = (e as CustomEvent).detail;
				if (detail) {
					applyTheme(detail);
				}
			};
			window.addEventListener('wms-theme-updated', handleThemeChange);
			return () => {
				window.removeEventListener('wms-theme-updated', handleThemeChange);
			};
		}
	});
</script>

<Toaster position="top-right" theme="dark" richColors />

{#if currentPath === '/login'}
	{@render children()}
{:else}
	<div class="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
		<!-- Header -->
		<header class="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
				<!-- Logo -->
				<div class="flex items-center gap-2.5">
					<img src="/logo-hilserv.png" alt="Hilserv WMS Logo" class="w-12 h-12 object-contain" />
					<div>
						<h1 class="text-sm font-bold tracking-wider text-slate-200">HILSERV</h1>
						<p class="text-[10px] text-slate-400 font-mono -mt-1">WMS INVENTORY</p>
					</div>
				</div>

				<!-- Navigation -->
				<nav class="hidden md:flex items-center gap-1">
					<a
						href="/"
						class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 {(currentPath === '/' || currentPath.startsWith('/tire/')) ? 'bg-slate-800 text-white font-semibold shadow-inner' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
					>
						<Search class="w-4 h-4 text-indigo-400" />
						Stoc
					</a>
					{#if auth.user?.role === 'ADMIN'}
						<a
							href="/dashboard"
							class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 {currentPath === '/dashboard' ? 'bg-slate-800 text-white font-semibold shadow-inner' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
						>
							<BarChart3 class="w-4 h-4 text-purple-400" />
							Dashboard
						</a>
					{/if}
					<a
						href="/scanner"
						class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 {currentPath === '/scanner' ? 'bg-slate-800 text-white font-semibold shadow-inner' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
					>
						<ScanBarcode class="w-4 h-4 text-emerald-400" />
						Scanner
					</a>
					<a
						href="/inventory"
						class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 {currentPath === '/inventory' ? 'bg-slate-800 text-white font-semibold shadow-inner' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
					>
						<ClipboardList class="w-4 h-4 text-indigo-400" />
						Inventar
					</a>
					<a
						href="/reception"
						class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 {currentPath === '/reception' ? 'bg-slate-800 text-white font-semibold shadow-inner' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
					>
						<Truck class="w-4 h-4 text-amber-400" />
						Recepție
					</a>
					<a
						href="/hotel"
						class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 {currentPath === '/hotel' ? 'bg-slate-800 text-white font-semibold shadow-inner' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
					>
						<Hotel class="w-4 h-4 text-sky-400" />
						Hotel Anvelope
					</a>
					{#if auth.user}
						<a
							href="/settings"
							class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 {currentPath === '/settings' ? 'bg-slate-800 text-white font-semibold shadow-inner' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}"
						>
							<SettingsIcon class="w-4 h-4 text-rose-400" />
							Setări
						</a>
					{/if}
				</nav>

				<!-- User actions -->
				<div class="flex items-center gap-3">
					<div class="hidden sm:flex flex-col items-end">
						<span class="text-xs font-medium text-slate-300">{auth.user?.username || 'Employee'}</span>
						<span class="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
							{auth.user?.role || 'Guest'}
						</span>
					</div>
					<button
						onclick={logout}
						class="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-all duration-200"
						title="Deconectare"
					>
						<LogOut class="w-5 h-5" />
					</button>
				</div>
			</div>
		</header>

		<!-- Main content -->
		<main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
			{@render children()}
		</main>

		<!-- Footer -->
		<footer class="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-600">
			Hilserv Warehouse Management System &copy; 2026. Securizat.
		</footer>
	</div>
{/if}

<style>
	:global(body) {
		background-color: #020617;
		margin: 0;
	}
</style>
