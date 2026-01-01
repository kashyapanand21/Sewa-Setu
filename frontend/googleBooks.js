import { db, addDoc, getDoc, doc, collection } from "./firebase.js";

const CACHE_COL = "bookCache";

async function fetchBookData(title, author) {
  const cacheRef = doc(db, CACHE_COL, `${title}-${author}`);
  const cached = await getDoc(cacheRef);
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

    await addDoc(collection(db, CACHE_COL), {
      _id: `${title}-${author}`,
      ...info,
      cachedAt: new Date()
    });
    console.log("Cached to Firestore ✔");
    return info;
  } catch (e) {
    console.error("API failed ❌", e);
    return null;
  }
}

function calcBulkDiscount(buyers) {
  if (buyers >= 10) return 0.30;
  return 0;
}

async function searchBook(title, author, buyers) {
  const book = await fetchBookData(title, author);
  if (!book) {
    console.error("Search failed ❌ No data");
    return null;
  }
  const discount = calcBulkDiscount(buyers);
  const finalPrice = book.price ? book.price * (1 - discount) : null;
  console.log(`Discount: ${discount*100}%`, `Final price:`, finalPrice);
  return { ...book, discount, finalPrice };
}

// expose for console testing
window.searchBook = searchBook;
export { fetchBookData, searchBook, calcBulkDiscount };
