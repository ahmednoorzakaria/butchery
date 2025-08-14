import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dailyReportsAPI } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layout } from "@/components/layout/Layout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Download, 
  Eye, 
  Play, 
  Settings, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Send
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface SchedulerStatus {
  isRunning: boolean;
  nextRun: string;
  timezone: string;
}

interface EmailConfiguration {
  emailUser: string | null;
  emailService: string;
  hasPassword: boolean;
  timezone: string;
}

export const DailyReports = () => {
  const [emailConfig, setEmailConfig] = useState({
    emailUser: '',
    emailPassword: '',
    emailService: 'gmail'
  });
  const [testEmail, setTestEmail] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch scheduler status
  const { data: status, isLoading: statusLoading } = useQuery<SchedulerStatus>({
    queryKey: ['scheduler-status'],
    queryFn: () => dailyReportsAPI.getStatus().then(res => res.data),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch email configuration
  const { data: config, isLoading: configLoading } = useQuery<EmailConfiguration>({
    queryKey: ['email-config'],
    queryFn: () => dailyReportsAPI.getConfiguration().then(res => res.data),
  });

  // Update email configuration when config data changes
  useEffect(() => {
    if (config) {
      setEmailConfig(prev => ({
        ...prev,
        emailUser: config.emailUser || '',
        emailService: config.emailService
      }));
    }
  }, [config]);

  // Mutations
  const triggerReportMutation = useMutation({
    mutationFn: (email?: string) => dailyReportsAPI.triggerReport(email),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['scheduler-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to trigger report",
        variant: "destructive",
      });
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: (email: string) => dailyReportsAPI.testEmail(email),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to send test email",
        variant: "destructive",
      });
    },
  });

  const configureEmailMutation = useMutation({
    mutationFn: (config: any) => dailyReportsAPI.configureEmail(config),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['email-config'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to configure email",
        variant: "destructive",
      });
    },
  });

  const handleTriggerReport = () => {
    if (recipientEmail) {
      triggerReportMutation.mutate(recipientEmail);
    } else {
      triggerReportMutation.mutate();
    }
  };

  const handleTestEmail = () => {
    if (!testEmail) {
      toast({
        title: "Error",
        description: "Please enter a test email address",
        variant: "destructive",
      });
      return;
    }
    testEmailMutation.mutate(testEmail);
  };

  const handleConfigureEmail = () => {
    if (!emailConfig.emailUser || !emailConfig.emailPassword) {
      toast({
        title: "Error",
        description: "Please fill in all email configuration fields",
        variant: "destructive",
      });
      return;
    }
    configureEmailMutation.mutate(emailConfig);
  };

  const handleDownloadReport = async (date?: string) => {
    try {
      const reportDate = date || format(new Date(), 'yyyy-MM-dd');
      const response = await dailyReportsAPI.downloadReport(reportDate);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `daily-report-${reportDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Report downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to download report",
        variant: "destructive",
      });
    }
  };

  const handlePreviewReport = async (date?: string) => {
    try {
      const reportDate = date || format(new Date(), 'yyyy-MM-dd');
      const response = await dailyReportsAPI.previewReport(reportDate);
      
      // Create blob and open in new tab
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      toast({
        title: "Success",
        description: "Report opened in new tab",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to preview report",
        variant: "destructive",
      });
    }
  };

  if (statusLoading || configLoading) {
    return (
      <Layout title="Daily Reports" showSearch={false}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Daily Reports" showSearch={false}>
      <div className="space-y-6">
        {/* Scheduler Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Scheduler Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {status?.isRunning ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-yellow-600" />
                  )}
                  <Badge variant={status?.isRunning ? "default" : "secondary"}>
                    {status?.isRunning ? "Running" : "Idle"}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">Current Status</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-lg font-semibold text-green-600">
                  {status?.nextRun ? format(new Date(status.nextRun), 'MMM dd, HH:mm') : 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Next Run</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-lg font-semibold text-purple-600">
                  {status?.timezone || 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Timezone</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-orange-500" />
              Email Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="emailUser">Email Address</Label>
                <Input
                  id="emailUser"
                  type="email"
                  value={emailConfig.emailUser}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, emailUser: e.target.value }))}
                  placeholder="your-email@gmail.com"
                />
              </div>
              <div>
                <Label htmlFor="emailPassword">App Password</Label>
                <Input
                  id="emailPassword"
                  type="password"
                  value={emailConfig.emailPassword}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, emailPassword: e.target.value }))}
                  placeholder="Enter app password"
                />
              </div>
              <div>
                <Label htmlFor="emailService">Email Service</Label>
                <Select
                  value={emailConfig.emailService}
                  onValueChange={(value) => setEmailConfig(prev => ({ ...prev, emailService: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail</SelectItem>
                    <SelectItem value="outlook">Outlook</SelectItem>
                    <SelectItem value="yahoo">Yahoo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleConfigureEmail}
                disabled={configureEmailMutation.isPending}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                {configureEmailMutation.isPending ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-green-500" />
              Test Email Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="testEmail">Test Email Address</Label>
                <Input
                  id="testEmail"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter email to send test to"
                />
              </div>
              <Button
                onClick={handleTestEmail}
                disabled={testEmailMutation.isPending}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {testEmailMutation.isPending ? "Sending..." : "Send Test Email"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Manual Report Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-purple-500" />
              Manual Report Generation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="recipientEmail">Recipient Email (Optional)</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="Leave empty to send to all admin users"
                  />
                </div>
                <Button
                  onClick={handleTriggerReport}
                  disabled={triggerReportMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  {triggerReportMutation.isPending ? "Generating..." : "Generate & Send Report"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                This will generate a daily report for today and send it via email. 
                If no recipient email is specified, it will be sent to all admin users.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Report Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Report Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Today's Report</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePreviewReport()}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadReport()}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Previous Reports</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePreviewReport(format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Yesterday
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadReport(format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Yesterday
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Information */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">📅 Automatic Daily Reports</h4>
                <p className="text-sm text-muted-foreground">
                  The system automatically generates and sends daily business reports every day at midnight (00:00).
                  Reports include comprehensive data about sales, profits, inventory, and customer analysis.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">📧 Email Configuration</h4>
                <p className="text-sm text-muted-foreground">
                  Configure your email settings to receive daily reports. For Gmail, you'll need to use an App Password
                  instead of your regular password. Enable 2-factor authentication and generate an app password.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">🔧 Manual Generation</h4>
                <p className="text-sm text-muted-foreground">
                  You can manually trigger report generation at any time. This is useful for testing or generating
                  reports for specific dates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default DailyReports;
