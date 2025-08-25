"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const professionalReportService_1 = require("../services/professionalReportService");
const router = (0, express_1.Router)();
const reportService = new professionalReportService_1.ProfessionalReportService();
// GET /professional-reports/excel/:date - Generate and download Excel report
router.get("/excel/:date", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { date } = req.params;
        const reportDate = date ? new Date(date) : new Date();
        const excelBuffer = await reportService.generateExcelReport(reportDate);
        const fileName = `professional-report-${date || new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', excelBuffer.length);
        res.send(excelBuffer);
    }
    catch (error) {
        console.error("Error generating Excel report:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /professional-reports/pdf/:date - Generate and download PDF report
router.get("/pdf/:date", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { date } = req.params;
        const reportDate = date ? new Date(date) : new Date();
        const pdfBuffer = await reportService.generateHTMLPDFReport(reportDate);
        const fileName = `professional-report-${date || new Date().toISOString().split('T')[0]}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error("Error generating PDF report:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /professional-reports/preview/:date - Preview report in browser
router.get("/preview/:date", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { date, type = 'pdf' } = req.query;
        const reportDate = date ? new Date(date) : new Date();
        if (type === 'excel') {
            const excelBuffer = await reportService.generateExcelReport(reportDate);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Length', excelBuffer.length);
            res.send(excelBuffer);
        }
        else {
            const pdfBuffer = await reportService.generateHTMLPDFReport(reportDate);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Length', pdfBuffer.length);
            res.send(pdfBuffer);
        }
    }
    catch (error) {
        console.error("Error previewing report:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// POST /professional-reports/generate - Generate report with custom options
router.post("/generate", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { date, type = 'excel', includeCharts = true } = req.body;
        const reportDate = date ? new Date(date) : new Date();
        let reportBuffer;
        let fileName;
        let contentType;
        if (type === 'pdf') {
            reportBuffer = await reportService.generateHTMLPDFReport(reportDate);
            fileName = `professional-report-${reportDate.toISOString().split('T')[0]}.pdf`;
            contentType = 'application/pdf';
        }
        else {
            reportBuffer = await reportService.generateExcelReport(reportDate);
            fileName = `professional-report-${reportDate.toISOString().split('T')[0]}.xlsx`;
            contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        }
        res.json({
            success: true,
            message: "Report generated successfully",
            fileName,
            contentType,
            size: reportBuffer.length,
            downloadUrl: `/professional-reports/${type === 'pdf' ? 'pdf' : 'excel'}/${reportDate.toISOString().split('T')[0]}`
        });
    }
    catch (error) {
        console.error("Error generating report:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /professional-reports/formats - Get available report formats
router.get("/formats", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const formats = [
            {
                id: 'excel',
                name: 'Excel Spreadsheet (.xlsx)',
                description: 'Professional Excel report with multiple worksheets, formatting, and formulas',
                features: [
                    'Multiple worksheets (Executive Summary, Sales Analysis, Financial Analysis, etc.)',
                    'Professional formatting with colors and borders',
                    'Formatted numbers and percentages',
                    'Conditional formatting for alerts',
                    'Easy to analyze and manipulate data',
                    'Compatible with all spreadsheet applications'
                ],
                icon: '📊',
                color: '#059669'
            },
            {
                id: 'pdf',
                name: 'PDF Document (.pdf)',
                description: 'Beautiful HTML-based PDF with modern styling and responsive design',
                features: [
                    'Modern, professional design',
                    'Responsive layout',
                    'Color-coded sections',
                    'Easy to read and print',
                    'Consistent formatting across devices',
                    'Professional appearance for sharing'
                ],
                icon: '📄',
                color: '#dc2626'
            }
        ];
        res.json({ formats });
    }
    catch (error) {
        console.error("Error getting report formats:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// GET /professional-reports/sample/:type - Get sample report for preview
router.get("/sample/:type", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { type } = req.params;
        const sampleDate = new Date('2024-01-15'); // Use a sample date
        if (type === 'excel') {
            const excelBuffer = await reportService.generateExcelReport(sampleDate);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="sample-report.xlsx"`);
            res.setHeader('Content-Length', excelBuffer.length);
            res.send(excelBuffer);
        }
        else if (type === 'pdf') {
            const pdfBuffer = await reportService.generateHTMLPDFReport(sampleDate);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="sample-report.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.send(pdfBuffer);
        }
        else {
            res.status(400).json({ error: "Invalid report type. Use 'excel' or 'pdf'" });
        }
    }
    catch (error) {
        console.error("Error generating sample report:", error);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
