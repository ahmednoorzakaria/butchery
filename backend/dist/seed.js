"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const faker_1 = require("@faker-js/faker");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const date_fns_1 = require("date-fns");
const prisma_1 = __importDefault(require("./lib/prisma"));
// Real butchery inventory items
const INVENTORY_ITEMS = [
    // Beef
    { name: 'Beef Chuck', category: 'Beef', subtype: 'Chuck', unit: 'kg', basePrice: 450, sellPrice: 550, limitPrice: 400 },
    { name: 'Beef Ribeye', category: 'Beef', subtype: 'Ribeye', unit: 'kg', basePrice: 800, sellPrice: 950, limitPrice: 750 },
    { name: 'Beef Tenderloin', category: 'Beef', subtype: 'Tenderloin', unit: 'kg', basePrice: 1200, sellPrice: 1400, limitPrice: 1100 },
    { name: 'Beef Sirloin', category: 'Beef', subtype: 'Sirloin', unit: 'kg', basePrice: 650, sellPrice: 780, limitPrice: 600 },
    { name: 'Beef Brisket', category: 'Beef', subtype: 'Brisket', unit: 'kg', basePrice: 380, sellPrice: 480, limitPrice: 350 },
    { name: 'Beef Short Ribs', category: 'Beef', subtype: 'Short Ribs', unit: 'kg', basePrice: 420, sellPrice: 520, limitPrice: 380 },
    { name: 'Ground Beef', category: 'Beef', subtype: 'Ground', unit: 'kg', basePrice: 350, sellPrice: 450, limitPrice: 320 },
    { name: 'Beef Liver', category: 'Beef', subtype: 'Offal', unit: 'kg', basePrice: 200, sellPrice: 280, limitPrice: 180 },
    { name: 'Beef Kidneys', category: 'Beef', subtype: 'Offal', unit: 'kg', basePrice: 180, sellPrice: 250, limitPrice: 160 },
    // Goat
    { name: 'Goat Leg', category: 'Goat', subtype: 'Leg', unit: 'kg', basePrice: 400, sellPrice: 500, limitPrice: 370 },
    { name: 'Goat Shoulder', category: 'Goat', subtype: 'Shoulder', unit: 'kg', basePrice: 380, sellPrice: 480, limitPrice: 350 },
    { name: 'Goat Ribs', category: 'Goat', subtype: 'Ribs', unit: 'kg', basePrice: 350, sellPrice: 450, limitPrice: 320 },
    { name: 'Goat Liver', category: 'Goat', subtype: 'Offal', unit: 'kg', basePrice: 180, sellPrice: 250, limitPrice: 160 },
    { name: 'Goat Kidneys', category: 'Goat', subtype: 'Offal', unit: 'kg', basePrice: 160, sellPrice: 220, limitPrice: 140 },
    // Chicken
    { name: 'Whole Chicken', category: 'Chicken', subtype: 'Whole', unit: 'kg', basePrice: 280, sellPrice: 350, limitPrice: 250 },
    { name: 'Chicken Breast', category: 'Chicken', subtype: 'Breast', unit: 'kg', basePrice: 320, sellPrice: 400, limitPrice: 290 },
    { name: 'Chicken Thighs', category: 'Chicken', subtype: 'Thighs', unit: 'kg', basePrice: 250, sellPrice: 320, limitPrice: 230 },
    { name: 'Chicken Wings', category: 'Chicken', subtype: 'Wings', unit: 'kg', basePrice: 200, sellPrice: 280, limitPrice: 180 },
    { name: 'Chicken Drumsticks', category: 'Chicken', subtype: 'Drumsticks', unit: 'kg', basePrice: 220, sellPrice: 300, limitPrice: 200 },
    { name: 'Chicken Gizzards', category: 'Chicken', subtype: 'Offal', unit: 'kg', basePrice: 150, sellPrice: 220, limitPrice: 130 },
    // Lamb
    { name: 'Lamb Chops', category: 'Lamb', subtype: 'Chops', unit: 'kg', basePrice: 600, sellPrice: 750, limitPrice: 550 },
    { name: 'Lamb Leg', category: 'Lamb', subtype: 'Leg', unit: 'kg', basePrice: 550, sellPrice: 680, limitPrice: 500 },
    { name: 'Lamb Shoulder', category: 'Lamb', subtype: 'Shoulder', unit: 'kg', basePrice: 480, sellPrice: 600, limitPrice: 440 },
    // Pork
    { name: 'Pork Chops', category: 'Pork', subtype: 'Chops', unit: 'kg', basePrice: 350, sellPrice: 450, limitPrice: 320 },
    { name: 'Pork Belly', category: 'Pork', subtype: 'Belly', unit: 'kg', basePrice: 300, sellPrice: 400, limitPrice: 270 },
    { name: 'Pork Shoulder', category: 'Pork', subtype: 'Shoulder', unit: 'kg', basePrice: 280, sellPrice: 380, limitPrice: 250 },
    // Eggs
    { name: 'Chicken Eggs', category: 'Eggs', subtype: 'Chicken', unit: 'dozen', basePrice: 120, sellPrice: 150, limitPrice: 100 },
    { name: 'Duck Eggs', category: 'Eggs', subtype: 'Duck', unit: 'dozen', basePrice: 180, sellPrice: 220, limitPrice: 160 },
    // Processed Meats
    { name: 'Beef Sausages', category: 'Processed', subtype: 'Sausages', unit: 'kg', basePrice: 400, sellPrice: 500, limitPrice: 370 },
    { name: 'Chicken Sausages', category: 'Processed', subtype: 'Sausages', unit: 'kg', basePrice: 350, sellPrice: 450, limitPrice: 320 },
    { name: 'Beef Burgers', category: 'Processed', subtype: 'Burgers', unit: 'kg', basePrice: 450, sellPrice: 550, limitPrice: 420 },
    { name: 'Chicken Burgers', category: 'Processed', subtype: 'Burgers', unit: 'kg', basePrice: 380, sellPrice: 480, limitPrice: 350 },
    // Spices and Seasonings
    { name: 'Black Pepper', category: 'Spices', subtype: 'Pepper', unit: 'g', basePrice: 15, sellPrice: 25, limitPrice: 12 },
    { name: 'White Pepper', category: 'Spices', subtype: 'Pepper', unit: 'g', basePrice: 12, sellPrice: 20, limitPrice: 10 },
    { name: 'Garlic Powder', category: 'Spices', subtype: 'Powder', unit: 'g', basePrice: 8, sellPrice: 15, limitPrice: 6 },
    { name: 'Onion Powder', category: 'Spices', subtype: 'Powder', unit: 'g', basePrice: 6, sellPrice: 12, limitPrice: 5 },
    { name: 'Paprika', category: 'Spices', subtype: 'Paprika', unit: 'g', basePrice: 10, sellPrice: 18, limitPrice: 8 },
    { name: 'Cumin', category: 'Spices', subtype: 'Cumin', unit: 'g', basePrice: 20, sellPrice: 30, limitPrice: 18 },
    { name: 'Coriander', category: 'Spices', subtype: 'Coriander', unit: 'g', basePrice: 18, sellPrice: 28, limitPrice: 16 },
    { name: 'Turmeric', category: 'Spices', subtype: 'Turmeric', unit: 'g', basePrice: 12, sellPrice: 20, limitPrice: 10 },
    { name: 'Ginger Powder', category: 'Spices', subtype: 'Powder', unit: 'g', basePrice: 15, sellPrice: 25, limitPrice: 13 },
    { name: 'Cinnamon', category: 'Spices', subtype: 'Cinnamon', unit: 'g', basePrice: 25, sellPrice: 35, limitPrice: 22 },
    // Marinades and Sauces
    { name: 'BBQ Sauce', category: 'Sauces', subtype: 'BBQ', unit: 'ml', basePrice: 80, sellPrice: 120, limitPrice: 70 },
    { name: 'Hot Sauce', category: 'Sauces', subtype: 'Hot', unit: 'ml', basePrice: 60, sellPrice: 100, limitPrice: 50 },
    { name: 'Worcestershire Sauce', category: 'Sauces', subtype: 'Worcestershire', unit: 'ml', basePrice: 100, sellPrice: 150, limitPrice: 90 },
    { name: 'Soy Sauce', category: 'Sauces', subtype: 'Soy', unit: 'ml', basePrice: 70, sellPrice: 110, limitPrice: 60 },
    { name: 'Teriyaki Sauce', category: 'Sauces', subtype: 'Teriyaki', unit: 'ml', basePrice: 90, sellPrice: 140, limitPrice: 80 },
    // Vegetables (for meat accompaniments)
    { name: 'Onions', category: 'Vegetables', subtype: 'Onions', unit: 'kg', basePrice: 40, sellPrice: 60, limitPrice: 35 },
    { name: 'Tomatoes', category: 'Vegetables', subtype: 'Tomatoes', unit: 'kg', basePrice: 60, sellPrice: 90, limitPrice: 50 },
    { name: 'Bell Peppers', category: 'Vegetables', subtype: 'Peppers', unit: 'kg', basePrice: 80, sellPrice: 120, limitPrice: 70 },
    { name: 'Carrots', category: 'Vegetables', subtype: 'Carrots', unit: 'kg', basePrice: 50, sellPrice: 75, limitPrice: 45 },
    { name: 'Potatoes', category: 'Vegetables', subtype: 'Potatoes', unit: 'kg', basePrice: 45, sellPrice: 65, limitPrice: 40 },
    { name: 'Garlic', category: 'Vegetables', subtype: 'Garlic', unit: 'kg', basePrice: 120, sellPrice: 180, limitPrice: 100 },
    { name: 'Ginger', category: 'Vegetables', subtype: 'Ginger', unit: 'kg', basePrice: 150, sellPrice: 220, limitPrice: 130 },
    { name: 'Lemon', category: 'Vegetables', subtype: 'Citrus', unit: 'kg', basePrice: 80, sellPrice: 120, limitPrice: 70 },
    { name: 'Lime', category: 'Vegetables', subtype: 'Citrus', unit: 'kg', basePrice: 90, sellPrice: 130, limitPrice: 80 }
];
// Real Kenyan names for customers
const CUSTOMER_NAMES = [
    'John Kamau', 'Mary Wanjiku', 'David Mwangi', 'Grace Njeri', 'James Kiprop',
    'Sarah Akinyi', 'Michael Ochieng', 'Faith Auma', 'Robert Odhiambo', 'Lucy Adhiambo',
    'Peter Kipchoge', 'Esther Chebet', 'Joseph Kiprotich', 'Hannah Cherono', 'Daniel Kipkoech',
    'Ruth Jepchirchir', 'Stephen Kiprop', 'Joyce Chepkoech', 'Thomas Kiprotich', 'Mercy Jelimo',
    'William Kiprop', 'Agnes Chepkoech', 'Christopher Kiprotich', 'Nancy Chepkoech', 'Kennedy Kiprop',
    'Dorcas Chepkoech', 'Brian Kiprop', 'Violet Chepkoech', 'Kevin Kiprotich', 'Gladys Chepkoech',
    'Dennis Kiprop', 'Beatrice Chepkoech', 'Geoffrey Kiprotich', 'Caroline Chepkoech', 'Philip Kiprop',
    'Margaret Chepkoech', 'Simon Kiprotich', 'Elizabeth Chepkoech', 'Patrick Kiprop', 'Florence Chepkoech',
    'Andrew Kiprotich', 'Christine Chepkoech', 'Mark Kiprop', 'Jane Chepkoech', 'Timothy Kiprotich',
    'Irene Chepkoech', 'Paul Kiprop', 'Rose Chepkoech', 'Martin Kiprotich', 'Ann Chepkoech',
    'Fredrick Kiprop', 'Susan Chepkoech', 'Charles Kiprotich', 'Helen Chepkoech', 'George Kiprop',
    'Alice Chepkoech', 'Richard Kiprotich', 'Betty Chepkoech', 'Edward Kiprop', 'Diana Chepkoech',
    'Frank Kiprotich', 'Eva Chepkoech', 'Henry Kiprop', 'Fiona Chepkoech', 'Victor Kiprotich',
    'Gloria Chepkoech', 'Walter Kiprop', 'Hilda Chepkoech', 'Raymond Kiprotich', 'Iris Chepkoech',
    'Stanley Kiprop', 'Janet Chepkoech', 'Gordon Kiprotich', 'Karen Chepkoech', 'Harold Kiprop',
    'Laura Chepkoech', 'Leonard Kiprotich', 'Martha Chepkoech', 'Norman Kiprop', 'Nora Chepkoech',
    'Oscar Kiprotich', 'Olive Chepkoech', 'Percy Kiprop', 'Pamela Chepkoech', 'Quentin Kiprotich',
    'Queenie Chepkoech', 'Reginald Kiprop', 'Ruby Chepkoech', 'Sidney Kiprotich', 'Sylvia Chepkoech',
    'Trevor Kiprop', 'Tracy Chepkoech', 'Ulysses Kiprotich', 'Una Chepkoech', 'Vincent Kiprop',
    'Vera Chepkoech', 'Warren Kiprop', 'Wendy Chepkoech', 'Xavier Kiprop', 'Xena Chepkoech',
    'Yusuf Kiprop', 'Yvonne Chepkoech', 'Zachary Kiprotich', 'Zara Chepkoech', 'Abel Kiprop',
    'Abigail Chepkoech', 'Benjamin Kiprotich', 'Bella Chepkoech', 'Caleb Kiprop', 'Clara Chepkoech',
    'Daniel Kiprotich', 'Daisy Chepkoech', 'Eli Kiprop', 'Emma Chepkoech', 'Felix Kiprotich',
    'Flora Chepkoech', 'Gabriel Kiprop', 'Grace Chepkoech', 'Hudson Kiprotich', 'Hope Chepkoech',
    'Isaac Kiprop', 'Ivy Chepkoech', 'Jack Kiprop', 'Jade Chepkoech', 'Kai Kiprotich',
    'Kate Chepkoech', 'Leo Kiprop', 'Lily Chepkoech', 'Max Kiprop', 'Maya Chepkoech',
    'Noah Kiprop', 'Nova Chepkoech', 'Owen Kiprop', 'Opal Chepkoech', 'Pax Kiprop',
    'Pearl Chepkoech', 'Quill Kiprop', 'Quinn Chepkoech', 'Rex Kiprop', 'Rose Chepkoech',
    'Sam Kiprop', 'Sage Chepkoech', 'Tate Kiprop', 'Tara Chepkoech', 'Uri Kiprotich',
    'Uma Chepkoech', 'Vale Kiprop', 'Vera Chepkoech', 'Wade Kiprop', 'Wren Chepkoech',
    'Xander Kiprop', 'Xena Chepkoech', 'York Kiprop', 'Yara Chepkoech', 'Zane Kiprop',
    'Zara Chepkoech', 'Aiden Kiprop', 'Aria Chepkoech', 'Blake Kiprop', 'Briar Chepkoech',
    'Cade Kiprop', 'Cora Chepkoech', 'Dane Kiprop', 'Dove Chepkoech', 'Echo Kiprop',
    'Eve Chepkoech', 'Finn Kiprop', 'Faye Chepkoech', 'Gage Kiprop', 'Gwen Chepkoech',
    'Hale Kiprop', 'Hazel Chepkoech', 'Ike Kiprop', 'Iris Chepkoech', 'Jace Kiprop',
    'Jade Chepkoech', 'Kade Kiprop', 'Kate Chepkoech', 'Lane Kiprop', 'Luna Chepkoech',
    'Mace Kiprop', 'Maya Chepkoech', 'Nate Kiprop', 'Nova Chepkoech', 'Owen Kiprop',
    'Opal Chepkoech', 'Pace Kiprop', 'Pearl Chepkoech', 'Quade Kiprop', 'Quinn Chepkoech',
    'Race Kiprop', 'Rose Chepkoech', 'Sage Kiprop', 'Sage Chepkoech', 'Tate Kiprop',
    'Tara Chepkoech', 'Ude Kiprop', 'Uma Chepkoech', 'Vale Kiprop', 'Vera Chepkoech',
    'Wade Kiprop', 'Wren Chepkoech', 'Xade Kiprop', 'Xena Chepkoech', 'Yade Kiprop',
    'Yara Chepkoech', 'Zade Kiprop', 'Zara Chepkoech'
];
// Payment types
const PAYMENT_TYPES = ['CASH', 'MPESA'];
// Transaction reasons
const TRANSACTION_REASONS = ['Payment', 'Refund', 'Credit', 'Partial Payment', 'Balance Settlement'];
async function main() {
    console.log('🌱 Starting comprehensive database seeding...');
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await prisma_1.default.customerTransaction.deleteMany();
    await prisma_1.default.saleItem.deleteMany();
    await prisma_1.default.sale.deleteMany();
    await prisma_1.default.inventoryTransaction.deleteMany();
    await prisma_1.default.inventoryItem.deleteMany();
    await prisma_1.default.customer.deleteMany();
    await prisma_1.default.user.deleteMany();
    await prisma_1.default.expense.deleteMany();
    // Create users Ahmed and Jon
    console.log('👥 Creating users...');
    const hashedPassword = await bcryptjs_1.default.hash('password123', 10);
    const ahmed = await prisma_1.default.user.create({
        data: {
            email: 'ahmed@butchery.com',
            name: 'Ahmed Hassan',
            phone: '+254700000001',
            password: hashedPassword,
            role: 'SALES',
        },
    });
    const jon = await prisma_1.default.user.create({
        data: {
            email: 'jon@butchery.com',
            name: 'Jon Smith',
            phone: '+254700000002',
            password: hashedPassword,
            role: 'SALES',
        },
    });
    console.log('✅ Created users:', ahmed.name, 'and', jon.name);
    // Create inventory items
    console.log('📦 Creating inventory items...');
    const inventoryItems = [];
    for (const itemData of INVENTORY_ITEMS) {
        const item = await prisma_1.default.inventoryItem.create({
            data: {
                ...itemData,
                quantity: faker_1.faker.number.int({ min: 20, max: 200 }),
                lowStockLimit: faker_1.faker.number.int({ min: 10, max: 30 }),
            },
        });
        inventoryItems.push(item);
    }
    console.log('✅ Created', inventoryItems.length, 'inventory items');
    // Create customers
    console.log('👥 Creating customers...');
    const customers = [];
    for (const name of CUSTOMER_NAMES) {
        const customer = await prisma_1.default.customer.create({
            data: {
                name,
                phone: `+254${faker_1.faker.number.int({ min: 700000000, max: 799999999 })}`,
            },
        });
        customers.push(customer);
    }
    console.log('✅ Created', customers.length, 'customers');
    // Create sales spanning the last 3 months
    console.log('💰 Creating sales...');
    const sales = [];
    const threeMonthsAgo = (0, date_fns_1.subMonths)(new Date(), 3);
    const today = new Date();
    for (let i = 0; i < 3000; i++) {
        // Generate random date within the last 3 months
        const randomDate = faker_1.faker.date.between({ from: threeMonthsAgo, to: today });
        // Randomly select customer and user
        const customer = faker_1.faker.helpers.arrayElement(customers);
        const user = faker_1.faker.helpers.arrayElement([ahmed, jon]);
        // Generate realistic sale amounts based on butchery business
        const baseAmount = faker_1.faker.number.float({ min: 200, max: 5000, fractionDigits: 2 });
        const discount = faker_1.faker.number.float({ min: 0, max: baseAmount * 0.15, fractionDigits: 2 });
        const totalAmount = baseAmount;
        const paidAmount = totalAmount - discount;
        const sale = await prisma_1.default.sale.create({
            data: {
                customerId: customer.id,
                userId: user.id,
                totalAmount,
                discount,
                paidAmount,
                paymentType: faker_1.faker.helpers.arrayElement(PAYMENT_TYPES),
                notes: faker_1.faker.helpers.maybe(() => faker_1.faker.lorem.sentence(), { probability: 0.3 }),
                createdAt: randomDate,
            },
        });
        // Create sale items (1-6 items per sale)
        const numItems = faker_1.faker.number.int({ min: 1, max: 6 });
        const selectedItems = faker_1.faker.helpers.arrayElements(inventoryItems, numItems);
        for (const item of selectedItems) {
            const quantity = faker_1.faker.number.float({ min: 0.5, max: 5, fractionDigits: 1 });
            const price = item.sellPrice || 0;
            await prisma_1.default.saleItem.create({
                data: {
                    saleId: sale.id,
                    itemId: item.id,
                    quantity,
                    price,
                },
            });
        }
        sales.push(sale);
        // Progress indicator
        if ((i + 1) % 500 === 0) {
            console.log(`   Created ${i + 1} sales...`);
        }
    }
    console.log('✅ Created', sales.length, 'sales with items');
    // Create inventory transactions for stock management
    console.log('📊 Creating inventory transactions...');
    for (const item of inventoryItems) {
        // Create some stock-in transactions
        const stockInCount = faker_1.faker.number.int({ min: 3, max: 8 });
        for (let i = 0; i < stockInCount; i++) {
            const transactionDate = faker_1.faker.date.between({ from: threeMonthsAgo, to: today });
            await prisma_1.default.inventoryTransaction.create({
                data: {
                    itemId: item.id,
                    type: 'STOCK_IN',
                    quantity: faker_1.faker.number.int({ min: 50, max: 200 }),
                    createdAt: transactionDate,
                },
            });
        }
        // Create some stock-out transactions
        const stockOutCount = faker_1.faker.number.int({ min: 2, max: 6 });
        for (let i = 0; i < stockOutCount; i++) {
            const transactionDate = faker_1.faker.date.between({ from: threeMonthsAgo, to: today });
            await prisma_1.default.inventoryTransaction.create({
                data: {
                    itemId: item.id,
                    type: 'STOCK_OUT',
                    quantity: faker_1.faker.number.int({ min: 10, max: 50 }),
                    createdAt: transactionDate,
                },
            });
        }
    }
    console.log('✅ Created inventory transactions');
    // Create customer transactions
    console.log('💳 Creating customer transactions...');
    for (let i = 0; i < 500; i++) {
        const customer = faker_1.faker.helpers.arrayElement(customers);
        const sale = faker_1.faker.helpers.arrayElement(sales);
        await prisma_1.default.customerTransaction.create({
            data: {
                customerId: customer.id,
                saleId: sale.id,
                amount: faker_1.faker.number.float({ min: 100, max: 2000, fractionDigits: 2 }),
                reason: faker_1.faker.helpers.arrayElement(TRANSACTION_REASONS),
                createdAt: faker_1.faker.date.between({ from: threeMonthsAgo, to: today }),
            },
        });
    }
    console.log('✅ Created customer transactions');
    // Create some expenses
    console.log('💸 Creating expenses...');
    const expenseCategories = ['Rent', 'Utilities', 'Supplies', 'Equipment', 'Transport', 'Marketing', 'Insurance', 'Maintenance'];
    const expenseReasons = [
        'Monthly rent payment',
        'Electricity bill',
        'Water bill',
        'Meat supplier payment',
        'Equipment maintenance',
        'Fuel for delivery vehicle',
        'Marketing materials',
        'Insurance premium',
        'Cleaning supplies',
        'Packaging materials',
        'Refrigeration maintenance',
        'Security services'
    ];
    for (let i = 0; i < 100; i++) {
        const expenseDate = faker_1.faker.date.between({ from: threeMonthsAgo, to: today });
        await prisma_1.default.expense.create({
            data: {
                amount: faker_1.faker.number.float({ min: 500, max: 50000, fractionDigits: 2 }),
                reason: faker_1.faker.helpers.arrayElement(expenseReasons),
                recipient: faker_1.faker.company.name(),
                date: expenseDate,
                notes: faker_1.faker.helpers.maybe(() => faker_1.faker.lorem.sentence(), { probability: 0.4 }),
                category: faker_1.faker.helpers.arrayElement(expenseCategories),
                createdAt: expenseDate,
                updatedAt: expenseDate,
            },
        });
    }
    console.log('✅ Created expenses');
    console.log('🎉 Comprehensive database seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Users: 2 (${ahmed.name}, ${jon.name})`);
    console.log(`   - Inventory Items: ${inventoryItems.length}`);
    console.log(`   - Customers: ${customers.length}`);
    console.log(`   - Sales: ${sales.length}`);
    console.log(`   - Sales span: ${(0, date_fns_1.format)(threeMonthsAgo, 'MMM dd, yyyy')} to ${(0, date_fns_1.format)(today, 'MMM dd, yyyy')}`);
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma_1.default.$disconnect();
});
