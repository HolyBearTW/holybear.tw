import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "./firebase";

export async function incrementAndGetViews(slug) {
  const ref = doc(db, "views", slug);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await updateDoc(ref, { count: increment(1) });
    return (snap.data().count || 0) + 1;
  } else {
    await setDoc(ref, { count: 1 });
    return 1;
  }
}
