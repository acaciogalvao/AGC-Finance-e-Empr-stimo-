import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, todayISO } from '../utils/format';
import { TrendingUp, TrendingDown, DollarSign, Target, Award } from 'lucide-react-native';

export const InicioScreen: React.FC = () => {
  const { rides, expenses, savingsGoals, loans, profile } = useFinance();

  const today = todayISO();
  const todayRides = rides.filter(r => r.date === today);
  const todayExpenses = expenses.filter(e => e.date === today);

  const todayGross = todayRides.reduce((s, r) => s + (r.driverGross || 0), 0);
  const todayExp = todayExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const todayNet = todayGross - todayExp;

  const totalLoansActive = loans.filter(l => l.status !== 'completed').length;
  const totalGoalsActive = savingsGoals.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {profile.name || 'Motorista'}</Text>
          <Text style={styles.subGreeting}>Painel Financeiro & Operacional</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>AGC v2.0 Native</Text>
        </View>
      </View>

      {/* Daily Summary Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumo de Hoje ({today})</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <TrendingUp size={20} color="#10b981" />
            <Text style={styles.statLabel}>Faturamento</Text>
            <Text style={[styles.statValue, { color: '#047857' }]}>{formatCurrency(todayGross)}</Text>
          </View>

          <View style={styles.statBox}>
            <TrendingDown size={20} color="#f43f5e" />
            <Text style={styles.statLabel}>Despesas</Text>
            <Text style={[styles.statValue, { color: '#be123c' }]}>{formatCurrency(todayExp)}</Text>
          </View>
        </View>

        <View style={styles.netBox}>
          <Text style={styles.netLabel}>Lucro Líquido do Dia:</Text>
          <Text style={styles.netValue}>{formatCurrency(todayNet)}</Text>
        </View>

        {/* Goal Progress */}
        <View style={styles.goalProgressContainer}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalLabel}>Meta Diária ({formatCurrency(profile.dailyGoal)})</Text>
            <Text style={styles.goalPercent}>
              {profile.dailyGoal > 0 ? ((todayGross / profile.dailyGoal) * 100).toFixed(0) : 0}%
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, profile.dailyGoal > 0 ? (todayGross / profile.dailyGoal) * 100 : 0)}%` },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Quick Overview Grid */}
      <View style={styles.grid}>
        <View style={styles.gridCard}>
          <Target size={24} color="#059669" />
          <Text style={styles.gridNumber}>{totalGoalsActive}</Text>
          <Text style={styles.gridLabel}>Metas / Caixinhas</Text>
        </View>

        <View style={styles.gridCard}>
          <DollarSign size={24} color="#0284c7" />
          <Text style={styles.gridNumber}>{totalLoansActive}</Text>
          <Text style={styles.gridLabel}>Empréstimos Ativos</Text>
        </View>
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  subGreeting: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#065f46',
    fontSize: 10,
    fontWeight: '700',
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
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  netBox: {
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginBottom: 16,
  },
  netLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065f46',
  },
  netValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#047857',
  },
  goalProgressContainer: {
    marginTop: 4,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  goalLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  goalPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  gridNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8,
  },
  gridLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
});
