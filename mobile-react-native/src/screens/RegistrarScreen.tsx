import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useFinance } from '../context/FinanceContext';
import { todayISO } from '../utils/format';
import { Car, Fuel, Plus } from 'lucide-react-native';

export const RegistrarScreen: React.FC = () => {
  const { addRide, addExpense } = useFinance();
  const [tab, setTab] = useState<'ride' | 'expense'>('ride');

  // Ride Form
  const [gross, setGross] = useState('');
  const [km, setKm] = useState('');
  const [minutes, setMinutes] = useState('');
  const [platform, setPlatform] = useState<'uber' | '99' | 'indrive' | 'particular' | 'outros'>('uber');

  // Expense Form
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<'combustivel' | 'alimentacao' | 'manutencao' | 'aluguel_veiculo' | 'seguro' | 'lava_jato' | 'outros'>('combustivel');
  const [description, setDescription] = useState('');

  const handleSaveRide = async () => {
    const amount = parseFloat(gross.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Atenção', 'Informe o valor faturado da corrida.');
      return;
    }

    await addRide({
      date: todayISO(),
      driverGross: amount,
      totalAppKm: parseFloat(km) || 0,
      totalAppMinutes: parseInt(minutes, 10) || 0,
      platform,
    });

    setGross('');
    setKm('');
    setMinutes('');
    Alert.alert('Sucesso', 'Corrida registrada com sucesso!');
  };

  const handleSaveExpense = async () => {
    const amount = parseFloat(expenseAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Atenção', 'Informe o valor da despesa.');
      return;
    }

    await addExpense({
      date: todayISO(),
      amount,
      category: expenseCategory,
      description,
    });

    setExpenseAmount('');
    setDescription('');
    Alert.alert('Sucesso', 'Despesa registrada com sucesso!');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Switch Tabs */}
      <View style={styles.switchContainer}>
        <TouchableOpacity
          style={[styles.switchBtn, tab === 'ride' && styles.switchBtnActive]}
          onPress={() => setTab('ride')}
        >
          <Car size={16} color={tab === 'ride' ? '#ffffff' : '#64748b'} />
          <Text style={[styles.switchBtnText, tab === 'ride' && styles.switchBtnTextActive]}>
            Registrar Corrida
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.switchBtn, tab === 'expense' && styles.switchBtnActive]}
          onPress={() => setTab('expense')}
        >
          <Fuel size={16} color={tab === 'expense' ? '#ffffff' : '#64748b'} />
          <Text style={[styles.switchBtnText, tab === 'expense' && styles.switchBtnTextActive]}>
            Registrar Despesa
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'ride' ? (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Lançamento de Faturamento</Text>

          <Text style={styles.inputLabel}>Valor Bruto (R$)</Text>
          <TextInput
            style={styles.input}
            placeholder="0,00"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            value={gross}
            onChangeText={setGross}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Km Rodados</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 15"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={km}
                onChangeText={setKm}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Tempo (min)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 25"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={minutes}
                onChangeText={setMinutes}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSaveRide}>
            <Plus size={18} color="#ffffff" />
            <Text style={styles.submitBtnText}>Salvar Corrida</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Lançamento de Despesa</Text>

          <Text style={styles.inputLabel}>Valor Gasto (R$)</Text>
          <TextInput
            style={styles.input}
            placeholder="0,00"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            value={expenseAmount}
            onChangeText={setExpenseAmount}
          />

          <Text style={styles.inputLabel}>Descrição (Opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Gasolina Aditivada, Almoço..."
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: '#e11d48' }]}
            onPress={handleSaveExpense}
          >
            <Plus size={18} color="#ffffff" />
            <Text style={styles.submitBtnText}>Salvar Despesa</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  switchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  switchBtnActive: {
    backgroundColor: '#059669',
  },
  switchBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  switchBtnTextActive: {
    color: '#ffffff',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  submitBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
