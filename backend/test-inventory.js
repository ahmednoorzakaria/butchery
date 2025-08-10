const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testInventoryUpdate() {
  try {
    console.log('🧪 Testing Inventory Update System...\n');

    // 1. First, let's check current inventory
    console.log('1. Checking current inventory...');
    const inventoryResponse = await axios.get(`${BASE_URL}/sales/debug/inventory`);
    console.log(`Found ${inventoryResponse.data.totalItems} items in inventory`);
    
    if (inventoryResponse.data.items.length === 0) {
      console.log('❌ No inventory items found. Please add some items first.');
      return;
    }

    // 2. Select the first item for testing
    const testItem = inventoryResponse.data.items[0];
    console.log(`\n2. Selected test item: ${testItem.name} (ID: ${testItem.id})`);
    console.log(`   Current stock: ${testItem.quantity} ${testItem.unit}`);
    
    if (testItem.quantity < 2) {
      console.log('❌ Item has insufficient stock for testing. Please add more stock.');
      return;
    }

    // 3. Create a test sale
    console.log('\n3. Creating test sale...');
    const testSaleData = {
      items: [
        {
          itemId: testItem.id,
          quantity: 1,
          price: testItem.sellPrice || 100
        }
      ],
      discount: 0,
      paidAmount: testItem.sellPrice || 100,
      paymentType: 'CASH'
    };

    const saleResponse = await axios.post(`${BASE_URL}/sales/test-sale`, testSaleData);
    
    if (saleResponse.data.success) {
      console.log('✅ Test sale created successfully!');
      console.log(`   Sale ID: ${saleResponse.data.sale.id}`);
      console.log(`   Inventory updates:`, saleResponse.data.inventoryUpdates);
    } else {
      console.log('❌ Test sale failed:', saleResponse.data.error);
      return;
    }

    // 4. Verify inventory was updated
    console.log('\n4. Verifying inventory update...');
    const updatedInventoryResponse = await axios.get(`${BASE_URL}/sales/debug/inventory/${testItem.id}`);
    const updatedItem = updatedInventoryResponse.data.item;
    
    console.log(`   Before: ${testItem.quantity} ${testItem.unit}`);
    console.log(`   After:  ${updatedItem.quantity} ${updatedItem.unit}`);
    console.log(`   Expected: ${testItem.quantity - 1} ${testItem.unit}`);
    
    if (updatedItem.quantity === testItem.quantity - 1) {
      console.log('✅ Inventory updated correctly!');
    } else {
      console.log('❌ Inventory update failed!');
    }

    // 5. Check transaction history
    console.log('\n5. Checking transaction history...');
    if (updatedInventoryResponse.data.recentTransactions.length > 0) {
      const latestTransaction = updatedInventoryResponse.data.recentTransactions[0];
      console.log(`   Latest transaction: ${latestTransaction.type} - ${latestTransaction.quantity} ${testItem.unit}`);
      console.log('✅ Transaction record created!');
    } else {
      console.log('❌ No transaction records found!');
    }

    console.log('\n🎉 Inventory update test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testInventoryUpdate();
