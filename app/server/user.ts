export interface UserData {
  id: string
  username: string
  email_address: string
  first_name: string
  last_name: string
  image_url: string
}

export async function createUser({ data }: { data: UserData }) {
  // TODO: INSERT nella tabella utente
  console.log('createUser stub:', data.id)
}

export async function updateUser({ data }: { data: UserData }) {
  // TODO: UPDATE nella tabella utente
  console.log('updateUser stub:', data.id)
}

export async function deleteUser({ data }: { data: { userId: string } }) {
  // TODO: DELETE dalla tabella utente
  console.log('deleteUser stub:', data.userId)
}
