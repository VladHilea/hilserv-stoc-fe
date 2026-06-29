export interface ConsolidatedStockInfo {
	source: 'internal' | 'adtotal' | 'rotis';
	location: string;
	quantity: number;
	stock_raw: string | null;
	price_buy: string;
	dot: string | null;
	dot_year: number | null;
	country_of_origin: string | null;
	delivery_time: string | null;
	supplier_internal_code: string | null;
}

export interface SourceStockSummary {
	source: 'internal' | 'adtotal' | 'rotis';
	total: number;
	raw_total?: string;
}

export interface TireResult {
	id: string; // UUID
	ean: string | null;
	eprel: string | null;
	sap_code: string | null;
	brand: string;
	model: string;
	dimension: string;
	width: string | null;
	height: string | null;
	radius: string | null;
	load_index: string | null;
	speed_index: string | null;
	noise_class: string | null;
	noise_db: number | null;
	fuel_efficiency: string | null;
	wet_grip: string | null;
	load_version: string | null;
	oe_mark: string | null;
	category: string | null;
	season: 'summer' | 'winter' | 'allseason' | null;
	image_url: string | null;

	// Extra fields from consolidation
	supplier_internal_code?: string | null;
	snow_grip?: boolean;
	ice_grip?: boolean;

	stocks: ConsolidatedStockInfo[];
	total_stock: number;
	source_summaries: SourceStockSummary[];
	min_price: string;
	best_source: 'internal' | 'adtotal' | 'rotis';
}

export interface FilterOptions {
	widths: string[];
	heights: string[];
	radiuses: string[];
	load_indices: string[];
	speed_indices: string[];
}
