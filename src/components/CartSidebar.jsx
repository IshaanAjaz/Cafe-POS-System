import React, {useContext, useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator, // <--- Import Indicator
} from 'react-native';
import {POSContext} from '../context/POSContext';
import {FirebaseService} from '../services/FirebaseService';
import {PrinterService} from '../services/PrinterService';
import {useToast} from '../context/ToastContext';
import {useConfirmation} from '../context/ConfirmationContext';
import {
  Trash2,
  PlusCircle,
  ArrowLeft,
  XCircle,
  CheckCircle,
  X,
  Printer,
  Clock,
  Save,
  User,
  Phone,
} from 'lucide-react-native';

const CartSidebar = ({
  activeTable,
  onOpenMenu,
  onComplete,
  onBack,
  selectedPrinter,
}) => {
  const {cart, updateQty, removeFromCart, clearCart, cartTotal} =
    useContext(POSContext);
  const {showToast} = useToast();
  const {askConfirmation} = useConfirmation();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState('0');
  const [extraAmount, setExtraAmount] = useState('0');
  const [extraReason, setExtraReason] = useState('');

  // --- NEW STATE TO PREVENT DOUBLE CLICKS ---
  const [isProcessing, setIsProcessing] = useState(false);

  const finalTotal = Math.max(
    0,
    cartTotal + (parseFloat(extraAmount) || 0) - (parseFloat(discount) || 0),
  );

  useEffect(() => {
    setDiscount('0');
    setExtraAmount('0');
    setExtraReason('');
    setCustomerName('');
    setCustomerPhone('');

    const loadOngoing = async () => {
      const order = await FirebaseService.getTableOrder(activeTable);
      if (order) {
        if (order.customerName) setCustomerName(order.customerName);
        if (order.customerPhone) setCustomerPhone(order.customerPhone);
      }
    };
    if (activeTable) loadOngoing();
  }, [activeTable]);

  if (!activeTable) return null;

  const saveOrderToDB = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty', 'warning');
      return null;
    }

    try {
      const orderData = {
        tableNumber: activeTable.toString(),
        items: JSON.stringify(cart),
        subTotal: cartTotal,
        finalTotal: cartTotal,
        status: 'ongoing',
        date: new Date().toISOString(),
        customerName: customerName,
        customerPhone: customerPhone,
      };

      const savedOrder = await FirebaseService.saveOrder(orderData);
      return savedOrder;
    } catch (e) {
      console.error(e);
      showToast('Save Failed', 'error');
      return null;
    }
  };

  const handleSaveOnly = async () => {
    if (isProcessing) return; // Prevent double click
    setIsProcessing(true);

    try {
      const saved = await saveOrderToDB();
      if (saved) {
        showToast('Order Saved', 'success');
        clearCart();
        onComplete();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = async () => {
    if (isProcessing) return; // Prevent double click
    setIsProcessing(true);

    try {
      const savedOrder = await saveOrderToDB();
      if (savedOrder) {
        // Now checks if printer actually succeeded
        const success = await PrinterService.printBill(savedOrder);

        if (success) {
          showToast('Sent to Printer', 'success');
          clearCart();
          onComplete();
        } else {
          // If print fails, we DO NOT clear cart, so user can try again
          // We DO NOT show 'Sent to Printer' toast
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFreeTable = () => {
    if (isProcessing) return;

    askConfirmation({
      title: 'Free Table?',
      message: 'Delete current order?',
      isDestructive: true,
      confirmText: 'Delete',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await FirebaseService.deleteActiveOrder(activeTable);
          clearCart();
          onComplete();
          showToast('Table Freed', 'info');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const finishOrder = async isPaidStatus => {
    if (isProcessing) return; // Prevent double click (Jumping IDs)
    setIsProcessing(true);

    try {
      const currentOrder = await FirebaseService.getTableOrder(activeTable);

      let orderId;
      if (!currentOrder) {
        const newOrder = await saveOrderToDB();
        if (!newOrder) {
          setIsProcessing(false);
          return;
        }
        orderId = newOrder.id;
      } else {
        orderId = currentOrder.id;
      }

      const updateData = {
        items: JSON.stringify(cart),
        subTotal: cartTotal,
        discount: parseFloat(discount) || 0,
        extraAmount: parseFloat(extraAmount) || 0,
        extraReason: extraReason,
        finalTotal: finalTotal,
        customerName: customerName,
        customerPhone: customerPhone,
        date: new Date().toISOString(),
        isPaid: isPaidStatus ? 1 : 0,
      };

      const billNum = await FirebaseService.finishOrder(orderId, updateData);

      setShowPaymentModal(false);
      clearCart();
      onComplete();
      showToast(
        `Bill #${billNum} ${isPaidStatus ? 'Paid' : 'Saved'}`,
        'success',
      );
    } catch (e) {
      console.error(e);
      showToast('Transaction Failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity onPress={onBack} style={{marginRight: 10}}>
            <ArrowLeft color="white" size={24} />
          </TouchableOpacity>
          <View style={styles.tableBadge}>
            <Text style={styles.tableBadgeText}>
              {activeTable.toString().startsWith('D')
                ? `DELIVERY ${activeTable}`
                : activeTable.toString().startsWith('T')
                ? `TAKEAWAY ${activeTable}`
                : `TABLE ${activeTable}`}
            </Text>
          </View>
        </View>
        <Text style={{color: '#94a3b8', fontSize: 12}}>
          {cart.length} Items
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.cartList}>
        <View style={styles.customerBox}>
          <Text style={styles.sectionTitle}>Customer Details</Text>
          <View style={{flexDirection: 'row', gap: 10}}>
            <View style={styles.inputWrap}>
              <User size={16} color="#64748b" style={{marginRight: 5}} />
              <TextInput
                placeholder="Name"
                value={customerName}
                onChangeText={setCustomerName}
                style={{flex: 1, color: '#334155'}}
              />
            </View>
            <View style={styles.inputWrap}>
              <Phone size={16} color="#64748b" style={{marginRight: 5}} />
              <TextInput
                placeholder="Phone"
                value={customerPhone}
                onChangeText={setCustomerPhone}
                keyboardType="phone-pad"
                style={{flex: 1, color: '#334155'}}
              />
            </View>
          </View>
        </View>

        {cart.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{color: '#94a3b8'}}>Order is empty</Text>
            <TouchableOpacity onPress={onOpenMenu}>
              <Text
                style={{color: '#2563eb', fontWeight: 'bold', marginTop: 8}}>
                + Add Items
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          cart.map(item => (
            <View key={item.cartId} style={styles.cartItem}>
              <View style={{flex: 1}}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>
                  ₹{item.price} x {item.qty}
                </Text>
              </View>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  onPress={() => updateQty(item.cartId, -1)}
                  style={styles.qtyBtn}>
                  <Text>-</Text>
                </TouchableOpacity>
                <Text style={{fontWeight: 'bold', marginHorizontal: 8}}>
                  {item.qty}
                </Text>
                <TouchableOpacity
                  onPress={() => updateQty(item.cartId, 1)}
                  style={[styles.qtyBtn, {backgroundColor: '#dbeafe'}]}>
                  <Text style={{color: '#2563eb'}}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => removeFromCart(item.cartId)}
                  style={{marginLeft: 8}}>
                  <Trash2 size={18} color="#f87171" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        {cart.length > 0 && (
          <TouchableOpacity onPress={onOpenMenu} style={styles.addMoreBtn}>
            <PlusCircle size={20} color="#64748b" />
            <Text style={{color: '#64748b', fontWeight: 'bold'}}>
              Add More Items
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Bill</Text>
          <Text style={styles.totalVal}>₹{cartTotal.toFixed(2)}</Text>
        </View>

        <View style={{flexDirection: 'row', gap: 8, marginTop: 10}}>
          <TouchableOpacity
            onPress={handleSaveOnly}
            disabled={isProcessing}
            style={[
              styles.actionBtn,
              {
                backgroundColor: '#0f172a',
                flex: 0.8,
                opacity: isProcessing ? 0.6 : 1,
              },
            ]}>
            {isProcessing ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Save color="white" size={20} />
            )}
            <Text style={styles.btnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePrint}
            disabled={isProcessing}
            style={[
              styles.actionBtn,
              {
                backgroundColor: '#2563eb',
                flex: 0.8,
                opacity: isProcessing ? 0.6 : 1,
              },
            ]}>
            {isProcessing ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Printer color="white" size={20} />
            )}
            <Text style={styles.btnText}>Print</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (cart.length > 0 && !isProcessing) setShowPaymentModal(true);
            }}
            disabled={isProcessing}
            style={[
              styles.actionBtn,
              {
                backgroundColor: '#16a34a',
                flex: 1,
                opacity: isProcessing ? 0.6 : 1,
              },
            ]}>
            <CheckCircle color="white" size={18} />
            <Text style={styles.btnText}>Pay</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleFreeTable}
          disabled={isProcessing}
          style={[
            styles.actionBtn,
            {
              backgroundColor: '#fef2f2',
              marginTop: 10,
              borderColor: '#fecaca',
              borderWidth: 1,
              opacity: isProcessing ? 0.6 : 1,
            },
          ]}>
          <XCircle color="#ef4444" size={18} />
          <Text style={[styles.btnText, {color: '#ef4444'}]}>Free Table</Text>
        </TouchableOpacity>
      </View>

      {/* PAYMENT MODAL */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isProcessing) setShowPaymentModal(false);
        }}>
        <View style={styles.modalOverlay}>
          <View style={styles.payModal}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}>
              <Text
                style={{fontSize: 20, fontWeight: 'bold', color: '#0f172a'}}>
                Settle Payment
              </Text>
              <TouchableOpacity
                onPress={() => setShowPaymentModal(false)}
                disabled={isProcessing}>
                <X size={24} color={isProcessing ? 'gray' : 'black'} />
              </TouchableOpacity>
            </View>
            <View style={styles.payRow}>
              <Text>Subtotal</Text>
              <Text style={{fontWeight: 'bold'}}>₹{cartTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Discount (₹)</Text>
              <TextInput
                keyboardType="numeric"
                value={discount}
                onChangeText={setDiscount}
                style={styles.input}
                editable={!isProcessing}
              />
            </View>
            <View style={{flexDirection: 'row', gap: 10}}>
              <View style={[styles.inputGroup, {flex: 1}]}>
                <Text style={styles.label}>Extra (₹)</Text>
                <TextInput
                  keyboardType="numeric"
                  value={extraAmount}
                  onChangeText={setExtraAmount}
                  style={styles.input}
                  editable={!isProcessing}
                />
              </View>
              <View style={[styles.inputGroup, {flex: 1}]}>
                <Text style={styles.label}>Reason</Text>
                <TextInput
                  value={extraReason}
                  onChangeText={setExtraReason}
                  style={styles.input}
                  editable={!isProcessing}
                />
              </View>
            </View>
            <View style={styles.finalTotalBox}>
              <Text style={{color: '#15803d', fontWeight: 'bold'}}>
                NET PAYABLE
              </Text>
              <Text style={{color: '#15803d', fontSize: 24, fontWeight: '900'}}>
                ₹{finalTotal.toFixed(2)}
              </Text>
            </View>

            <View style={{flexDirection: 'row', gap: 10}}>
              <TouchableOpacity
                onPress={() => finishOrder(false)}
                disabled={isProcessing}
                style={[
                  styles.payConfirmBtn,
                  {
                    backgroundColor: '#f97316',
                    flex: 1,
                    opacity: isProcessing ? 0.6 : 1,
                  },
                ]}>
                {isProcessing ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Clock size={20} color="white" />
                )}
                <Text style={styles.payConfirmText}>Pending</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => finishOrder(true)}
                disabled={isProcessing}
                style={[
                  styles.payConfirmBtn,
                  {
                    backgroundColor: '#15803d',
                    flex: 1,
                    opacity: isProcessing ? 0.6 : 1,
                  },
                ]}>
                {isProcessing ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <CheckCircle size={20} color="white" />
                )}
                <Text style={styles.payConfirmText}>Paid</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: 'white'},
  header: {
    backgroundColor: '#0f172a',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableBadge: {
    backgroundColor: '#eab308',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tableBadgeText: {fontWeight: 'bold', fontSize: 12, color: '#0f172a'},
  cartList: {padding: 16},
  customerBox: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 40,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  emptyState: {alignItems: 'center', marginTop: 50},
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
    borderRadius: 8,
  },
  itemName: {fontWeight: '600', color: '#334155'},
  itemPrice: {fontSize: 12, color: '#64748b'},
  qtyRow: {flexDirection: 'row', alignItems: 'center'},
  qtyBtn: {
    width: 24,
    height: 24,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  addMoreBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    marginTop: 10,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalLabel: {fontSize: 18, fontWeight: 'bold', color: '#0f172a'},
  totalVal: {fontSize: 18, fontWeight: 'bold', color: '#0f172a'},
  actionBtn: {
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  btnText: {color: 'white', fontWeight: 'bold', fontSize: 13},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  payModal: {backgroundColor: 'white', borderRadius: 16, padding: 20},
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginBottom: 15,
  },
  inputGroup: {marginBottom: 15},
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  finalTotalBox: {
    backgroundColor: '#dcfce7',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  payConfirmBtn: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payConfirmText: {color: 'white', fontWeight: 'bold', fontSize: 16},
});

export default CartSidebar;
