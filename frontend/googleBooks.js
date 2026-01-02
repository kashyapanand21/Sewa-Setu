import { db, getDoc, doc } from "./firebase.js";
import { setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const CACHE_COL = "bookCache";

export async function fetchBookData(title, author) {
  const ref = doc(db, CACHE_COL, `${title}-${author}`);
  const cached = await getDoc(ref);
  if (cached.exists()) {
    console.log("Cache hit ✔", cached.data());
    return cached.data();
  }

  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title + " " + author)}`);
    const data = await res.json();
    const info = {
      title,
      author,
      price: data.items?.[0]?.saleInfo?.listPrice?.amount ?? null,
      availability: data.items?.[0]?.saleInfo?.saleability ?? "UNKNOWN"
    };
    console.log("API success ✔", info);

    await setDoc(ref, {
      ...info,
      cachedAt: serverTimestamp()
    });

    console.log("Cached to Firestore ✔");
    return info;
  } catch (e) {
    console.error("API failed ❌", e);
    return null;
  }
}

export function calcBulkDiscount(buyers) {
  return buyers >= 10 ? 0.30 : 0;
}

export async function searchBook(title, author, buyers) {
  const book = await fetchBookData(title, author);
  if (!book) {
    console.error("Search failed ❌ No data");
    return null;
  }
  const discount = calcBulkDiscount(buyers);
  const finalPrice = book.price ? book.price * (1 - discount) : null;
  console.log(`Discount: ${discount*100}% | Final Price:`, finalPrice);
  return { ...book, discount, finalPrice };
}

window.searchBook = searchBook;
export { fetchBookData, searchBook, calcBulkDiscount };
