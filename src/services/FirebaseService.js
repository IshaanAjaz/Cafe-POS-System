import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const MENU_COL = 'menu';
const CAT_COL = 'categories';
const ORDERS_COL = 'orders';
const EXPENSES_COL = 'expenses';

// --- HELPER ---
const getUserCollection = collectionName => {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('User not authenticated. Cannot access database.');
  }
  return firestore()
    .collection('users')
    .doc(user.uid)
    .collection(collectionName);
};

export const FirebaseService = {
  // --- AUTHENTICATION ---
  registerUser: async (email, password) => {
    const userCredential = await auth().createUserWithEmailAndPassword(
      email,
      password,
    );
    const user = userCredential.user;
    await user.sendEmailVerification();

    // Sign out immediately so they can't access the app until verified
    await auth().signOut();

    return user;
  },

  loginUser: async (email, password) => {
    const userCredential = await auth().signInWithEmailAndPassword(
      email,
      password,
    );
    let user = userCredential.user;

    // Reload to get fresh verification status
    await user.reload();
    user = auth().currentUser;

    if (!user.emailVerified) {
      await auth().signOut();
      throw new Error('Email not verified. Please check your inbox.');
    }

    return user;
  },

  logoutUser: async () => {
    await auth().signOut();
  },

  // --- USER SETTINGS (NEW) ---
  updateCafeDetails: async (name, phone) => {
    const user = auth().currentUser;
    if (!user) return;

    // Save cafe details to the main user document
    // We also save 'email' so you can identify the user in the database console
    await firestore().collection('users').doc(user.uid).set(
      {
        cafeName: name,
        phoneNumber: phone,
        email: user.email,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
    );
  },

  // --- DATA SYNC ---
  syncPendingWrites: async () => {
    // Attempt to sync pending writes to the server
    // We race against a 2-second timeout so logout doesn't hang if offline
    try {
      const sync = firestore().waitForPendingWrites();
      const timeout = new Promise(resolve => setTimeout(resolve, 2000));
      await Promise.race([sync, timeout]);
    } catch (e) {
      console.log('Sync timed out or failed, proceeding to logout.');
    }
  },

  sendPasswordReset: async email => {
    await auth().sendPasswordResetEmail(email);
  },

  checkVerification: async () => {
    const user = auth().currentUser;
    if (user) {
      await user.reload();
      return user.emailVerified;
    }
    return false;
  },

  // --- DATABASE INITIALIZATION ---
  seedDatabase: async () => {
    const user = auth().currentUser;
    if (!user) return;
    const snapshot = await getUserCollection(CAT_COL).limit(1).get();
    if (snapshot.empty) {
      const batch = firestore().batch();
      ['Coffee', 'Tea', 'Snacks'].forEach(name => {
        const docRef = getUserCollection(CAT_COL).doc();
        batch.set(docRef, {name});
      });
      await batch.commit();
    }
  },

  pruneOldData: async () => {
    const user = auth().currentUser;
    if (!user) return;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const snap = await getUserCollection(ORDERS_COL)
      .where('date', '<', cutoff.toISOString())
      .limit(100)
      .get();
    if (!snap.empty) {
      const batch = firestore().batch();
      snap.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
  },

  subscribeCategories: callback => {
    return getUserCollection(CAT_COL)
      .orderBy('name', 'asc')
      .onSnapshot(snap => {
        const data = snap.docs.map(doc => ({id: doc.id, ...doc.data()}));
        callback(data);
      });
  },

  subscribeMenu: callback => {
    return getUserCollection(MENU_COL)
      .orderBy('name', 'asc')
      .onSnapshot(snap => {
        const data = snap.docs.map(doc => ({id: doc.id, ...doc.data()}));
        callback(data);
      });
  },

  // --- POS ORDER LOGIC ---
  subscribeActiveOrders: callback => {
    return getUserCollection(ORDERS_COL)
      .where('status', '==', 'ongoing')
      .onSnapshot(snap => {
        const orders = snap.docs.map(doc => ({id: doc.id, ...doc.data()}));
        callback(orders);
      });
  },

  getTableOrder: async tableNumber => {
    const snap = await getUserCollection(ORDERS_COL)
      .where('tableNumber', '==', tableNumber.toString())
      .where('status', '==', 'ongoing')
      .get();
    if (!snap.empty) return {id: snap.docs[0].id, ...snap.docs[0].data()};
    return null;
  },

  saveOrder: async orderData => {
    const ordersRef = getUserCollection(ORDERS_COL);

    const snap = await ordersRef
      .where('tableNumber', '==', orderData.tableNumber)
      .where('status', '==', 'ongoing')
      .get();

    if (!snap.empty) {
      const docId = snap.docs[0].id;
      const existingData = snap.docs[0].data();

      await ordersRef.doc(docId).update({
        items: orderData.items,
        subTotal: orderData.subTotal,
        finalTotal: orderData.finalTotal,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        date: orderData.date,
      });
      return {id: docId, ...existingData, ...orderData};
    } else {
      const lastOrderSnap = await ordersRef
        .orderBy('orderNumber', 'desc')
        .limit(1)
        .get();

      let nextNum = 1;
      if (!lastOrderSnap.empty) {
        nextNum = (lastOrderSnap.docs[0].data().orderNumber || 0) + 1;
      }

      const newOrder = {...orderData, orderNumber: nextNum};
      const docRef = await ordersRef.add(newOrder);
      return {id: docRef.id, ...newOrder};
    }
  },

  deleteActiveOrder: async tableNumber => {
    const snap = await getUserCollection(ORDERS_COL)
      .where('tableNumber', '==', tableNumber.toString())
      .where('status', '==', 'ongoing')
      .get();
    const batch = firestore().batch();
    snap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  },

  finishOrder: async (orderId, updateData) => {
    const billSnap = await getUserCollection(ORDERS_COL)
      .where('status', '==', 'completed')
      .orderBy('billNumber', 'desc')
      .limit(1)
      .get();

    let nextBill = 1;
    if (!billSnap.empty) {
      nextBill = (billSnap.docs[0].data().billNumber || 0) + 1;
    }

    await getUserCollection(ORDERS_COL)
      .doc(orderId)
      .update({
        ...updateData,
        status: 'completed',
        billNumber: nextBill,
      });

    return nextBill;
  },

  fetchReportData: async (start, end) => {
    const ordersSnap = await getUserCollection(ORDERS_COL)
      .where('status', '==', 'completed')
      .where('date', '>=', start)
      .where('date', '<', end)
      .get();
    const expensesSnap = await getUserCollection(EXPENSES_COL)
      .where('date', '>=', start)
      .where('date', '<', end)
      .get();
    return {
      orders: ordersSnap.docs.map(d => ({id: d.id, ...d.data()})),
      expenses: expensesSnap.docs.map(d => ({id: d.id, ...d.data()})),
    };
  },

  markOrderPaid: async id => {
    await getUserCollection(ORDERS_COL).doc(id).update({isPaid: 1});
  },

  addExpense: async (title, amount) => {
    await getUserCollection(EXPENSES_COL).add({
      title,
      amount: parseFloat(amount),
      date: new Date().toISOString(),
    });
  },

  addCategory: async name => getUserCollection(CAT_COL).add({name}),
  deleteCategory: async id => getUserCollection(CAT_COL).doc(id).delete(),
  addItem: async item => getUserCollection(MENU_COL).add(item),
  updateItem: async (id, item) =>
    getUserCollection(MENU_COL).doc(id).update(item),
  deleteItem: async id => getUserCollection(MENU_COL).doc(id).delete(),
};
