import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { salesAPI } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { SalesListBase } from "./SalesListBase";

interface SaleItem {
	itemId: number;
	quantity: number;
	price: number;
	item: { id: number; name: string; unit: string; category: string };
}
interface Customer { id: number; name: string; phone: string }
interface UserType { id: number; name: string }
interface Sale {
	id: number;
	customerId: number;
	totalAmount: number;
	discount: number;
	paidAmount: number;
	paymentType: string;
	notes?: string;
	createdAt: string;
	customer: Customer;
	user: UserType;
	userId: number;
	items: SaleItem[];
}

function classifySearch(term: string): 'phone' | 'id' | 'name' {
	const trimmed = term.trim();
	if (/^07\d{8}$/.test(trimmed)) return 'phone';
	return /\D/.test(trimmed) ? 'name' : 'id';
}

export function SearchSales() {
	const [searchInput, setSearchInput] = useState("");
	const [triggeredTerm, setTriggeredTerm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const isAdmin = localStorage.getItem("user_role") === "ADMIN";

	const detectedType = classifySearch(searchInput || "");

	const { data, isFetching } = useQuery({
		queryKey: ["sales-search-standalone", triggeredTerm],
		queryFn: async () => {
			if (!triggeredTerm) return { data: { sales: [], summary: { totalSales: 0, totalAmount: 0 } } } as any;
			const res = await salesAPI.getAllOptimized({ search: triggeredTerm, limit: 'all', filterType: 'custom' });
			return res;
		},
		enabled: !!triggeredTerm,
		staleTime: 0,
		gcTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	});

	const sales: Sale[] = Array.isArray(data?.data?.sales) ? data?.data?.sales : Array.isArray(data?.data) ? (data?.data as Sale[]) : [];
	const summary = data?.data?.summary;

	const handleSearch = () => {
		const term = searchInput.trim();
		if (!term) { setError("Enter a phone, ID, or name"); return; }
		const type = classifySearch(term);
		if (type === 'phone' && !/^07\d{8}$/.test(term)) {
			setError("Phone must start with 07 and be exactly 10 digits");
			return;
		}
		setError(null);
		setTriggeredTerm(term);
	};

	const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') { e.preventDefault(); handleSearch(); }
	};

	return (
		<div className="space-y-6">
			{/* Standalone Search Bar */}
			<Card>
				<CardContent className="p-4">
					<div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
						<div className="relative flex-1 max-w-xl w-full">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search by ID, 07XXXXXXXX phone, or customer name"
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								onKeyPress={handleKeyPress}
								className="pl-10"
							/>
							{error && <p className="text-sm text-destructive mt-2">{error}</p>}
							{!error && searchInput && (
								<p className="text-xs text-muted-foreground mt-2">
									Detected: {detectedType === 'phone' ? 'Phone (exact match)' : detectedType === 'id' ? 'Sale ID (exact match)' : 'Name/Phone (contains)'}
								</p>
							)}
						</div>
						<div className="flex gap-2">
							<Button onClick={handleSearch} disabled={isFetching}>{isFetching ? 'Searching...' : 'Search'}</Button>
							{(searchInput || triggeredTerm) && (
								<Button variant="outline" onClick={() => { setSearchInput(""); setTriggeredTerm(""); setError(null); }}>
									Clear
								</Button>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Results */}
			<SalesListBase
				sales={sales}
				summary={summary}
				title={triggeredTerm ? `Search Results for "${triggeredTerm}"` : 'Search Results'}
				isAdmin={isAdmin}
				onClear={() => { setSearchInput(""); setTriggeredTerm(""); setError(null); }}
			/>
		</div>
	);
}