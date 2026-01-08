import AsyncStorage from '@react-native-async-storage/async-storage';

export const generateReceiptText = async order => {
  const PAD_SIZE = 32;
  // Use AsyncStorage instead of localStorage
  const cafeName =
    (await AsyncStorage.getItem('cafe_name')) || 'HISAAB KITAAB CAFE';

  const center = text => {
    const spaces = Math.max(0, Math.floor((PAD_SIZE - text.length) / 2));
    return ' '.repeat(spaces) + text + '\n';
  };

  const row = (left, right) => {
    const space = PAD_SIZE - left.length - right.length;
    return left + ' '.repeat(Math.max(1, space)) + right + '\n';
  };

  const line = '-'.repeat(PAD_SIZE) + '\n';

  let receipt = '';
  receipt += center(cafeName.toUpperCase());
  receipt += center('----------------');
  receipt += `Date: ${new Date(order.date).toLocaleString()}\n`;
  receipt += `Order #: ${order.billNumber || order.id}\n`;
  receipt += `Table: ${order.tableNumber || order.tableId}\n`;
  receipt += line;

  // Handle items array
  const items = Array.isArray(order.items)
    ? order.items
    : JSON.parse(order.items || '[]');

  items.forEach(item => {
    receipt += `${item.name}\n`;
    receipt += row(
      `  ${item.qty} x ${item.price}`,
      (item.qty * item.price).toFixed(2),
    );
  });

  receipt += line;
  receipt += row('Subtotal:', (order.subTotal || 0).toFixed(2));

  if (order.discount > 0)
    receipt += row('Discount:', `-${(order.discount || 0).toFixed(2)}`);

  // Extra Charges
  if (order.extraAmount > 0) {
    receipt += row('Extra:', `+${(order.extraAmount || 0).toFixed(2)}`);
    if (order.extraReason) receipt += `(${order.extraReason})\n`;
  }

  receipt += '\n';
  receipt += row('TOTAL:', (order.finalTotal || 0).toFixed(2));
  receipt += line;
  receipt += center('Thank You!');
  receipt += '\n\n\n'; // Feed lines

  return receipt;
};
