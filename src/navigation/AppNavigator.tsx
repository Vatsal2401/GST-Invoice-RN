import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';

// Screens
import InvoiceListScreen from '../screens/InvoiceListScreen';
import CreateInvoiceScreen from '../screens/CreateInvoiceScreen';
import PreviewInvoiceScreen from '../screens/PreviewInvoiceScreen';
import CustomersScreen from '../screens/CustomersScreen';
import CustomerLedgerScreen from '../screens/CustomerLedgerScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SetupScreen from '../screens/SetupScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { useStore } from '../store/useStore';

// ─── Stack Param Lists ───────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type InvoicesStackParamList = {
  InvoiceList: undefined;
  CreateInvoice: { invoiceId?: string } | undefined;
  PreviewInvoice: { invoiceId: string };
};

export type CustomersStackParamList = {
  CustomerList: undefined;
  CustomerLedger: { customerId: string; customerName: string };
};

export type HistoryStackParamList = {
  History: undefined;
  PreviewInvoice: { invoiceId: string };
};

export type RootTabParamList = {
  InvoicesTab: undefined;
  CustomersTab: undefined;
  HistoryTab: undefined;
  Settings: undefined;
};

// ─── Stack Navigators ────────────────────────────────────────────────────────

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const InvoicesStack = createNativeStackNavigator<InvoicesStackParamList>();
const CustomersStack = createNativeStackNavigator<CustomersStackParamList>();
const HistoryStack = createNativeStackNavigator<HistoryStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

const PRIMARY = '#1e3a5f';
const ACCENT = '#f0a500';

function AuthNavigator(): React.ReactElement {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function InvoicesNavigator(): React.ReactElement {
  return (
    <InvoicesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: PRIMARY },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <InvoicesStack.Screen
        name="InvoiceList"
        component={InvoiceListScreen}
        options={{ title: 'Invoices' }}
      />
      <InvoicesStack.Screen
        name="CreateInvoice"
        component={CreateInvoiceScreen}
        options={({ route }) => ({
          title: route.params?.invoiceId ? 'Edit Invoice' : 'New Invoice',
        })}
      />
      <InvoicesStack.Screen
        name="PreviewInvoice"
        component={PreviewInvoiceScreen}
        options={{ title: 'Invoice Preview' }}
      />
    </InvoicesStack.Navigator>
  );
}

function CustomersNavigator(): React.ReactElement {
  return (
    <CustomersStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: PRIMARY },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <CustomersStack.Screen
        name="CustomerList"
        component={CustomersScreen}
        options={{ title: 'Customers' }}
      />
      <CustomersStack.Screen
        name="CustomerLedger"
        component={CustomerLedgerScreen}
        options={({ route }) => ({ title: route.params.customerName })}
      />
    </CustomersStack.Navigator>
  );
}

function HistoryNavigator(): React.ReactElement {
  return (
    <HistoryStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: PRIMARY },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <HistoryStack.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'Invoice History' }}
      />
      <HistoryStack.Screen
        name="PreviewInvoice"
        component={PreviewInvoiceScreen}
        options={{ title: 'Invoice Preview' }}
      />
    </HistoryStack.Navigator>
  );
}

// ─── Root Navigator ───────────────────────────────────────────────────────────

export default function AppNavigator(): React.ReactElement {
  const { isAuthenticated } = useStore();

  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'document-text';
          if (route.name === 'InvoicesTab') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'CustomersTab') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'HistoryTab') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return (
            <View>
              <Ionicons name={iconName} size={size} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="InvoicesTab"
        component={InvoicesNavigator}
        options={{ title: 'Invoices' }}
      />
      <Tab.Screen
        name="CustomersTab"
        component={CustomersNavigator}
        options={{ title: 'Customers' }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryNavigator}
        options={{ title: 'History' }}
      />
      <Tab.Screen
        name="Settings"
        component={SetupScreen}
        options={{
          title: 'Settings',
          headerShown: true,
          headerStyle: { backgroundColor: PRIMARY },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          headerTitle: 'Business Setup',
        }}
      />
    </Tab.Navigator>
  );
}
