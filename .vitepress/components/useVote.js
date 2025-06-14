import { ref } from 'vue';

export function useVote(articleId) {
  const up = ref(0);
  const down = ref(0);
  const loading = ref(true);

  let db = null;
  let doc = null;
  let getDoc = null;
  let setDoc = null;
  let updateDoc = null;
  let increment = null;
  let firebaseInitialized = false;

  async function initFirebaseIfNeeded() {
    if (typeof window !== 'undefined' && !firebaseInitialized) {
      try {
        const { initializeApp } = await import('firebase/app');
        const firestore = await import('firebase/firestore');
        doc = firestore.doc;
        getDoc = firestore.getDoc;
        setDoc = firestore.setDoc;
        updateDoc = firestore.updateDoc;
        increment = firestore.increment;
        const firebaseConfig = {
          apiKey: "...",
          // ...略...
        };
        const app = initializeApp(firebaseConfig);
        db = firestore.getFirestore(app);
        firebaseInitialized = true;
      } catch (e) {
        console.error("Firebase initialization failed on client:", e);
        loading.value = false;
      }
    }
  }

  async function fetchVotes() {
    if (!firebaseInitialized) {
      loading.value = false;
      return;
    }
    loading.value = true;
    try {
      const docRef = doc(db, 'votes', articleId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        up.value = snap.data().up || 0;
        down.value = snap.data().down || 0;
      } else {
        up.value = 0;
        down.value = 0;
        await setDoc(docRef, { up: 0, down: 0 });
      }
    } catch (e) {
      console.error("Error fetching votes:", e);
      up.value = 0;
      down.value = 0;
    } finally {
      loading.value = false;
    }
  }

  async function vote(type) {
    if (!firebaseInitialized) return;
    try {
      const docRef = doc(db, 'votes', articleId);
      await updateDoc(docRef, { [type]: increment(1) });
      await fetchVotes();
    } catch (e) {
      console.error("Error voting:", e);
    }
  }

  async function unvote(type) {
    if (!firebaseInitialized) return;
    try {
      const docRef = doc(db, 'votes', articleId);
      await updateDoc(docRef, { [type]: increment(-1) });
      await fetchVotes();
    } catch (e) {
      console.error("Error unvoting:", e);
    }
  }

  // 這裡沒有 onMounted 了！

  return { up, down, vote, unvote, loading, fetchVotes };
}
