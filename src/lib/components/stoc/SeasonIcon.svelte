<script lang="ts">
	let { s }: { s: string | null } = $props();
</script>

{#if s === 'summer'}
	<span title="Vară">☀️</span>
{:else}
	{#if s === 'winter'}
		<span title="Iarnă">❄️</span>
	{:else}
		{#if s === 'allseason'}
			<span class="flex items-center justify-center gap-0.5" title="All-Season">
				<span class="text-orange-400">☀️</span>
				<span class="text-blue-400">❄️</span>
			</span>
		{:else}
			<span>❓</span>
		{/if}
	{/if}
{/if}
