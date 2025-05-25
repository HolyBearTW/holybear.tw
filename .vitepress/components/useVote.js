import { ref, onMounted } from 'vue'

export function useVote(articleId) {
  const up = ref(0)
  const down = ref(0)
  const loading = ref(true)

  let db, doc, getDoc, setDoc, updateDoc, increment

  async function fetchVotes() {
    if (typeof window === 'undefined') {
      loading.value = false
      return
    }
    if (!db) {
      const { initializeApp } = await import('firebase/app')
      const firestore = await import('firebase/firestore')
      doc = firestore.doc
      getDoc = firestore.getDoc
      setDoc = firestore.setDoc
      updateDoc = firestore.updateDoc
      increment = firestore.increment
      const firebaseConfig = { ... } // 你的 config
      const app = initializeApp(firebaseConfig)
      db = firestore.getFirestore(app)
    }
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
    if (!db) await fetchVotes()
    const docRef = doc(db, 'votes', articleId)
    await updateDoc(docRef, { [type]: increment(1) })
    await fetchVotes()
  }

  onMounted(fetchVotes)

  return { up, down, vote, loading }
}
