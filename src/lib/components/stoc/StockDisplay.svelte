<script lang="ts">
	import type { TireResult } from '$lib/types';

	let { item }: { item: TireResult } = $props();

	const internalStock = $derived(item.source_summaries?.find((s) => s.source === 'internal'));
	const hasInternal = $derived(internalStock && internalStock.total > 0);
	const otherSources = $derived(
		item.source_summaries?.filter((s) => s.source !== 'internal' && s.total > 0) || []
	);
	const hasOtherStock = $derived(otherSources.length > 0);
</script>

<div class="flex flex-col gap-1">
	{#if hasInternal && internalStock}
		<span class="text-lg font-black text-blue-600 dark:text-blue-400">
			{internalStock.raw_total || internalStock.total} BUC
		</span>
	{:else if hasOtherStock}
		<span class="text-[10px] font-black uppercase leading-tight tracking-tighter text-slate-500 dark:text-slate-400">
			ÎN STOC FURNIZOR
		</span>
	{:else}
		<span class="text-lg font-black text-rose-500 dark:text-rose-450"> 0 BUC </span>
	{/if}

	{#if hasOtherStock}
		<div class="mt-0.5 flex flex-wrap gap-1.5">
			{#each otherSources as summary}
				<div
					class="flex items-center gap-1.5 rounded-full border px-2 py-0.5 shadow-sm {summary.source ===
					'adtotal'
						? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10'
						: 'border-amber-250 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10'}"
				>
					<span
						class="text-[8px] font-black uppercase {summary.source === 'adtotal'
							? 'text-emerald-700 dark:text-emerald-400'
							: 'text-amber-700 dark:text-amber-400'}"
					>
						{summary.source === 'adtotal' ? 'AD TOTAL' : 'ROTIS'}
					</span>
					<span
						class="text-[10px] font-black {summary.source === 'adtotal'
							? 'text-emerald-800 dark:text-emerald-350'
							: 'text-amber-800 dark:text-amber-350'}"
					>
						{summary.raw_total || summary.total}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
