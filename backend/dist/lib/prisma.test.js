"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./prisma"));
const prisma_2 = __importDefault(require("./prisma"));
// Test that we're getting the same instance
console.log('Testing centralized Prisma client...');
console.log('prisma1 === prisma2:', prisma_1.default === prisma_2.default);
console.log('prisma1 instance ID:', prisma_1.default.$connect);
console.log('prisma2 instance ID:', prisma_2.default.$connect);
// Test database connection
async function testConnection() {
    try {
        await prisma_1.default.$connect();
        console.log('✅ Database connection successful');
        // Test a simple query
        const userCount = await prisma_1.default.user.count();
        console.log(`✅ Database query successful. User count: ${userCount}`);
        await prisma_1.default.$disconnect();
        console.log('✅ Database disconnected successfully');
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
    }
}
testConnection();
