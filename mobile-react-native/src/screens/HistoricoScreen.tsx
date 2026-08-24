import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDateDisplay } from '../utils/format';
import { Trash2, Car, Fuel } from 'lucide-react-native';

export const HistoricoScreen: React.FC = () => {
  const { rides, expenses, deleteRide, deleteExpense } = useFinance();

  const allItems = [
    ...rides.map(r => ({ ...r, type: 'ride' as const })),
    ...expenses.map(e => ({ ...e, type: 'expense' as const })),
  ].sort((a, b) => (b.date > a.date ? 1 : -1));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Histórico de Lançamentos</Text>

      {allItems.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Nenhum registro encontrado.</Text>
        </View>
      ) : (
        allItems.map(item => {
          if (item.type === 'ride') {
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardLeft}>
                  <View style={styles.iconRide}>
                    <Car size={18} color="#059669" />
                  </View>
                  <View>
                    <Text style={styles.cardTitle}>
                      Corrida ({item.platform.toUpperCase()})
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      {formatDateDisplay(item.date)} • {item.totalAppKm} km
                    </Text>
                  </View>
                </View>

                <View style={styles.cardRight}>
                  <Text style={styles.amountGreen}>
                    +{formatCurrency(item.driverGross)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => deleteRide(item.id)}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          } else {
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardLeft}>
                  <View style={styles.iconExpense}>
                    <Fuel size={18} color="#e11d48" />
                  </View>
                  <View>
                    <Text style={styles.cardTitle}>
                      {item.category.toUpperCase()}
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      {formatDateDisplay(item.date)}
                      {item.description ? ` • ${item.description}` : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardRight}>
                  <Text style={styles.amountRed}>
                    -{formatCurrency(item.amount)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => deleteExpense(item.id)}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }
        })
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
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconRide: {
    backgroundColor: '#ecfdf5',
    padding: 8,
    borderRadius: 8,
  },
  iconExpense: {
    backgroundColor: '#ffe4e6',
    padding: 8,
    borderRadius: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amountGreen: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  amountRed: {
    fontSize: 14,
    fontWeight: '800',
    color: '#e11d48',
  },
  deleteBtn: {
    padding: 4,
  },
});
