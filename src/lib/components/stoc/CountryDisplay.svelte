<script lang="ts">
	const getCountryInfo = (country: string) => {
		const c = country.toUpperCase().trim();
		const mapping: Record<string, { code: string; name: string }> = {
			ROMANIA: { code: 'ro', name: 'România' },
			RO: { code: 'ro', name: 'România' },
			ROM: { code: 'ro', name: 'România' },
			GERMANY: { code: 'de', name: 'Germania' },
			DE: { code: 'de', name: 'Germania' },
			GER: { code: 'de', name: 'Germania' },
			FRANCE: { code: 'fr', name: 'Franța' },
			FR: { code: 'fr', name: 'Franța' },
			FRA: { code: 'fr', name: 'Franța' },
			HUNGARY: { code: 'hu', name: 'Ungaria' },
			HU: { code: 'hu', name: 'Ungaria' },
			UNG: { code: 'hu', name: 'Ungaria' },
			HUN: { code: 'hu', name: 'Ungaria' },
			HUNG: { code: 'hu', name: 'Ungaria' },
			POLAND: { code: 'pl', name: 'Polonia' },
			PL: { code: 'pl', name: 'Polonia' },
			POL: { code: 'pl', name: 'Polonia' },
			PLAND: { code: 'pl', name: 'Polonia' },
			ITALY: { code: 'it', name: 'Italia' },
			IT: { code: 'it', name: 'Italia' },
			ITA: { code: 'it', name: 'Italia' },
			ITEL: { code: 'it', name: 'Italia' },
			ITAL: { code: 'it', name: 'Italia' },
			SPAIN: { code: 'es', name: 'Spania' },
			ES: { code: 'es', name: 'Spania' },
			SPA: { code: 'es', name: 'Spania' },
			SERBIA: { code: 'rs', name: 'Serbia' },
			RS: { code: 'rs', name: 'Serbia' },
			SERB: { code: 'rs', name: 'Serbia' },
			SLOVENIA: { code: 'si', name: 'Slovenia' },
			SI: { code: 'si', name: 'Slovenia' },
			SLO: { code: 'si', name: 'Slovenia' },
			SLOV: { code: 'si', name: 'Slovenia' },
			SLOVV: { code: 'si', name: 'Slovenia' },
			SLOVAKIA: { code: 'sk', name: 'Slovacia' },
			SK: { code: 'sk', name: 'Slovacia' },
			SLOVK: { code: 'sk', name: 'Slovacia' },
			UK: { code: 'gb', name: 'Marea Britanie' },
			'UNITED KINGDOM': { code: 'gb', name: 'Marea Britanie' },
			GB: { code: 'gb', name: 'Marea Britanie' },
			MEXICO: { code: 'mx', name: 'Mexic' },
			MEX: { code: 'mx', name: 'Mexic' },
			MX: { code: 'mx', name: 'Mexic' },
			PORTUGAL: { code: 'pt', name: 'Portugalia' },
			PT: { code: 'pt', name: 'Portugalia' },
			POR: { code: 'pt', name: 'Portugalia' },
			PORT: { code: 'pt', name: 'Portugalia' },
			LUXEMBOURG: { code: 'lu', name: 'Luxemburg' },
			LUX: { code: 'lu', name: 'Luxemburg' },
			LU: { code: 'lu', name: 'Luxemburg' },
			BELGIUM: { code: 'be', name: 'Belgia' },
			BEL: { code: 'be', name: 'Belgia' },
			BE: { code: 'be', name: 'Belgia' },
			CHINA: { code: 'cn', name: 'China' },
			CN: { code: 'cn', name: 'China' },
			TURKEY: { code: 'tr', name: 'Turcia' },
			TR: { code: 'tr', name: 'Turcia' },
			JAPAN: { code: 'jp', name: 'Japonia' },
			JP: { code: 'jp', name: 'Japonia' },
			KOREA: { code: 'kr', name: 'Coreea de Sud' },
			KR: { code: 'kr', name: 'Coreea de Sud' },
			USA: { code: 'us', name: 'SUA' },
			US: { code: 'us', name: 'SUA' },
			THAILAND: { code: 'th', name: 'Thailanda' },
			TH: { code: 'th', name: 'Thailanda' },
			VIETNAM: { code: 'vn', name: 'Vietnam' },
			VN: { code: 'vn', name: 'Vietnam' },
			CZECH: { code: 'cz', name: 'Cehia' },
			CZ: { code: 'cz', name: 'Cehia' }
		};
		return mapping[c] || { code: null, name: country };
	};

	let { country }: { country: string } = $props();

	const info = $derived(getCountryInfo(country));
</script>

<div class="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-indigo-550 dark:text-indigo-400">
	{#if info.code}
		<img
			src="https://flagcdn.com/w20/{info.code}.png"
			alt={info.name}
			class="h-auto w-4 rounded-[1px] border border-slate-200 dark:border-slate-800 shadow-sm"
		/>
	{:else}
		<span class="opacity-70">🌍</span>
	{/if}
	<span>{info.name}</span>
</div>
