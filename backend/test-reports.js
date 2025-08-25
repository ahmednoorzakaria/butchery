const axios = require('axios');

// Test the new professional reporting system
async function testReports() {
  const baseURL = 'http://localhost:3000';
  
  try {
    console.log('🧪 Testing Professional Reports System...\n');
    
    // Test 1: Get available report formats
    console.log('1️⃣ Testing report formats endpoint...');
    try {
      const formatsResponse = await axios.get(`${baseURL}/professional-reports/formats`);
      console.log('✅ Report formats:', formatsResponse.data);
    } catch (error) {
      console.log('❌ Report formats error:', error.response?.data || error.message);
    }
    
    console.log('\n2️⃣ Testing Excel report generation...');
    try {
      const excelResponse = await axios.get(`${baseURL}/professional-reports/excel/2024-01-15`, {
        responseType: 'arraybuffer'
      });
      console.log('✅ Excel report generated successfully!');
      console.log('   Size:', excelResponse.data.length, 'bytes');
      console.log('   Content-Type:', excelResponse.headers['content-type']);
    } catch (error) {
      console.log('❌ Excel report error:', error.response?.data || error.message);
    }
    
    console.log('\n3️⃣ Testing PDF report generation...');
    try {
      const pdfResponse = await axios.get(`${baseURL}/professional-reports/pdf/2024-01-15`, {
        responseType: 'arraybuffer'
      });
      console.log('✅ PDF report generated successfully!');
      console.log('   Size:', pdfResponse.data.length, 'bytes');
      console.log('   Content-Type:', pdfResponse.headers['content-type']);
    } catch (error) {
      console.log('❌ PDF report error:', error.response?.data || error.message);
    }
    
    console.log('\n4️⃣ Testing daily reports Excel endpoint...');
    try {
      const dailyExcelResponse = await axios.get(`${baseURL}/daily-reports/download/2024-01-15`, {
        responseType: 'arraybuffer'
      });
      console.log('✅ Daily Excel report generated successfully!');
      console.log('   Size:', dailyExcelResponse.data.length, 'bytes');
      console.log('   Content-Type:', dailyExcelResponse.headers['content-type']);
    } catch (error) {
      console.log('❌ Daily Excel report error:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 Testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testReports();
