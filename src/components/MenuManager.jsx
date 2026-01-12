import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import {FirebaseService} from '../services/FirebaseService';
import {Trash2, Coffee, ChevronDown, Edit2, XCircle} from 'lucide-react-native'; // <--- Added Edit2, XCircle
import {useToast} from '../context/ToastContext';
import {useConfirmation} from '../context/ConfirmationContext';

const MenuManager = () => {
  const {showToast} = useToast();
  const {askConfirmation} = useConfirmation();

  const [view, setView] = useState('items');
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedFilterCat, setSelectedFilterCat] = useState('All');

  // Forms
  const [editId, setEditId] = useState(null); // <--- Edit State
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    price: '',
    isVariant: false,
    variants: [],
  });
  const [newCat, setNewCat] = useState('');
  const [variantInput, setVariantInput] = useState({name: '', price: ''});
  const [showCatDropdown, setShowCatDropdown] = useState(false);

  useEffect(() => {
    // --- REAL TIME LISTENERS ---
    const unsubCats = FirebaseService.subscribeCategories(cats => {
      setCategories(cats);
      if (cats.length > 0 && !newItem.category && !editId) {
        setNewItem(prev => ({...prev, category: cats[0].name}));
      }
    });

    const unsubMenu = FirebaseService.subscribeMenu(menuItems => {
      const processed = menuItems.map(item => {
        if (item.variants && typeof item.variants === 'string') {
          try {
            return {...item, variants: JSON.parse(item.variants)};
          } catch (e) {
            return item;
          }
        }
        return item;
      });
      setItems(processed);
    });

    return () => {
      unsubCats();
      unsubMenu();
    };
  }, []);

  const addCategory = async () => {
    if (!newCat) {
      showToast('Please enter a category name', 'warning');
      return;
    }
    try {
      await FirebaseService.addCategory(newCat);
      setNewCat('');
      showToast('Category Added!', 'success');
    } catch (e) {
      showToast('Could not add category', 'error');
    }
  };

  const deleteCategory = id => {
    askConfirmation({
      title: 'Delete Category?',
      message:
        'Items in this category will not be deleted but will lose their tag.',
      isDestructive: true,
      confirmText: 'Delete',
      onConfirm: async () => {
        await FirebaseService.deleteCategory(id);
        showToast('Category Deleted', 'info');
      },
    });
  };

  const addVariant = () => {
    if (!variantInput.name || !variantInput.price) return;
    setNewItem({...newItem, variants: [...newItem.variants, variantInput]});
    setVariantInput({name: '', price: ''});
  };

  const removeVariant = index => {
    const updated = [...newItem.variants];
    updated.splice(index, 1);
    setNewItem({...newItem, variants: updated});
  };

  // --- EDIT LOGIC ---
  const handleEdit = item => {
    setNewItem({
      name: item.name,
      category: item.category,
      price: item.price ? String(item.price) : '',
      isVariant: item.isVariant === 1 || item.isVariant === true,
      variants: item.variants || [],
    });
    setEditId(item.id);
    setView('items');
    // Optional: scroll to top logic would go here
  };

  const cancelEdit = () => {
    setEditId(null);
    setNewItem({
      name: '',
      category: categories[0]?.name || '',
      price: '',
      isVariant: false,
      variants: [],
    });
  };
  // ------------------

  const saveItem = async () => {
    if (!newItem.name || !newItem.category) {
      showToast('Item Name and Category are required', 'warning');
      return;
    }

    try {
      const itemToSave = {
        name: newItem.name,
        category: newItem.category,
        price: newItem.price || 0,
        isVariant: newItem.isVariant ? 1 : 0,
        variants: newItem.variants,
      };

      if (editId) {
        // UPDATE MODE
        await FirebaseService.updateItem(editId, itemToSave);
        showToast('Item Updated Successfully', 'success');
        setEditId(null); // Exit edit mode
      } else {
        // ADD MODE
        await FirebaseService.addItem(itemToSave);
        showToast('Item Added Successfully', 'success');
      }

      // Reset Form
      setNewItem({
        name: '',
        category: categories[0]?.name || '',
        price: '',
        isVariant: false,
        variants: [],
      });
    } catch (e) {
      console.error(e);
      showToast('Failed to save item', 'error');
    }
  };

  const deleteItem = id => {
    askConfirmation({
      title: 'Delete Item?',
      message: 'Are you sure you want to remove this item?',
      isDestructive: true,
      confirmText: 'Delete',
      onConfirm: async () => {
        await FirebaseService.deleteItem(id);
        showToast('Item deleted', 'info');
      },
    });
  };

  const filteredItems =
    selectedFilterCat === 'All'
      ? items
      : items.filter(i => i.category === selectedFilterCat);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{paddingBottom: 80}}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
          <Coffee color="#0f172a" size={24} />
          <Text style={styles.title}>Menu Setup</Text>
        </View>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            onPress={() => setView('items')}
            style={[styles.toggleBtn, view === 'items' && styles.toggleActive]}>
            <Text
              style={[styles.toggleText, view === 'items' && {color: 'white'}]}>
              Items
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setView('categories')}
            style={[
              styles.toggleBtn,
              view === 'categories' && styles.toggleActive,
            ]}>
            <Text
              style={[
                styles.toggleText,
                view === 'categories' && {color: 'white'},
              ]}>
              Categories
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CATEGORIES VIEW */}
      {view === 'categories' && (
        <View style={styles.section}>
          <View style={styles.formCard}>
            <Text style={styles.label}>Add Category</Text>
            <View style={{flexDirection: 'row', gap: 10}}>
              <TextInput
                value={newCat}
                onChangeText={setNewCat}
                style={[styles.input, {flex: 1}]}
                placeholder="e.g. Pizza"
              />
              <TouchableOpacity onPress={addCategory} style={styles.addBtn}>
                <Text style={{color: 'white', fontWeight: 'bold'}}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
          {categories.map(c => (
            <View key={c.id} style={styles.listItem}>
              <Text style={{fontWeight: 'bold', color: '#334155'}}>
                {c.name}
              </Text>
              <TouchableOpacity onPress={() => deleteCategory(c.id)}>
                <Trash2 size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* ITEMS VIEW */}
      {view === 'items' && (
        <View style={styles.section}>
          <View
            style={[
              styles.formCard,
              editId ? {borderColor: '#3b82f6', borderWidth: 2} : {},
            ]}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}>
              <Text style={[styles.label, {marginBottom: 0}]}>
                {editId ? 'Editing Item' : 'Add New Item'}
              </Text>
              {editId && (
                <TouchableOpacity onPress={cancelEdit}>
                  <Text style={{color: '#ef4444', fontWeight: 'bold'}}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              value={newItem.name}
              onChangeText={t => setNewItem({...newItem, name: t})}
              style={[styles.input, {marginBottom: 12}]}
              placeholder="Item Name"
            />

            <Text style={styles.label}>Category</Text>
            <View style={{marginBottom: 12, position: 'relative', zIndex: 10}}>
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setShowCatDropdown(!showCatDropdown)}>
                <Text style={{color: newItem.category ? '#0f172a' : '#94a3b8'}}>
                  {newItem.category || 'Select Category'}
                </Text>
                <ChevronDown size={20} color="#64748b" />
              </TouchableOpacity>

              {showCatDropdown && (
                <ScrollView
                  style={styles.dropdownList}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled">
                  {categories.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setNewItem({...newItem, category: c.name});
                        setShowCatDropdown(false);
                      }}>
                      <Text style={styles.dropdownItemText}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 10,
                justifyContent: 'space-between',
              }}>
              <Text style={{color: '#334155', fontWeight: '600'}}>
                Is Variant?
              </Text>
              <Switch
                value={newItem.isVariant}
                onValueChange={v => setNewItem({...newItem, isVariant: v})}
                trackColor={{false: '#e2e8f0', true: '#bae6fd'}}
                thumbColor={newItem.isVariant ? '#2563eb' : '#f1f5f9'}
              />
            </View>

            {!newItem.isVariant ? (
              <TextInput
                value={newItem.price}
                onChangeText={t => setNewItem({...newItem, price: t})}
                style={styles.input}
                placeholder="Price (0.00)"
                keyboardType="numeric"
              />
            ) : (
              <View style={styles.variantBox}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: 'bold',
                    marginBottom: 5,
                    color: '#334155',
                  }}>
                  Manage Variants
                </Text>
                {newItem.variants.map((v, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}>
                    <Text style={{fontSize: 12, color: '#64748b'}}>
                      {v.name} - ₹{v.price}
                    </Text>
                    <TouchableOpacity onPress={() => removeVariant(i)}>
                      <XCircle size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={{flexDirection: 'row', gap: 5, marginTop: 5}}>
                  <TextInput
                    value={variantInput.name}
                    onChangeText={t =>
                      setVariantInput({...variantInput, name: t})
                    }
                    style={[styles.input, {flex: 1, height: 40}]}
                    placeholder="Size"
                  />
                  <TextInput
                    value={variantInput.price}
                    onChangeText={t =>
                      setVariantInput({...variantInput, price: t})
                    }
                    style={[styles.input, {width: 70, height: 40}]}
                    placeholder="₹"
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    onPress={addVariant}
                    style={styles.variantAddBtn}>
                    <Text
                      style={{
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: 13,
                      }}>
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={saveItem}
              style={[
                styles.addBtn,
                {
                  marginTop: 15,
                  width: '100%',
                  backgroundColor: editId ? '#3b82f6' : '#2563eb',
                },
              ]}>
              <Text style={{color: 'white', fontWeight: 'bold'}}>
                {editId ? 'Update Item' : 'Save Item'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ITEM LIST */}
          <View>
            <Text style={styles.sectionTitle}>Your Menu Items</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{paddingBottom: 10}}>
              <TouchableOpacity
                onPress={() => setSelectedFilterCat('All')}
                style={[
                  styles.catTab,
                  selectedFilterCat === 'All' && styles.catTabActive,
                ]}>
                <Text
                  style={[
                    styles.catTabText,
                    selectedFilterCat === 'All' && styles.catTabTextActive,
                  ]}>
                  All
                </Text>
              </TouchableOpacity>
              {categories.map(c => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setSelectedFilterCat(c.name)}
                  style={[
                    styles.catTab,
                    selectedFilterCat === c.name && styles.catTabActive,
                  ]}>
                  <Text
                    style={[
                      styles.catTabText,
                      selectedFilterCat === c.name && styles.catTabTextActive,
                    ]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filteredItems.map(i => (
              <View key={i.id} style={styles.listItem}>
                <View style={{flex: 1}}>
                  <Text style={{fontWeight: 'bold', color: '#0f172a'}}>
                    {i.name}
                  </Text>
                  <Text style={{fontSize: 10, color: '#64748b'}}>
                    {i.isVariant ? 'Variants Available' : `₹${i.price}`}
                  </Text>
                </View>

                {/* ACTION BUTTONS */}
                <View style={{flexDirection: 'row', gap: 12}}>
                  <TouchableOpacity onPress={() => handleEdit(i)}>
                    <Edit2 size={18} color="#2563eb" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteItem(i.id)}>
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, backgroundColor: '#f8fafc'},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {fontSize: 24, fontWeight: 'bold', color: '#0f172a'},
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6},
  toggleActive: {backgroundColor: '#0f172a'},
  toggleText: {fontWeight: 'bold', fontSize: 12, color: '#64748b'},
  section: {marginBottom: 20},
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
    marginTop: 10,
  },
  formCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    zIndex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  addBtn: {
    backgroundColor: '#2563eb',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
  },
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f8fafc',
  },
  dropdownList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: 'white',
    maxHeight: 150,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemText: {fontSize: 14, color: '#334155'},
  variantBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  variantAddBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
  },
  catTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 20,
    marginRight: 8,
  },
  catTabActive: {backgroundColor: '#0f172a'},
  catTabText: {fontSize: 13, fontWeight: '600', color: '#64748b'},
  catTabTextActive: {color: 'white'},
});

export default MenuManager;
