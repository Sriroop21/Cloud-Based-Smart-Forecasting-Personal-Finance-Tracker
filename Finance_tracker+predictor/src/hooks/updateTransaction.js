import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";

export const updateTransactionOnFirebase = async (userId, updatedFields) => {
  try {

    const transactionRef = doc(
      db,
      `users/${userId}/transactions/${updatedFields.id}`
    );
    const transactionDoc = await getDoc(transactionRef); 
    if (transactionDoc.exists()) {

      const transactionData = transactionDoc.data();

      const updatedTransaction = { ...transactionData, ...updatedFields };
      await updateDoc(transactionRef, updatedTransaction);
      toast.success("Transaction data updated successfully.");
    } else {
      toast.error("Transaction not found in the database.");
    }
  } catch (error) {
    toast.error(error.message);
  }
};
