import { useState, useEffect } from 'react'
import { Plus, X, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import './Finance.css'

const CATEGORIES = {
  expense: ['Food', 'Transport', 'Subscriptions', 'Education', 'Health', 'Shopping', 'Entertainment', 'Rent', 'Other'],
  income:  ['Salary', 'Freelance', 'Gift', 'Investment', 'Refund', 'Other'],
}

export default function Finance() {
  const [transactions, setTransactions] = useState([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ type: 'expense', amount: '', category: 'Food', note: '', date: format(new Date(), 'yyyy-MM-dd') })
  const [saving, setSaving] = useState(false)
  const [netWorth, setNetWorth] = useState({ assets: '', liabilities: '' })
  const [tab, setTab] = useState('log')

  useEffect(() => { load() }, [])

  async function load() {
    const start = startOfMonth(new Date()).toISOString()
    const end   = endOfMonth(new Date()).toISOString()
    const { data } = await supabase.from('finance').select('*').gte('date', start.slice(0,10)).lte('date', end.slice(0,10)).order('date', { ascending: false })
    if (data) setTransactions(data)
  }

  async function save() {
    if (!form.amount || isNaN(Number(form.amount))) return
    setSaving(true)
    await supabase.from('finance').insert([{ ...form, amount: Number(form.amount) }])
    setForm({ type: 'expense', amount: '', category: 'Food', note: '', date: format(new Date(), 'yyyy-MM-dd') })
    setAdding(false)
    setSaving(false)
    load()
  }

  async function remove(id) {
    await supabase.from('finance').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  const income   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const balance  = income - expenses
  const nw       = Number(netWorth.assets || 0) - Number(netWorth.liabilities || 0)

  const byCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + Number(t.amount); return acc }, {})

  return (
    <div className="finance stagger">
      <div className="section-header">
        <h2>Finance</h2>
        <button className="add-btn" onClick={() => setAdding(true)}><Plus size={15} /> Add</button>
      </div>

      <div className="fin-tabs">
        <button className={tab === 'log' ? 'fin-tab active' : 'fin-tab'} onClick={() => setTab('log')}>This month</button>
        <button className={tab === 'networth' ? 'fin-tab active' : 'fin-tab'} onClick={() => setTab('networth')}>Net worth</button>
      </div>

      {tab === 'log' && (
        <>
          <div className="fin-summary">
            <div className="fin-metric">
              <TrendingUp size={14} />
              <div>
                <p className="fin-label">Income</p>
                <p className="fin-val income">${income.toLocaleString()}</p>
              </div>
            </div>
            <div className="fin-metric">
              <TrendingDown size={14} />
              <div>
                <p className="fin-label">Expenses</p>
                <p className="fin-val expense">${expenses.toLocaleString()}</p>
              </div>
            </div>
            <div className="fin-metric">
              <DollarSign size={14} />
              <div>
                <p className="fin-label">Balance</p>
                <p className={`fin-val ${balance >= 0 ? 'income' : 'expense'}`}>${balance.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {Object.keys(byCategory).length > 0 && (
            <div className="category-breakdown">
              <p className="breakdown-title">Expenses by category</p>
              {Object.entries(byCategory).sort((a,b) => b[1]-a[1]).map(([cat, amt]) => (
                <div key={cat} className="cat-row">
                  <span className="cat-name">{cat}</span>
                  <div className="cat-bar-wrap">
                    <div className="cat-bar" style={{ width: `${Math.min(100, (amt/expenses)*100)}%` }} />
                  </div>
                  <span className="cat-amt">${amt.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {adding && (
            <div className="add-form fade-in">
              <div className="type-toggle">
                <button className={form.type === 'expense' ? 'type-btn active-expense' : 'type-btn'} onClick={() => setForm(f => ({ ...f, type: 'expense', category: 'Food' }))}>Expense</button>
                <button className={form.type === 'income'  ? 'type-btn active-income'  : 'type-btn'} onClick={() => setForm(f => ({ ...f, type: 'income',  category: 'Salary' }))}>Income</button>
              </div>
              <input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES[form.type].map(c => <option key={c}>{c}</option>)}
              </select>
              <input placeholder="Note (optional)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              <div className="form-actions">
                <button className="cancel-btn" onClick={() => setAdding(false)}>Cancel</button>
                <button className="save-btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          )}

          <div className="tx-list">
            {transactions.length === 0 && <div className="empty-state">No transactions this month.</div>}
            {transactions.map(tx => (
              <div key={tx.id} className="tx-row">
                <div className="tx-left">
                  <span className={`tx-type-dot ${tx.type}`} />
                  <div>
                    <p className="tx-note">{tx.note || tx.category}</p>
                    <p className="tx-meta">{tx.category} · {format(new Date(tx.date), 'MMM d')}</p>
                  </div>
                </div>
                <div className="tx-right">
                  <span className={`tx-amount ${tx.type}`}>{tx.type === 'income' ? '+' : '-'}${Number(tx.amount).toLocaleString()}</span>
                  <button className="icon-btn" onClick={() => remove(tx.id)}><X size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'networth' && (
        <div className="networth-section fade-in">
          <div className="nw-inputs">
            <div className="nw-field">
              <label>Total assets ($)</label>
              <input type="number" placeholder="e.g. 5000" value={netWorth.assets} onChange={e => setNetWorth(n => ({ ...n, assets: e.target.value }))} />
            </div>
            <div className="nw-field">
              <label>Total liabilities ($)</label>
              <input type="number" placeholder="e.g. 1200" value={netWorth.liabilities} onChange={e => setNetWorth(n => ({ ...n, liabilities: e.target.value }))} />
            </div>
          </div>
          <div className={`nw-result ${nw >= 0 ? 'positive' : 'negative'}`}>
            <p className="nw-label">Net worth</p>
            <p className="nw-value">${nw.toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  )
}
