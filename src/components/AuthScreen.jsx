import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {FirebaseService} from '../services/FirebaseService';
import {useToast} from '../context/ToastContext';
import {useConfirmation} from '../context/ConfirmationContext';
import {
  NotebookTabs,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react-native';

const COLORS = {
  slate900: '#0f172a',
  yellow400: '#facc15',
  gray100: '#f3f4f6',
  white: '#ffffff',
  gray500: '#64748b',
};

const AuthScreen = () => {
  const {showToast} = useToast();
  const {askConfirmation} = useConfirmation();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // <--- Added State

  const [form, setForm] = useState({email: '', password: ''});

  const handleAuth = async () => {
    if (!form.email || !form.password) {
      showToast('Please fill all fields', 'warning');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // --- LOGIN ---
        await FirebaseService.loginUser(form.email, form.password);
        // App.tsx handles the screen switch automatically
      } else {
        // --- REGISTER ---
        await FirebaseService.registerUser(form.email, form.password);

        askConfirmation({
          title: 'Verify Email',
          message: `We sent a verification link to ${form.email}. Please verify before logging in.`,
          confirmText: 'OK, I Understand',
          onConfirm: () => setIsLogin(true),
        });
      }
    } catch (error) {
      console.error(error);
      let msg = 'Authentication failed';
      if (error.code === 'auth/email-already-in-use')
        msg = 'Email already registered';
      if (error.code === 'auth/invalid-email') msg = 'Invalid email address';
      if (error.code === 'auth/user-not-found') msg = 'No account found';
      if (error.code === 'auth/wrong-password') msg = 'Incorrect password';

      if (error.message && error.message.includes('Email not verified')) {
        Alert.alert(
          'Verify Email',
          'Please verify your email address before logging in. Check your inbox (and spam folder).',
        );
        setLoading(false);
        return;
      }

      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!form.email) {
      showToast('Enter your email address first', 'warning');
      return;
    }

    askConfirmation({
      title: 'Reset Password?',
      message: `Send a password reset link to ${form.email}?`,
      confirmText: 'Send Email',
      onConfirm: async () => {
        try {
          await FirebaseService.sendPasswordReset(form.email);
          showToast('Reset link sent! Check your inbox.', 'success');
        } catch (e) {
          showToast('Failed to send reset link', 'error');
        }
      },
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <NotebookTabs size={32} color={COLORS.slate900} />
        </View>
        <Text style={styles.logoText}>
          Hisaab<Text style={{color: COLORS.yellow400}}>Kitaab</Text>
        </Text>
        <Text style={styles.subtitle}>
          {isLogin ? 'Manager Login' : 'Create Account'}
        </Text>
      </View>

      {/* CARD */}
      <View style={styles.card}>
        {/* Email Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputWrapper}>
            <Mail size={20} color={COLORS.gray500} style={{marginRight: 10}} />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={form.email}
              onChangeText={t => setForm({...form, email: t})}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
        </View>

        {/* Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <Lock size={20} color={COLORS.gray500} style={{marginRight: 10}} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={form.password}
              onChangeText={t => setForm({...form, password: t})}
              secureTextEntry={!showPassword} // <--- Toggled here
            />
            {/* TOGGLE EYE ICON */}
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeOff size={20} color={COLORS.gray500} />
              ) : (
                <Eye size={20} color={COLORS.gray500} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Forgot Password Link */}
        {isLogin && (
          <TouchableOpacity
            onPress={handleForgotPassword}
            style={{alignSelf: 'flex-end', marginBottom: 20}}>
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

        {/* Main Action Button */}
        <TouchableOpacity
          onPress={handleAuth}
          disabled={loading}
          style={styles.mainBtn}>
          {loading ? (
            <ActivityIndicator color={COLORS.slate900} />
          ) : (
            <>
              <Text style={styles.btnText}>
                {isLogin ? 'Login Dashboard' : 'Create Account'}
              </Text>
              <ArrowRight size={20} color={COLORS.slate900} />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer Toggle */}
      <View style={styles.footer}>
        <Text style={{color: 'gray'}}>
          {isLogin ? 'New here?' : 'Have an account?'}
        </Text>
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.toggleText}>
            {isLogin ? 'Register Store' : 'Login Here'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.slate900,
    justifyContent: 'center',
    padding: 20,
  },
  header: {alignItems: 'center', marginBottom: 40},
  logoBadge: {
    backgroundColor: COLORS.yellow400,
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
    transform: [{rotate: '-5deg'}],
  },
  logoText: {fontSize: 32, fontWeight: '800', color: 'white', marginBottom: 8},
  subtitle: {color: COLORS.gray500, fontSize: 16},
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    elevation: 5,
  },
  inputGroup: {marginBottom: 20},
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate900,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    backgroundColor: '#f8fafc',
  },
  input: {flex: 1, fontSize: 16, color: COLORS.slate900},
  linkText: {color: COLORS.slate900, fontWeight: '600', fontSize: 13},
  mainBtn: {
    backgroundColor: COLORS.yellow400,
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  btnText: {color: COLORS.slate900, fontWeight: 'bold', fontSize: 16},
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 30,
  },
  toggleText: {color: COLORS.yellow400, fontWeight: 'bold'},
});

export default AuthScreen;
