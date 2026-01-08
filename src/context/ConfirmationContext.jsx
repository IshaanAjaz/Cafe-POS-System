import React, {createContext, useState, useContext} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {AlertTriangle, HelpCircle} from 'lucide-react-native';

const ConfirmationContext = createContext();

export const ConfirmationProvider = ({children}) => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false, // If true, Confirm button is Red (e.g. Delete)
    confirmText: 'Confirm',
  });

  const askConfirmation = ({
    title,
    message,
    onConfirm,
    isDestructive = false,
    confirmText = 'Confirm',
  }) => {
    setConfig({
      title,
      message,
      onConfirm,
      isDestructive,
      confirmText,
    });
    setVisible(true);
  };

  const handleConfirm = () => {
    setVisible(false);
    if (config.onConfirm) config.onConfirm();
  };

  const handleCancel = () => {
    setVisible(false);
  };

  return (
    <ConfirmationContext.Provider value={{askConfirmation}}>
      {children}
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={handleCancel}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            {/* Header Icon */}
            <View style={styles.iconRow}>
              {config.isDestructive ? (
                <AlertTriangle size={32} color="#ef4444" />
              ) : (
                <HelpCircle size={32} color="#0f172a" />
              )}
            </View>

            {/* Content */}
            <Text style={styles.title}>{config.title}</Text>
            <Text style={styles.message}>{config.message}</Text>

            {/* Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirm}
                style={[
                  styles.confirmBtn,
                  config.isDestructive
                    ? styles.destructiveBtn
                    : styles.primaryBtn,
                ]}>
                <Text style={styles.confirmText}>{config.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ConfirmationContext.Provider>
  );
};

export const useConfirmation = () => useContext(ConfirmationContext);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  iconRow: {
    marginBottom: 16,
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 50,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: '#0f172a', // Slate 900
  },
  destructiveBtn: {
    backgroundColor: '#ef4444', // Red 500
  },
  cancelText: {
    fontWeight: '600',
    color: '#64748b',
  },
  confirmText: {
    fontWeight: 'bold',
    color: 'white',
  },
});
