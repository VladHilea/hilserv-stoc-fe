<script lang="ts">
	let { url, onClose }: { url: string | null; onClose: () => void } = $props();
</script>

{#if url}
	<div
		class="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4 md:p-12"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		role="button"
		tabindex="0"
	>
		<div
			class="relative max-w-4xl cursor-default rounded-2xl bg-white dark:bg-slate-900 p-2 shadow-2xl border border-slate-200 dark:border-slate-800"
			onclick={(e) => e.stopPropagation()}
			role="presentation"
		>
			<button
				class="absolute right-4 top-4 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-zinc-900/50 text-white transition-colors hover:bg-zinc-900"
				onclick={onClose}
			>
				✕
			</button>
			<img src={url} alt="Enlarged" class="max-h-[85vh] max-w-full rounded-lg object-contain" />
		</div>
	</div>
{/if}
