import { View, Text, StyleSheet } from 'react-native'
import { useUser } from '@clerk/clerk-expo'

export default function HomeScreen() {
  const { user } = useUser()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ciao, {user?.firstName ?? 'utente'}!</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
})
