// useVote.js
import { ref, onMounted } from 'vue';

export function useVote(articleId) {
  const up = ref(0);
  const down = ref(0);
  const loading = ref(true);

  // 將 Firebase 相關的變數定義為可選的，並在客戶端才賦值
  let db = null;
  let doc = null;
  let getDoc = null;
  let setDoc = null;
  let updateDoc = null;
  let increment = null;

  // 使用一個變數標記是否已初始化，並確保僅在客戶端執行
  let firebaseInitialized = false;

  async function initFirebaseIfNeeded() {
    // !!! 核心修正：僅在客戶端環境才執行 Firebase 的初始化 !!!
    if (typeof window !== 'undefined' && !firebaseInitialized) {
      // 由於 Firebase 的模組本身可能在 Node.js 環境下有問題
      // 我們動態導入並確保只在客戶端執行這些步驟
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
        firebaseInitialized = true; // 標記為已初始化
      } catch (e) {
        console.error("Firebase initialization failed on client:", e);
        // 如果初始化失敗，確保 loading 狀態正確
        loading.value = false;
        // 考慮在開發模式下提供更詳細錯誤，生產模式下則靜默
      }
    }
  }

  async function fetchVotes() {
    // 確保只在客戶端且 Firebase 已初始化時才執行
    if (!firebaseInitialized) {
      loading.value = false; // 如果 Firebase 未初始化，直接設為非載入中
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
          await setDoc(docRef, { up: 0, down: 0 }); // 確保文檔存在
        }
    } catch (e) {
        console.error("Error fetching votes:", e);
        // 處理錯誤，例如將計數設為預設值
        up.value = 0;
        down.value = 0;
    } finally {
        loading.value = false;
    }
  }

  async function vote(type) {
    if (!firebaseInitialized) return; // 未初始化則不執行
    try {
        const docRef = doc(db, 'votes', articleId);
        await updateDoc(docRef, { [type]: increment(1) });
        await fetchVotes(); // 重新獲取最新數據
    } catch (e) {
        console.error("Error voting:", e);
    }
  }

  async function unvote(type) {
    if (!firebaseInitialized) return; // 未初始化則不執行
    try {
        const docRef = doc(db, 'votes', articleId);
        await updateDoc(docRef, { [type]: increment(-1) });
        await fetchVotes(); // 重新獲取最新數據
    } catch (e) {
        console.error("Error unvoting:", e);
    }
  }

  // !!! 核心修正：在 onMounted 中初始化 Firebase 並獲取數據 !!!
  onMounted(async () => {
    await initFirebaseIfNeeded(); // 初始化 Firebase
    if (firebaseInitialized) { // 如果初始化成功，才獲取數據
      await fetchVotes();
    }
  });


  return { up, down, vote, unvote, loading, fetchVotes };
}
