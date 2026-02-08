import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import {
  CheckCircle, XCircle, RefreshCw, Play, Trash2,
  Database, FlaskConical, Clock, Shield, Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface TestResult {
  id: string;
  name: string;
  module: string;
  steps: string;
  expected: string;
  status: "pass" | "fail" | "skip" | "pending";
  error?: string;
  duration_ms?: number;
}

const QAMode = () => {
  const { role, loading: permLoading } = usePermissions();
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const callQAFunction = useCallback(async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/qa-smoke-tests`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    return res.json();
  }, []);

  const runTests = useCallback(async (testIds?: string[]) => {
    setRunning(true);
    try {
      const body: Record<string, unknown> = { action: "run_tests" };
      if (testIds && testIds.length > 0) body.tests = testIds;

      const data = await callQAFunction(body);
      setResults(data.results || []);
      setLastRun(data.ran_at);

      const pass = (data.results || []).filter((r: TestResult) => r.status === "pass").length;
      const fail = (data.results || []).filter((r: TestResult) => r.status === "fail").length;
      toast.success(`Tests complete: ${pass} pass, ${fail} fail`);
    } catch (e: unknown) {
      toast.error("Test run failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setRunning(false);
    }
  }, [callQAFunction]);

  const handleRunAll = useCallback(() => runTests(), [runTests]);
  const handleRunSelected = useCallback(() => {
    if (selected.size === 0) {
      toast.warning("No tests selected");
      return;
    }
    runTests(Array.from(selected));
  }, [selected, runTests]);

  const handleGenerateTestData = useCallback(async () => {
    setGenerating(true);
    try {
      const data = await callQAFunction({ action: "generate_test_data" });
      toast.success(`Test data generated: ${data.created?.length || 0} items`);
    } catch (e: unknown) {
      toast.error("Failed to generate test data: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setGenerating(false);
    }
  }, [callQAFunction]);

  const handleDeleteTestData = useCallback(async () => {
    setDeleting(true);
    try {
      const data = await callQAFunction({ action: "delete_test_data" });
      const total = data.deleted?.length || 0;
      toast.success(`Test data cleaned up: ${total} tables affected`);
    } catch (e: unknown) {
      toast.error("Failed to delete test data: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setDeleting(false);
    }
  }, [callQAFunction]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Guard: super_admin only (after all hooks)
  if (permLoading) return null;

  if (role !== "super_admin") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              QA Mode is restricted to super_admin users only.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pass":
        return (
          <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
            <CheckCircle className="h-3 w-3" /> PASS
          </Badge>
        );
      case "fail":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" /> FAIL
          </Badge>
        );
      case "skip":
        return <Badge variant="secondary">SKIP</Badge>;
      default:
        return <Badge variant="outline">PENDING</Badge>;
    }
  };

  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;
  const modules = [...new Set(results.map((r) => r.module))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FlaskConical className="h-8 w-8 text-primary" />
            QA Mode
          </h1>
          <p className="text-muted-foreground mt-1">
            Automated smoke tests across all critical platform flows
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {lastRun && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(lastRun).toLocaleString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunSelected}
            disabled={running || selected.size === 0}
          >
            <Play className="h-4 w-4 mr-1" />
            Run Selected ({selected.size})
          </Button>
          <Button onClick={handleRunAll} disabled={running}>
            {running ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {running ? "Running..." : "Run All Tests"}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold">{results.length}</div>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-primary">{passCount}</div>
              <p className="text-sm text-muted-foreground">Pass</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-destructive">{failCount}</div>
              <p className="text-sm text-muted-foreground">Fail</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold">{modules.length}</div>
              <p className="text-sm text-muted-foreground">Modules</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test data controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5" />
            Sandbox Test Data
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleGenerateTestData}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            Generate Test Data
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteTestData}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete Test Data
          </Button>
        </CardContent>
      </Card>

      {/* Empty state */}
      {results.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <FlaskConical className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No tests run yet</h3>
            <p className="text-muted-foreground mb-4">
              Click "Run All Tests" to execute the full smoke test suite
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results table — grouped by module */}
      {modules.map((mod) => (
        <Card key={mod}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>{mod}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {results.filter((r) => r.module === mod && r.status === "pass").length}/
                {results.filter((r) => r.module === mod).length} passing
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        results
                          .filter((r) => r.module === mod)
                          .every((r) => selected.has(r.id))
                      }
                      onCheckedChange={() => {
                        const modIds = results
                          .filter((r) => r.module === mod)
                          .map((r) => r.id);
                        const allSelected = modIds.every((id) => selected.has(id));
                        setSelected((prev) => {
                          const next = new Set(prev);
                          modIds.forEach((id) =>
                            allSelected ? next.delete(id) : next.add(id)
                          );
                          return next;
                        });
                      }}
                    />
                  </TableHead>
                  <TableHead>Test Name</TableHead>
                  <TableHead className="hidden md:table-cell">Steps</TableHead>
                  <TableHead className="hidden lg:table-cell">Expected</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Time</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results
                  .filter((r) => r.module === mod)
                  .map((test) => (
                    <TableRow
                      key={test.id}
                      className={
                        test.status === "fail" ? "bg-destructive/5" : ""
                      }
                    >
                      <TableCell>
                        <Checkbox
                          checked={selected.has(test.id)}
                          onCheckedChange={() => toggleSelect(test.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {test.name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                        {test.steps}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                        {test.expected}
                      </TableCell>
                      <TableCell>{getStatusBadge(test.status)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {test.duration_ms != null
                          ? `${test.duration_ms}ms`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs max-w-[250px]">
                        {test.error ? (
                          <span className="text-destructive break-words">
                            {test.error}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default QAMode;
