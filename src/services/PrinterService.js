import {
  BluetoothManager,
  BluetoothEscposPrinter,
} from 'react-native-bluetooth-escpos-printer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Alert, PermissionsAndroid, Platform} from 'react-native';

export const PrinterService = {
  sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),

  requestPermissions: async () => {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 31) {
        try {
          const result = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);
          return (
            result['android.permission.BLUETOOTH_CONNECT'] ===
              PermissionsAndroid.RESULTS.GRANTED &&
            result['android.permission.BLUETOOTH_SCAN'] ===
              PermissionsAndroid.RESULTS.GRANTED
          );
        } catch (e) {
          console.error('Permission Error', e);
          return false;
        }
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true;
  },

  scanDevices: async () => {
    try {
      const hasPerms = await PrinterService.requestPermissions();
      if (!hasPerms) return {paired: [], found: []};
      const devicesStr = await BluetoothManager.scanDevices();
      const devices = JSON.parse(devicesStr);
      return {paired: devices.paired || [], found: devices.found || []};
    } catch (e) {
      console.error('Scan Error', e);
      return {paired: [], found: []};
    }
  },

  connectDevice: async address => {
    try {
      const hasPerms = await PrinterService.requestPermissions();
      if (!hasPerms) throw new Error('Bluetooth permission denied');
      await BluetoothManager.connect(address);
      await AsyncStorage.setItem('saved_printer', address);
      return true;
    } catch (e) {
      console.error('Connect Error', e);
      throw e;
    }
  },

  // --- UPDATED PRINT FUNCTION ---
  printBill: async order => {
    // 1. PREPARE DATA
    const cafeName =
      (await AsyncStorage.getItem('cafe_name')) || 'Hisaab Kitaab Cafe';
    const cafePhone = (await AsyncStorage.getItem('phone_number')) || '';
    const footerMsg =
      (await AsyncStorage.getItem('receipt_footer')) || 'Thank you!';
    const paperSize = (await AsyncStorage.getItem('paper_size')) || '58';
    const PAD_SIZE = paperSize === '80' ? 48 : 32;

    const formatRow = (label, value) => {
      const maxLabelLength = Math.floor(PAD_SIZE * 0.65);
      const labelStr = String(label).substring(0, maxLabelLength);
      const valueStr = String(value);
      const spaces = Math.max(1, PAD_SIZE - labelStr.length - valueStr.length);
      return labelStr + ' '.repeat(spaces) + valueStr;
    };

    const separatorLine = '- '.repeat(Math.floor(PAD_SIZE / 2));
    const items =
      typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

    // Use Bill Number -> Order Number -> Last 6 chars of ID
    const displayId =
      order.billNumber ||
      order.orderNumber ||
      (order.id ? order.id.slice(-6).toUpperCase() : '---');

    // 2. GENERATE VIRTUAL RECEIPT STRING (Always Log for Debugging)
    let virtualReceipt = '\n========== VIRTUAL RECEIPT ==========\n';
    virtualReceipt += `[CENTER BOLD] ${cafeName}\n`;
    if (cafePhone) virtualReceipt += `[CENTER] Ph: ${cafePhone}\n`;
    virtualReceipt += `${separatorLine}\n`;
    virtualReceipt += `Date: ${new Date().toLocaleDateString()}\n`;
    virtualReceipt += `Bill No: #${displayId}\n`; // <--- Uses 1..n if available
    if (order.customerName) virtualReceipt += `Name: ${order.customerName}\n`;
    if (order.customerPhone)
      virtualReceipt += `Phone: ${order.customerPhone}\n`; // <--- ADDED CUSTOMER PHONE
    virtualReceipt += `${separatorLine}\n`;
    virtualReceipt += formatRow('Item (Qty)', 'Price') + '\n';

    for (let item of items) {
      const qty = item.qty || 1;
      const price = (item.price * qty).toFixed(2);
      const cleanName = item.name.replace(/[^a-zA-Z0-9 ()-]/g, '');
      const nameWithQty = `${cleanName} x${qty}`;
      virtualReceipt += formatRow(nameWithQty, price) + '\n';
    }

    virtualReceipt += `${separatorLine}\n`;
    if (order.discount > 0)
      virtualReceipt +=
        formatRow('Discount:', `-${order.discount.toFixed(2)}`) + '\n';
    if (order.extraAmount > 0)
      virtualReceipt +=
        formatRow('Extra:', `+${order.extraAmount.toFixed(2)}`) + '\n';

    virtualReceipt += `\nTOTAL: Rs.${order.finalTotal.toFixed(2)}\n`;
    virtualReceipt += `\n[CENTER] ${footerMsg}\n`;
    virtualReceipt += '=====================================\n';

    console.log(virtualReceipt); // <--- Still logs to console

    // 3. PHYSICAL PRINT CHECKS (Strict Mode)
    try {
      const isEnabled = await BluetoothManager.isBluetoothEnabled();
      if (!isEnabled) {
        Alert.alert('Bluetooth Off', 'Please turn on Bluetooth to print.');
        return false; // <--- Return False (UI won't show success toast)
      }

      const savedAddress = await AsyncStorage.getItem('saved_printer');
      if (!savedAddress) {
        Alert.alert(
          'No Printer',
          'Please connect a printer in Settings > Printer Connection.',
        );
        return false; // <--- Return False
      }

      try {
        await BluetoothManager.connect(savedAddress);
      } catch (e) {
        // Continue if already connected
      }

      await BluetoothEscposPrinter.printerInit();
      await PrinterService.sleep(200);

      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.CENTER,
      );
      await BluetoothEscposPrinter.setBlob(1);
      await BluetoothEscposPrinter.printText(`${cafeName}\n\r`, {});
      await BluetoothEscposPrinter.setBlob(0);
      await PrinterService.sleep(200);

      if (cafePhone) {
        await BluetoothEscposPrinter.printText(`Ph: ${cafePhone}\n\r`, {});
      }
      await BluetoothEscposPrinter.printText(separatorLine + '\n\r', {});

      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.LEFT,
      );
      await BluetoothEscposPrinter.printText(
        `Date: ${new Date().toLocaleDateString()}\n\r`,
        {},
      );
      await BluetoothEscposPrinter.printText(`Bill No: #${displayId}\n\r`, {});

      if (order.customerName) {
        await BluetoothEscposPrinter.printText(
          `Name: ${order.customerName}\n\r`,
          {},
        );
      }
      // --- ADDED CUSTOMER PHONE PRINTING ---
      if (order.customerPhone) {
        await BluetoothEscposPrinter.printText(
          `Phone: ${order.customerPhone}\n\r`,
          {},
        );
      }

      await BluetoothEscposPrinter.printText(separatorLine + '\n\r', {});

      await BluetoothEscposPrinter.printText(
        formatRow('Item (Qty)', 'Price') + '\n\r',
        {},
      );

      for (let item of items) {
        const qty = item.qty || 1;
        const price = (item.price * qty).toFixed(2);
        const cleanName = item.name.replace(/[^a-zA-Z0-9 ()-]/g, '');
        const nameWithQty = `${cleanName} x${qty}`;

        await BluetoothEscposPrinter.printText(
          formatRow(nameWithQty, price) + '\n\r',
          {},
        );
        await PrinterService.sleep(150);
      }

      await BluetoothEscposPrinter.printText(separatorLine + '\n\r', {});

      if (order.discount > 0) {
        await BluetoothEscposPrinter.printText(
          formatRow('Discount:', `-${order.discount.toFixed(2)}`) + '\n\r',
          {},
        );
      }
      if (order.extraAmount > 0) {
        await BluetoothEscposPrinter.printText(
          formatRow('Extra:', `+${order.extraAmount.toFixed(2)}`) + '\n\r',
          {},
        );
      }

      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.CENTER,
      );
      await PrinterService.sleep(100);
      await BluetoothEscposPrinter.printText(
        `\nTOTAL: Rs.${order.finalTotal.toFixed(2)}\n\r`,
        {},
      );

      await PrinterService.sleep(500);
      await BluetoothEscposPrinter.printText(`\n${footerMsg}\n\r`, {});
      await PrinterService.sleep(300);
      await BluetoothEscposPrinter.printText('\n\n\n', {});

      return true; // Physical Print Success
    } catch (e) {
      console.warn('Physical Print Failed:', e.message);
      Alert.alert(
        'Printer Error',
        'Could not connect to printer. Please check connection.',
      );
      return false; // <--- Return False on error
    }
  },

  testPrint: async () => {
    try {
      await BluetoothEscposPrinter.printerInit();
      await BluetoothEscposPrinter.printText('Test Success\n\r', {});
    } catch (e) {
      Alert.alert('Printer Error', 'Printer not connected.');
    }
  },
};
