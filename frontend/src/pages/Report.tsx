import { useEffect, useState } from "react";
import { reportsAPI } from "@/services/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export const Report = () => {
  const [daily, setDaily] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [balances, setBalances] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [inventoryUsage, setInventoryUsage] = useState([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  useEffect(() => {
    reportsAPI.getDailySales().then((res) => setDaily(res.data));
    reportsAPI.getWeeklySales().then((res) => setWeekly(res.data));
    reportsAPI.getOutstandingBalances().then((res) => setBalances(res.data));
    reportsAPI.getInventoryUsage().then((res) => setInventoryUsage(res.data));
  }, []);

  const fetchTopProducts = () => {
    reportsAPI.getTopProducts(start, end).then((res) => setTopProducts(res.data));
  };

  return (
    <div className="grid gap-4 p-4">
      {/* Daily Sales */}
      <Card>
        <CardHeader className="text-xl font-bold">📅 Daily Sales</CardHeader>
        <CardContent>
          {daily ? (
            <div>
              <p>Total Sales: {daily.totalSales}</p>
              <p>Total Paid: {daily.totalPaid}</p>
              <p>Discounts: {daily.totalDiscount}</p>
              <p>Number of Sales: {daily.numberOfSales}</p>
            </div>
          ) : <p>Loading...</p>}
        </CardContent>
      </Card>

      {/* Weekly Sales */}
      <Card>
        <CardHeader className="text-xl font-bold">🗓 Weekly Sales</CardHeader>
        <CardContent>
          {weekly ? (
            <div>
              <p>Total Sales: {weekly.totalSales}</p>
              <p>Total Paid: {weekly.totalPaid}</p>
              <p>Discounts: {weekly.totalDiscount}</p>
              <p>Number of Sales: {weekly.numberOfSales}</p>
            </div>
          ) : <p>Loading...</p>}
        </CardContent>
      </Card>

      {/* Outstanding Balances */}
      <Card>
        <CardHeader className="text-xl font-bold">❗ Outstanding Balances</CardHeader>
        <CardContent>
          {balances.length > 0 ? (
            <ul className="space-y-2">
              {balances.map((bal) => (
                <li key={bal.customerId}>
                  {bal.name} - Balance: {bal.balance}
                </li>
              ))}
            </ul>
          ) : <p>No outstanding balances.</p>}
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card>
        <CardHeader className="text-xl font-bold">📦 Top Products</CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            <Button onClick={fetchTopProducts}>Fetch</Button>
          </div>
          <ul>
            {topProducts.length > 0 ? (
              topProducts.map((product, index) => (
                <li key={index}>
                  {product.name} — Sold: {product.quantity}
                </li>
              ))
            ) : (
              <p>No data</p>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Inventory Usage */}
      <Card>
        <CardHeader className="text-xl font-bold">📉 Inventory Usage</CardHeader>
        <CardContent>
          {inventoryUsage.length > 0 ? (
            <ul className="space-y-1">
              {inventoryUsage.map((item) => (
                <li key={item.itemId}>
                  {item.name} — Used: {item.used}
                </li>
              ))}
            </ul>
          ) : <p>No inventory usage recorded.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default Report;