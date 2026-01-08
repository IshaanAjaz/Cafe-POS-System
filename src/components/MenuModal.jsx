import React, {useContext, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import {X, ShoppingBag, Search} from 'lucide-react-native';
import MenuGrid from './MenuGrid';
import {POSContext} from '../context/POSContext';

const MenuModal = ({onClose}) => {
  const {cart, cartTotal} = useContext(POSContext);
  const [searchQuery, setSearchQuery] = useState(''); // NEW: Search State

  // Calculate total items (sum of quantities)
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{flex: 1}}>
          <Text style={styles.title}>Add Items</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X color="white" size={20} />
        </TouchableOpacity>
      </View>

      {/* NEW: Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color="#64748b" />
          <TextInput
            placeholder="Search items..."
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Menu Grid - Pass Search Query */}
      <View style={styles.content}>
        <MenuGrid searchQuery={searchQuery} />
      </View>

      {/* LIVE CART FOOTER */}
      <View style={styles.footer}>
        <View style={styles.cartInfo}>
          <Text style={styles.itemCount}>{totalQty} Items Added</Text>
          <Text style={styles.totalPrice}>Total: ₹{cartTotal.toFixed(0)}</Text>
        </View>

        <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
          <ShoppingBag color="white" size={18} />
          <Text style={styles.doneText}>View Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: 'white'},
  header: {
    height: 60,
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  title: {color: 'white', fontSize: 18, fontWeight: 'bold'},
  closeBtn: {padding: 8, backgroundColor: '#334155', borderRadius: 20},

  // Search Styles
  searchContainer: {
    padding: 10,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#0f172a',
  },

  content: {flex: 1, backgroundColor: '#f8fafc'},

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cartInfo: {
    flexDirection: 'column',
  },
  itemCount: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  doneBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  doneText: {color: 'white', fontWeight: 'bold', fontSize: 16},
});

export default MenuModal;
