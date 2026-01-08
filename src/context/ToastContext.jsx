import React, {
  createContext,
  useState,
  useContext,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import {
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
} from 'lucide-react-native';

const ToastContext = createContext();

export const ToastProvider = ({children}) => {
  const [toast, setToast] = useState(null);

  // Animation Values
  // translateY: Starts off-screen (-100), moves to 50
  const slideAnim = useRef(new Animated.Value(-100)).current;
  // Opacity: Starts at 0, goes to 1
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showToast = (message, type = 'success') => {
    setToast({message, type});

    // Reset values for new animation
    slideAnim.setValue(-100);
    fadeAnim.setValue(0);

    // Animate In (Slide Down + Fade In)
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: Platform.OS === 'ios' ? 60 : 40, // Adjust for notch/status bar
        useNativeDriver: true,
        friction: 6,
        tension: 50,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-hide after 3 seconds
    const timer = setTimeout(hideToast, 3000);
    return () => clearTimeout(timer);
  };

  const hideToast = () => {
    // Animate Out (Slide Up + Fade Out)
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  };

  // Helper to get colors/icons based on type
  const getToastConfig = () => {
    if (!toast) return {};
    switch (toast.type) {
      case 'error':
        return {
          borderColor: '#ef4444', // Red-500
          icon: <XCircle size={22} color="#ef4444" />,
          textColor: '#fca5a5', // Red-300
        };
      case 'warning':
        return {
          borderColor: '#f97316', // Orange-500
          icon: <AlertTriangle size={22} color="#f97316" />,
          textColor: '#fdba74', // Orange-300
        };
      case 'info':
        return {
          borderColor: '#3b82f6', // Blue-500
          icon: <Info size={22} color="#3b82f6" />,
          textColor: '#93c5fd', // Blue-300
        };
      case 'success':
      default:
        // Using your App's Yellow/Green accents
        return {
          borderColor: '#22c55e', // Green-500
          icon: <CheckCircle size={22} color="#22c55e" />,
          textColor: '#86efac', // Green-300
        };
    }
  };

  const config = getToastConfig();

  return (
    <ToastContext.Provider value={{showToast}}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              transform: [{translateY: slideAnim}],
              opacity: fadeAnim,
              borderColor: config.borderColor,
            },
          ]}>
          {config.icon}
          <Text style={[styles.message, {color: 'white'}]}>
            {toast.message}
          </Text>
          <TouchableOpacity onPress={hideToast} style={styles.closeBtn}>
            <X size={16} color="#94a3b8" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    // THEME MATCHING: Dark Slate Background
    backgroundColor: '#0f172a', // Slate-900 (Matches your Navbar)
    borderWidth: 1, // Colored border determines type
    // Shadow
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
  },
  message: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
