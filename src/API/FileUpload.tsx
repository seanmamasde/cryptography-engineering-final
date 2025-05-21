import { storage } from "@/firebaseConfig";
// import { ref, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { ref, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { encryptFile } from "@/lib/cryptoModule";
import { addFiles } from "@/API/Firestore";

const fileUpload = async (
  file: any,
  setProgress: Function,
  parentId: string,
  userEmail: string,
) => {
  // 1. Encrypt on client
  const { blob, meta } = await encryptFile(file, ["prod-dev"]); // only product dev role

  // 2. Register wrapped key with demo-KMS
  await fetch("/api/kms/register/" + file.name, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wrappedKey: meta.wrappedKey, roles: meta.roles }),
  });

  const storageRef = ref(storage, `files/${file.name}`);
  // const uploadTask = uploadBytesResumable(storageRef, file);
  const uploadTask = uploadBytesResumable(storageRef, blob, {
    customMetadata: {
      iv: meta.iv,
      wrappedKey: meta.wrappedKey,
    },
  });
  uploadTask.on(
    "state_changed",
    (snapshot) => {
      const progress = Math.round(
        (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
      );
      // TODO: add progress bar
      setProgress((prev: number[]) => [...prev, { [file.name]: progress }]);
    },
    (error) => {
      alert(error);
    },
    () => {
      getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
        addFiles(downloadURL, file.name, parentId, userEmail);
      });
    },
  );
};

export default fileUpload;
