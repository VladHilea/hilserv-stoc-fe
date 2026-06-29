<script lang="ts">
	let {
		dot,
		dotYear,
		totalQty,
		variant = 'light'
	}: {
		dot: string | null;
		dotYear: number | null;
		totalQty?: number;
		variant?: 'light' | 'dark';
	} = $props();

	const isDark = $derived(variant === 'dark');

	const parsedParts = $derived.by(() => {
		if (!dot || (!dot.includes('/') && !dot.includes('*'))) return [];

		const rawParts = dot
			.split('/')
			.map((p) => p.trim())
			.filter((p) => p !== '');
		if (rawParts.length === 1 && !rawParts[0].includes('*')) return [];

		let knownQty = 0;
		let missingIdx = -1;

		const parts = rawParts.map((p, i) => {
			const starIdx = p.indexOf('*');
			if (starIdx === -1) return { val: p, qty: null as number | null };

			const val = p.substring(0, starIdx);
			const qtyStr = p.substring(starIdx + 1);

			if (qtyStr === '') {
				missingIdx = i;
				return { val, qty: null };
			}

			const q = parseInt(qtyStr) || 0;
			knownQty += q;
			return { val, qty: q };
		});

		if (missingIdx !== -1 && totalQty !== undefined) {
			parts[missingIdx].qty = Math.max(0, totalQty - knownQty);
		}

		return parts;
	});
</script>

{#if !dot}
	<span class={isDark ? 'text-slate-650' : 'text-slate-500'}>N/A</span>
{:else if parsedParts.length > 0}
	<div class="flex flex-col gap-1.5 py-1">
		{#each parsedParts as part}
			{#if part.val}
				<div
					class="flex w-fit items-center gap-1.5 whitespace-nowrap rounded border px-2 py-1 shadow-sm {isDark
						? 'border-white/10 bg-white/10'
						: 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40'}"
				>
					<span class="font-mono font-bold {isDark ? 'text-yellow-400' : 'text-slate-700 dark:text-slate-350'}"
						>{part.val}</span
					>
					{#if part.qty !== null}
						<span class="{isDark ? 'text-white/40' : 'text-slate-400'} text-[9px]">x</span>
						<span class="text-[10px] font-black {isDark ? 'text-indigo-400' : 'text-indigo-650 dark:text-indigo-400'}"
							>{part.qty}</span
						>
					{/if}
				</div>
			{/if}
		{/each}
	</div>
{:else}
	{@const isOld = dotYear && dotYear < 2025}
	<div class="flex flex-col gap-1">
		<span
			class="font-mono font-bold {isOld ? 'text-red-500' : isDark ? 'text-yellow-400' : 'text-slate-700 dark:text-slate-300'}"
			>{dot}</span
		>
		{#if isOld}
			<span
				class="w-fit rounded border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-red-500"
				>DOT Vechi</span
			>
		{/if}
	</div>
{/if}
