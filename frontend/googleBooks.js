import { db } from "./firebase.js";
import { getDoc, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const CACHE_COL = "bookCache";

// 12-hour cache expiry check
function isExpired(ts) {
  if (!ts) return true;
  const cachedTime = ts.toMillis ? ts.toMillis() : Date.now();
  return Date.now() - cachedTime > 12 * 60 * 60 * 1000;
}

export async function fetchBookData(title, author) {
  const key = `${title}-${author}`.replace(/\s+/g, "_").toLowerCase();
  const ref = doc(db, CACHE_COL, key);
  const cached = await getDoc(ref);

  if (cached.exists() && !isExpired(cached.data().cachedAt)) {
    console.log("Cache hit ✔", cached.data());
    return cached.data();
  }

  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title + " " + author)}`);
  const data = await res.json();
  const sale = data.items?.[0]?.saleInfo;
  if (!sale) throw new Error("Book not found");

  const basePrice = sale.listPrice?.amount ?? null;
  const inStock = sale.saleability === "FOR_SALE";

  const info = {
    title,
    author,
    basePrice,
    inStock,
    status: inStock ? "ok" : "out_of_stock",
    cachedAt: serverTimestamp()
  };

  await setDoc(ref, info);
  console.log("API success + cached ✔", info);
  return info;
}

export function calcBulkDiscount(qty) {
  const tiers = [50, 40, 30, 15];
  const mins  = [30, 20, 10, 5];

  const idx = mins.findIndex(m => qty >= m);
  const rate = idx === -1 ? 0 : tiers[idx] / 100;
  return rate;
}

export async function generateDiscountReport(title, author, qty) {
  const book = await fetchBookData(title, author);
  const discountRate = calcBulkDiscount(qty);

  if (!book.inStock) {
    const fail = {
      title, author, requestedQty: qty,
      discountRate, finalPrice: null,
      state: "failed", reason: "Out of stock",
      checkedAt: new Date().toISOString()
    };
    console.log(fail);
    return fail;
  }

  const finalPrice = book.basePrice
    ? +(book.basePrice * (1 - discountRate)).toFixed(2)
    : null;

  const report = {
    title,
    author,
    basePrice: book.basePrice,
    requestedQty: qty,
    discountRate,
    finalPrice,
    state: "success",
    checkedAt: new Date().toISOString()
  };

  console.log(report);
  return report;
}

// expose to browser
window.generateDiscountReport = generateDiscountReport;
