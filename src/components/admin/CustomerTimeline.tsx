import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Clock, CreditCard, Receipt, Truck, Mail, Activity, Filter } from "lucide-react";

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'invoice' | 'payment' | 'subscription' | 'fulfillment' | 'email' | 'system';
  title: string;
  description: string;
  status: string;
  adminActor?: string;
  metadata?: Record<string, unknown>;
}

interface CustomerTimelineProps {
  userId: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  invoice: { icon: Receipt, color: 'text-blue-400', label: 'Invoice' },
  payment: { icon: CreditCard, color: 'text-emerald-400', label: 'Payment' },
  subscription: { icon: CreditCard, color: 'text-purple-400', label: 'Subscription' },
  fulfillment: { icon: Truck, color: 'text-amber-400', label: 'Fulfillment' },
  email: { icon: Mail, color: 'text-cyan-400', label: 'Email' },
  system: { icon: Activity, color: 'text-muted-foreground', label: 'System' },
};

export function CustomerTimeline({ userId }: CustomerTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadTimeline();
  }, [userId]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const [invoicesRes, paymentsRes, subscriptionsRes, fulfillmentRes, systemLogsRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('id, invoice_number, status, amount_cents, currency, created_at, paid_at, last_email_sent_at, last_email_type, plan_name')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select('id, status, method, provider, amount_received_cents, currency, created_at, received_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('subscriptions')
          .select('id, plan, status, amount_cents, currency, created_at, paid_at, ends_at, provisioning_status')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('fulfillment')
          .select('id, status, created_at, sent_at, sent_by_admin_id, notes, invoice_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('system_event_log')
          .select('id, event_type, entity_type, entity_id, status, created_at, actor_id, metadata, error_message')
          .or(`entity_id.eq.${userId},metadata->user_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      const timeline: TimelineEvent[] = [];

      // Invoices
      invoicesRes.data?.forEach(inv => {
        timeline.push({
          id: `inv-created-${inv.id}`,
          timestamp: inv.created_at,
          type: 'invoice',
          title: `Invoice ${inv.invoice_number} created`,
          description: `${inv.plan_name || 'Plan'} — ${inv.currency} ${(inv.amount_cents / 100).toFixed(2)}`,
          status: inv.status,
        });
        if (inv.paid_at) {
          timeline.push({
            id: `inv-paid-${inv.id}`,
            timestamp: inv.paid_at,
            type: 'invoice',
            title: `Invoice ${inv.invoice_number} paid`,
            description: `Payment confirmed for ${inv.currency} ${(inv.amount_cents / 100).toFixed(2)}`,
            status: 'paid',
          });
        }
        if (inv.last_email_sent_at) {
          timeline.push({
            id: `email-${inv.id}`,
            timestamp: inv.last_email_sent_at,
            type: 'email',
            title: `Email sent: ${inv.last_email_type || 'notification'}`,
            description: `For invoice ${inv.invoice_number}`,
            status: 'sent',
          });
        }
      });

      // Payments
      paymentsRes.data?.forEach(pay => {
        timeline.push({
          id: `pay-${pay.id}`,
          timestamp: pay.created_at,
          type: 'payment',
          title: `Payment ${pay.status}`,
          description: `${pay.method} via ${pay.provider || 'N/A'} — ${pay.currency} ${((pay.amount_received_cents || 0) / 100).toFixed(2)}`,
          status: pay.status,
        });
      });

      // Subscriptions
      subscriptionsRes.data?.forEach(sub => {
        timeline.push({
          id: `sub-${sub.id}`,
          timestamp: sub.created_at,
          type: 'subscription',
          title: `Subscription: ${sub.plan}`,
          description: `Status: ${sub.status} | Provisioning: ${sub.provisioning_status}`,
          status: sub.status,
        });
      });

      // Fulfillment
      fulfillmentRes.data?.forEach(ful => {
        timeline.push({
          id: `ful-${ful.id}`,
          timestamp: ful.created_at,
          type: 'fulfillment',
          title: `Fulfillment ${ful.status.replace(/_/g, ' ')}`,
          description: ful.notes || `Invoice: ${ful.invoice_id.slice(0, 8)}…`,
          status: ful.status,
          adminActor: ful.sent_by_admin_id || undefined,
        });
        if (ful.sent_at) {
          timeline.push({
            id: `ful-sent-${ful.id}`,
            timestamp: ful.sent_at,
            type: 'fulfillment',
            title: 'Credentials sent',
            description: `Marked as sent by admin`,
            status: 'sent',
            adminActor: ful.sent_by_admin_id || undefined,
          });
        }
      });

      // System events
      systemLogsRes.data?.forEach(log => {
        timeline.push({
          id: `sys-${log.id}`,
          timestamp: log.created_at,
          type: 'system',
          title: log.event_type.replace(/_/g, ' '),
          description: log.error_message || `${log.entity_type}: ${log.entity_id.slice(0, 8)}…`,
          status: log.status,
          adminActor: log.actor_id || undefined,
          metadata: log.metadata as Record<string, unknown> || undefined,
        });
      });

      // Sort by timestamp descending
      timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEvents(timeline);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = typeFilter === 'all' ? events : events.filter(e => e.type === typeFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Customer Timeline ({filteredEvents.length} events)
          </CardTitle>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="invoice">Invoices</SelectItem>
              <SelectItem value="payment">Payments</SelectItem>
              <SelectItem value="subscription">Subscriptions</SelectItem>
              <SelectItem value="fulfillment">Fulfillment</SelectItem>
              <SelectItem value="email">Emails</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No events found for this user
          </p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            
            <div className="space-y-4">
              {filteredEvents.map((event) => {
                const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.system;
                const Icon = config.icon;
                
                return (
                  <div key={event.id} className="relative flex gap-4 pl-2">
                    {/* Dot */}
                    <div className={`relative z-10 flex items-center justify-center w-5 h-5 rounded-full bg-background border-2 border-border mt-0.5`}>
                      <div className={`w-2 h-2 rounded-full ${
                        event.status === 'paid' || event.status === 'confirmed' || event.status === 'sent' || event.status === 'success'
                          ? 'bg-emerald-400'
                          : event.status === 'failed' || event.status === 'void'
                          ? 'bg-red-400'
                          : 'bg-amber-400'
                      }`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                            <span className="text-sm font-medium">{event.title}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{event.description}</p>
                          {event.adminActor && (
                            <p className="text-[10px] text-muted-foreground/70">
                              by admin: {event.adminActor.slice(0, 8)}…
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(event.timestamp).toLocaleDateString()}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
