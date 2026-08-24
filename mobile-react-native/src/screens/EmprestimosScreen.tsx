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
import { HandCoins, Plus, Calendar, User, Phone, Trash2, CheckCircle2 } from 'lucide-react-native';
import { Loan, Installment } from '../types';

export const EmprestimosScreen: React.FC = () => {
  const { loans, addLoan, updateLoan, deleteLoan } = useFinance();
  const [modalVisible, setModalVisible] = useState(false);

  // Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientPixKey, setClientPixKey] = useState('');
  const [borrowedAmount, setBorrowedAmount] = useState('');
  const [interestRate, setInterestRate] = useState('20');
  const [installmentsCount, setInstallmentsCount] = useState('4');
  const [paymentFrequency, setPaymentFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [startDate, setStartDate] = useState(todayISO());

  const handleCreateLoan = async () => {
    if (!clientName || !borrowedAmount) {
      Alert.alert('Atenção', 'Informe pelo menos o nome do cliente e o valor emprestado.');
      return;
    }

    const borrowed = parseFloat(borrowedAmount.replace(',', '.'));
    const rate = parseFloat(interestRate.replace(',', '.')) || 0;
    const totalToPay = borrowed * (1 + rate / 100);
    const count = parseInt(installmentsCount, 10) || 1;
    const instAmount = totalToPay / count;

    const installments: Installment[] = [];
    for (let i = 1; i <= count; i++) {
      installments.push({
        installmentNumber: i,
        dueDate: startDate,
        amount: Math.round(instAmount * 100) / 100,
        isPaid: false,
      });
    }

    await addLoan({
      clientName,
      clientPhone,
      clientPixKey,
      borrowedAmount: borrowed,
      interestRate: rate,
      totalToPay,
      installmentsCount: count,
      paymentFrequency,
      startDate,
      installments,
      status: 'active',
    });

    setClientName('');
    setClientPhone('');
    setClientPixKey('');
    setBorrowedAmount('');
    setModalVisible(false);
  };

  const handleToggleInstallment = async (loan: Loan, installmentNumber: number) => {
    const updatedInst = loan.installments.map(inst => {
      if (inst.installmentNumber === installmentNumber) {
        return { ...inst, isPaid: !inst.isPaid };
      }
      return inst;
    });

    const allPaid = updatedInst.every(i => i.isPaid);
    await updateLoan({
      ...loan,
      installments: updatedInst,
      status: allPaid ? 'completed' : 'active',
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topHeader}>
          <Text style={styles.sectionTitle}>Controle de Empréstimos</Text>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => setModalVisible(true)}
          >
            <Plus size={16} color="#ffffff" />
            <Text style={styles.newBtnText}>Novo Empréstimo</Text>
          </TouchableOpacity>
        </View>

        {loans.length === 0 ? (
          <View style={styles.emptyCard}>
            <HandCoins size={40} color="#94a3b8" />
            <Text style={styles.emptyTitle}>Nenhum empréstimo ativo</Text>
            <Text style={styles.emptySubtitle}>
              Cadastre empréstimos, controle juros, parcelas e cobranças via PIX diretamente no app.
            </Text>
          </View>
        ) : (
          loans.map(loan => {
            const paidCount = loan.installments.filter(i => i.isPaid).length;
            const isFinished = loan.status === 'completed';

            return (
              <View key={loan.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.clientName}>{loan.clientName}</Text>
                    {loan.clientPhone ? (
                      <Text style={styles.clientPhone}>{loan.clientPhone}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => deleteLoan(loan.id)}>
                    <Trash2 size={18} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* Values Overview */}
                <View style={styles.valuesGrid}>
                  <View style={styles.valueBox}>
                    <Text style={styles.valueBoxLabel}>Emprestado</Text>
                    <Text style={styles.valueBoxVal}>{formatCurrency(loan.borrowedAmount)}</Text>
                  </View>
                  <View style={styles.valueBox}>
                    <Text style={styles.valueBoxLabel}>Total c/ Juros ({loan.interestRate}%)</Text>
                    <Text style={[styles.valueBoxVal, { color: '#047857' }]}>
                      {formatCurrency(loan.totalToPay)}
                    </Text>
                  </View>
                </View>

                {/* Installments Checklist */}
                <Text style={styles.parcelasTitle}>Parcelas ({paidCount}/{loan.installmentsCount} pagas):</Text>
                <View style={styles.parcelasList}>
                  {loan.installments.map(inst => (
                    <TouchableOpacity
                      key={inst.installmentNumber}
                      style={[
                        styles.parcelaItem,
                        inst.isPaid && styles.parcelaItemPaid,
                      ]}
                      onPress={() => handleToggleInstallment(loan, inst.installmentNumber)}
                    >
                      <View style={styles.parcelaLeft}>
                        <CheckCircle2
                          size={18}
                          color={inst.isPaid ? '#059669' : '#94a3b8'}
                        />
                        <Text
                          style={[
                            styles.parcelaText,
                            inst.isPaid && styles.parcelaTextPaid,
                          ]}
                        >
                          Parcela {inst.installmentNumber}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.parcelaAmount,
                          inst.isPaid && styles.parcelaAmountPaid,
                        ]}
                      >
                        {formatCurrency(inst.amount)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal Novo Empréstimo */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Empréstimo</Text>

            <TextInput
              style={styles.input}
              placeholder="Nome do Cliente"
              placeholderTextColor="#94a3b8"
              value={clientName}
              onChangeText={setClientName}
            />

            <TextInput
              style={styles.input}
              placeholder="WhatsApp / Telefone"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={clientPhone}
              onChangeText={setClientPhone}
            />

            <TextInput
              style={styles.input}
              placeholder="Valor Emprestado (R$)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={borrowedAmount}
              onChangeText={setBorrowedAmount}
            />

            <View style={styles.formRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Taxa Juros (%)"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={interestRate}
                onChangeText={setInterestRate}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Nº Parcelas"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={installmentsCount}
                onChangeText={setInstallmentsCount}
              />
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={handleCreateLoan}
              >
                <Text style={styles.confirmBtnText}>Salvar</Text>
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
  newBtn: {
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newBtnText: {
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
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  clientPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  valuesGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  valueBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  valueBoxLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  valueBoxVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  parcelasTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  parcelasList: {
    gap: 6,
  },
  parcelaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  parcelaItemPaid: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  parcelaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  parcelaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  parcelaTextPaid: {
    color: '#065f46',
    textDecorationLine: 'line-through',
  },
  parcelaAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  parcelaAmountPaid: {
    color: '#047857',
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
  formRow: {
    flexDirection: 'row',
    gap: 10,
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
    backgroundColor: '#0284c7',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
