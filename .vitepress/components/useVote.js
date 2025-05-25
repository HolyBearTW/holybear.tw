import { ref } from 'vue'
import { db } from './firebase'
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore"

export function useVote(articleId) {
  const up = ref(0)
  const down = ref(0)
  const loading = ref(true)

  async function fetchVotes() {
    loading.value = true
    const docRef = doc(db, 'votes', articleId)
    const snap = await getDoc(docRef)
    if (snap.exists()) {
      up.value = snap.data().up || 0
      down.value = snap.data().down || 0
    } else {
      up.value = 0
      down.value = 0
      await setDoc(docRef, { up: 0, down: 0 })
    }
    loading.value = false
  }

  async function vote(type) {
    const docRef = doc(db, 'votes', articleId)
    await updateDoc(docRef, { [type]: increment(1) })
    await fetchVotes()
  }

  fetchVotes()

  return { up, down, vote, loading }
}
