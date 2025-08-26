import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { salesAPI } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Phone, Hash, User, AlertCircle } from "lucide-react";
import { SalesListBase } from "./SalesListBase";
import { Badge } from "@/components/ui/badge";

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
	
	// Phone number: starts with 07 and has exactly 10 digits
	if (/^07\d{8}$/.test(trimmed)) return 'phone';
	
	// ID: only digits (sale ID)
	if (/^\d+$/.test(trimmed)) return 'id';
	
	// Name: contains letters (customer name)
	return 'name';
}

export function SearchSales() {
	const [searchInput, setSearchInput] = useState("");
	const [triggeredTerm, setTriggeredTerm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [searchType, setSearchType] = useState<'phone' | 'id' | 'name' | null>(null);
	const isAdmin = localStorage.getItem("user_role") === "ADMIN";

	const detectedType = classifySearch(searchInput || "");

	const { data, isFetching } = useQuery({
		queryKey: ["sales-search-standalone", triggeredTerm],
		queryFn: async () => {
			if (!triggeredTerm) return { data: { sales: [], summary: { totalSales: 0, totalAmount: 0 } } };
			// Use the getAllOptimized endpoint with search parameter and no date limits
			const res = await salesAPI.getAllOptimized({ 
				search: triggeredTerm, 
				limit: 'all',
				filterType: 'custom',
				start: '2020-01-01', // Start from a reasonable date to get all sales
				end: new Date().toISOString().slice(0, 10) // End at today
			});
			return res;
		},
		enabled: !!triggeredTerm,
		staleTime: 0,
		gcTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	});

	// Fix: The backend returns data directly in data.data, not nested under data.data.sales
	const sales: Sale[] = Array.isArray(data?.data?.sales) ? data.data.sales : [];
	const summary = data?.data?.summary;

	const validateSearch = (term: string): { isValid: boolean; error?: string } => {
		const trimmed = term.trim();
		
		if (!trimmed) {
			return { isValid: false, error: "Please enter a search term" };
		}

		const type = classifySearch(trimmed);
		
		switch (type) {
			case 'phone':
				if (!/^07\d{8}$/.test(trimmed)) {
					return { isValid: false, error: "Phone number must start with 07 and be exactly 10 digits" };
				}
				break;
			case 'id':
				if (!/^\d+$/.test(trimmed)) {
					return { isValid: false, error: "Sale ID must contain only digits" };
				}
				break;
			case 'name':
				if (trimmed.length < 2) {
					return { isValid: false, error: "Customer name must be at least 2 characters long" };
				}
				break;
		}
		
		return { isValid: true };
	};

	const handleSearch = () => {
		const validation = validateSearch(searchInput);
		
		if (!validation.isValid) {
			setError(validation.error || "Invalid search term");
			return;
		}

		setError(null);
		setSearchType(classifySearch(searchInput));
		setTriggeredTerm(searchInput.trim());
	};

	const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSearch();
		}
	};

	const getSearchTypeIcon = (type: 'phone' | 'id' | 'name') => {
		switch (type) {
			case 'phone':
				return <Phone className="h-4 w-4" />;
			case 'id':
				return <Hash className="h-4 w-4" />;
			case 'name':
				return <User className="h-4 w-4" />;
			default:
				return <Search className="h-4 w-4" />;
		}
	};

	const getSearchTypeLabel = (type: 'phone' | 'id' | 'name') => {
		switch (type) {
			case 'phone':
				return 'Phone Number';
			case 'id':
				return 'Sale ID';
			case 'name':
				return 'Customer Name';
			default:
				return 'Search';
		}
	};

	const getSearchTypeColor = (type: 'phone' | 'id' | 'name') => {
		switch (type) {
			case 'phone':
				return 'bg-blue-100 text-blue-800 border-blue-200';
			case 'id':
				return 'bg-green-100 text-green-800 border-green-200';
			case 'name':
				return 'bg-purple-100 text-purple-800 border-purple-200';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	};

	return (
		<div className="space-y-6">
			{/* Search Header */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Search className="h-5 w-5" />
						Search Sales
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{/* Search Input */}
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Enter sale ID, phone number (07XXXXXXXX), or customer name..."
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								onKeyPress={handleKeyPress}
								className="pl-10 pr-4 py-3 text-base"
							/>
						</div>

						{/* Search Type Detection */}
						{searchInput && (
							<div className="flex items-center gap-2">
								<Badge variant="outline" className={getSearchTypeColor(detectedType)}>
									{getSearchTypeIcon(detectedType)}
									{getSearchTypeLabel(detectedType)}
								</Badge>
								<span className="text-sm text-muted-foreground">
									{detectedType === 'phone' && 'Exact phone match'}
									{detectedType === 'id' && 'Exact sale ID match'}
									{detectedType === 'name' && 'Customer name contains search term'}
								</span>
							</div>
						)}

						{/* Error Display */}
						{error && (
							<div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
								<AlertCircle className="h-4 w-4 text-destructive" />
								<span className="text-sm text-destructive">{error}</span>
							</div>
						)}

						{/* Search Actions */}
						<div className="flex gap-2">
							<Button 
								onClick={handleSearch} 
								disabled={isFetching || !searchInput.trim()}
								className="flex-1 md:flex-none"
							>
								{isFetching ? (
									<>
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
										Searching...
									</>
								) : (
									<>
										<Search className="h-4 w-4 mr-2" />
										Search
									</>
								)}
							</Button>
							
							{(searchInput || triggeredTerm) && (
								<Button 
									variant="outline" 
									onClick={() => { 
										setSearchInput(""); 
										setTriggeredTerm(""); 
										setError(null); 
										setSearchType(null);
									}}
								>
									Clear
								</Button>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Search Instructions */}
			<Card>
				<CardContent className="p-4">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
						<div className="flex items-start gap-2">
							<Hash className="h-4 w-4 text-green-600 mt-0.5" />
							<div>
								<p className="font-medium text-green-800">Sale ID</p>
								<p className="text-muted-foreground">Enter digits only (e.g., 12345)</p>
							</div>
						</div>
						<div className="flex items-start gap-2">
							<Phone className="h-4 w-4 text-blue-600 mt-0.5" />
							<div>
								<p className="font-medium text-blue-800">Phone Number</p>
								<p className="text-muted-foreground">Must start with 07 and be 10 digits</p>
							</div>
						</div>
						<div className="flex items-start gap-2">
							<User className="h-4 w-4 text-purple-600 mt-0.5" />
							<div>
								<p className="font-medium text-purple-800">Customer Name</p>
								<p className="text-muted-foreground">Enter at least 2 characters</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Results */}
			{triggeredTerm && (
				<SalesListBase
					sales={sales}
					summary={summary}
					title={
						<div className="flex items-center gap-2">
							{getSearchTypeIcon(searchType!)}
							Search Results for "{triggeredTerm}"
							<Badge variant="outline" className={getSearchTypeColor(searchType!)}>
								{getSearchTypeLabel(searchType!)}
							</Badge>
						</div>
					}
					isAdmin={isAdmin}
					onClear={() => { 
						setSearchInput(""); 
						setTriggeredTerm(""); 
						setError(null); 
						setSearchType(null);
					}}
				/>
			)}
		</div>
	);
}