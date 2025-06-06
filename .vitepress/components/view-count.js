import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../components/firebase";

// 新增 opts 參數，支援 onlyRead
export async function incrementAndGetViews(slug, opts = {}) {
  try {
    const ref = doc(db, "views", slug);
    const snap = await getDoc(ref);

    if (opts.onlyRead) {
      // 只讀取，不更新
      if (snap.exists()) {
        return snap.data().count || 0;
      }
      return 0;
    }

    if (snap.exists()) {
      await updateDoc(ref, { count: increment(1) });
      const latestSnap = await getDoc(ref);
      return latestSnap.data().count || 0;
    } else {
      await setDoc(ref, { count: 1 });
      return 1;
    }
  } catch (e) {
    console.error("[view-count.js] Firestore error:", e);
    throw e;
  }
}
