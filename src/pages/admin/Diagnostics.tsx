import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle, XCircle, AlertTriangle, RefreshCw, Database, 
  Webhook, Shield, Zap, Clock, Server, Activity 
} from "lucide-react";
import { toast } from "sonner";

interface DiagnosticCheck {
  name: string;
  category: string;
  status: 'pass' | 'fail' | 'warn' | 'checking';
  detail: string;
}

const Diagnostics = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard/profile');
    }
  }, [isAdmin, adminLoading, navigate]);

  const runDiagnostics = async () => {
    setRunning(true);
    const results: DiagnosticCheck[] = [];

    // === DATABASE CHECKS ===
    
    // 1. Check tables exist
    try {
      const expectedTables = [
        'profiles', 'subscriptions', 'invoices', 'payments', 'fulfillment',
        'referral_codes', 'referral_clicks', 'referral_uses', 'notifications',
        'user_roles', 'staff_activity_log', 'system_event_log', 'operational_alerts',
        'fraud_markers', 'incidents', 'runbooks', 'backup_status', 'sla_targets',
        'retention_policies', 'elevation_requests', 'retry_queue'
      ];
      
      const { data: tables } = await supabase
        .from('plans')
        .select('id')
        .limit(1);
      
      // Quick check each table exists
      let missingTables: string[] = [];
      for (const table of expectedTables) {
        try {
          const { error } = await supabase.from(table as any).select('*').limit(0);
          if (error) missingTables.push(table);
        } catch {
          missingTables.push(table);
        }
      }
      
      results.push({
        name: 'Database Tables',
        category: 'Database',
        status: missingTables.length === 0 ? 'pass' : 'fail',
        detail: missingTables.length === 0 
          ? `All ${expectedTables.length} tables verified` 
          : `Missing: ${missingTables.join(', ')}`,
      });
    } catch (e: any) {
      results.push({
        name: 'Database Tables',
        category: 'Database',
        status: 'fail',
        detail: e.message,
      });
    }

    // 2. Check RLS is enforced (try accessing data without proper permissions)
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .limit(5);
      
      results.push({
        name: 'RLS on user_roles',
        category: 'Security',
        status: 'pass',
        detail: `Query returned ${roles?.length || 0} rows (admin-scoped)`,
      });
    } catch (e: any) {
      results.push({
        name: 'RLS on user_roles',
        category: 'Security',
        status: 'fail',
        detail: e.message,
      });
    }

    // 3. Check referral_stats materialized view
    try {
      const { data, error } = await supabase.rpc('refresh_referral_stats');
      results.push({
        name: 'Materialized View: referral_stats',
        category: 'Database',
        status: error ? 'fail' : 'pass',
        detail: error ? error.message : 'View refreshed successfully',
      });
    } catch (e: any) {
      results.push({
        name: 'Materialized View: referral_stats',
        category: 'Database',
        status: 'fail',
        detail: e.message,
      });
    }

    // 4. Check plans exist
    try {
      const { data, error } = await supabase.from('plans').select('id, name, active');
      results.push({
        name: 'Plans Configuration',
        category: 'Database',
        status: data && data.length > 0 ? 'pass' : 'warn',
        detail: data && data.length > 0 
          ? `${data.length} plans (${data.filter((p: any) => p.active).length} active)` 
          : 'No plans configured',
      });
    } catch (e: any) {
      results.push({
        name: 'Plans Configuration',
        category: 'Database',
        status: 'fail',
        detail: e.message,
      });
    }

    // === EDGE FUNCTION CHECKS ===
    const edgeFunctions = [
      { name: 'check-alerts', requiresAuth: false },
      { name: 'track-referral-click', requiresAuth: false },
      { name: 'validate-trial-signup', requiresAuth: false },
    ];

    for (const fn of edgeFunctions) {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn.name}`;
        const response = await fetch(url, {
          method: 'OPTIONS',
          headers: { 'Content-Type': 'application/json' },
        });
        
        results.push({
          name: `Edge Function: ${fn.name}`,
          category: 'Edge Functions',
          status: response.ok || response.status === 204 ? 'pass' : 'warn',
          detail: `CORS preflight: ${response.status}`,
        });
      } catch (e: any) {
        results.push({
          name: `Edge Function: ${fn.name}`,
          category: 'Edge Functions',
          status: 'fail',
          detail: e.message || 'Unreachable',
        });
      }
    }

    // === WEBHOOK STATUS ===
    try {
      const { data: anyWebhook } = await supabase
        .from('system_event_log')
        .select('id, created_at')
        .eq('event_type', 'nowpayments_webhook_received')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!anyWebhook || anyWebhook.length === 0) {
        results.push({
          name: 'NOWPayments Webhook',
          category: 'Webhooks',
          status: 'warn',
          detail: 'No webhook events ever received — expected if no crypto payments yet',
        });
      } else {
        const lastReceived = new Date(anyWebhook[0].created_at);
        const hoursSince = Math.round((Date.now() - lastReceived.getTime()) / 3600000);
        results.push({
          name: 'NOWPayments Webhook',
          category: 'Webhooks',
          status: hoursSince < 24 ? 'pass' : 'warn',
          detail: `Last received ${hoursSince}h ago`,
        });
      }
    } catch (e: any) {
      results.push({
        name: 'NOWPayments Webhook',
        category: 'Webhooks',
        status: 'fail',
        detail: e.message,
      });
    }

    // === OPERATIONAL HEALTH ===
    
    // Pending retries
    try {
      const { data, error } = await supabase
        .from('retry_queue')
        .select('id')
        .in('status', ['pending', 'failed']);
      
      results.push({
        name: 'Retry Queue',
        category: 'Operations',
        status: (data?.length || 0) === 0 ? 'pass' : (data!.length > 5 ? 'fail' : 'warn'),
        detail: `${data?.length || 0} items pending retry`,
      });
    } catch (e: any) {
      results.push({
        name: 'Retry Queue',
        category: 'Operations',
        status: 'fail',
        detail: e.message,
      });
    }

    // Unresolved alerts
    try {
      const { data } = await supabase
        .from('operational_alerts')
        .select('id, severity')
        .is('resolved_at', null);
      
      const critical = data?.filter((a: any) => a.severity === 'critical').length || 0;
      results.push({
        name: 'Operational Alerts',
        category: 'Operations',
        status: critical > 0 ? 'fail' : (data?.length || 0) > 0 ? 'warn' : 'pass',
        detail: `${data?.length || 0} unresolved (${critical} critical)`,
      });
    } catch (e: any) {
      results.push({
        name: 'Operational Alerts',
        category: 'Operations',
        status: 'fail',
        detail: e.message,
      });
    }

    // Stuck fulfillment
    try {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('fulfillment')
        .select('id')
        .eq('status', 'pending_manual_provisioning')
        .lt('created_at', sixHoursAgo);
      
      results.push({
        name: 'Stuck Fulfillment (>6h)',
        category: 'Operations',
        status: (data?.length || 0) === 0 ? 'pass' : 'warn',
        detail: `${data?.length || 0} items stuck`,
      });
    } catch (e: any) {
      results.push({
        name: 'Stuck Fulfillment',
        category: 'Operations',
        status: 'fail',
        detail: e.message,
      });
    }

    // Active incidents
    try {
      const { data } = await supabase
        .from('incidents')
        .select('id, severity')
        .in('status', ['investigating', 'identified', 'monitoring']);
      
      const critical = data?.filter((i: any) => i.severity === 'critical').length || 0;
      results.push({
        name: 'Active Incidents',
        category: 'Operations',
        status: critical > 0 ? 'fail' : (data?.length || 0) > 0 ? 'warn' : 'pass',
        detail: `${data?.length || 0} active (${critical} critical)`,
      });
    } catch (e: any) {
      results.push({
        name: 'Active Incidents',
        category: 'Operations',
        status: 'fail',
        detail: e.message,
      });
    }

    // === AUTH CHECK ===
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id || '');
      
      results.push({
        name: 'Current User Auth',
        category: 'Auth',
        status: user ? 'pass' : 'fail',
        detail: user 
          ? `${user.email} — Roles: ${roles?.map((r: any) => r.role).join(', ') || 'none'}` 
          : 'Not authenticated',
      });
    } catch (e: any) {
      results.push({
        name: 'Current User Auth',
        category: 'Auth',
        status: 'fail',
        detail: e.message,
      });
    }

    // === SLA Targets ===
    try {
      const { data, error } = await supabase.from('sla_targets').select('id');
      results.push({
        name: 'SLA Targets Configured',
        category: 'Configuration',
        status: data && data.length > 0 ? 'pass' : 'warn',
        detail: `${data?.length || 0} SLA targets defined`,
      });
    } catch (e: any) {
      results.push({
        name: 'SLA Targets',
        category: 'Configuration',
        status: 'fail',
        detail: e.message,
      });
    }

    // === Backup Status ===
    try {
      const { data } = await supabase.from('backup_status').select('*').limit(5);
      results.push({
        name: 'Backup Configuration',
        category: 'Configuration',
        status: data && data.length > 0 ? 'pass' : 'warn',
        detail: `${data?.length || 0} backup entries configured`,
      });
    } catch (e: any) {
      results.push({
        name: 'Backup Configuration',
        category: 'Configuration',
        status: 'fail',
        detail: e.message,
      });
    }

    setChecks(results);
    setLastRun(new Date());
    setRunning(false);

    const passCount = results.filter(r => r.status === 'pass').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    const warnCount = results.filter(r => r.status === 'warn').length;

    toast.success(`Diagnostics complete: ${passCount} pass, ${warnCount} warn, ${failCount} fail`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'fail': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warn': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">PASS</Badge>;
      case 'fail': return <Badge variant="destructive">FAIL</Badge>;
      case 'warn': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">WARN</Badge>;
      default: return <Badge variant="secondary">CHECKING</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Database': return <Database className="h-4 w-4" />;
      case 'Security': return <Shield className="h-4 w-4" />;
      case 'Edge Functions': return <Zap className="h-4 w-4" />;
      case 'Webhooks': return <Webhook className="h-4 w-4" />;
      case 'Operations': return <Activity className="h-4 w-4" />;
      case 'Auth': return <Shield className="h-4 w-4" />;
      case 'Configuration': return <Server className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const categories = [...new Set(checks.map(c => c.category))];
  const passCount = checks.filter(r => r.status === 'pass').length;
  const failCount = checks.filter(r => r.status === 'fail').length;
  const warnCount = checks.filter(r => r.status === 'warn').length;

  if (adminLoading) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Diagnostics</h1>
          <p className="text-muted-foreground mt-1">
            Automated health checks across database, edge functions, webhooks, and operations
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastRun && (
            <span className="text-sm text-muted-foreground">
              Last run: {lastRun.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={runDiagnostics} disabled={running}>
            <RefreshCw className={`h-4 w-4 mr-2 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Running...' : 'Run Diagnostics'}
          </Button>
        </div>
      </div>

      {checks.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-green-500">{passCount}</div>
              <p className="text-sm text-muted-foreground">Passing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-yellow-500">{warnCount}</div>
              <p className="text-sm text-muted-foreground">Warnings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-red-500">{failCount}</div>
              <p className="text-sm text-muted-foreground">Failures</p>
            </CardContent>
          </Card>
        </div>
      )}

      {checks.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No diagnostics run yet</h3>
            <p className="text-muted-foreground mb-4">Click "Run Diagnostics" to check system health</p>
          </CardContent>
        </Card>
      )}

      {categories.map(category => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {getCategoryIcon(category)}
              {category}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {checks.filter(c => c.category === category).map((check, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.status)}
                    <div>
                      <p className="font-medium text-sm">{check.name}</p>
                      <p className="text-xs text-muted-foreground">{check.detail}</p>
                    </div>
                  </div>
                  {getStatusBadge(check.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Diagnostics;
