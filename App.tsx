import 'react-native-gesture-handler';
import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  useWindowDimensions,
  Animated,
  Easing,
  LogBox,
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LayoutGrid,
  Coffee,
  FileText,
  Settings,
  Store,
  NotebookTabs,
  Phone,
  Bluetooth,
  Printer,
  MessageSquare,
  ScrollText,
  LogOut,
  User,
  CheckCircle2,
} from 'lucide-react-native';

// --- IMPORTS ---
import {POSProvider, POSContext} from './src/context/POSContext';
import {ToastProvider, useToast} from './src/context/ToastContext';
import {
  ConfirmationProvider,
  useConfirmation,
} from './src/context/ConfirmationContext';
import {AuthProvider, useAuth} from './src/context/AuthContext';

// @ts-ignore
import {FirebaseService} from './src/services/FirebaseService';

import TableGrid from './src/components/TableGrid';
import CartSidebar from './src/components/CartSidebar';
import MenuManager from './src/components/MenuManager';
import Reports from './src/components/Reports';
import MenuModal from './src/components/MenuModal';
import {PrinterService} from './src/services/PrinterService';
// @ts-ignore
import AuthScreen from './src/components/AuthScreen';

LogBox.ignoreLogs([
  'This method is deprecated',
  'Using insecure protocols',
  'Method called was',
  'The caller does not have permission',
  'The query requires an index',
  'namespaced API',
]);

const COLORS = {
  slate900: '#0f172a',
  slate800: '#1e293b',
  yellow500: '#eab308',
  yellow400: '#facc15',
  gray100: '#f3f4f6',
  white: '#ffffff',
  gray300: '#d1d5db',
  blue600: '#2563eb',
};

const AppContent = () => {
  const {loadCart, clearCart} = React.useContext(POSContext);
  const {showToast} = useToast();
  // @ts-ignore
  const {user, logout} = useAuth();
  const {askConfirmation} = useConfirmation();

  const {width} = useWindowDimensions();
  const isTablet = width >= 768;
  const slideAnim = useRef(new Animated.Value(600)).current;

  // --- STATE ---
  const [activeTab, setActiveTab] = useState('pos');
  const [activeTable, setActiveTable] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const [activeOrders, setActiveOrders] = useState<any[]>([]);

  // Settings State
  const [cafeName, setCafeName] = useState('My Awesome Cafe');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('Thank you for visiting!');
  const [paperSize, setPaperSize] = useState('58');
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [foundPrinters, setFoundPrinters] = useState<any[]>([]);

  // --- ANIMATION EFFECT ---
  useEffect(() => {
    if (activeTable && isTablet) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp),
      }).start();
    } else {
      slideAnim.setValue(600);
    }
  }, [activeTable, isTablet]);

  // --- SETUP EFFECTS ---
  useEffect(() => {
    const setup = async () => {
      try {
        await FirebaseService.seedDatabase();
        try {
          await FirebaseService.pruneOldData();
        } catch (e) {}

        const savedName = await AsyncStorage.getItem('cafe_name');
        const savedPhone = await AsyncStorage.getItem('phone_number');
        const savedFooter = await AsyncStorage.getItem('receipt_footer');
        const savedPrinter = await AsyncStorage.getItem('saved_printer');
        const savedPaper = await AsyncStorage.getItem('paper_size');

        if (savedName) setCafeName(savedName);
        if (savedPhone) setPhoneNumber(savedPhone);
        if (savedFooter) setReceiptFooter(savedFooter);
        if (savedPrinter) setSelectedPrinter(savedPrinter);
        if (savedPaper) setPaperSize(savedPaper);
      } catch (e) {
        console.error('Setup failed', e);
      }
    };
    setup();

    const unsubscribe = FirebaseService.subscribeActiveOrders(
      (orders: any[]) => {
        setActiveOrders(orders);
      },
    );

    return () => unsubscribe();
  }, []);

  // --- HANDLERS ---
  const handleSelectTable = async (tableId: any) => {
    setActiveTable(tableId);
    try {
      const order: any = await FirebaseService.getTableOrder(tableId);
      if (order) {
        loadCart(JSON.parse(order.items));
      } else {
        clearCart();
      }
    } catch (e) {
      console.error(e);
      clearCart();
    }
  };

  const handleCloseTable = () => {
    if (isTablet) {
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setActiveTable(null));
    } else {
      setActiveTable(null);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await AsyncStorage.setItem('cafe_name', cafeName);
      await AsyncStorage.setItem('phone_number', phoneNumber);
      await AsyncStorage.setItem('receipt_footer', receiptFooter);
      await AsyncStorage.setItem('paper_size', paperSize);

      // Sync to Firebase so it appears in the database console
      await FirebaseService.updateCafeDetails(cafeName, phoneNumber);

      showToast('Settings Saved Successfully!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to save settings', 'error');
    }
  };

  // --- UPDATED SCAN LOGIC (Sorting & Filtering) ---
  const handleScanPrinters = async () => {
    setIsScanning(true);
    setFoundPrinters([]);
    try {
      const devices = await PrinterService.scanDevices();
      const all: any[] = [...(devices.paired || []), ...(devices.found || [])];

      // Filter Duplicates
      const unique = all.filter(
        (v, i, a) => a.findIndex(t => t.address === v.address) === i,
      );

      // SORTING: Prioritize "Printer-like" names -> Named Devices -> Unnamed
      unique.sort((a, b) => {
        const nameA = (a.name || '').toUpperCase();
        const nameB = (b.name || '').toUpperCase();

        const isPrinterA = nameA.match(/MTP|POS|RPP|PRINTER|EPSON|THERMAL|BT/);
        const isPrinterB = nameB.match(/MTP|POS|RPP|PRINTER|EPSON|THERMAL|BT/);

        if (isPrinterA && !isPrinterB) return -1;
        if (!isPrinterA && isPrinterB) return 1;
        if (nameA && !nameB) return -1;
        if (!nameA && nameB) return 1;
        return 0;
      });

      setFoundPrinters(unique);
      if (unique.length > 0) {
        showToast(`Found ${unique.length} devices`, 'info');
      } else {
        showToast('No devices found', 'warning');
      }
    } catch (e) {
      showToast('Scan failed', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnectPrinter = async (address: string) => {
    try {
      showToast('Connecting...', 'info');
      await PrinterService.connectDevice(address);
      setSelectedPrinter(address);
      showToast('Printer Connected!', 'success');
    } catch (e) {
      showToast('Connection failed. Is printer on?', 'error');
    }
  };

  // --- LOGOUT HANDLER ---
  const handleLogout = () => {
    askConfirmation({
      title: 'Log Out',
      message: 'Are you sure you want to log out?',
      confirmText: 'Log Out',
      onConfirm: async () => {
        try {
          showToast('Syncing data...', 'info');
          await FirebaseService.syncPendingWrites();
          await logout();
        } catch (e) {
          showToast('Logout Failed', 'error');
        }
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor={COLORS.slate900} barStyle="light-content" />

      {/* NAVBAR */}
      <View style={styles.navbar}>
        <View style={styles.navHeader}>
          <View style={styles.logoBadge}>
            <NotebookTabs size={20} color={COLORS.slate900} />
          </View>
          <View>
            <Text style={styles.logoText}>
              Hisaab<Text style={{color: COLORS.yellow400}}>Kitaab</Text>
            </Text>
            <View style={styles.subLogoRow}>
              <Store size={10} color="#60a5fa" />
              <Text style={styles.cafeNameSmall} numberOfLines={1}>
                {cafeName}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tabBar}>
          {['pos', 'menu', 'reports', 'settings'].map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}>
              {tab === 'pos' && (
                <LayoutGrid
                  size={16}
                  color={activeTab === tab ? COLORS.slate900 : COLORS.gray300}
                />
              )}
              {tab === 'menu' && (
                <Coffee
                  size={16}
                  color={activeTab === tab ? COLORS.slate900 : COLORS.gray300}
                />
              )}
              {tab === 'reports' && (
                <FileText
                  size={16}
                  color={activeTab === tab ? COLORS.slate900 : COLORS.gray300}
                />
              )}
              {tab === 'settings' && (
                <Settings
                  size={16}
                  color={activeTab === tab ? COLORS.slate900 : COLORS.gray300}
                />
              )}
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.content}>
        {activeTab === 'pos' && (
          <TableGrid
            activeOrders={activeOrders}
            onSelectTable={handleSelectTable}
          />
        )}
        {activeTab === 'menu' && <MenuManager />}
        {activeTab === 'reports' && <Reports />}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <ScrollView
            contentContainerStyle={{
              paddingVertical: 20,
              paddingHorizontal: 32, // Increased from 20 to 32 for curved displays
            }}>
            <Text style={styles.heading}>App Settings</Text>

            {/* ACCOUNT INFO SECTION */}
            <Text style={styles.sectionHeader}>Account Info</Text>
            <View style={styles.card}>
              <View
                style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                <View
                  style={{
                    backgroundColor: '#eff6ff',
                    padding: 10,
                    borderRadius: 25,
                  }}>
                  <User size={24} color={COLORS.blue600} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={{fontSize: 12, color: '#64748b'}}>
                    Logged in as
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: COLORS.slate900,
                    }}>
                    {user?.email}
                  </Text>
                </View>
                {user?.emailVerified && (
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 4,
                      backgroundColor: '#dcfce7',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      alignItems: 'center',
                    }}>
                    <CheckCircle2 size={12} color="#16a34a" />
                    <Text
                      style={{
                        color: '#16a34a',
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}>
                      VERIFIED
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={styles.sectionHeader}>Shop Details</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Cafe Name</Text>
              <TextInput
                value={cafeName}
                onChangeText={setCafeName}
                style={styles.input}
                placeholder="e.g. Starbucks CP"
              />
            </View>
            <View style={styles.card}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 8,
                }}>
                <Phone size={16} color={COLORS.slate900} />
                <Text style={[styles.label, {marginBottom: 0}]}>
                  Phone Number
                </Text>
              </View>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                style={styles.input}
                placeholder="e.g. +91 98765 43210"
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.sectionHeader}>Receipt Settings</Text>
            <View style={styles.card}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 8,
                }}>
                <MessageSquare size={16} color={COLORS.slate900} />
                <Text style={[styles.label, {marginBottom: 0}]}>
                  Footer Message
                </Text>
              </View>
              <TextInput
                value={receiptFooter}
                onChangeText={setReceiptFooter}
                style={styles.input}
                placeholder="e.g. Thank you, Visit Again!"
              />
            </View>

            <View style={styles.card}>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                <ScrollText size={16} color={COLORS.slate900} />
                <Text style={[styles.label, {marginBottom: 0}]}>
                  Printer Paper Size
                </Text>
              </View>
              <View style={{flexDirection: 'row', gap: 10}}>
                <TouchableOpacity
                  onPress={() => setPaperSize('58')}
                  style={[
                    styles.optionBtn,
                    paperSize === '58' && styles.optionBtnActive,
                  ]}>
                  <Text
                    style={[
                      styles.optionText,
                      paperSize === '58' && styles.optionTextActive,
                    ]}>
                    58mm (Standard)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPaperSize('80')}
                  style={[
                    styles.optionBtn,
                    paperSize === '80' && styles.optionBtnActive,
                  ]}>
                  <Text
                    style={[
                      styles.optionText,
                      paperSize === '80' && styles.optionTextActive,
                    ]}>
                    80mm (Wide)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sectionHeader}>Printer Connection</Text>
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View
                  style={{flexDirection: 'row', gap: 6, alignItems: 'center'}}>
                  <Bluetooth size={16} color={COLORS.slate900} />
                  <Text style={[styles.label, {marginBottom: 0}]}>
                    Bluetooth Printer
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleScanPrinters}
                  disabled={isScanning}>
                  {isScanning ? (
                    <ActivityIndicator size="small" color={COLORS.blue600} />
                  ) : (
                    <Text style={styles.link}>Scan Devices</Text>
                  )}
                </TouchableOpacity>
              </View>
              <Text style={{fontSize: 12, color: 'gray', marginBottom: 10}}>
                Current: {selectedPrinter || 'Not Connected'}
              </Text>

              {/* UPDATED PRINTER LIST WITH SCROLL */}
              {foundPrinters.length > 0 && (
                <View style={styles.printerListContainer}>
                  <Text style={styles.listHeader}>Available Devices:</Text>
                  <ScrollView
                    style={styles.printerScroll}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}>
                    {foundPrinters.map((p, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => handleConnectPrinter(p.address)}
                        style={styles.printerRow}>
                        <View style={{flex: 1}}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                            }}>
                            <Bluetooth
                              size={14}
                              color={p.name ? '#2563eb' : '#94a3b8'}
                            />
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: 'bold',
                                color: '#1e293b',
                              }}>
                              {p.name || 'Unknown Device'}
                            </Text>
                          </View>
                          <Text
                            style={{
                              fontSize: 10,
                              color: '#64748b',
                              marginLeft: 20,
                            }}>
                            {p.address}
                          </Text>
                        </View>
                        {selectedPrinter === p.address && (
                          <View
                            style={{
                              backgroundColor: '#dcfce7',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}>
                            <Text
                              style={{
                                color: '#16a34a',
                                fontWeight: 'bold',
                                fontSize: 10,
                              }}>
                              CONNECTED
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <TouchableOpacity
                onPress={() => PrinterService.testPrint()}
                style={styles.testPrintBtn}>
                <Printer size={16} color="white" />
                <Text style={{color: 'white', fontWeight: 'bold'}}>
                  Test Print
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleSaveSettings}
              style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save All Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogout}
              style={[
                styles.saveBtn,
                {backgroundColor: '#ef4444', marginTop: 20},
              ]}>
              <View
                style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <LogOut size={18} color="white" />
                <Text style={styles.saveBtnText}>Log Out</Text>
              </View>
            </TouchableOpacity>

            <View style={{height: 50}} />
          </ScrollView>
        )}
      </View>

      <Modal
        visible={!!activeTable}
        transparent={isTablet}
        animationType={isTablet ? 'none' : 'slide'}
        presentationStyle={isTablet ? 'overFullScreen' : 'pageSheet'}
        onRequestClose={handleCloseTable}>
        {isTablet ? (
          <View style={styles.tabletOverlay}>
            <TouchableOpacity
              style={styles.backdrop}
              activeOpacity={1}
              onPress={handleCloseTable}
            />
            <Animated.View
              style={[
                styles.tabletDrawer,
                {transform: [{translateX: slideAnim}]},
              ]}>
              <CartSidebar
                activeTable={activeTable}
                onOpenMenu={() => setShowMenu(true)}
                onBack={handleCloseTable}
                onComplete={handleCloseTable}
                selectedPrinter={selectedPrinter}
              />
            </Animated.View>
          </View>
        ) : (
          <CartSidebar
            activeTable={activeTable}
            onOpenMenu={() => setShowMenu(true)}
            onBack={handleCloseTable}
            onComplete={handleCloseTable}
            selectedPrinter={selectedPrinter}
          />
        )}
      </Modal>

      <Modal
        visible={showMenu}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMenu(false)}>
        <MenuModal onClose={() => setShowMenu(false)} />
      </Modal>
    </SafeAreaView>
  );
};

// --- MAIN LAYOUT ---
const MainLayout = () => {
  // @ts-ignore
  const {user, loading} = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#0f172a',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <ActivityIndicator size="large" color="#facc15" />
      </View>
    );
  }

  // --- STRICT CHECK: User must exist AND be verified ---
  if (!user || !user.emailVerified) {
    return <AuthScreen />;
  }

  return <AppContent />;
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.slate900},
  navbar: {backgroundColor: COLORS.slate900, paddingBottom: 10},
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  logoBadge: {
    backgroundColor: COLORS.yellow400,
    padding: 6,
    borderRadius: 8,
    transform: [{rotate: '3deg'}],
  },
  logoText: {color: 'white', fontWeight: '800', fontSize: 18, lineHeight: 22},
  subLogoRow: {flexDirection: 'row', alignItems: 'center', gap: 4},
  cafeNameSmall: {
    color: COLORS.gray300,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    maxWidth: 150,
  },
  tabBar: {flexDirection: 'row', paddingHorizontal: 10, gap: 8},
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  tabBtnActive: {backgroundColor: COLORS.yellow500},
  tabText: {color: COLORS.gray300, fontSize: 13, fontWeight: '600'},
  tabTextActive: {color: COLORS.slate900},
  content: {
    flex: 1,
    backgroundColor: COLORS.gray100,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.slate900,
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate800,
    marginTop: 10,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: COLORS.slate900,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  hint: {fontSize: 12, color: 'gray', marginTop: 6},
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  link: {color: COLORS.blue600, fontWeight: '600'},

  // --- UPDATED PRINTER LIST STYLES ---
  printerListContainer: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  listHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  printerScroll: {
    maxHeight: 180, // Restricts height to avoid overflow
  },
  printerRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
  },

  saveBtn: {
    backgroundColor: COLORS.slate900,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {color: 'white', fontWeight: 'bold', fontSize: 16},
  testPrintBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.blue600,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  tabletOverlay: {flex: 1, flexDirection: 'row'},
  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)'},
  tabletDrawer: {
    width: 450,
    backgroundColor: 'white',
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  optionBtnActive: {
    backgroundColor: COLORS.slate900,
    borderColor: COLORS.slate900,
  },
  optionText: {color: COLORS.slate900, fontWeight: '600'},
  optionTextActive: {color: 'white'},
});

const App = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <POSProvider>
          <ToastProvider>
            <ConfirmationProvider>
              <MainLayout />
            </ConfirmationProvider>
          </ToastProvider>
        </POSProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;
