import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/format';
import { BarChart3, PieChart, Wallet } from 'lucide-react-native';

export const RelatoriosScreen: React.FC = () => {
  const { rides, expenses, profile } = useFinance();

  const totalGross = rides.reduce((s, r) => s + (r.driverGross || 0), 0);
  const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit = totalGross - totalExp;

  const totalKm = rides.reduce((s, r) => s + (r.totalAppKm || 0), 0);
  const avgPerKm = totalKm > 0 ? totalGross / totalKm : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Relatórios & Desempenho</Text>

      {/* Main Stats Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Balanço Geral Acumulado</Text>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Faturamento Total:</Text>
          <Text style={styles.grossVal}>{formatCurrency(totalGross)}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Despesas Totais:</Text>
          <Text style={styles.expVal}>{formatCurrency(totalExp)}</Text>
        </View>

        <View style={[styles.statRow, styles.profitRow]}>
          <Text style={styles.profitLabel}>Lucro Líquido Real:</Text>
          <Text style={styles.profitVal}>{formatCurrency(netProfit)}</Text>
        </View>
      </View>

      {/* Operational Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Métricas Operacionais</Text>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Km Rodados:</Text>
          <Text style={styles.statVal}>{totalKm.toFixed(1)} km</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Rendimento Médio por Km:</Text>
          <Text style={styles.statVal}>{formatCurrency(avgPerKm)} / km</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total de Corridas:</Text>
          <Text style={styles.statVal}>{rides.length} corridas</Text>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  grossVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  expVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#e11d48',
  },
  statVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  profitRow: {
    borderBottomWidth: 0,
    marginTop: 6,
    paddingTop: 10,
  },
  profitLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  profitVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#047857',
  },
});
