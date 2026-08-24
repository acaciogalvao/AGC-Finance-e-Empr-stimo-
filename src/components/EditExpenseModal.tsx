import React, { useState } from 'react';
import { X, Save, Trash2, Tag, Calendar, DollarSign } from 'lucide-react';
import { Expense, ExpenseCategory, EXPENSE_CATEGORIES } from '../context/FinanceContext';
import { FormField } from './FormField';
import { parseCurrency, maskCurrency } from '../utils/masks';
import { ConfirmModal } from './ConfirmModal';

interface EditExpenseModalProps {
  expense: Expense;
  onSave: (id: string, updated: Partial<Expense>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function EditExpenseModal({ expense, onSave, onDelete, onClose }: EditExpenseModalProps) {
  const [category, setCategory] = useState<ExpenseCategory>(expense.category);
  const [value, setValue] = useState(maskCurrency(Math.round(expense.value * 100).toString()));
  const [date, setDate] = useState(expense.date);
  const [description, setDescription] = useState(expense.description || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseCurrency(value);
    onSave(expense.id, {
      category,
      value: val > 0 ? val : expense.value,
      date,
      description: description.trim() || category,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Editar Despesa</h3>
              <p className="text-xs text-slate-400">Atualize os detalhes do gasto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <FormField
            label="Valor do Gasto (R$)"
            mask="currency"
            value={value}
            onChange={setValue}
            icon={<DollarSign className="w-4 h-4 text-slate-400" />}
          />

          <FormField
            label="Data"
            type="date"
            value={date}
            onChange={setDate}
            icon={<Calendar className="w-4 h-4 text-slate-400" />}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Abastecimento Posto Shell"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-6">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center space-x-1.5 text-rose-400 hover:text-rose-300 font-bold text-xs px-3 py-2 rounded-xl hover:bg-rose-500/10 transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir</span>
            </button>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-slate-400 font-bold text-xs hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Salvar</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Excluir Despesa"
        message="Tem certeza que deseja excluir esta despesa?"
        confirmText="Excluir"
        variant="danger"
        onConfirm={() => {
          onDelete(expense.id);
          onClose();
        }}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
