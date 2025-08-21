# Sales API Pagination Guide

## 🚀 What's New

The sales endpoints now support pagination to prevent large responses that cause timeouts and performance issues.

## 📍 Updated Endpoints

### 1. `/sales` - Main Sales Endpoint (Paginated)

**Before:** Returned ALL sales (causing 400KB+ responses)
**After:** Returns paginated results with metadata

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 50, max: 100)
- `start` (optional): Start date filter
- `end` (optional): End date filter

**Response Format:**
```json
{
  "sales": [...], // Array of sale objects
  "pagination": {
    "currentPage": 1,
    "pageSize": 50,
    "totalCount": 1250,
    "totalPages": 25,
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextPage": 2,
    "prevPage": null
  },
  "filters": {
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-07T23:59:59.999Z"
  }
}
```

### 2. `/sales/count` - Get Total Count

**Purpose:** Get total number of sales for pagination UI
**Response:** Lightweight count without fetching sales data

**Query Parameters:**
- `start` (optional): Start date filter
- `end` (optional): End date filter

**Response Format:**
```json
{
  "totalCount": 1250,
  "filters": {
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-07T23:59:59.999Z"
  }
}
```

### 3. `/sales/summary` - Lightweight Sales Summary

**Purpose:** Dashboard view with minimal data (no detailed items)
**Benefits:** Much smaller response size, faster loading

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 100, max: 200)
- `start` (optional): Start date filter
- `end` (optional): End date filter

**Response Format:**
```json
{
  "sales": [
    {
      "id": 1,
      "totalAmount": 5000,
      "paidAmount": 5000,
      "discount": 0,
      "paymentType": "CASH",
      "createdAt": "2024-01-01T10:00:00.000Z",
      "customer": {
        "id": 1,
        "name": "John Doe",
        "phone": "+1234567890"
      },
      "user": {
        "id": 1,
        "name": "Sales User"
      },
      "_count": {
        "items": 3
      }
    }
  ],
  "pagination": { ... },
  "filters": { ... }
}
```

### 4. `/sales/filter` - Filtered Sales (Paginated)

**Purpose:** Customer-specific sales with pagination
**Query Parameters:** Same as main endpoint + `customerId`

### 5. `/customers` - Customers List (Paginated)

**Purpose:** Get paginated list of customers with search
**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 100, max: 200)
- `search` (optional): Search by name or phone

**Response Format:**
```json
{
  "customers": [...], // Array of customer objects
  "pagination": {
    "currentPage": 1,
    "pageSize": 100,
    "totalCount": 450,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextPage": 2,
    "prevPage": null
  },
  "filters": {
    "search": "john"
  }
}
```

### 6. `/customers/count` - Get Total Customers Count

**Purpose:** Get total number of customers for pagination UI
**Query Parameters:**
- `search` (optional): Search by name or phone

**Response Format:**
```json
{
  "totalCount": 450,
  "filters": {
    "search": "john"
  }
}
```

## 🔧 Frontend Implementation

### React Query Example
```javascript
import { useQuery } from '@tanstack/react-query';

const useSales = (page = 1, pageSize = 50, startDate, endDate) => {
  return useQuery({
    queryKey: ['sales', page, pageSize, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(startDate && { start: startDate }),
        ...(endDate && { end: endDate })
      });
      
      const response = await fetch(`/api/sales?${params}`);
      return response.json();
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60, // 1 minute
  });
};
```

### Pagination Component Example
```javascript
const SalesPagination = ({ pagination, onPageChange }) => {
  const { currentPage, totalPages, hasNextPage, hasPrevPage } = pagination;
  
  return (
    <div className="pagination">
      <button 
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrevPage}
      >
        Previous
      </button>
      
      <span>Page {currentPage} of {totalPages}</span>
      
      <button 
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
      >
        Next
      </button>
    </div>
  );
};
```

## 📊 Performance Improvements

### Before (No Pagination)
- **Response Size:** 400KB+ for large datasets
- **Load Time:** 10+ seconds
- **Memory Usage:** High
- **User Experience:** Poor (timeouts, crashes)

### After (With Pagination)
- **Response Size:** 5-20KB per page
- **Load Time:** <500ms
- **Memory Usage:** Low
- **User Experience:** Smooth, responsive

## 🚨 Migration Notes

### Breaking Changes
- `/sales` now returns `{ sales, pagination, filters }` instead of just `sales[]`
- `/sales/filter` now returns the same paginated format
- `/customers` now returns `{ customers, pagination, filters }` instead of just `customers[]`

### Backward Compatibility
- Default page size is 50 (reasonable for most use cases)
- Date filters work the same way
- All existing sale data is preserved

## 🧪 Testing

Run the test script to verify pagination:
```bash
cd backend
node test-pagination.js
```

## 🔍 Monitoring

Check your server logs for:
- Response times (should be <500ms)
- Response sizes (should be <50KB)
- No more `ECONNABORTED` errors
- No more 500 Internal Server Errors

## 💡 Best Practices

1. **Use `/sales/summary` for dashboards** - Much faster loading
2. **Implement infinite scroll or pagination UI** - Don't load all data at once
3. **Cache paginated results** - Use React Query's built-in caching
4. **Set reasonable page sizes** - 50-100 items per page is optimal
5. **Use the count endpoint** - For pagination UI without fetching data

## 🆘 Troubleshooting

### Still getting timeouts?
- Check if you're using the new paginated endpoints
- Verify page size is reasonable (≤100)
- Check database performance

### Response format issues?
- Update frontend to handle new paginated response structure
- Use `response.data.sales` instead of `response.data`

### Need to load all sales?
- Use multiple paginated requests
- Consider implementing a bulk export endpoint for reports
