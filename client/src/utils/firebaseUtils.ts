import { db } from '../firebase';
import { deleteDoc, doc } from "firebase/firestore";
import { User } from "firebase/auth"; // Assuming currentUser is a Firebase User object

export async function handleDeleteEntry(
    entryId: string,
    currentUser: User | null,
    entrySuccessMessage: { textContent: string } // Assuming entrySuccessMessage has a textContent property
): Promise<void> {
    if (!currentUser) return;
    console.log('Attempting to delete entry ID:', entryId);

    if (confirm("Are you sure you want to delete this entry? This action cannot be undone.")) {
        entrySuccessMessage.textContent = 'Deleting entry...';
        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'entries', entryId));
            console.log('Journal entry deleted with ID:', entryId);
            entrySuccessMessage.textContent = 'Entry deleted successfully.';
        } catch (error) {
            console.error('Error deleting journal entry:', error);
            alert('Error deleting entry. Please try again.');
            entrySuccessMessage.textContent = 'Failed to delete entry.';
        } finally {
            setTimeout(() => { entrySuccessMessage.textContent = ''; }, 5000);
        }
    }
} 