import React, {useState, useContext, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  useWindowDimensions,
} from 'react-native';
import {FirebaseService} from '../services/FirebaseService'; // <--- UPDATED
import {POSContext} from '../context/POSContext';
import {X} from 'lucide-react-native';
import {useToast} from '../context/ToastContext';

const MenuGrid = ({searchQuery = ''}) => {
  const {addToCart} = useContext(POSContext);
  const {showToast} = useToast();
  const {width} = useWindowDimensions();

  // Dynamic columns
  const numColumns = width > 900 ? 5 : width > 600 ? 3 : 2;
  const itemWidth = 100 / numColumns - 2;

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [variantModalItem, setVariantModalItem] = useState(null);

  useEffect(() => {
    // --- REAL TIME LISTENERS ---
    const unsubCats = FirebaseService.subscribeCategories(cats => {
      setCategories(cats);
    });

    const unsubMenu = FirebaseService.subscribeMenu(items => {
      // Process items (parse variants if string, though in Firebase they are objects usually)
      const processed = items.map(item => {
        if (item.variants && typeof item.variants === 'string') {
          try {
            return {...item, variants: JSON.parse(item.variants)};
          } catch (e) {
            return item;
          }
        }
        return item;
      });
      setMenuItems(processed);
    });

    return () => {
      unsubCats();
      unsubMenu();
    };
  }, []);

  // Filter Logic
  const filteredItems = menuItems.filter(item => {
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleItemClick = item => {
    if (item.isVariant && item.variants?.length > 0) {
      setVariantModalItem(item);
    } else {
      addToCart(item);
      showToast(`Added ${item.name}`, 'success');
    }
  };

  const handleVariantSelect = variant => {
    addToCart({
      ...variantModalItem,
      price: variant.price,
      variantName: variant.name,
      id: variantModalItem.id,
    });
    showToast(`Added ${variantModalItem.name} (${variant.name})`, 'success');
    setVariantModalItem(null);
  };

  return (
    <View style={styles.container}>
      {/* Category Filter */}
      <View style={styles.catContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}>
          <TouchableOpacity
            onPress={() => setSelectedCategory('All')}
            style={[
              styles.catPill,
              selectedCategory === 'All'
                ? styles.catActive
                : styles.catInactive,
            ]}>
            <Text
              style={[
                styles.catText,
                selectedCategory === 'All'
                  ? styles.catTextActive
                  : styles.catTextInactive,
              ]}>
              All Items
            </Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategory(cat.name)}
              style={[
                styles.catPill,
                selectedCategory === cat.name
                  ? styles.catActive
                  : styles.catInactive,
              ]}>
              <Text
                style={[
                  styles.catText,
                  selectedCategory === cat.name
                    ? styles.catTextActive
                    : styles.catTextInactive,
                ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {filteredItems.length === 0 ? (
          <View style={{width: '100%', alignItems: 'center', marginTop: 50}}>
            <Text style={{color: '#94a3b8', fontSize: 16}}>
              No items found.
            </Text>
          </View>
        ) : (
          filteredItems.map(item => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleItemClick(item)}
              activeOpacity={0.7}
              style={[styles.card, {width: `${itemWidth}%`}]}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconLetter}>{item.name.charAt(0)}</Text>
              </View>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
              {item.isVariant ? (
                <View style={styles.variantBadge}>
                  <Text style={styles.variantText}>Select Option</Text>
                </View>
              ) : (
                <Text style={styles.price}>₹{item.price}</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal
        visible={!!variantModalItem}
        transparent
        animationType="fade"
        onRequestClose={() => setVariantModalItem(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Option</Text>
              <TouchableOpacity onPress={() => setVariantModalItem(null)}>
                <X color="white" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {variantModalItem?.variants?.map((v, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleVariantSelect(v)}
                  style={styles.variantRow}>
                  <Text style={styles.variantName}>{v.name}</Text>
                  <Text style={styles.variantPrice}>₹{v.price}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f8fafc'},
  catContainer: {
    height: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  catScroll: {paddingHorizontal: 12, alignItems: 'center'},
  catPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  catActive: {backgroundColor: '#0f172a'},
  catInactive: {backgroundColor: '#f1f5f9'},
  catText: {fontSize: 13, fontWeight: '700'},
  catTextActive: {color: 'white'},
  catTextInactive: {color: '#64748b'},
  grid: {flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8},
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconLetter: {fontSize: 20, fontWeight: 'bold', color: '#2563eb'},
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
    height: 40,
  },
  price: {fontSize: 14, color: '#64748b', fontWeight: '600'},
  variantBadge: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  variantText: {color: '#c2410c', fontSize: 10, fontWeight: 'bold'},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: 350,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#0f172a',
  },
  modalTitle: {color: 'white', fontWeight: 'bold', fontSize: 16},
  variantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  variantName: {fontSize: 16, color: '#334155', fontWeight: '500'},
  variantPrice: {fontSize: 16, fontWeight: 'bold', color: '#0f172a'},
});

export default MenuGrid;
