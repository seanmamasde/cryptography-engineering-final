import React, { useState } from "react";
import { fetchFiles } from "@/hooks/fetchFiles";
import Image from "next/image";
import fileIcons from "@/components/fileIcons";
import { BsThreeDotsVertical } from "react-icons/bs";
import { MdRemoveRedEye } from "react-icons/md";
import { encryptedDownload } from "@/API/EncryptedDownload";
import { useSession } from "next-auth/react";
import FileDropDown from "./FileDropDown";
import { fetchAllFiles } from "@/hooks/fetchAllFiles";
import Rename from "./Rename";
import EncryptedViewer from "./EncryptedViewer";

function GetFiles({ folderId, select }: { folderId: string; select: string }) {
  const [openMenu, setOpenMenu] = useState("");
  const [renameToggle, setRenameToggle] = useState("");
  const [viewingEncrypted, setViewingEncrypted] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState("");

  const { data: session } = useSession();

  let fileList = fetchFiles(folderId, session?.user.email!);
  if (select) fileList = fetchAllFiles(session?.user.email!);

  // const openFile = (fileLink: string) => {
  //   window.open(fileLink, "_blank");
  // };

  const openFile = async (fileId: string, fileName: string) => {
    const blob = await encryptedDownload(fileId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.target = "_blank";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMenuToggle = (fileId: string) => {
    // Toggle the dropdown for the given file
    setRenameToggle("");
    setOpenMenu((prevOpenMenu) => (prevOpenMenu === fileId ? "" : fileId));
  };

  // Function to view encrypted content
  const viewEncrypted = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent div's onDoubleClick
    setSelectedFileId(fileId);
    setViewingEncrypted(true);
  };

  const list = fileList.map((file) => {
    // getting the icon for the file
    const icon =
      fileIcons[file.fileExtension as keyof typeof fileIcons] ??
      fileIcons["any"];

    const img = ["jpg", "ico", "webp", "png", "jpeg", "gif", "jfif"].includes(
      file.fileExtension,
    ) ? (
      <Image
        src={file.fileLink}
        alt={file.fileName}
        height="500"
        width="500"
        draggable={false}
        className="h-full w-full rounded-sm object-cover object-center"
      />
    ) : file.fileExtension === "mp3" ? (
      <div className="flex flex-col items-center justify-center">
        <div className="h-24 w-24 ">{icon}</div>
        <audio controls className="w-44">
          <source src={file.fileLink} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      </div>
    ) : file.fileExtension === "mp4" ? (
      <video controls>
        <source src={file.fileLink} type="audio/mpeg" />
        <div className="h-36 w-36 ">{icon}</div>
      </video>
    ) : (
      <div className="h-36 w-36 ">{icon}</div>
    );

    // set a condition for the files to be displayed
    let condition = !file?.isFolder && !file?.isTrashed;
    if (select === "starred")
      condition = !file?.isFolder && file?.isStarred && !file?.isTrashed;
    else if (select === "trashed")
      condition = !file?.isFolder && file?.isTrashed;

    return (
      condition && (
        <div
          key={file.id}
          onDoubleClick={() => openFile(file.id, file.fileName)}
          className="hover:cursor-alias"
        >
          <div
            className="flex w-full flex-col items-center justify-center
         overflow-hidden rounded-xl bg-darkC2 px-2.5 hover:bg-darkC"
          >
            <div className="relative flex w-full items-center justify-between px-1 py-3">
              <div className="flex items-center space-x-4">
                <div className="h-6 w-6">{icon}</div>
                <span className="w-32 truncate text-sm font-medium text-textC">
                  {file.fileName}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <MdRemoveRedEye
                  onClick={(e) => viewEncrypted(file.id, e)}
                  className="h-5 w-5 cursor-pointer text-gray-600 hover:text-blue-600"
                  title="View encrypted content"
                />
                <BsThreeDotsVertical
                  onClick={() => handleMenuToggle(file.id)}
                  className="h-6 w-6 cursor-pointer rounded-full p-1 hover:bg-[#ccc]"
                />
              </div>
              {
                /* drop down */
                openMenu === file.id && (
                  <FileDropDown
                    file={file}
                    setOpenMenu={setOpenMenu}
                    isFolderComp={false}
                    select={select}
                    folderId=""
                    setRenameToggle={setRenameToggle}
                  />
                )
              }
              {
                // rename toggle
                renameToggle === file.id && (
                  <Rename
                    setRenameToggle={setRenameToggle}
                    fileId={file.id}
                    isFolder={file.isFolder}
                    fileName={file.fileName}
                    fileExtension={file.fileExtension}
                  />
                )
              }
            </div>
            <div className="flex h-44 w-48 items-center justify-center pb-2.5">
              {img}
            </div>
          </div>
        </div>
      )
    );
  });

  // the list of files
  return (
    <>
      {list}
      {/* Encrypted Viewer Modal */}
      {viewingEncrypted && selectedFileId && (
        <EncryptedViewer
          fileId={selectedFileId}
          onClose={() => {
            setViewingEncrypted(false);
            setSelectedFileId("");
          }}
        />
      )}
    </>
  );
}

export default GetFiles;
