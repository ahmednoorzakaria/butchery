import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	Receipt,
	Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { salesAPI } from "@/services/api";
import { SalesListBase } from "./SalesListBase";

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

export function Views() {
	const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('day');
	const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().slice(0, 10)); // yyyy-mm-dd

	// Check if current user is admin
	const isAdmin = localStorage.getItem("user_role") === "ADMIN";

	// Get current date info for default selections
	const now = new Date();

	// Get start of week (Monday)
	const getStartOfWeek = (date: Date) => {
		const d = new Date(date);
		const day = d.getDay();
		const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
		return new Date(d.setDate(diff));
	};

	// Get start of month
	const getStartOfMonth = (date: Date) => {
		return new Date(date.getFullYear(), date.getMonth(), 1);
	};

	// Get start of year
	const getStartOfYear = (date: Date) => {
		return new Date(date.getFullYear(), 0, 1);
	};

	// Get date range based on selected period
	const getDateRange = () => {
		const baseDate = new Date(targetDate);
		
		switch (selectedPeriod) {
			case 'day': {
				return {
					start: targetDate,
					end: targetDate
				};
			}
			case 'week': {
				const weekStart = getStartOfWeek(baseDate);
				const weekEnd = new Date(weekStart);
				weekEnd.setDate(weekStart.getDate() + 6);
				return {
					start: weekStart.toISOString().slice(0, 10),
					end: weekEnd.toISOString().slice(0, 10)
				};
			}
			case 'month': {
				const monthStart = getStartOfMonth(baseDate);
				const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
				return {
					start: monthStart.toISOString().slice(0, 10),
					end: monthEnd.toISOString().slice(0, 10)
				};
			}
			case 'year': {
				const yearStart = getStartOfYear(baseDate);
				const yearEnd = new Date(baseDate.getFullYear(), 11, 31);
				return {
					start: yearStart.toISOString().slice(0, 10),
					end: yearEnd.toISOString().slice(0, 10)
				};
			}
			case 'all': {
				// For "All" period, return a very wide date range to get all sales
				return {
					start: '2020-01-01', // Reasonable start date
					end: new Date().toISOString().slice(0, 10)
				};
			}
			default: {
				return {
					start: targetDate,
					end: targetDate
				};
			}
		}
	};

	const dateRange = getDateRange();

	// Fetch sales data based on selected period and date
	const {
		data: salesResponse,
		isLoading,
		error,
		refetch,
		isFetching,
	} = useQuery({
		queryKey: ["sales-time-based", selectedPeriod, targetDate, dateRange],
		queryFn: async () => {
			if (selectedPeriod === 'all') {
				// For "All" period, don't pass any date filters to get all sales
				return salesAPI.getAllWithoutPagination({});
			}
			
			// For specific periods, use the date-based endpoint
			const res = await salesAPI.getByDate({
				date: targetDate,
				type: selectedPeriod,
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

	const sales: Sale[] = Array.isArray(salesResponse?.data?.sales) ? salesResponse?.data?.sales : [];
	const summary = salesResponse?.data?.summary;

	// Calculate summary if not provided by backend
	const calculatedSummary = summary || {
		totalSales: sales.length,
		totalAmount: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
	};

	const getPeriodLabel = () => {
		switch (selectedPeriod) {
			case 'day':
				return `Daily view for ${new Date(targetDate).toLocaleDateString()}`;
			case 'week':
				return `Weekly view for ${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}`;
			case 'month':
				return `Monthly view for ${new Date(targetDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
			case 'year':
				return `Yearly view for ${new Date(targetDate).getFullYear()}`;
			case 'all':
				return 'All sales';
			default:
				return 'Sales view';
		}
	};

	if (isLoading || isFetching) {
		return (
			<div className="flex items-center justify-center h-64">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center h-64 space-y-4">
				<div className="text-center">
					<div className="h-12 w-12 text-destructive mx-auto mb-4">⚠️</div>
					<h3 className="text-lg font-semibold mb-2">Failed to load sales</h3>
					<p className="text-muted-foreground mb-4">
						{error instanceof Error ? error.message : "An error occurred while loading sales"}
					</p>
					<Button onClick={() => refetch()} variant="outline">
						Try Again
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardContent className="p-4 h-full">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Total Amount</p>
								<p className="text-2xl font-bold">KSH {calculatedSummary.totalAmount.toLocaleString()}</p>
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
								<p className="text-2xl font-bold">{calculatedSummary.totalSales}</p>
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
									KSH {calculatedSummary.totalSales > 0 ? Math.round(calculatedSummary.totalAmount / calculatedSummary.totalSales).toLocaleString() : "0"}
								</p>
							</div>
							<div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
								<Receipt className="h-5 w-5 text-warning" />
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Time Period Selection */}
			<Card>
				<CardContent className="p-6">
					<div className="space-y-4">
						<h3 className="text-lg font-semibold">Select Time Period</h3>
						
						{/* Period Tabs */}
						<Tabs value={selectedPeriod} onValueChange={(value: 'day' | 'week' | 'month' | 'year' | 'all') => setSelectedPeriod(value)} className="w-full">
							<TabsList className="grid w-full grid-cols-5">
								<TabsTrigger value="day">Day</TabsTrigger>
								<TabsTrigger value="week">Week</TabsTrigger>
								<TabsTrigger value="month">Month</TabsTrigger>
								<TabsTrigger value="year">Year</TabsTrigger>
								<TabsTrigger value="all">All</TabsTrigger>
							</TabsList>
						</Tabs>

						{/* Date Selection */}
						{selectedPeriod !== 'all' && (
							<div className="flex items-center gap-4">
								<div className="flex items-center gap-2">
									<CalendarIcon className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm font-medium">Select Date:</span>
								</div>
								<input
									type="date"
									className="border rounded px-3 py-2 text-sm"
									value={targetDate}
									onChange={(e) => setTargetDate(e.target.value)}
								/>
								<Button 
									variant="outline" 
									size="sm"
									onClick={() => setTargetDate(now.toISOString().slice(0, 10))}
								>
									Today
								</Button>
							</div>
						)}

						{/* Period Info */}
						<div className="text-sm text-muted-foreground">
							{getPeriodLabel()}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Sales List */}
			<SalesListBase
				sales={sales}
				summary={calculatedSummary}
				title={getPeriodLabel()}
				isAdmin={isAdmin}
				onClear={() => refetch()}
				showClear={false}
			/>
		</div>
	);
}
