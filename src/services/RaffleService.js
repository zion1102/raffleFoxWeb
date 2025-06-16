import { db } from '../config/firebaseConfig';
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { auth } from '../config/firebaseConfig';

// Fetch a single raffle by ID
export const getRaffleById = async (id) => {
  const ref = doc(db, 'raffles', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Raffle not found');
  return { id: snap.id, ...snap.data() };
};

// Save guess to cart
export const saveGuessToCart = async (raffleId, { x, y }, editedGamePicture, imgWidth = 352, imgHeight = 492) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  await addDoc(collection(db, 'cart'), {
    raffleId,
    userId: user.uid,
    xCoord: parseFloat(x.toFixed(2)),
    yCoord: parseFloat(y.toFixed(2)),
    imageUrl: editedGamePicture,
    imgWidth,
    imgHeight,
    createdAt: serverTimestamp()
  });
};


// Save guess directly to confirmed tickets AND deduct credits
export const saveGuessToFirestore = async (
  raffleId,
  { x, y },
  editedGamePicture,
  deductCredits = true,
  imgWidth = 352,
  imgHeight = 492
) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const userRef = doc(db, 'users', user.uid);
  const raffleRef = doc(db, 'raffles', raffleId);

  const [userSnap, raffleSnap] = await Promise.all([
    getDoc(userRef),
    getDoc(raffleRef)
  ]);

  if (!userSnap.exists()) throw new Error('User not found');
  if (!raffleSnap.exists()) throw new Error('Raffle not found');

  const raffleData = raffleSnap.data();

  if (deductCredits) {
    const userData = userSnap.data();
    const costPer = raffleData.costPer || 0;

    if (userData.credits < costPer) {
      throw new Error('Insufficient credits');
    }

    await updateDoc(userRef, {
      credits: userData.credits - costPer
    });
  }

  await addDoc(collection(db, 'raffle_tickets'), {
    raffleId,
    userId: user.uid,
    xCoord: parseFloat(x.toFixed(2)),
    yCoord: parseFloat(y.toFixed(2)),
    createdAt: serverTimestamp(),
    raffleTitle: raffleData.title || 'Untitled Raffle',
    raffleExpiryDate: raffleData.expiryDate || null,
    imageUrl: editedGamePicture,
    imgWidth,
    imgHeight
  });
};



// Fetch 4 valid, non-expired raffles to show as ads (excluding the current one)
export const getSuggestedRaffles = async (excludeId) => {
  const snapshot = await getDocs(collection(db, 'raffles'));
  const now = new Date();

  const valid = snapshot.docs
    .filter(doc => {
      const data = doc.data();
      const expiry = data.expiryDate?.toDate?.();
      return doc.id !== excludeId && expiry && expiry > now;
    })
    .map(doc => ({
      id: doc.id,
      title: doc.data().title || 'Untitled Raffle',
      picture: doc.data().picture || 'https://via.placeholder.com/150',
      expiryDate: doc.data().expiryDate || null
    }));

  return valid.sort(() => 0.5 - Math.random()).slice(0, 4);
};
