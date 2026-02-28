import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';
import { Platform } from 'react-native';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  focused,
}: {
  name: IoniconsName;
  focused: boolean;
}) {
  return (
    <Ionicons
      name={name}
      size={24}
      color={focused ? COLORS.primary : COLORS.textTertiary}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: {
          backgroundColor: COLORS.bgCard,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 88 : 88,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Aujourd'hui",
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'checkmark-circle' : 'checkmark-circle-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Statistiques',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'bar-chart' : 'bar-chart-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="calories"
        options={{
          title: 'Calories',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'flame' : 'flame-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
