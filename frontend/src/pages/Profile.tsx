import { apiClient } from 'api';
import {
  ChevronDown,
  ChevronRight,
  CreditCard,
  MessageSquare,
  Wallet
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAuth } from '@chainlit/react-client';

import CustomFooter from '@/components/CustomFooter';
import { CustomHeader } from '@/components/CustomHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import useScrollTo from '@/hooks/scrollTo';

interface Turn {
  id: string;
  createdAt: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

interface ThreadUsage {
  id: string;
  name: string;
  createdAt: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  turns: Turn[];
}

interface ThreadUsageDisplay {
  id: string;
  name: string;
  createdAt: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  turns?: Turn[];
  turnslength?: number;
}

interface Payment {
  order_code: string;
  transaction_id: string;
  amount: number;
  currency?: string;
  created_at: string;
  status?: string;
}

interface ProfileData {
  user: {
    id: string;
    identifier: string;
    balance: number;
  };
  payments: Payment[];
  threadUsage: ThreadUsage[];
}

function formatDate(dateString: string): string {
  /* Format date to 'dd MMM yyyy, HH:mm' in Greek locale 
    current_timestamp in SQLite is in UTC, so we convert to local timezone
*/
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('el-GR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency
  }).format(amount);
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(2)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

function ThreadRow({ thread }: { thread: ThreadUsageDisplay }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasTurns = thread.turns && thread.turns.length > 0;

  return (
    <>
      <TableRow className="hover:bg-muted/50">
        <TableCell>
          {hasTurns ? (
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-6 w-6"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <span className="w-6 inline-block" />
          )}
        </TableCell>
        <TableCell className="font-medium max-w-[200px] truncate">
          {thread.name || 'Untitled conversation'}
        </TableCell>
        <TableCell>{formatDate(thread.createdAt)}</TableCell>
        <TableCell className="text-right">
          {formatTokens(thread.input_tokens)}
        </TableCell>
        <TableCell className="text-right">
          {formatTokens(thread.output_tokens)}
        </TableCell>
        <TableCell className="text-right font-semibold">
          {formatTokens(thread.total_tokens)}
        </TableCell>
        <TableCell className="text-right text-muted-foreground">
          {thread.turns?.length || 0}
        </TableCell>
      </TableRow>
      {hasTurns &&
        isOpen &&
        (thread.turns || []).map((turn, idx) => (
          <TableRow key={turn.id} className="bg-muted/30">
            <TableCell />
            <TableCell className="pl-8 text-muted-foreground text-sm">
              ↳ Turn {idx + 1}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(turn.createdAt)}
            </TableCell>
            <TableCell className="text-right text-sm">
              {formatTokens(turn.input_tokens)}
            </TableCell>
            <TableCell className="text-right text-sm">
              {formatTokens(turn.output_tokens)}
            </TableCell>
            <TableCell className="text-right text-sm">
              {formatTokens(turn.total_tokens)}
            </TableCell>
            <TableCell />
          </TableRow>
        ))}
    </>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  useScrollTo()(0, 0);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await apiClient.get('/user/account');
        const data = await response.json();
        setProfileData(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
        // if the call is not ok, apiClient will have already shown a toast
        //toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchProfile();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <CustomHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">
            <p>Please log in to view your profile.</p>
          </div>
        </main>
        <CustomFooter />
      </div>
    );
  }

  // Calculate totals
  const totalTokens =
    profileData?.threadUsage.reduce((sum, t) => sum + t.total_tokens, 0) || 0;
  const totalPayments =
    profileData?.payments.reduce((sum, p) => sum + p.amount, 0) || 0;

  return (
    <div className="custom-pg card flex flex-col items-center justify-center h-full w-full">
      <main className="wrap" role="main" aria-label="app-title">
        <CustomHeader />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {/* Balance Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Τρέχον Υπόλοιπο
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(profileData?.user.balance || 0)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Διαθέσιμο για χρήση
              </p>
            </CardContent>
          </Card>

          {/* Total Spent Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Συνολικές Πληρωμές
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatCurrency(totalPayments)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {profileData?.payments.length || 0} συναλλαγές
              </p>
            </CardContent>
          </Card>

          {/* Total Tokens Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Συνολικά Tokens
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatTokens(totalTokens)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {profileData?.threadUsage.length || 0} συνομιλίες
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment History */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Ιστορικό Πληρωμών
            </CardTitle>
            <CardDescription>Όλες οι συναλλαγές σας</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : profileData?.payments && profileData.payments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ημερομηνία</TableHead>
                    <TableHead>Κωδικός Παραγγελίας</TableHead>
                    <TableHead>ID Συναλλαγής</TableHead>
                    <TableHead className="text-right">Ποσό</TableHead>
                    <TableHead>Κατάσταση</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profileData.payments.map((payment) => (
                    <TableRow key={payment.transaction_id}>
                      <TableCell>{formatDate(payment.created_at)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.order_code}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.transaction_id}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(
                          payment.amount,
                          payment.currency || 'EUR'
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          {payment.status || 'Ολοκληρωμένη'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Δεν υπάρχουν πληρωμές ακόμα.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Thread Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Χρήση Tokens ανά Συνομιλία
            </CardTitle>
            <CardDescription>
              Κάντε κλικ σε μια συνομιλία για να δείτε τη χρήση ανά μήνυμα
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : profileData?.threadUsage &&
              profileData.threadUsage.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Συνομιλία</TableHead>
                    <TableHead>Ημερομηνία</TableHead>
                    <TableHead className="text-right">Input</TableHead>
                    <TableHead className="text-right">Output</TableHead>
                    <TableHead className="text-right">Σύνολο</TableHead>
                    <TableHead className="text-right">Συνομιλίες</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profileData.threadUsage.map((thread) => {
                    const thread_copy: ThreadUsageDisplay =
                      structuredClone(thread);
                    thread_copy.turnslength = thread_copy.turns?.length || 0;
                    delete thread_copy.turns;
                    return <ThreadRow key={thread.id} thread={thread_copy} />;
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Δεν υπάρχουν συνομιλίες ακόμα.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Up Button */}
        <div className="mt-8 text-center">
          <Button
            size="lg"
            onClick={() => (window.location.href = '/order')}
            className="gap-2"
          >
            <Wallet className="h-5 w-5" />
            Ανανέωση Υπολοίπου
          </Button>
        </div>
      </main>
      <CustomFooter />
    </div>
  );
}
