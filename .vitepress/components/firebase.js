import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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
export const db = getFirestore(app);
