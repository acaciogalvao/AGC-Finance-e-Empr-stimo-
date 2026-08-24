import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDateDisplay, todayISO } from '../utils/format';
import { Target, Plus, CheckCircle, Clock, AlertTriangle, Trash2, DollarSign, Calendar } from 'lucide-react-native';

export const MetasScreen: React.FC = () => {
  const { savingsGoals, addGoal, addGoalDeposit, deleteGoal } = useFinance();
  const [modalVisible, setModalVisible] = useState(false);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [excludeSundays, setExcludeSundays] = useState(true);
  const [startDate, setStartDate] = useState(todayISO());
  const [targetDate, setTargetDate] = useState('');

  const handleCreateGoal = async () => {
    if (!name || !totalAmount || !targetDate) {
      Alert.alert('Atenção', 'Preencha o nome, valor total e a data limite da meta.');
      return;
    }

    await addGoal({
      name,
      totalAmount: parseFloat(totalAmount.replace(',', '.')),
      frequency,
      excludeSundays,
      startDate: startDate || todayISO(),
      targetDate,
      payments: [],
    });

    setName('');
    setTotalAmount('');
    setTargetDate('');
    setModalVisible(false);
  };

  const handleDeposit = async () => {
    if (!selectedGoalId || !depositAmount) return;
    const amount = parseFloat(depositAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Atenção', 'Informe um valor de depósito válido.');
      return;
    }

    await addGoalDeposit(selectedGoalId, amount);
    setDepositAmount('');
    setDepositModalVisible(false);
    setSelectedGoalId(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header Button */}
        <View style={styles.topHeader}>
          <Text style={styles.sectionTitle}>Caixinhas & Metas</Text>
          <TouchableOpacity
            style={styles.newGoalBtn}
            onPress={() => setModalVisible(true)}
          >
            <Plus size={16} color="#ffffff" />
            <Text style={styles.newGoalBtnText}>Nova Meta</Text>
          </TouchableOpacity>
        </View>

        {savingsGoals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Target size={40} color="#94a3b8" />
            <Text style={styles.emptyTitle}>Nenhuma meta cadastrada</Text>
            <Text style={styles.emptySubtitle}>
              Crie uma meta para juntar dinheiro para IPVA, Seguro, Férias ou Troca de Moto/Carro.
            </Text>
          </View>
        ) : (
          savingsGoals.map(goal => {
            const saved = (goal.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
            const progress = goal.totalAmount > 0 ? (saved / goal.totalAmount) * 100 : 0;
            const isCompleted = saved >= goal.totalAmount;

            // Calculations
            const dailyVal = goal.totalAmount / 30;
            const weeklyVal = dailyVal * 6;
            const monthlyVal = goal.totalAmount;

            return (
              <View key={goal.id} style={styles.goalCard}>
                {/* Header Tag */}
                <View style={styles.goalHeaderRow}>
                  <View style={styles.tagsContainer}>
                    <View style={styles.freqTag}>
                      <Text style={styles.freqTagText}>
                        {goal.frequency === 'daily'
                          ? 'Aporte Diário'
                          : goal.frequency === 'weekly'
                          ? 'Aporte Semanal'
                          : 'Aporte Mensal'}
                      </Text>
                    </View>
                    <View style={[styles.statusTag, isCompleted ? styles.tagSuccess : styles.tagActive]}>
                      <Text style={[styles.statusTagText, isCompleted ? styles.textSuccess : styles.textActive]}>
                        {isCompleted ? '✓ Atingida' : 'Em Dia'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity onPress={() => deleteGoal(goal.id)}>
                    <Trash2 size={18} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* Title */}
                <Text style={styles.goalName}>{goal.name}</Text>

                {/* Dates */}
                <View style={styles.datesRow}>
                  <Calendar size={14} color="#059669" />
                  <Text style={styles.datesText}>
                    Início: {formatDateDisplay(goal.startDate)} → Término: {formatDateDisplay(goal.targetDate)}
                  </Text>
                </View>

                {/* Progress */}
                <View style={styles.progressSection}>
                  <View style={styles.progressLabels}>
                    <Text style={styles.progressLabelLeft}>Progresso</Text>
                    <Text style={styles.progressLabelRight}>
                      {formatCurrency(saved)} / {formatCurrency(goal.totalAmount)} ({progress.toFixed(0)}%)
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(100, progress)}%` },
                      ]}
                    />
                  </View>
                </View>

                {/* 3 Equivalents Breakdown */}
                <View style={styles.breakdownContainer}>
                  <Text style={styles.breakdownTitle}>Divisão dos Valores a Guardar:</Text>
                  <View style={styles.breakdownGrid}>
                    <View style={styles.breakdownBox}>
                      <Text style={styles.breakdownBoxLabel}>Diariamente</Text>
                      <Text style={styles.breakdownBoxValue}>{formatCurrency(dailyVal)}</Text>
                    </View>
                    <View style={styles.breakdownBox}>
                      <Text style={styles.breakdownBoxLabel}>Semanalmente</Text>
                      <Text style={styles.breakdownBoxValue}>{formatCurrency(weeklyVal)}</Text>
                    </View>
                    <View style={styles.breakdownBox}>
                      <Text style={styles.breakdownBoxLabel}>Mensalmente</Text>
                      <Text style={styles.breakdownBoxValue}>{formatCurrency(monthlyVal)}</Text>
                    </View>
                  </View>
                </View>

                {/* Deposit Action */}
                {!isCompleted && (
                  <TouchableOpacity
                    style={styles.depositBtn}
                    onPress={() => {
                      setSelectedGoalId(goal.id);
                      setDepositModalVisible(true);
                    }}
                  >
                    <DollarSign size={16} color="#ffffff" />
                    <Text style={styles.depositBtnText}>Fazer Depósito / Aporte</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal Nova Meta */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova Meta ou Caixinha</Text>

            <TextInput
              style={styles.input}
              placeholder="Nome (Ex: IPVA, Pagar Moto, Férias)"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={styles.input}
              placeholder="Valor Total Alvo (R$)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={totalAmount}
              onChangeText={setTotalAmount}
            />

            <TextInput
              style={styles.input}
              placeholder="Data Alvo / Término (AAAA-MM-DD)"
              placeholderTextColor="#94a3b8"
              value={targetDate}
              onChangeText={setTargetDate}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={handleCreateGoal}
              >
                <Text style={styles.confirmBtnText}>Salvar Meta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Depósito */}
      <Modal visible={depositModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Depositar na Caixinha</Text>
            <TextInput
              style={styles.input}
              placeholder="Valor a depositar (R$)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={depositAmount}
              onChangeText={setDepositAmount}
              autoFocus
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setDepositModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={handleDeposit}
              >
                <Text style={styles.confirmBtnText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  newGoalBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newGoalBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  goalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  freqTag: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  freqTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagActive: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  tagSuccess: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textActive: {
    color: '#15803d',
  },
  textSuccess: {
    color: '#166534',
  },
  goalName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  datesText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 12,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabelLeft: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  progressLabelRight: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  breakdownContainer: {
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#475569',
    marginBottom: 6,
  },
  breakdownGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  breakdownBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  breakdownBoxLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
  },
  breakdownBoxValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  depositBtn: {
    backgroundColor: '#047857',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  depositBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 12,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
  },
  confirmBtn: {
    backgroundColor: '#059669',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
