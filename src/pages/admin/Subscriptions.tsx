import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";

interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  user_email?: string;
}

const AdminSubscriptions = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard/profile');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadSubscriptions();
    }
  }, [isAdmin]);

  const loadSubscriptions = async () => {
    try {
      // Fetch subscriptions with user email from profiles table
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          profiles!subscriptions_user_id_fkey (email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map the data to include email at the top level
      const subsWithEmails: Subscription[] = (data || []).map((sub: any) => ({
        ...sub,
        user_email: sub.profiles?.email || 'No email'
      }));

      setSubscriptions(subsWithEmails);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Filter subscriptions based on search query
  const filteredSubscriptions = subscriptions.filter((sub) =>
    sub.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions Management</h1>
        <p className="text-muted-foreground">View and manage all subscriptions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions ({filteredSubscriptions.length})</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {searchQuery ? "No subscriptions found matching your search" : "No subscriptions found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.user_email}</TableCell>
                    <TableCell className="capitalize">{sub.plan}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(sub.status)}>{sub.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {sub.currency} {(sub.amount_cents / 100).toFixed(2)}
                    </TableCell>
                    <TableCell>{new Date(sub.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {sub.paid_at ? new Date(sub.paid_at).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSubscriptions;
