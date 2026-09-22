"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  Car,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Coffee,
  FileText,
  Home,
  Lightbulb,
  ListFilter,
  LockKeyhole,
  MoreHorizontal,
  PackageOpen,
  Plus,
  ReceiptText,
  RefreshCcw,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Trash2,
  TrendingDown,
  Upload,
  Utensils,
  WalletCards,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  analyseBankText,
  analyseCsv,
  categoryList,
  money,
  monthKey,
  monthLabel,
  pdfText,
  sampleTransactions,
  signedAmount,
  type Category,
  type StatementRecord,
  type Transaction,
  type WasteStatus,
} from "../../lib/spend";

type Tab = "overview" | "spending" | "waste" | "settings";
type SpendingView = "categories" | "subscriptions";

const categoryMeta: Record<Category, { color: string; icon: LucideIcon }> = {
  Subscriptions: { color: "purple", icon: WalletCards },
  "Food delivery": { color: "orange", icon: Utensils },
  Cafés: { color: "violet", icon: Coffee },
  "Dining out": { color: "amber", icon: Utensils },
  Groceries: { color: "green", icon: ShoppingCart },
  Shopping: { color: "mint", icon: ShoppingBag },
  Transport: { color: "blue", icon: Car },
  Bills: { color: "cyan", icon: ReceiptText },
  Convenience: { color: "yellow", icon: Zap },
  Other: { color: "slate", icon: MoreHorizontal },
};

const tabCopy: Record<Tab, { title: string; subtitle: string }> = {
  overview: { title: "Spend Wise", subtitle: "See where your money really goes" },
  spending: { title: "Monthly spend", subtitle: "Explore your spending trends" },
  waste: { title: "Waste finder", subtitle: "Spot the little leaks. Keep more of what’s yours." },
  settings: { title: "Settings", subtitle: "Your data, rules and preferences" },
};

const navItems: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "spending", label: "Spending", icon: BarChart3 },
  { id: "waste", label: "Waste", icon: Sparkles },
  { id: "settings", label: "Settings", icon: Settings },
];

function dateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(date);
}

function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function CategoryIcon({ category, size = "normal" }: { category: Category; size?: "small" | "normal" | "large" }) {
  const meta = categoryMeta[category];
  const Icon = meta.icon;
  return (
    <span className={`category-icon ${meta.color} ${size}`}>
      <Icon aria-hidden="true" />
    </span>
  );
}

function EmptyState({ title, text, onUpload }: { title: string; text: string; onUpload: () => void }) {
  return (
    <section className="empty-state surface">
      <span className="empty-icon"><PackageOpen /></span>
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="primary-button" onClick={onUpload}><Upload /> Upload statement</button>
    </section>
  );
}

function MonthPicker({ value, options, onChange, onUpload }: { value: string; options: string[]; onChange: (value: string) => void; onUpload: () => void }) {
  return (
    <div className="month-actions">
      <label className="select-control">
        <CalendarDays />
        <select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Select month">
          {options.map((month) => <option value={month} key={month}>{monthLabel(month)}</option>)}
        </select>
        <ChevronDown />
      </label>
      <button className="compact-upload" onClick={onUpload}><Upload /> <span>Upload</span></button>
    </div>
  );
}

function TrendBars({ totals, selected }: { totals: Array<[string, number]>; selected: string }) {
  const max = Math.max(...totals.map(([, value]) => value), 1);
  return (
    <div className="trend-chart" aria-label="Monthly spending bar chart">
      {totals.map(([month, value]) => (
        <div className="trend-column" key={month}>
          <span className="bar-value">{money(value)}</span>
          <div className="bar-track"><i className={month === selected ? "selected" : ""} style={{ height: `${Math.max(12, (value / max) * 100)}%` }} /></div>
          <span>{monthLabel(month, true)}</span>
        </div>
      ))}
    </div>
  );
}

function AppHeader({ tab, hasNotification }: { tab: Tab; hasNotification: boolean }) {
  return (
    <header className="app-header">
      <div>
        {tab === "overview" ? <h1>Spend <span>Wise</span></h1> : <h1>{tabCopy[tab].title}</h1>}
        <p>{tabCopy[tab].subtitle}</p>
      </div>
      <div className="header-actions">
        <button className="icon-button" aria-label="Notifications"><Bell />{hasNotification && <i />}</button>
        <span className="avatar">MJ</span>
      </div>
    </header>
  );
}

function InsightCard({ amount, onAction }: { amount: number; onAction: () => void }) {
  return (
    <article className="insight-card surface">
      <span className="insight-icon"><Lightbulb /></span>
      <div>
        <small>INSIGHT FOR YOU</small>
        <strong>You could save {money(amount)} this month</strong>
        <p>Small changes to delivery, cafés and convenience spending can add up quickly.</p>
      </div>
      <button className="ghost-button" onClick={onAction}>See tips <ChevronRight /></button>
    </article>
  );
}

function OverviewScreen({
  month,
  monthOptions,
  monthTransactions,
  monthTotals,
  average,
  isSample,
  setMonth,
  onUpload,
  onCategory,
  onWaste,
}: {
  month: string;
  monthOptions: string[];
  monthTransactions: Transaction[];
  monthTotals: Array<[string, number]>;
  average: number;
  isSample: boolean;
  setMonth: (month: string) => void;
  onUpload: () => void;
  onCategory: (category: Category) => void;
  onWaste: () => void;
}) {
  const total = monthTransactions.reduce((sum, item) => sum + signedAmount(item), 0);
  const groups = Object.entries(monthTransactions.reduce((result, item) => {
    result[item.category] = (result[item.category] ?? 0) + signedAmount(item);
    return result;
  }, {} as Record<Category, number>)).sort((a, b) => b[1] - a[1]) as Array<[Category, number]>;
  const waste = monthTransactions.filter((item) => item.wasteStatus === "avoidable").reduce((sum, item) => sum + signedAmount(item), 0);
  const priorTotal = monthTotals.find(([key]) => key < month)?.[1] ?? total;
  const improvement = priorTotal ? Math.round(((priorTotal - total) / priorTotal) * 100) : 0;

  if (!monthTransactions.length) return <EmptyState title="No spending found for this month" text="Choose another month or upload a bank statement to start your analysis." onUpload={onUpload} />;

  return (
    <div className="screen-stack">
      {isSample && <div className="sample-banner"><Sparkles /> You’re viewing sample data. <button onClick={onUpload}>Upload yours</button></div>}
      <MonthPicker value={month} options={monthOptions} onChange={setMonth} onUpload={onUpload} />
      <section className="hero-metric surface">
        <div>
          <span>Average monthly spend</span>
          <strong>{money(average)}</strong>
          <em className={improvement >= 0 ? "positive" : "negative"}><ArrowDown /> {Math.abs(improvement)}% <small>vs last month</small></em>
        </div>
        <div className="mini-mountains"><i /><i /><i /></div>
        <span className="status-pill"><BarChart3 /> {improvement >= 0 ? "Getting better" : "Worth a look"}</span>
        <p>Small choices.<br />A brighter tomorrow.</p>
      </section>

      <section className="chart-card surface">
        <div className="section-heading"><div><h2>Monthly spending</h2><p>Your last {monthTotals.length} active months</p></div><span>{money(total)} this month</span></div>
        <TrendBars totals={monthTotals} selected={month} />
      </section>

      <section>
        <div className="section-heading"><div><h2>Top categories</h2><p>Where your money went</p></div><button onClick={() => onCategory(groups[0]?.[0] ?? "Other")}>See all <ChevronRight /></button></div>
        <div className="category-grid">
          {groups.slice(0, 5).map(([category, amount]) => (
            <button className="category-card surface" key={category} onClick={() => onCategory(category)}>
              <CategoryIcon category={category} />
              <span><small>{category}</small><strong>{money(amount)}</strong><em>{percentage(amount, total)}% of total</em></span>
              <ChevronRight />
            </button>
          ))}
        </div>
      </section>
      <InsightCard amount={Math.round(waste * 0.25)} onAction={onWaste} />
    </div>
  );
}

function TransactionRow({ transaction, onClick }: { transaction: Transaction; onClick: () => void }) {
  return (
    <button className="transaction-row" onClick={onClick}>
      <CategoryIcon category={transaction.category} size="small" />
      <span><strong>{transaction.merchant}</strong><small>{dateLabel(transaction.date)} · {transaction.category}</small></span>
      <b className={transaction.kind === "refund" ? "refund" : ""}>{transaction.kind === "refund" ? "−" : ""}{money(transaction.amount, 2)}</b>
      <ChevronRight />
    </button>
  );
}

function SpendingScreen({
  month,
  monthOptions,
  transactions,
  monthTotals,
  view,
  setMonth,
  setView,
  onUpload,
  onTransaction,
}: {
  month: string;
  monthOptions: string[];
  transactions: Transaction[];
  monthTotals: Array<[string, number]>;
  view: SpendingView;
  setMonth: (month: string) => void;
  setView: (view: SpendingView) => void;
  onUpload: () => void;
  onTransaction: (transaction: Transaction) => void;
}) {
  const [query, setQuery] = useState("");
  const total = transactions.reduce((sum, item) => sum + signedAmount(item), 0);
  const categoryGroups = Object.entries(transactions.reduce((result, item) => {
    result[item.category] = (result[item.category] ?? 0) + signedAmount(item);
    return result;
  }, {} as Record<Category, number>)).sort((a, b) => b[1] - a[1]) as Array<[Category, number]>;
  const filtered = transactions.filter((transaction) => {
    const matchesView = view === "categories" || transaction.category === "Subscriptions";
    const text = `${transaction.merchant} ${transaction.description} ${transaction.category}`.toLowerCase();
    return matchesView && text.includes(query.toLowerCase());
  });
  const subscriptions = transactions.filter((item) => item.category === "Subscriptions");
  const subscriptionTotal = subscriptions.reduce((sum, item) => sum + signedAmount(item), 0);

  return (
    <div className="screen-stack">
      <MonthPicker value={month} options={monthOptions} onChange={setMonth} onUpload={onUpload} />
      <div className="segmented-control">
        <button className={view === "categories" ? "active" : ""} onClick={() => setView("categories")}>Categories</button>
        <button className={view === "subscriptions" ? "active" : ""} onClick={() => setView("subscriptions")}>Subscriptions</button>
      </div>

      {view === "categories" ? (
        <>
          <section className="chart-card surface">
            <div className="section-heading"><div><h2>Monthly spending</h2><p>Your spending over time</p></div><b>{money(total)}</b></div>
            <TrendBars totals={monthTotals} selected={month} />
          </section>
          <section className="total-card surface">
            <div><span>Total spend</span><strong>{money(total)}</strong><em className="positive"><ArrowDown /> On track</em></div>
            <div className="mini-mountains"><i /><i /><i /></div>
            <p>Small changes.<br />A brighter tomorrow.</p>
          </section>
          <section className="surface breakdown-card">
            <div className="section-heading"><div><h2>Spending by category</h2><p>Your {monthLabel(month)} breakdown</p></div></div>
            {categoryGroups.map(([category, amount]) => (
              <div className="breakdown-row" key={category}>
                <CategoryIcon category={category} size="small" />
                <span>{category}</span><strong>{money(amount)}</strong>
                <div className="progress"><i className={categoryMeta[category].color} style={{ width: `${percentage(amount, total)}%` }} /></div>
                <small>{percentage(amount, total)}%</small>
              </div>
            ))}
          </section>
        </>
      ) : (
        <>
          <section className="subscription-hero surface">
            <div><span>Subscriptions</span><strong>{money(subscriptionTotal)}</strong><small>per month</small><em><ArrowDown /> {subscriptions.length} active subscriptions</em></div>
            <div className="mini-mountains"><i /><i /><i /></div>
            <span className="status-pill"><BarChart3 /> Manage smarter</span>
          </section>
          <article className="insight-card surface compact">
            <span className="insight-icon"><Lightbulb /></span>
            <div><small>INSIGHT FOR YOU</small><strong>Review low-use subscriptions</strong><p>Even one cancellation can save hundreds each year.</p></div>
          </article>
        </>
      )}

      <section className="transactions-section">
        <div className="section-heading"><div><h2>{view === "subscriptions" ? "Your subscriptions" : "Transactions"}</h2><p>{filtered.length} items</p></div><ListFilter /></div>
        <label className="search-field"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transactions" /></label>
        <div className="transaction-list surface">
          {filtered.length ? filtered.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} onClick={() => onTransaction(transaction)} />) : <p className="inline-empty">No matching transactions.</p>}
        </div>
      </section>
    </div>
  );
}

function WasteScreen({
  month,
  monthOptions,
  transactions,
  setMonth,
  onUpload,
  onTransaction,
}: {
  month: string;
  monthOptions: string[];
  transactions: Transaction[];
  setMonth: (month: string) => void;
  onUpload: () => void;
  onTransaction: (transaction: Transaction) => void;
}) {
  const wasteTransactions = transactions.filter((item) => item.wasteStatus === "avoidable");
  const total = wasteTransactions.reduce((sum, item) => sum + signedAmount(item), 0);
  const merchants = Object.entries(wasteTransactions.reduce((result, item) => {
    const entry = result[item.merchant] ?? { amount: 0, count: 0, category: item.category, item };
    entry.amount += signedAmount(item);
    entry.count += 1;
    result[item.merchant] = entry;
    return result;
  }, {} as Record<string, { amount: number; count: number; category: Category; item: Transaction }>)).sort((a, b) => b[1].amount - a[1].amount);
  const saveAmount = Math.round(total * 0.25);

  return (
    <div className="screen-stack">
      <MonthPicker value={month} options={monthOptions} onChange={setMonth} onUpload={onUpload} />
      <section className="waste-hero surface">
        <div><span>Total avoidable spend</span><strong>{money(total)}</strong><small>this month</small><em className="positive"><TrendingDown /> Review and reduce</em></div>
        <div className="mini-mountains"><i /><i /><i /></div>
        <span className="status-pill"><Sparkles /> Save more</span>
        <p>Mostly food delivery,<br />cafés and convenience.</p>
      </section>
      <section>
        <div className="section-heading"><div><h2>Top waste merchants</h2><p>Tap an item to correct it</p></div><span>{monthLabel(month)}</span></div>
        <div className="ranked-list">
          {merchants.length ? merchants.map(([merchant, item], index) => (
            <button className="ranked-row surface" key={merchant} onClick={() => onTransaction(item.item)}>
              <b>{index + 1}</b><CategoryIcon category={item.category} />
              <span><strong>{merchant}</strong><small>{item.category}</small></span>
              <span className="rank-amount"><strong>{money(item.amount)}</strong><small>{item.count} transaction{item.count === 1 ? "" : "s"}</small></span>
              <ChevronRight />
            </button>
          )) : <EmptyState title="Nothing marked avoidable" text="Review transactions and mark spending you want SpendWise to track." onUpload={onUpload} />}
        </div>
      </section>
      <section>
        <div className="section-heading"><div><h2>Where you can save</h2><p>Simple, realistic changes</p></div></div>
        <div className="saving-list">
          <article className="surface"><CategoryIcon category="Food delivery" /><div><strong>Cut delivery by 25%</strong><p>A smaller order each week could save {money(saveAmount)} a month.</p></div><ChevronRight /></article>
          <article className="surface"><CategoryIcon category="Cafés" /><div><strong>Brew at home</strong><p>Replace three coffees a week and keep more in your pocket.</p></div><ChevronRight /></article>
          <article className="surface"><CategoryIcon category="Shopping" /><div><strong>Pause impulse purchases</strong><p>Wait 24 hours before non-essential buys.</p></div><ChevronRight /></article>
        </div>
      </section>
      <InsightCard amount={saveAmount} onAction={() => undefined} />
    </div>
  );
}

function SettingsScreen({
  statements,
  transactionCount,
  onUpload,
  onClear,
}: {
  statements: StatementRecord[];
  transactionCount: number;
  onUpload: () => void;
  onClear: () => void;
}) {
  const [privateMode, setPrivateMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  return (
    <div className="screen-stack settings-screen">
      <section className="profile-card surface"><span className="large-avatar">MJ</span><div><h2>Matthew</h2><p>Australian dollars · Local data</p></div><button className="ghost-button">Edit <ChevronRight /></button></section>
      <section>
        <div className="section-heading"><div><h2>Your data</h2><p>Statements stay on this device</p></div></div>
        <div className="settings-list surface">
          <button onClick={onUpload}><span className="setting-icon green"><Upload /></span><span><strong>Upload statement</strong><small>PDF and CSV supported</small></span><ChevronRight /></button>
          <div><span className="setting-icon blue"><ReceiptText /></span><span><strong>Transactions analysed</strong><small>{transactionCount} saved transactions</small></span><b>{transactionCount}</b></div>
          <div><span className="setting-icon purple"><LockKeyhole /></span><span><strong>Private mode</strong><small>Process statements on this device</small></span><button className={`toggle ${privateMode ? "on" : ""}`} onClick={() => setPrivateMode((value) => !value)} aria-label="Toggle private mode"><i /></button></div>
        </div>
      </section>
      <section>
        <div className="section-heading"><div><h2>Statement history</h2><p>{statements.length ? `${statements.length} imported files` : "No statements imported yet"}</p></div></div>
        <div className="statement-list surface">
          {statements.length ? statements.map((statement) => (
            <div key={statement.id}><span className="setting-icon slate"><FileText /></span><span><strong>{statement.name}</strong><small>{statement.transactionCount} transactions · {new Date(statement.uploadedAt).toLocaleDateString("en-AU")}</small></span><Check /></div>
          )) : <p className="inline-empty">Upload a statement to see its history here.</p>}
        </div>
      </section>
      <section>
        <div className="section-heading"><div><h2>Preferences</h2></div></div>
        <div className="settings-list surface">
          <div><span className="setting-icon amber"><Bell /></span><span><strong>Monthly insights</strong><small>Get a reminder when spending changes</small></span><button className={`toggle ${notifications ? "on" : ""}`} onClick={() => setNotifications((value) => !value)} aria-label="Toggle monthly insights"><i /></button></div>
          <button><span className="setting-icon mint"><CircleDollarSign /></span><span><strong>Currency</strong><small>Australian dollar</small></span><b>AUD</b></button>
        </div>
      </section>
      {transactionCount > 0 && <button className="danger-button" onClick={onClear}><Trash2 /> Clear all app data</button>}
      <p className="version-label">SpendWise 1.0 · Built for clarity, not judgement.</p>
    </div>
  );
}

function UploadModal({
  open,
  busy,
  message,
  onClose,
  onFiles,
}: {
  open: boolean;
  busy: boolean;
  message: string;
  onClose: () => void;
  onFiles: (files: FileList) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && !busy && onClose()}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="upload-title">
        <button className="modal-close" onClick={onClose} disabled={busy}><X /></button>
        <span className="modal-icon"><Upload /></span>
        <h2 id="upload-title">Upload bank statements</h2>
        <p>SpendWise reads your transactions and builds the dashboard automatically. Your files are processed on this device.</p>
        <button className="drop-zone" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <RefreshCcw className="spin" /> : <FileText />}
          <strong>{busy ? "Analysing your spending…" : "Choose PDF or CSV files"}</strong>
          <small>Upload multiple months at once</small>
        </button>
        <input ref={inputRef} hidden type="file" multiple accept=".pdf,.csv,application/pdf,text/csv" onChange={(event) => event.target.files && onFiles(event.target.files)} />
        {message && <div className={`upload-message ${message.startsWith("Could") ? "error" : ""}`}>{message}</div>}
        <div className="privacy-note"><LockKeyhole /><span><strong>Private by design</strong><small>No bank login. No files uploaded to a server.</small></span></div>
      </section>
    </div>
  );
}

function TransactionDrawer({
  transaction,
  onClose,
  onUpdate,
}: {
  transaction: Transaction | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
}) {
  if (!transaction) return null;
  const setWaste = (status: WasteStatus) => onUpdate(transaction.id, { wasteStatus: status });
  return (
    <div className="modal-backdrop drawer-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <section className="transaction-drawer" role="dialog" aria-modal="true" aria-labelledby="transaction-title">
        <div className="drawer-handle" />
        <button className="modal-close" onClick={onClose}><X /></button>
        <CategoryIcon category={transaction.category} size="large" />
        <h2 id="transaction-title">{transaction.merchant}</h2>
        <strong className="drawer-amount">{money(transaction.amount, 2)}</strong>
        <p>{dateLabel(transaction.date)} · {transaction.source}</p>
        <div className="drawer-section">
          <label>Category</label>
          <div className="drawer-select"><select value={transaction.category} onChange={(event) => onUpdate(transaction.id, { category: event.target.value as Category })}>{categoryList.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown /></div>
        </div>
        <div className="drawer-section">
          <label>Was this avoidable?</label>
          <div className="choice-grid">
            <button className={transaction.wasteStatus === "avoidable" ? "active" : ""} onClick={() => setWaste("avoidable")}>Avoidable</button>
            <button className={transaction.wasteStatus === "necessary" ? "active" : ""} onClick={() => setWaste("necessary")}>Necessary</button>
            <button className={transaction.wasteStatus === "unreviewed" ? "active" : ""} onClick={() => setWaste("unreviewed")}>Not sure</button>
          </div>
        </div>
        <div className="raw-description"><small>BANK DESCRIPTION</small><p>{transaction.description}</p></div>
        <button className="primary-button full" onClick={onClose}><Check /> Save correction</button>
      </section>
    </div>
  );
}

export default function SpendWiseApp() {
  const [tab, setTab] = useState<Tab>("overview");
  const [spendingView, setSpendingView] = useState<SpendingView>("categories");
  const [transactions, setTransactions] = useState<Transaction[]>(sampleTransactions);
  const [statements, setStatements] = useState<StatementRecord[]>([]);
  const [isSample, setIsSample] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("2026-09");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("spendwise-data-v1");
      if (saved) {
        const parsed = JSON.parse(saved) as { transactions: Transaction[]; statements: StatementRecord[] };
        if (parsed.transactions?.length) {
          setTransactions(parsed.transactions);
          setStatements(parsed.statements ?? []);
          setIsSample(false);
          const latest = [...new Set(parsed.transactions.map((item) => monthKey(item.date)))].sort().at(-1);
          if (latest) setSelectedMonth(latest);
        }
      }
    } catch {
      localStorage.removeItem("spendwise-data-v1");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || isSample) return;
    localStorage.setItem("spendwise-data-v1", JSON.stringify({ transactions, statements }));
  }, [hydrated, isSample, statements, transactions]);

  const monthOptions = useMemo(() => [...new Set(transactions.map((item) => monthKey(item.date)))].filter(Boolean).sort().reverse(), [transactions]);
  const monthTransactions = useMemo(() => transactions.filter((item) => monthKey(item.date) === selectedMonth), [selectedMonth, transactions]);
  const monthTotals = useMemo(() => {
    const totals = transactions.reduce((result, item) => {
      const key = monthKey(item.date);
      result[key] = (result[key] ?? 0) + signedAmount(item);
      return result;
    }, {} as Record<string, number>);
    return Object.entries(totals).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  }, [transactions]);
  const average = monthTotals.length ? monthTotals.reduce((sum, [, value]) => sum + value, 0) / monthTotals.length : 0;

  const openCategory = (category: Category) => {
    setTab("spending");
    setSpendingView(category === "Subscriptions" ? "subscriptions" : "categories");
  };

  const handleFiles = async (files: FileList) => {
    setBusy(true);
    setUploadMessage("Building your verified transaction ledger…");
    const imported: Transaction[] = [];
    const importedStatements: StatementRecord[] = [];
    let failed = 0;
    for (const file of Array.from(files)) {
      try {
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        const text = isPdf ? await pdfText(file) : await file.text();
        const parsed = isPdf ? analyseBankText(text, file.name) : analyseCsv(text, file.name);
        imported.push(...parsed);
        importedStatements.push({ id: `${file.name}-${file.lastModified}`, name: file.name, uploadedAt: new Date().toISOString(), transactionCount: parsed.length });
      } catch {
        failed += 1;
      }
    }
    const unique = Array.from(new Map(imported.map((item) => [item.id, item])).values());
    if (unique.length) {
      setTransactions(unique);
      setStatements(importedStatements);
      setIsSample(false);
      const latest = [...new Set(unique.map((item) => monthKey(item.date)))].sort().at(-1);
      if (latest) setSelectedMonth(latest);
      setUploadMessage(`Found ${unique.length} transactions across ${files.length - failed} statement${files.length - failed === 1 ? "" : "s"}.`);
      setTimeout(() => setUploadOpen(false), 900);
    } else {
      setUploadMessage(failed === files.length ? "Could not read those files. Try a bank PDF or CSV export." : "Could not find debit transactions in those statements.");
    }
    setBusy(false);
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions((items) => items.map((item) => item.id === id ? { ...item, ...updates } : item));
    setSelectedTransaction((item) => item?.id === id ? { ...item, ...updates } : item);
  };

  const clearData = () => {
    if (!window.confirm("Clear all imported statements and corrections from this device?")) return;
    localStorage.removeItem("spendwise-data-v1");
    setTransactions(sampleTransactions);
    setStatements([]);
    setSelectedMonth("2026-09");
    setIsSample(true);
    setTab("overview");
  };

  return (
    <main className="app-shell">
      <div className="app-frame">
        <AppHeader tab={tab} hasNotification={!isSample} />
        <div className="screen-content">
          {tab === "overview" && <OverviewScreen month={selectedMonth} monthOptions={monthOptions} monthTransactions={monthTransactions} monthTotals={monthTotals} average={average} isSample={isSample} setMonth={setSelectedMonth} onUpload={() => setUploadOpen(true)} onCategory={openCategory} onWaste={() => setTab("waste")} />}
          {tab === "spending" && <SpendingScreen month={selectedMonth} monthOptions={monthOptions} transactions={monthTransactions} monthTotals={monthTotals} view={spendingView} setMonth={setSelectedMonth} setView={setSpendingView} onUpload={() => setUploadOpen(true)} onTransaction={setSelectedTransaction} />}
          {tab === "waste" && <WasteScreen month={selectedMonth} monthOptions={monthOptions} transactions={monthTransactions} setMonth={setSelectedMonth} onUpload={() => setUploadOpen(true)} onTransaction={setSelectedTransaction} />}
          {tab === "settings" && <SettingsScreen statements={statements} transactionCount={isSample ? 0 : transactions.length} onUpload={() => setUploadOpen(true)} onClear={clearData} />}
        </div>
        <nav className="bottom-nav" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return <button className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)} key={item.id}><Icon /><span>{item.label}</span></button>;
          })}
        </nav>
      </div>
      <UploadModal open={uploadOpen} busy={busy} message={uploadMessage} onClose={() => !busy && setUploadOpen(false)} onFiles={handleFiles} />
      <TransactionDrawer transaction={selectedTransaction} onClose={() => setSelectedTransaction(null)} onUpdate={updateTransaction} />
    </main>
  );
}
