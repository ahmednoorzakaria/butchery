import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Receipt as ReceiptIcon, Calendar, Eye, Edit, User } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
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

export interface SalesListBaseProps {
	sales: Sale[];
	summary?: { totalSales?: number; totalAmount?: number } | null;
	title: string;
	isAdmin: boolean;
	isLoading?: boolean;
	onClear?: () => void;
	showClear?: boolean;
}

function getPaymentMethodColor(method: string) {
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
}

export function SalesListBase({ sales, summary, title, isAdmin, isLoading, onClear, showClear }: SalesListBaseProps) {
	const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
	const [isSaleDetailOpen, setIsSaleDetailOpen] = useState(false);
	const [editingSale, setEditingSale] = useState<Sale | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<Card className="bg-muted/50">
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-lg font-semibold">{title}</h3>
							<p className="text-sm text-muted-foreground">
								{(summary?.totalSales ?? sales.length).toLocaleString()} transactions • KSH {(summary?.totalAmount ?? sales.reduce((s, x) => s + x.totalAmount, 0)).toLocaleString()}
							</p>
						</div>
						<div className="text-right">
							<p className="text-sm text-muted-foreground">Average per sale</p>
							<p className="text-lg font-semibold">
								{(() => {
									const count = summary?.totalSales ?? sales.length;
									const amount = summary?.totalAmount ?? sales.reduce((s, x) => s + x.totalAmount, 0);
									return `KSH ${count > 0 ? Math.round(amount / count).toLocaleString() : '0'}`;
								})()}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Sales */}
			{sales.map((sale: Sale) => (
				<Card key={sale.id} className="hover:shadow-lg transition-all duration-300">
					<CardContent className="p-6">
						<div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
							<div className="flex items-start space-x-4">
								<div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
									<ReceiptIcon className="h-6 w-6 text-primary" />
								</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-center space-x-2 mb-1">
										<h3 className="font-semibold text-lg">#{sale.id}</h3>
										<Badge className={cn("text-xs", getPaymentMethodColor(sale.paymentType))}>
											{sale.paymentType}
										</Badge>
									</div>
									<p className="text-muted-foreground">{sale.customer.name}{sale.customer.phone ? ` • ${sale.customer.phone}` : ''}</p>
									<div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
										<span className="flex items-center">
											<Calendar className="h-4 w-4 mr-1" />
											{new Date(sale.createdAt).toLocaleDateString()} at {new Date(sale.createdAt).toLocaleTimeString()}
										</span>
										<span>
											{sale.items.reduce((sum, item) => sum + item.quantity, 0)} items
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
									<p className="text-2xl font-bold text-primary">KSH {sale.totalAmount.toLocaleString()}</p>
									<div className="flex gap-1 justify-end">
										<Badge variant="secondary" className="bg-success/10 text-success">Completed</Badge>
										{sale.paidAmount < sale.totalAmount && (
											<Badge className="bg-destructive/10 text-destructive-foreground">Credit</Badge>
										)}
									</div>
								</div>

								<div className="flex space-x-2">
									<Button variant="outline" size="sm" onClick={() => { setSelectedSale(sale); setIsSaleDetailOpen(true); }}>
										<Eye className="h-4 w-4 mr-2" />
										View
									</Button>
									{isAdmin && (
										<Button variant="outline" size="sm" onClick={() => { setEditingSale(sale); setIsEditDialogOpen(true); }}>
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

			{sales.length === 0 && (
				<Card className="p-8">
					<div className="text-center">
						<ReceiptIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">No sales found</h3>
						<p className="text-muted-foreground mb-4">Try adjusting your search or period</p>
						{onClear && (
							<Button variant="outline" onClick={onClear}>
								{showClear ? 'Clear Filters' : 'Clear'}
							</Button>
						)}
					</div>
				</Card>
			)}

			{/* Sale Detail Dialog */}
			<Dialog open={isSaleDetailOpen} onOpenChange={setIsSaleDetailOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Sale Details - #{selectedSale?.id}</DialogTitle>
						<DialogDescription>View detailed information about this sale transaction.</DialogDescription>
					</DialogHeader>
					{selectedSale ? (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-sm font-medium text-muted-foreground">Customer</label>
									<p className="text-lg">{selectedSale.customer.name}</p>
									<p className="text-sm text-muted-foreground">{selectedSale.customer.phone}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-muted-foreground">Date & Time</label>
									<p className="text-lg">{new Date(selectedSale.createdAt).toLocaleDateString()} at {new Date(selectedSale.createdAt).toLocaleTimeString()}</p>
								</div>
								<div>
									<label className="text-sm font-medium text-muted-foreground">Payment Method</label>
									<Badge className={cn("text-xs", getPaymentMethodColor(selectedSale.paymentType))}>{selectedSale.paymentType}</Badge>
								</div>
								<div>
									<label className="text-sm font-medium text-muted-foreground">Sale Made By</label>
									<p className="text-lg">{selectedSale.user?.name || 'N/A'}</p>
								</div>
							</div>

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
										<div key={index} className="flex justify-between p-2 bg-muted rounded">
											<div>
												<span className="font-medium">{item.item?.name || "Item"}</span>
												<span className="text-muted-foreground ml-2">{item.quantity}x KSH {item.price}</span>
											</div>
											<span className="font-medium">KSH {(item.quantity * item.price).toLocaleString()}</span>
										</div>
									))}
								</div>
								<div className="border-t mt-4 pt-4">
									{selectedSale.discount > 0 && (
										<>
											<div className="flex justify-between text-lg">
												<span>Subtotal:</span>
												<span>KSH {(selectedSale.totalAmount + selectedSale.discount).toLocaleString()}</span>
											</div>
											<div className="flex justify-between text-sm text-muted-foreground">
												<span>Discount:</span>
												<span>-KSH {selectedSale.discount.toLocaleString()}</span>
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
												<span>KSH {selectedSale.paidAmount.toLocaleString()}</span>
											</div>
											<div className="flex justify-between text-lg font-bold text-warning">
												<span>Outstanding:</span>
												<span>KSH {(selectedSale.totalAmount - selectedSale.paidAmount).toLocaleString()}</span>
											</div>
										</>
									)}
								</div>
							</div>
						</div>
					) : null}
				</DialogContent>
			</Dialog>

			{/* Edit Sale Dialog */}
			<EditSaleDialog
				sale={editingSale}
				isOpen={isEditDialogOpen}
				onClose={() => { setIsEditDialogOpen(false); setEditingSale(null); }}
			/>
		</div>
	);
}