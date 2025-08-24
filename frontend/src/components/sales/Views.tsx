import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	Search,
	Calendar,
	Receipt,
	Eye,
	Edit,
	User,
	Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { salesAPI } from "@/services/api";
import { Receipt as ReceiptComponent } from "./Receipt";
import { EditSaleDialog } from "./EditSaleDialog";

interface SaleItem {
	itemId: number;
	quantity: number;
	price: number;
	item: {
		id: number;
		name: string;
		unit: string;
		category: string;
	};
}

interface Customer {
	id: number;
	name: string;
	phone: string;
}

interface UserType {
	id: number;
	name: string;
}

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

interface ViewsProps {
	searchTerm: string;
	selectedUser: string; // kept for compatibility but not used in filtering
	onSearchChange: (value: string) => void;
	onUserChange: (value: string) => void; // kept for compatibility
}

export function Views({
	searchTerm,
	selectedUser,
	onSearchChange,
	onUserChange,
}: ViewsProps) {
	const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
	const [isSaleDetailOpen, setIsSaleDetailOpen] = useState(false);
	const [editingSale, setEditingSale] = useState<Sale | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'all'>('all');
	const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().slice(0, 10)); // yyyy-mm-dd
	const [searchInput, setSearchInput] = useState(searchTerm);

	// Check if current user is admin
	const isAdmin = localStorage.getItem("user_role") === "ADMIN";

	// Map UI period to backend sales-optimized/by-date type
	const mapPeriodToType = (p: 'day' | 'week' | 'month' | 'all') => p;

	// MAIN LIST: always server-driven by selected period and date
	const {
		data: mainResponse,
		isLoading: mainLoading,
		error: mainError,
		refetch: refetchMain,
		isFetching: mainFetching,
	} = useQuery({
		queryKey: ["sales-main", period, targetDate],
		queryFn: async () => {
			if (period === 'all') {
				return salesAPI.getAllWithoutPagination({});
			}
			const res = await salesAPI.getByDate({
				date: targetDate,
				type: mapPeriodToType(period),
				page: 1,
				limit: 1000,
			});
			return res;
		},
		staleTime: 0,
		gcTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: true,
	});

	const sales: Sale[] = Array.isArray(mainResponse?.data?.sales) ? mainResponse?.data?.sales : [];
	const summary = mainResponse?.data?.summary;

	// BACKEND SEARCH: separate query, does not reuse or filter existing list
	const {
		data: searchResponse,
		isFetching: searchFetching,
		refetch: refetchSearch,
	} = useQuery({
		queryKey: ["sales-search", searchTerm],
		queryFn: async () => {
			if (!searchTerm || !searchTerm.trim()) return { data: null } as any;
			// Use optimized list with search only, let backend handle it; default to last 7 days window
			const res = await salesAPI.getAllOptimized({
				search: searchTerm.trim(),
				limit: 'all',
				filterType: 'custom',
			});
			return res;
		},
		enabled: !!(searchTerm && searchTerm.trim()),
		staleTime: 0,
		gcTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
	});

	const searchResults: Sale[] = Array.isArray(searchResponse?.data?.sales)
		? searchResponse?.data?.sales
		: Array.isArray(searchResponse?.data)
		? (searchResponse?.data as Sale[])
		: [];

	const displayedSales: Sale[] = (searchTerm && searchTerm.trim()) ? searchResults : sales;

	// Events
	const handleSearch = () => {
		onSearchChange(searchInput);
	};

	const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchInput(e.target.value);
	};

	const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSearch();
		}
	};

	useEffect(() => {
		setSearchInput(searchTerm);
	}, [searchTerm]);

	const getPaymentMethodColor = (method: string) => {
		switch (method) {
			case "CASH":
				return "bg-success/10 text-success";
			case "MPESA":
				return "bg-primary/10 text-primary";
			case "CARD":
				return "bg-warning/10 text-warning";
			case "TRANSFER":
				return "bg-secondary/10 text-secondary";
			default:
				return "bg-muted text-muted-foreground";
		}
	};

	if (mainLoading || mainFetching) {
		return (
			<div className="flex items-center justify-center h-64">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	if (mainError) {
		return (
			<div className="flex flex-col items-center justify-center h-64 space-y-4">
				<div className="text-center">
					<div className="h-12 w-12 text-destructive mx-auto mb-4">⚠️</div>
					<h3 className="text-lg font-semibold mb-2">Failed to load sales</h3>
					<p className="text-muted-foreground mb-4">
						{mainError instanceof Error ? mainError.message : "An error occurred while loading sales"}
					</p>
					<Button onClick={() => refetchMain()} variant="outline">
						Try Again
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Summary Cards (from backend summary) */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-4 h-full">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Total Amount</p>
								<p className="text-2xl font-bold">KSH {(summary?.totalAmount || 0).toLocaleString()}</p>
							</div>
							<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
								<Receipt className="h-5 w-5 text-primary" />
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4 h-full">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Transactions</p>
								<p className="text-2xl font-bold">{summary?.totalSales || sales.length || 0}</p>
							</div>
							<div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
								<Receipt className="h-5 w-5 text-success" />
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4 h-full">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Avg. Sale</p>
								<p className="text-2xl font-bold">
									KSH {(() => {
										const count = summary?.totalSales ?? sales.length;
										const amount = summary?.totalAmount ?? sales.reduce((s, x) => s + x.totalAmount, 0);
										return count > 0 ? Math.round(amount / count).toLocaleString() : "0";
									})()}
								</p>
							</div>
							<div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
								<Receipt className="h-5 w-5 text-warning" />
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4 h-full">
						<div className="flex items-center justify-between">
							<div className="w-full">
								<p className="text-sm text-muted-foreground">Select Period</p>
								<div className="mt-2 flex items-center gap-2">
									<Select value={period} onValueChange={(v: any) => setPeriod(v)}>
										<SelectTrigger className="w-[120px]">
											<SelectValue placeholder="Period" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All</SelectItem>
											<SelectItem value="day">Daily</SelectItem>
											<SelectItem value="week">Weekly</SelectItem>
											<SelectItem value="month">Monthly</SelectItem>
										</SelectContent>
									</Select>
									<input
										type="date"
										className="border rounded px-2 py-1 text-sm flex-1 min-w-[130px]"
										value={targetDate}
										onChange={(e) => setTargetDate(e.target.value)}
									/>
								</div>
							</div>
							<div className="h-10 w-10 rounded-lg bg-primary/10 hidden md:flex items-center justify-center">
								<CalendarIcon className="h-5 w-5 text-primary" />
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Search and Filter Bar */}
			<div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
				<div className="flex flex-col md:flex-row gap-4 flex-1">
					<div className="relative flex-1 max-w-md">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by sale ID, customer name, or phone..."
							value={searchInput}
							onChange={handleSearchInputChange}
							onKeyPress={handleSearchKeyPress}
							className="pl-10"
						/>
					</div>

					<div className="flex gap-2">
						<Button onClick={handleSearch} disabled={searchFetching}>
							{searchFetching ? 'Searching...' : 'Search'}
						</Button>
						{searchTerm && (
							<Button 
								variant="outline" 
								onClick={() => {
									onSearchChange("");
									setSearchInput("");
								}}
							>
								Clear
							</Button>
						)}
					</div>
				</div>
			</div>

			{/* Sales List */}
			<div className="space-y-4">
				{/* Header */}
				<Card className="bg-muted/50">
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="text-lg font-semibold">
									{searchTerm 
										? `Search Results for "${searchTerm}"`
										: period === 'all' 
											? 'All Sales'
											: `${period[0].toUpperCase()}${period.slice(1)} view for ${new Date(targetDate).toLocaleDateString()}`
									}
								</h3>
								<p className="text-sm text-muted-foreground">
									{(summary?.totalSales ?? displayedSales.length).toLocaleString()} transactions • KSH {(summary?.totalAmount ?? displayedSales.reduce((s, x) => s + x.totalAmount, 0)).toLocaleString()} total
									{searchTerm && " (Search results)"}
								</p>
							</div>
							<div className="text-right">
								<p className="text-sm text-muted-foreground">Average per sale</p>
								<p className="text-lg font-semibold">
									{(() => {
										const count = summary?.totalSales ?? displayedSales.length;
										const amount = summary?.totalAmount ?? displayedSales.reduce((s, x) => s + x.totalAmount, 0);
										return `KSH ${count > 0 ? Math.round(amount / count).toLocaleString() : '0'}`;
									})()}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{displayedSales.map((sale: Sale) => (
					<Card
						key={sale.id}
						className="hover:shadow-lg transition-all duration-300"
					>
						<CardContent className="p-6">
							<div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
								<div className="flex items-start space-x-4">
									<div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
										<Receipt className="h-6 w-6 text-primary" />
									</div>

									<div className="flex-1 min-w-0">
										<div className="flex items-center space-x-2 mb-1">
											<h3 className="font-semibold text-lg">#{sale.id}</h3>
											<Badge
												className={cn(
													"text-xs",
													getPaymentMethodColor(sale.paymentType)
												)}
											>
												{sale.paymentType}
											</Badge>
										</div>
										<p className="text-muted-foreground">
											{sale.customer.name}
										</p>
										<div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
											<span className="flex items-center">
												<Calendar className="h-4 w-4 mr-1" />
												{new Date(
													sale.createdAt
												).toLocaleDateString()} at{" "}
												{new Date(sale.createdAt).toLocaleTimeString()}
											</span>
											<span>
												{sale.items.reduce(
														(sum, item) => sum + item.quantity,
														0
												)}{" "}
												items
											</span>
											<span className="flex items-center">
												<User className="h-4 w-4 mr-1" />
												Sale made by: {sale.user?.name || 'N/A'}
											</span>
										</div>
									</div>
								</div>

								<div className="flex items-center space-x-4">
									<div className="text-right">
										<p className="text-2xl font-bold text-primary">
											KSH {sale.totalAmount.toLocaleString()}
										</p>
										<div className="flex gap-1 justify-end">
											<Badge
												variant="secondary"
												className="bg-success/10 text-success"
											>
												Completed
											</Badge>
											{sale.paidAmount < sale.totalAmount && (
												<Badge className="bg-destructive/10 text-destructive-foreground">
													Credit
												</Badge>
											)}
										</div>
									</div>

									<div className="flex space-x-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												setSelectedSale(sale);
												setIsSaleDetailOpen(true);
											}}
										>
											<Eye className="h-4 w-4 mr-2" />
											View
										</Button>
										{isAdmin && (
											<Button
												variant="outline"
												size="sm"
												onClick={() => {
													setEditingSale(sale);
													setIsEditDialogOpen(true);
												}}
											>
												<Edit className="h-4 w-4 mr-2" />
												Edit
											</Button>
										)}
																					<ReceiptComponent sale={sale} />
										</div>
								</div>
							</div>
						</CardContent>
					</Card>
				))}

				{displayedSales.length === 0 && (
					<Card className="p-8">
						<div className="text-center">
							<Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
							<h3 className="text-lg font-semibold mb-2">No sales found</h3>
							<p className="text-muted-foreground mb-4">
								Try adjusting your search or period
							</p>
							<Button 
								variant="outline" 
								onClick={() => {
									onSearchChange("");
									setSearchInput("");
									refetchMain();
								}}
							>
								Clear Filters
							</Button>
						</div>
					</Card>
				)}
			</div>

			{/* Sale Detail Dialog */}
			<Dialog open={isSaleDetailOpen} onOpenChange={setIsSaleDetailOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Sale Details - #{selectedSale?.id}</DialogTitle>
						<DialogDescription>
							View detailed information about this sale transaction.
						</DialogDescription>
					</DialogHeader>

					{selectedSale && (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-sm font-medium text-muted-foreground">
										Customer
									</label>
									<p className="text-lg">{selectedSale.customer.name}</p>
									<p className="text-sm text-muted-foreground">
										{selectedSale.customer.phone}
									</p>
								</div>
								<div>
									<label className="text-sm font-medium text-muted-foreground">
										Date & Time
									</label>
									<p className="text-lg">
										{new Date(selectedSale.createdAt).toLocaleDateString()} at{" "}
										{new Date(selectedSale.createdAt).toLocaleTimeString()}
									</p>
								</div>
								<div>
									<label className="text-sm font-medium text-muted-foreground">
										Payment Method
									</label>
									<Badge
										className={cn(
											"text-xs",
											getPaymentMethodColor(selectedSale.paymentType)
										)}
									>
										{selectedSale.paymentType}
									</Badge>
								</div>
								<div>
									<label className="text-sm font-medium text-muted-foreground">
										Sale Made By
									</label>
									<p className="text-lg">{selectedSale.user?.name || 'N/A'}</p>
								</div>
							</div>

							{/* Notes Section */}
							{selectedSale.notes && (
								<div className="border rounded-lg p-4 bg-blue-50">
									<h3 className="font-medium mb-2 text-blue-900">Notes</h3>
									<p className="text-blue-800 whitespace-pre-wrap">{selectedSale.notes}</p>
								</div>
							)}

							<div>
								<h3 className="font-medium mb-2">Items</h3>
								<div className="space-y-2">
									{selectedSale.items.map((item, index) => (
										<div
											key={index}
											className="flex justify-between p-2 bg-muted rounded"
										>
											<div>
												<span className="font-medium">
													{item.item?.name || "Item"}
												</span>
												<span className="text-muted-foreground ml-2">
													{item.quantity}x KSH {item.price}
												</span>
											</div>
											<span className="font-medium">
												KSH {(item.quantity * item.price).toLocaleString()}
											</span>
										</div>
									))}
								</div>
								<div className="border-t mt-4 pt-4">
									{selectedSale.discount > 0 && (
										<>
											<div className="flex justify-between text-lg">
												<span>Subtotal:</span>
												<span>
													KSH {(
														selectedSale.totalAmount + selectedSale.discount
													).toLocaleString()}
												</span>
											</div>
											<div className="flex justify-between text-sm text-muted-foreground">
												<span>Discount:</span>
												<span>
													-KSH {selectedSale.discount.toLocaleString()}
												</span>
											</div>
										</>
									)}
									<div className="flex justify-between text-lg font-bold">
										<span>Total:</span>
										<span>KSH {selectedSale.totalAmount.toLocaleString()}</span>
									</div>
									{selectedSale.paidAmount < selectedSale.totalAmount && (
										<>
											<div className="flex justify-between text-md">
												<span>Amount Paid:</span>
												<span>
													KSH {selectedSale.paidAmount.toLocaleString()}
												</span>
											</div>
											<div className="flex justify-between text-lg font-bold text-warning">
												<span>Outstanding:</span>
												<span>
													KSH {(
														selectedSale.totalAmount - selectedSale.paidAmount
													).toLocaleString()}
												</span>
											</div>
										</>
									)}
								</div>
							</div>
						</div>
						)}
				</DialogContent>
			</Dialog>

			{/* Edit Sale Dialog */}
			<EditSaleDialog
				sale={editingSale}
				isOpen={isEditDialogOpen}
				onClose={() => {
					setIsEditDialogOpen(false);
					setEditingSale(null);
				}}
			/>
		</div>
	);
}
