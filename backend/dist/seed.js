"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const faker_1 = require("@faker-js/faker");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seeding...');
    // Create a test user
    const hashedPassword = await bcryptjs_1.default.hash('password123', 10);
    const user = await prisma.user.upsert({
        where: { email: 'admin@butchery.com' },
        update: {},
        create: {
            email: 'admin@butchery.com',
            name: 'Admin User',
            phone: '+254700000000',
            password: hashedPassword,
            role: 'ADMIN',
        },
    });
    console.log('✅ Created user:', user.email);
    // Create test customers
    const customers = [];
    for (let i = 0; i < 10; i++) {
        const customer = await prisma.customer.create({
            data: {
                name: faker_1.faker.person.fullName(),
                phone: faker_1.faker.phone.number(),
            },
        });
        customers.push(customer);
    }
    console.log('✅ Created', customers.length, 'customers');
    // Create test inventory items
    const inventoryItems = [];
    const categories = ['meat', 'spice', 'egg', 'vegetable'];
    const subtypes = ['leg', 'boneless', 'whole', 'ground'];
    const units = ['kg', 'pcs', 'g', 'dozen'];
    for (let i = 0; i < 20; i++) {
        const item = await prisma.inventoryItem.create({
            data: {
                name: faker_1.faker.commerce.productName(),
                category: faker_1.faker.helpers.arrayElement(categories),
                subtype: faker_1.faker.helpers.arrayElement(subtypes),
                quantity: faker_1.faker.number.int({ min: 5, max: 100 }),
                unit: faker_1.faker.helpers.arrayElement(units),
                basePrice: parseFloat(faker_1.faker.commerce.price({ min: 100, max: 2000 })),
                sellPrice: parseFloat(faker_1.faker.commerce.price({ min: 200, max: 3000 })),
                limitPrice: parseFloat(faker_1.faker.commerce.price({ min: 50, max: 1500 })),
                lowStockLimit: faker_1.faker.number.int({ min: 5, max: 20 }),
            },
        });
        inventoryItems.push(item);
    }
    console.log('✅ Created', inventoryItems.length, 'inventory items');
    // Create test sales
    const sales = [];
    for (let i = 0; i < 50; i++) {
        const customer = faker_1.faker.helpers.arrayElement(customers);
        const sale = await prisma.sale.create({
            data: {
                customerId: customer.id,
                userId: user.id,
                totalAmount: parseFloat(faker_1.faker.commerce.price({ min: 500, max: 10000 })),
                discount: parseFloat(faker_1.faker.commerce.price({ min: 0, max: 500 })),
                paidAmount: parseFloat(faker_1.faker.commerce.price({ min: 400, max: 9500 })),
                paymentType: faker_1.faker.helpers.arrayElement(['CASH', 'MPESA']),
                createdAt: faker_1.faker.date.between({ from: '2024-01-01', to: '2024-12-31' }),
            },
        });
        // Create sale items
        const numItems = faker_1.faker.number.int({ min: 1, max: 5 });
        for (let j = 0; j < numItems; j++) {
            const item = faker_1.faker.helpers.arrayElement(inventoryItems);
            await prisma.saleItem.create({
                data: {
                    saleId: sale.id,
                    itemId: item.id,
                    quantity: faker_1.faker.number.int({ min: 1, max: 10 }),
                    price: item.sellPrice || 0,
                },
            });
        }
        sales.push(sale);
    }
    console.log('✅ Created', sales.length, 'sales with items');
    // Create some customer transactions
    for (let i = 0; i < 20; i++) {
        const customer = faker_1.faker.helpers.arrayElement(customers);
        await prisma.customerTransaction.create({
            data: {
                customerId: customer.id,
                saleId: faker_1.faker.helpers.arrayElement(sales).id,
                amount: parseFloat(faker_1.faker.commerce.price({ min: 100, max: 2000 })),
                reason: faker_1.faker.helpers.arrayElement(['Payment', 'Refund', 'Credit']),
            },
        });
    }
    console.log('✅ Created customer transactions');
    console.log('🎉 Database seeding completed successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
