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
  const [searchQuery, setSearchQuery] = useState('');
  const [lastAddedItem, setLastAddedItem] = useState(null);

  // Calculate total items
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);

  // Helper: Find qty of the specific item we just touched
  const getLastItemQty = () => {
    if (!lastAddedItem) return 0;
    const found = cart.find(
      i =>
        i.id === lastAddedItem.id ||
        (i.name === lastAddedItem.name && i.price === lastAddedItem.price),
    );
    return found ? found.qty : 0;
  };

  // Helper: Construct dynamic display name (e.g. "Burger - Spicy")
  const getDisplayName = () => {
    if (!lastAddedItem) return '';
    if (lastAddedItem.variantName) {
      return `${lastAddedItem.name} - ${lastAddedItem.variantName}`;
    }
    return lastAddedItem.name;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Add Items</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X color="#0f172a" size={24} />
        </TouchableOpacity>
      </View>

      {/* Modern Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color="#64748b" />
          <TextInput
            placeholder="Search menu..."
            placeholderTextColor="#94a3b8"
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

      {/* Content */}
      <View style={styles.content}>
        <MenuGrid
          searchQuery={searchQuery}
          onItemAdded={item => setLastAddedItem(item)}
        />
      </View>

      {/* MODERN FOOTER */}
      <View style={styles.footer}>
        <View style={styles.cartDetails}>
          <View style={styles.priceRow}>
            <Text style={styles.totalItemsText}>{totalQty} ITEMS</Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.totalPriceText}>₹{cartTotal.toFixed(0)}</Text>
          </View>

          {/* Dynamic Feedback Text - Now allows wrapping */}
          <Text style={styles.itemsPreview}>
            {lastAddedItem
              ? `Added: ${getDisplayName()} (x${getLastItemQty()})`
              : 'Select items to add'}
          </Text>
        </View>

        <TouchableOpacity onPress={onClose} style={styles.viewCartBtn}>
          <Text style={styles.viewCartText}>View Cart</Text>
          <ShoppingBag color="white" size={18} style={{marginLeft: 8}} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f8fafc'},

  // Header
  header: {
    height: 60,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  title: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },

  // Search
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    paddingBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },

  content: {flex: 1},

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cartDetails: {
    flex: 1,
    marginRight: 16,
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  totalItemsText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  dotSeparator: {
    marginHorizontal: 8,
    color: '#cbd5e1',
    fontSize: 10,
  },
  totalPriceText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  itemsPreview: {
    fontSize: 14,
    color: '#15803d', // Green to indicate success
    fontWeight: '600',
    flexShrink: 1, // Ensures text wraps if it hits the button
  },
  viewCartBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#2563eb',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  viewCartText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default MenuModal;
