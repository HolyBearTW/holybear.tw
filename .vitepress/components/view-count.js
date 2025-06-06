import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../components/firebase";

export async function incrementAndGetViews(slug) {
  try {
    const ref = doc(db, "views", slug);
    const snap = await getDoc(ref);

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
