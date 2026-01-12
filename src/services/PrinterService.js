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

    // Determine Order Type based on Table Number prefix (D=Delivery, T=Takeaway)
    const tableId = String(order.tableNumber || '');
    let orderType = 'DINE IN';
    if (tableId.startsWith('D')) orderType = 'DELIVERY';
    else if (tableId.startsWith('T')) orderType = 'TAKEAWAY';

    // 58mm paper usually holds ~32 chars. 80mm holds ~48 chars.
    const PAD_SIZE = paperSize === '80' ? 48 : 32;

    const separatorLine = '- '.repeat(Math.floor(PAD_SIZE / 2));
    const items =
      typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

    // Helper for simple rows (Headers, totals)
    const formatRow = (label, value) => {
      const maxLabelLength = Math.floor(PAD_SIZE * 0.65);
      const labelStr = String(label).substring(0, maxLabelLength);
      const valueStr = String(value);
      const spaces = Math.max(1, PAD_SIZE - labelStr.length - valueStr.length);
      return labelStr + ' '.repeat(spaces) + valueStr;
    };

    // Use Bill Number -> Order Number -> Last 6 chars of ID
    const displayId =
      order.billNumber ||
      order.orderNumber ||
      (order.id ? order.id.slice(-6).toUpperCase() : '---');

    // ==========================================
    // 2. GENERATE VIRTUAL RECEIPT (Console Log)
    // ==========================================
    let virtualReceipt = '\n========== VIRTUAL RECEIPT ==========\n';
    virtualReceipt += `[CENTER BOLD] ${cafeName}\n`;
    if (cafePhone) virtualReceipt += `[CENTER] Ph: ${cafePhone}\n`;

    // ADDED: Order Type Line
    virtualReceipt += `[CENTER] (${orderType})\n`;

    virtualReceipt += `${separatorLine}\n`;
    virtualReceipt += `Date: ${new Date().toLocaleDateString()}\n`;
    virtualReceipt += `Bill No: #${displayId}\n`;
    if (order.customerName) virtualReceipt += `Name: ${order.customerName}\n`;
    if (order.customerPhone)
      virtualReceipt += `Phone: ${order.customerPhone}\n`;
    virtualReceipt += `${separatorLine}\n`;
    virtualReceipt += formatRow('Item (Qty)', 'Price') + '\n';

    // --- UPDATED LOGGING LOGIC ---
    for (let item of items) {
      const qty = item.qty || 1;
      const price = (item.price * qty).toFixed(2);
      const cleanName = item.name.replace(/[^a-zA-Z0-9 ()-]/g, '');
      const rightSide = ` x${qty} ${price}`;

      // Calculate space available for name on the first line
      // We reserve space for rightSide + 1 space gap
      const maxNameLen = PAD_SIZE - rightSide.length - 1;

      if (cleanName.length <= maxNameLen) {
        // CASE 1: Fits perfectly on one line
        const spaces = PAD_SIZE - cleanName.length - rightSide.length;
        virtualReceipt += cleanName + ' '.repeat(spaces) + rightSide + '\n';
      } else {
        // CASE 2: Name is too long. Split it.
        // Find split point (last space before the limit) to avoid cutting words
        let splitIndex = cleanName.lastIndexOf(' ', maxNameLen);
        if (splitIndex === -1 || splitIndex === 0) splitIndex = maxNameLen; // No space found, hard cut

        const part1 = cleanName.substring(0, splitIndex);
        const part2 = cleanName.substring(splitIndex).trim();

        // Line 1: Part 1 + spaces + Price
        const spaces = PAD_SIZE - part1.length - rightSide.length;
        virtualReceipt += part1 + ' '.repeat(spaces) + rightSide + '\n';

        // Line 2: The rest of the name
        virtualReceipt += part2 + '\n';
      }
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

    console.log(virtualReceipt);

    // ==========================================
    // 3. PHYSICAL PRINT CHECKS
    // ==========================================
    try {
      const isEnabled = await BluetoothManager.isBluetoothEnabled();
      if (!isEnabled) {
        Alert.alert('Bluetooth Off', 'Please turn on Bluetooth to print.');
        return false;
      }

      const savedAddress = await AsyncStorage.getItem('saved_printer');
      if (!savedAddress) {
        Alert.alert(
          'No Printer',
          'Please connect a printer in Settings > Printer Connection.',
        );
        return false;
      }

      try {
        await BluetoothManager.connect(savedAddress);
      } catch (e) {
        // Continue if already connected
      }

      await BluetoothEscposPrinter.printerInit();
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.CENTER,
      );

      // HEADER
      await BluetoothEscposPrinter.setBlob(1);
      await BluetoothEscposPrinter.printText(`${cafeName}\n\r`, {});
      await BluetoothEscposPrinter.setBlob(0);

      if (cafePhone) {
        await BluetoothEscposPrinter.printText(`Ph: ${cafePhone}\n\r`, {});
      }

      // ADDED: Order Type Line
      await BluetoothEscposPrinter.printText(`(${orderType})\n\r`, {});

      await BluetoothEscposPrinter.printText(separatorLine + '\n\r', {});

      // METADATA
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

      // --- FIXED PHYSICAL PRINTING LOOP (Smart Wrap) ---
      for (let item of items) {
        const qty = item.qty || 1;
        const priceVal = (item.price * qty).toFixed(2);
        const cleanName = item.name.replace(/[^a-zA-Z0-9 ()-]/g, '');

        const rightSide = ` x${qty} ${priceVal}`;

        // Calculate maximum width available for the name on Line 1
        const maxNameLen = PAD_SIZE - rightSide.length - 1; // -1 ensures at least one space

        if (cleanName.length <= maxNameLen) {
          // CASE 1: Fits on one line
          const spaces = PAD_SIZE - cleanName.length - rightSide.length;
          await BluetoothEscposPrinter.printText(
            cleanName + ' '.repeat(spaces) + rightSide + '\n\r',
            {},
          );
        } else {
          // CASE 2: Too long - Smart Split

          // Find the last space within the allowed width so we don't cut words in half
          let splitIndex = cleanName.lastIndexOf(' ', maxNameLen);

          // If the word is super long (no spaces found), hard cut it
          if (splitIndex === -1 || splitIndex === 0) splitIndex = maxNameLen;

          const part1 = cleanName.substring(0, splitIndex);
          const part2 = cleanName.substring(splitIndex).trim();

          // Print Line 1: Part of Name + Spaces + Price
          const spaces = PAD_SIZE - part1.length - rightSide.length;
          await BluetoothEscposPrinter.printText(
            part1 + ' '.repeat(spaces) + rightSide + '\n\r',
            {},
          );

          // Print Line 2: Remaining Name
          await BluetoothEscposPrinter.printText(part2 + '\n\r', {});
        }

        await PrinterService.sleep(100);
      }
      // -------------------------------------------------------------

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

      // Trailing feed
      await PrinterService.sleep(300);
      await BluetoothEscposPrinter.printText('\n\n', {});

      return true;
    } catch (e) {
      console.warn('Physical Print Failed:', e.message);
      Alert.alert(
        'Printer Error',
        'Could not connect to printer. Please check connection.',
      );
      return false;
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
