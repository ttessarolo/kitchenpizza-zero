import { View, Text, StyleSheet } from 'react-native'
import { useSignIn } from '@clerk/clerk-expo'

export default function SignInScreen() {
  const { isLoaded } = useSignIn()

  if (!isLoaded) return null

  return (
    <View style={styles.container}>
      <Text style={styles.title}>KitchenPizza</Text>
      <Text style={styles.subtitle}>Accedi per continuare</Text>
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
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
})
