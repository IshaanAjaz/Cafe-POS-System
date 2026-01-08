import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Armchair, Bike, ShoppingBag, Plus} from 'lucide-react-native';

interface TableGridProps {
  onSelectTable: (id: string) => void;
  activeOrders?: any[];
}

const TableGrid = ({onSelectTable, activeOrders = []}: TableGridProps) => {
  const {width} = useWindowDimensions();

  // State to track how many slots exist for each category
  const [counts, setCounts] = useState({
    dineIn: 6,
    delivery: 6,
    takeaway: 6,
  });

  // Calculate dynamic layout
  const numColumns = width > 900 ? 5 : width > 600 ? 4 : 3;
  // Subtract margin/gap to calculate precise width
  const itemWidth = (100 - (numColumns + 1) * 2) / numColumns;

  // Load saved counts on mount
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const saved = await AsyncStorage.getItem('grid_counts');
        if (saved) {
          setCounts(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load grid counts', e);
      }
    };
    loadCounts();
  }, []);

  const addSlot = async (type: 'dineIn' | 'delivery' | 'takeaway') => {
    const newCounts = {...counts, [type]: counts[type] + 1};
    setCounts(newCounts);
    await AsyncStorage.setItem('grid_counts', JSON.stringify(newCounts));
  };

  // Helper to render a section
  const renderSection = (
    title: string,
    type: 'dineIn' | 'delivery' | 'takeaway',
    Icon: any,
    prefix: string = '',
    colorTheme: string,
  ) => {
    const count = counts[type];
    const items = Array.from({length: count}, (_, i) => i + 1);

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
            <Icon color="#0f172a" size={24} />
            <Text style={styles.headerTitle}>{title}</Text>
          </View>
          <TouchableOpacity onPress={() => addSlot(type)} style={styles.addBtn}>
            <Plus size={16} color="white" />
            <Text style={styles.addBtnText}>Add Slot</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {items.map(num => {
            // Dine In uses simple numbers ("1"), others use prefix ("D1", "T1")
            const id = type === 'dineIn' ? num.toString() : `${prefix}${num}`;

            const order = activeOrders.find(o => o.tableNumber == id);
            const isOccupied = !!order;

            return (
              <TouchableOpacity
                key={id}
                onPress={() => onSelectTable(id)}
                activeOpacity={0.7}
                style={[
                  styles.card,
                  {width: `${itemWidth}%`},
                  isOccupied ? styles.occupiedCard : styles.freeCard,
                ]}>
                <View
                  style={[
                    styles.iconBadge,
                    isOccupied ? styles.occupiedBadge : styles.freeBadge,
                  ]}>
                  <Icon size={20} color={isOccupied ? '#854d0e' : '#64748b'} />
                </View>
                <Text style={styles.tableNum}>
                  {type === 'dineIn' ? `Table ${num}` : `${title} ${num}`}
                </Text>
                {isOccupied ? (
                  <>
                    <View style={styles.statusTag}>
                      <Text style={styles.statusText}>BUSY</Text>
                    </View>
                    <Text style={styles.priceText}>
                      ₹{(order?.finalTotal || 0).toFixed(0)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.emptyText}>Empty</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {renderSection('Dine In', 'dineIn', Armchair, '', '#0f172a')}
      <View style={styles.divider} />
      {renderSection('Delivery', 'delivery', Bike, 'D', '#ea580c')}
      <View style={styles.divider} />
      {renderSection('Takeaway', 'takeaway', ShoppingBag, 'T', '#059669')}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {padding: 16, paddingBottom: 100},
  section: {marginBottom: 20},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  headerTitle: {fontSize: 20, fontWeight: 'bold', color: '#1f2937'},
  addBtn: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    gap: 4,
  },
  addBtnText: {color: 'white', fontSize: 12, fontWeight: 'bold'},
  divider: {height: 1, backgroundColor: '#e2e8f0', marginVertical: 10},
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
  card: {
    aspectRatio: 1.1, // Slightly wider for text
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 1,
    backgroundColor: 'white',
    borderColor: '#e5e7eb',
    padding: 4,
  },
  freeCard: {backgroundColor: 'white', borderColor: '#e5e7eb'},
  freeBadge: {backgroundColor: '#f1f5f9'},
  emptyText: {fontSize: 10, color: '#9ca3af', marginTop: 4},
  occupiedCard: {
    backgroundColor: '#fefce8',
    borderColor: '#facc15',
    borderWidth: 1.5,
  },
  occupiedBadge: {backgroundColor: '#fef08a'},
  statusTag: {
    backgroundColor: '#eab308',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: {color: 'white', fontSize: 8, fontWeight: 'bold'},
  priceText: {marginTop: 2, fontSize: 12, fontWeight: 'bold', color: '#854d0e'},
  iconBadge: {padding: 8, borderRadius: 50, marginBottom: 4},
  tableNum: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
  },
});

export default TableGrid;
