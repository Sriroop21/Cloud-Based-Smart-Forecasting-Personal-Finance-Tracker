import { deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";

export const deleteTransactionOnFirebase = async (userId, delteField) => {
  try {

    const transactionRef = doc(
      db,
      `users/${userId}/transactions/${delteField.id}`
    );
    const transactionDoc = await getDoc(transactionRef); 
    if (transactionDoc.exists()) {

      const transactionData = transactionDoc.data();

      await deleteDoc(transactionRef, transactionData);
      toast.success("Transaction data Deleted successfully.");
    } else {
      toast.error("Transaction not found in the database.");
    }
  } catch (error) {
    toast.error(error.message);
  }
};
