import { ref, onMounted, watch } from 'vue';

// 支援 articleId 為 ref/computed（reactive），SPA 切頁時自動刷新
export function useVote(articleIdRef) {
  const up = ref(0);
  const down = ref(0);
  const loading = ref(true);

  // Firebase 相關變數
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
          apiKey: "AIzaSyA7DEXo4vLvGinpIrOhhCXtoawV0l4zBBc",
          authDomain: "holybear-goodbad.firebaseapp.com",
          projectId: "holybear-goodbad",
          storageBucket: "holybear-goodbad.appspot.com",
          messagingSenderId: "227880753618",
          appId: "1:227880753618:web:280ac7b02894ea857cd00b",
          measurementId: "G-1FQ8WE5HHE"
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
      const docRef = doc(db, 'votes', articleIdRef.value);
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
      const docRef = doc(db, 'votes', articleIdRef.value);
      await updateDoc(docRef, { [type]: increment(1) });
      await fetchVotes();
    } catch (e) {
      console.error("Error voting:", e);
    }
  }

  async function unvote(type) {
    if (!firebaseInitialized) return;
    try {
      const docRef = doc(db, 'votes', articleIdRef.value);
      await updateDoc(docRef, { [type]: increment(-1) });
      await fetchVotes();
    } catch (e) {
      console.error("Error unvoting:", e);
    }
  }

  // 初始化＋初次獲取
  onMounted(async () => {
    await initFirebaseIfNeeded();
    if (firebaseInitialized) {
      await fetchVotes();
    }
  });

  // 監聽 id 變動，SPA 切頁時自動重抓
  watch(articleIdRef, async () => {
    if (firebaseInitialized) {
      await fetchVotes();
    }
  });

  return { up, down, vote, unvote, loading, fetchVotes };
}
