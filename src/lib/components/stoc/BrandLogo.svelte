<script lang="ts">
	const KNOWN_LOGOS: Record<string, string> = {
		aptany: 'aptany.png',
		autototal: 'autototal.webp',
		barum: 'barum.svg',
		bfgoodrich: 'bfgoodrich.svg',
		bridgestone: 'bridgestone.svg',
		crosswind: 'Ccosswind.png',
		continental: 'continental.svg',
		cooper: 'cooper.svg',
		debica: 'debica.svg',
		diplomat: 'diplomat.webp',
		doublecoin: 'doublecoin.webp',
		dunlop: 'dunlop.svg',
		falken: 'falken.png',
		firestone: 'firestone.svg',
		fulda: 'fulda.svg',
		generaltire: 'general-tire.svg',
		gislaved: 'gislaved.svg',
		giti: 'giti.png',
		goodyear: 'goodyear.svg',
		gtradial: 'gtradial.png',
		hankook: 'hankook.svg',
		hankooklogo2024: 'Hankook_Logo_2024.svg',
		kelly: 'kelly.png',
		kumho: 'kumho.svg',
		laufenn: 'laufenn.svg',
		linglong: 'linglong.png',
		maxxis: 'maxxis.webp',
		michelin: 'michelin.svg',
		minerva: 'minerva.png',
		nexen: 'nexen.svg',
		nokian: 'nokian.svg',
		nordexx: 'nordexx.jpg',
		optimo: 'optimo.jpg',
		pirelli: 'pirelli.svg',
		radar: 'radar.png',
		rotis: 'rotis.png',
		sava: 'sava.svg',
		semperit: 'semperit.jpg',
		sunny: 'sunny.png',
		tigar: 'tigar.svg',
		toyotires: 'toyo-tires.png',
		toyo: 'toyo-tires.png',
		trelleborg: 'trelleborg.svg',
		viking: 'viking.svg',
		vredestein: 'vredestein.png',
		westlake: 'westlake.png',
		yokohama: 'yokohama.svg'
	};

	let { brand }: { brand: string } = $props();

	const b = $derived(brand.toLowerCase().trim().replace(/\s+/g, ''));
	const fileName = $derived(KNOWN_LOGOS[b]);
</script>

<div
	class="flex h-10 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white p-2 shadow-sm"
>
	{#if fileName}
		<img
			src="/brand-logo/{fileName}"
			alt={brand}
			class="pointer-events-none max-h-full max-w-full object-contain"
		/>
	{:else}
		<div class="px-1 text-center text-[10px] font-black uppercase leading-tight text-slate-400">
			{brand}
		</div>
	{/if}
</div>
