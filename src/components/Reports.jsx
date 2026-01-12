import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {FirebaseService} from '../services/FirebaseService';
import {generateMonthlyReport} from '../services/PDFService';
import {useToast} from '../context/ToastContext';
import {useConfirmation} from '../context/ConfirmationContext';
import {
  TrendingUp,
  TrendingDown,
  PlusCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  CalendarDays,
  X,
  User,
  Phone,
  Receipt,
  Calendar,
  CalendarRange,
} from 'lucide-react-native';

const ITEMS_PER_PAGE = 10;

const Reports = () => {
  const {showToast} = useToast();
  const {askConfirmation} = useConfirmation();
  const scrollRef = useRef(); // Ref for the top menu scroll

  const [mode, setMode] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({
    sales: 0,
    expenses: 0,
    profit: 0,
    pending: 0,
  });

  const [data, setData] = useState({
    paidOrders: [],
    pendingOrders: [],
    expenses: [],
  });

  const [salesPage, setSalesPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const [expensesPage, setExpensesPage] = useState(1);
  const [expenseForm, setExpenseForm] = useState({title: '', amount: ''});

  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Check if selected date is today to disable "Next" button
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  useEffect(() => {
    fetchReport();
  }, [mode, selectedDate]);

  const fetchReport = async () => {
    setLoading(true);
    const today = new Date();
    let start, end;

    if (mode === 'daily') {
      start = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      ).toISOString();
      end = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1,
      ).toISOString();
    } else if (mode === 'custom') {
      start = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
      ).toISOString();
      end = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate() + 1,
      ).toISOString();
    } else if (mode === 'current') {
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      end = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        1,
      ).toISOString();
    } else if (mode === 'previous') {
      start = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1,
      ).toISOString();
      end = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    } else if (mode === 'year') {
      start = new Date(today.getFullYear(), 0, 1).toISOString();
      end = new Date(today.getFullYear() + 1, 0, 1).toISOString();
    }

    try {
      const result = await FirebaseService.fetchReportData(start, end);

      const allOrders = result.orders;
      const expenses = result.expenses;

      let totalSales = 0;
      let pendingAmount = 0;
      const paidList = [];
      const pendingList = [];

      allOrders.forEach(o => {
        if (o.isPaid === 1) {
          totalSales += o.finalTotal;
          paidList.push(o);
        } else {
          pendingAmount += o.finalTotal;
          pendingList.push(o);
        }
      });

      // Sort by date desc
      paidList.sort((a, b) => new Date(b.date) - new Date(a.date));
      pendingList.sort((a, b) => new Date(b.date) - new Date(a.date));
      expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

      let totalExp = 0;
      expenses.forEach(e => (totalExp += e.amount));

      setData({
        paidOrders: paidList,
        pendingOrders: pendingList,
        expenses,
      });

      setStats({
        sales: totalSales,
        expenses: totalExp,
        profit: totalSales - totalExp,
        pending: pendingAmount,
      });

      setSalesPage(1);
      setPendingPage(1);
      setExpensesPage(1);
    } catch (e) {
      console.error(e);
      showToast('Error loading report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const changeDate = days => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);

    // Extra safety check: prevent going to future
    if (days > 0 && newDate > new Date()) return;

    setSelectedDate(newDate);
  };

  const handleSettleOrder = orderId => {
    askConfirmation({
      title: 'Confirm Settle',
      message: 'Mark this pending order as Paid?',
      confirmText: 'Mark Paid',
      onConfirm: async () => {
        const targetOrder = data.pendingOrders.find(o => o.id === orderId);
        if (!targetOrder) return;

        const amount = targetOrder.finalTotal;

        const newPending = data.pendingOrders.filter(o => o.id !== orderId);
        const newPaid = [
          {...targetOrder, isPaid: 1, date: new Date().toISOString()},
          ...data.paidOrders,
        ];

        newPaid.sort((a, b) => new Date(b.date) - new Date(a.date));

        setData(prev => ({
          ...prev,
          pendingOrders: newPending,
          paidOrders: newPaid,
        }));

        setStats(prev => ({
          ...prev,
          sales: prev.sales + amount,
          pending: prev.pending - amount,
          profit: prev.profit + amount,
        }));

        showToast('Order marked as paid', 'success');

        try {
          await FirebaseService.markOrderPaid(orderId);
        } catch (e) {
          console.error(e);
          showToast('Could not sync update', 'error');
        }
      },
    });
  };

  const handleAddExpense = async () => {
    if (!expenseForm.title || !expenseForm.amount) {
      showToast('Enter title and amount', 'warning');
      return;
    }
    const amountVal = parseFloat(expenseForm.amount);
    if (isNaN(amountVal)) {
      showToast('Invalid Amount', 'warning');
      return;
    }

    const newExpenseItem = {
      id: Date.now().toString(),
      title: expenseForm.title,
      amount: amountVal,
      date: new Date().toISOString(),
    };

    try {
      await FirebaseService.addExpense(expenseForm.title, expenseForm.amount);
      setExpenseForm({title: '', amount: ''});

      const newExpenses = [newExpenseItem, ...data.expenses];
      newExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

      setData(prev => ({
        ...prev,
        expenses: newExpenses,
      }));
      setStats(prev => ({
        ...prev,
        expenses: prev.expenses + amountVal,
        profit: prev.profit - amountVal,
      }));
      showToast('Expense Added', 'success');
    } catch (e) {
      console.error(e);
      showToast('Could not save expense', 'error');
    }
  };

  const handleExport = async () => {
    const allOrders = [...data.paidOrders, ...data.pendingOrders];
    if (allOrders.length === 0 && data.expenses.length === 0) {
      showToast('No data to export', 'warning');
      return;
    }
    try {
      let reportTitle = 'Current Month';
      if (mode === 'daily')
        reportTitle = `Daily Report (${new Date().toLocaleDateString()})`;
      if (mode === 'custom')
        reportTitle = `Daily Report (${selectedDate.toLocaleDateString()})`;
      if (mode === 'previous') reportTitle = 'Last Month';
      if (mode === 'year')
        reportTitle = `Yearly Report (${new Date().getFullYear()})`;

      await generateMonthlyReport(allOrders, data.expenses, reportTitle);
    } catch (e) {
      showToast('PDF Generation Failed', 'error');
    }
  };

  const handleItemClick = item => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const getPaginatedData = (list, page) => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return list.slice(start, end);
  };

  const shouldShowHeader = (currentDate, index, array) => {
    if (index === 0) return true;
    const prevDate = new Date(array[index - 1].date).toDateString();
    const curr = new Date(currentDate).toDateString();
    return prevDate !== curr;
  };

  const formatDateHeader = isoString => {
    return new Date(isoString).toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const renderPaginationControls = (currentPage, totalItems, setPage) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;

    return (
      <View style={styles.paginationRow}>
        <TouchableOpacity
          disabled={currentPage === 1}
          onPress={() => setPage(p => p - 1)}
          style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}>
          <ChevronLeft
            size={16}
            color={currentPage === 1 ? '#cbd5e1' : '#0f172a'}
          />
        </TouchableOpacity>
        <Text style={styles.pageText}>
          Page {currentPage} of {totalPages}
        </Text>
        <TouchableOpacity
          disabled={currentPage === totalPages}
          onPress={() => setPage(p => p + 1)}
          style={[
            styles.pageBtn,
            currentPage === totalPages && styles.pageBtnDisabled,
          ]}>
          <ChevronRight
            size={16}
            color={currentPage === totalPages ? '#cbd5e1' : '#0f172a'}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <TouchableOpacity onPress={handleExport} style={styles.exportBtn}>
          <Download color="white" size={16} />
          <Text style={{color: 'white', fontWeight: 'bold', fontSize: 12}}>
            Save PDF
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTROLS */}
      <View style={styles.controls}>
        {/* Left Arrow for Menu */}
        <TouchableOpacity
          onPress={() => scrollRef.current?.scrollTo({x: 0, animated: true})}
          style={styles.navArrow}>
          <ChevronLeft size={20} color="#64748b" />
        </TouchableOpacity>

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toggleWrapper}>
          <TouchableOpacity
            onPress={() => setMode('daily')}
            style={[
              styles.toggleBtn,
              mode === 'daily' && styles.toggleActive,
              {flexDirection: 'row', gap: 4},
            ]}>
            <Calendar
              size={14}
              color={mode === 'daily' ? 'white' : '#64748b'}
            />
            <Text
              style={[styles.toggleText, mode === 'daily' && {color: 'white'}]}>
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode('custom')}
            style={[
              styles.toggleBtn,
              mode === 'custom' && styles.toggleActive,
              {flexDirection: 'row', gap: 4},
            ]}>
            <CalendarRange
              size={14}
              color={mode === 'custom' ? 'white' : '#64748b'}
            />
            <Text
              style={[
                styles.toggleText,
                mode === 'custom' && {color: 'white'},
              ]}>
              Custom Date
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode('current')}
            style={[
              styles.toggleBtn,
              mode === 'current' && styles.toggleActive,
            ]}>
            <Text
              style={[
                styles.toggleText,
                mode === 'current' && {color: 'white'},
              ]}>
              Current Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('previous')}
            style={[
              styles.toggleBtn,
              mode === 'previous' && styles.toggleActive,
            ]}>
            <Text
              style={[
                styles.toggleText,
                mode === 'previous' && {color: 'white'},
              ]}>
              Last Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('year')}
            style={[
              styles.toggleBtn,
              mode === 'year' && styles.toggleActive,
              {flexDirection: 'row', gap: 4},
            ]}>
            <CalendarDays
              size={14}
              color={mode === 'year' ? 'white' : '#64748b'}
            />
            <Text
              style={[styles.toggleText, mode === 'year' && {color: 'white'}]}>
              Yearly
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Right Arrow for Menu */}
        <TouchableOpacity
          onPress={() => scrollRef.current?.scrollToEnd({animated: true})}
          style={styles.navArrow}>
          <ChevronRight size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <View style={{alignItems: 'center', marginBottom: 20}}>
        {mode === 'custom' ? (
          <View
            style={[
              styles.dateBadge,
              {flexDirection: 'row', gap: 12, alignItems: 'center'},
            ]}>
            <TouchableOpacity onPress={() => changeDate(-1)}>
              <ChevronLeft size={20} color="#0f172a" />
            </TouchableOpacity>

            <Text
              style={{
                fontSize: 14,
                fontWeight: 'bold',
                color: '#0f172a',
                minWidth: 120,
                textAlign: 'center',
              }}>
              {selectedDate.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Text>

            <TouchableOpacity
              onPress={() => changeDate(1)}
              disabled={isToday}
              style={{opacity: isToday ? 0.3 : 1}}>
              <ChevronRight size={20} color="#0f172a" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.dateBadge}>
            <Text style={{fontSize: 12, fontWeight: 'bold', color: '#64748b'}}>
              {mode === 'daily'
                ? new Date().toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : mode === 'year'
                ? `Year: ${new Date().getFullYear()}`
                : mode === 'current'
                ? new Date().toLocaleString('default', {
                    month: 'long',
                    year: 'numeric',
                  })
                : (() => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - 1);
                    return d.toLocaleString('default', {
                      month: 'long',
                      year: 'numeric',
                    });
                  })()}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#0f172a"
          style={{marginTop: 20}}
        />
      ) : (
        <>
          {/* STATS */}
          <View style={styles.statsRow}>
            <View style={styles.card}>
              <TrendingUp color="#16a34a" size={24} />
              <Text style={styles.statLabel}>Paid Sales</Text>
              <Text style={styles.statVal}>₹{stats.sales.toFixed(0)}</Text>
            </View>

            <View style={styles.card}>
              <Clock color="#f97316" size={24} />
              <Text style={styles.statLabel}>Pending</Text>
              <Text style={[styles.statVal, {color: '#f97316'}]}>
                ₹{stats.pending.toFixed(0)}
              </Text>
            </View>

            <View style={styles.card}>
              <TrendingDown color="#dc2626" size={24} />
              <Text style={styles.statLabel}>Expenses</Text>
              <Text style={styles.statVal}>₹{stats.expenses.toFixed(0)}</Text>
            </View>
          </View>

          {/* LIST 1: PENDING ORDERS */}
          {data.pendingOrders.length > 0 && (
            <View
              style={[
                styles.listSection,
                {borderColor: '#fed7aa', borderWidth: 1},
              ]}>
              <Text style={[styles.sectionTitle, {color: '#c2410c'}]}>
                Pending Orders ({data.pendingOrders.length})
              </Text>
              {getPaginatedData(data.pendingOrders, pendingPage).map(
                (o, index, arr) => (
                  <React.Fragment key={o.id}>
                    {shouldShowHeader(o.date, index, arr) && (
                      <Text style={styles.dateHeader}>
                        {formatDateHeader(o.date)}
                      </Text>
                    )}
                    <TouchableOpacity
                      style={styles.listItem}
                      onPress={() => handleItemClick(o)}>
                      <View>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}>
                          <Text style={{fontWeight: 'bold', color: '#334155'}}>
                            #{o.billNumber || o.orderNumber || '---'}
                          </Text>
                          <View
                            style={{
                              backgroundColor: '#ffedd5',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}>
                            <Text
                              style={{
                                fontSize: 8,
                                fontWeight: 'bold',
                                color: '#c2410c',
                              }}>
                              UNPAID
                            </Text>
                          </View>
                        </View>
                        <Text style={{fontSize: 10, color: 'gray'}}>
                          {new Date(o.date).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                        {o.customerName ? (
                          <Text style={{fontSize: 10, color: '#64748b'}}>
                            {o.customerName}
                          </Text>
                        ) : null}
                      </View>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                        }}>
                        <Text
                          style={{
                            color: '#f97316',
                            fontWeight: 'bold',
                          }}>
                          ₹{o.finalTotal.toFixed(0)}
                        </Text>

                        <TouchableOpacity
                          onPress={() => handleSettleOrder(o.id)}
                          style={{
                            backgroundColor: '#16a34a',
                            padding: 6,
                            borderRadius: 4,
                          }}>
                          <CheckCircle2 size={16} color="white" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </React.Fragment>
                ),
              )}
              {renderPaginationControls(
                pendingPage,
                data.pendingOrders.length,
                setPendingPage,
              )}
            </View>
          )}

          {/* LIST 2: EXPENSES */}
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>
              Expenses ({data.expenses.length})
            </Text>
            {data.expenses.length === 0 && (
              <Text style={{color: 'gray', fontStyle: 'italic'}}>
                No expenses recorded.
              </Text>
            )}

            {getPaginatedData(data.expenses, expensesPage).map(
              (e, index, arr) => (
                <React.Fragment key={e.id}>
                  {shouldShowHeader(e.date, index, arr) && (
                    <Text style={styles.dateHeader}>
                      {formatDateHeader(e.date)}
                    </Text>
                  )}
                  <View style={styles.listItem}>
                    <View>
                      <Text style={{fontWeight: 'bold', color: '#334155'}}>
                        {e.title}
                      </Text>
                      <Text style={{fontSize: 10, color: 'gray'}}>
                        {new Date(e.date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <Text style={{color: '#dc2626', fontWeight: 'bold'}}>
                      -₹{e.amount.toFixed(0)}
                    </Text>
                  </View>
                </React.Fragment>
              ),
            )}
            {renderPaginationControls(
              expensesPage,
              data.expenses.length,
              setExpensesPage,
            )}

            <View style={styles.expenseForm}>
              <TextInput
                placeholder="Title (e.g. Milk)"
                value={expenseForm.title}
                onChangeText={t => setExpenseForm({...expenseForm, title: t})}
                style={[styles.input, {flex: 2}]}
              />
              <TextInput
                placeholder="Amount"
                value={expenseForm.amount}
                onChangeText={t => setExpenseForm({...expenseForm, amount: t})}
                keyboardType="numeric"
                style={[styles.input, {flex: 1}]}
              />
              <TouchableOpacity
                onPress={handleAddExpense}
                style={styles.addBtn}>
                <PlusCircle color="white" size={20} />
              </TouchableOpacity>
            </View>
          </View>

          {/* LIST 3: PAID SALES */}
          <View style={[styles.listSection, {marginBottom: 50}]}>
            <Text style={styles.sectionTitle}>
              Paid Sales ({data.paidOrders.length})
            </Text>
            {data.paidOrders.length === 0 && (
              <Text style={{color: 'gray', fontStyle: 'italic'}}>
                No sales recorded.
              </Text>
            )}

            {getPaginatedData(data.paidOrders, salesPage).map(
              (o, index, arr) => (
                <React.Fragment key={o.id}>
                  {shouldShowHeader(o.date, index, arr) && (
                    <Text style={styles.dateHeader}>
                      {formatDateHeader(o.date)}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => handleItemClick(o)}>
                    <View>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}>
                        <Text style={{fontWeight: 'bold', color: '#334155'}}>
                          #{o.billNumber || o.orderNumber || '---'}
                        </Text>
                        <View
                          style={{
                            backgroundColor: '#dcfce7',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                          }}>
                          <Text
                            style={{
                              fontSize: 8,
                              fontWeight: 'bold',
                              color: '#15803d',
                            }}>
                            PAID
                          </Text>
                        </View>
                      </View>
                      <Text style={{fontSize: 10, color: 'gray'}}>
                        {new Date(o.date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      {o.customerName ? (
                        <Text style={{fontSize: 10, color: '#64748b'}}>
                          {o.customerName}
                        </Text>
                      ) : null}
                    </View>

                    <Text
                      style={{
                        color: '#16a34a',
                        fontWeight: 'bold',
                      }}>
                      +₹{o.finalTotal.toFixed(0)}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              ),
            )}
            {renderPaginationControls(
              salesPage,
              data.paidOrders.length,
              setSalesPage,
            )}
          </View>
        </>
      )}

      {/* CUSTOMER DETAILS MODAL */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <View style={{gap: 16}}>
                <View style={styles.detailRow}>
                  <Receipt color="#64748b" size={20} />
                  <View>
                    <Text style={styles.detailLabel}>Bill Number</Text>
                    <Text style={styles.detailValue}>
                      #
                      {selectedItem.billNumber ||
                        selectedItem.orderNumber ||
                        selectedItem.id}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <User color="#64748b" size={20} />
                  <View>
                    <Text style={styles.detailLabel}>Customer Name</Text>
                    <Text style={styles.detailValue}>
                      {selectedItem.customerName || 'N/A'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Phone color="#64748b" size={20} />
                  <View>
                    <Text style={styles.detailLabel}>Phone Number</Text>
                    <Text style={styles.detailValue}>
                      {selectedItem.customerPhone || 'N/A'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <TrendingUp color="#64748b" size={20} />
                  <View>
                    <Text style={styles.detailLabel}>Total Amount</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        {
                          color:
                            selectedItem.isPaid === 1 ? '#16a34a' : '#f97316',
                        },
                      ]}>
                      ₹{selectedItem.finalTotal.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, backgroundColor: '#f8fafc'},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {fontSize: 24, fontWeight: 'bold', color: '#0f172a'},
  exportBtn: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
    alignItems: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6, // Added gap for spacing between arrows and list
  },
  navArrow: {
    padding: 8,
  },
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    padding: 2,
    flexGrow: 0, // Helps with layout within the row
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: {backgroundColor: '#0f172a'},
  toggleText: {fontSize: 12, fontWeight: 'bold', color: '#64748b'},
  dateBadge: {
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  card: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    elevation: 1,
  },
  statLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: '#64748b',
    marginTop: 4,
  },
  statVal: {fontSize: 18, fontWeight: 'bold', color: '#0f172a'},
  expenseSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  expenseForm: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f8fafc',
    fontSize: 14,
  },
  addBtn: {
    backgroundColor: '#0f172a',
    width: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#334155',
    fontSize: 16,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 15,
  },
  pageBtn: {padding: 5, borderRadius: 4, backgroundColor: '#f1f5f9'},
  pageBtnDisabled: {opacity: 0.3},
  pageText: {fontSize: 12, fontWeight: '600', color: '#64748b'},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {fontSize: 20, fontWeight: 'bold', color: '#0f172a'},
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  detailLabel: {fontSize: 12, color: '#64748b', marginBottom: 2},
  detailValue: {fontSize: 16, fontWeight: 'bold', color: '#334155'},
  dateHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
});

export default Reports;
