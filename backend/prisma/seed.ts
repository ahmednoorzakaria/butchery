// prisma/seed.ts

import { PrismaClient, PaymentType, TransactionType } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seeding...');

  // 1. Create Inventory Items
  const inventoryItems = await Promise.all(
    Array.from({ length: 50 }).map(() =>
      prisma.inventoryItem.create({
        data: {
          name: faker.commerce.productName(),
          category: faker.helpers.arrayElement(['meat', 'spice', 'egg']),
          subtype: faker.commerce.productMaterial(),
          quantity: faker.number.int({ min: 10, max: 200 }),
          unit: faker.helpers.arrayElement(['kg', 'pcs']),
          price: parseFloat(faker.commerce.price({ min: 100, max: 2000 })),
        },
      })
    )
  );

  // 2. Create Customers
  const customers = await Promise.all(
    Array.from({ length: 100 }).map(() =>
      prisma.customer.create({
        data: {
          name: faker.person.fullName(),
          phone: faker.phone.number('07########'),
        },
      })
    )
  );

  // 3. Create Sales
  for (let i = 0; i < 300; i++) {
    const customer = faker.helpers.arrayElement(customers);
    const item = faker.helpers.arrayElement(inventoryItems);
    const quantity = faker.number.int({ min: 1, max: 5 });
    const price = item.price;
    const discount = parseFloat((Math.random() * 100).toFixed(2));
    const totalAmount = quantity * price - discount;
    const paidAmount = totalAmount;

    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        totalAmount,
        discount,
        paidAmount,
        paymentType: faker.helpers.arrayElement(Object.values(PaymentType)),
        items: {
          create: [
            {
              itemId: item.id,
              quantity,
              price,
            },
          ],
        },
      },
    });

    // Optional: Add a transaction record for customer
    await prisma.customerTransaction.create({
      data: {
        customerId: customer.id,
        amount: paidAmount,
        reason: `Payment for sale ${sale.id}`,
      },
    });

    // Optional: Reduce inventory (simulate STOCK_OUT)
    await prisma.inventoryTransaction.create({
      data: {
        itemId: item.id,
        quantity,
        type: TransactionType.STOCK_OUT,
      },
    });
  }

  console.log('✅ Done seeding');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
