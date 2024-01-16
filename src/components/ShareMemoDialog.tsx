import { Button } from "@mui/joy";
import copy from "copy-to-clipboard";
import React, { useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { getDateTimeString } from "@/helpers/datetime";
import useLoading from "@/hooks/useLoading";
import toImage from "@/labs/html2image";
import { useUserStore, extractUsernameFromName } from "@/store/v1";
import { Memo } from "@/types/proto/api/v2/memo_service";
import { useTranslate } from "@/utils/i18n";
import { generateDialog } from "./Dialog";
import Icon from "./Icon";
import MemoContent from "./MemoContent";
import MemoResourceListView from "./MemoResourceListView";
import UserAvatar from "./UserAvatar";
import "@/less/share-memo-dialog.less";

interface Props extends DialogProps {
  memo: Memo;
}

const ShareMemoDialog: React.FC<Props> = (props: Props) => {
  const { memo, destroy } = props;
  const t = useTranslate();
  const userStore = useUserStore();
  const downloadingImageState = useLoading(false);
  const loadingState = useLoading();
  const memoElRef = useRef<HTMLDivElement>(null);
  const user = userStore.getUserByUsername(extractUsernameFromName(memo.creator));

  useEffect(() => {
    (async () => {
      await userStore.getOrFetchUserByUsername(extractUsernameFromName(memo.creator));
      loadingState.setFinish();
    })();
  }, []);

  const handleCloseBtnClick = () => {
    destroy();
  };

  const handleDownloadImageBtnClick = () => {
    if (!memoElRef.current) {
      return;
    }

    downloadingImageState.setLoading();
    toImage(memoElRef.current, {
      pixelRatio: window.devicePixelRatio * 2,
    })
      .then((url) => {
        const a = document.createElement("a");
        a.href = url;
        a.download = `memos-${getDateTimeString(Date.now())}.png`;
        a.click();

        downloadingImageState.setFinish();
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const handleCopyLinkBtnClick = () => {
    copy(`${window.location.origin}/m/${memo.id}`);
    toast.success(t("message.succeed-copy-link"));
  };

  if (loadingState.isLoading) {
    return null;
  }

  return (
    <>
      <div className="dialog-header-container py-3 px-4 !mb-0 rounded-t-lg">
        <p className="">{t("common.share")} Memo</p>
        <button className="btn close-btn" onClick={handleCloseBtnClick}>
          <Icon.X className="icon-img" />
        </button>
      </div>
      <div className="dialog-content-container w-full flex flex-col justify-start items-start relative">
        <div className="px-4 pb-3 w-full flex flex-row justify-start items-center space-x-2">
          <Button color="neutral" variant="outlined" disabled={downloadingImageState.isLoading} onClick={handleDownloadImageBtnClick}>
            {downloadingImageState.isLoading ? (
              <Icon.Loader className="w-4 h-auto mr-1 animate-spin" />
            ) : (
              <Icon.Download className="w-4 h-auto mr-1" />
            )}
            {t("common.image")}
          </Button>
          <Button color="neutral" variant="outlined" onClick={handleCopyLinkBtnClick}>
            <Icon.Link className="w-4 h-auto mr-1" />
            {t("common.link")}
          </Button>
        </div>
        <div className="w-full border-t dark:border-zinc-700 overflow-clip">
          <div
            className="w-full h-auto select-none relative flex flex-col justify-start items-start bg-white dark:bg-zinc-800"
            ref={memoElRef}
          >
            <span className="w-full px-6 pt-5 pb-2 text-sm text-gray-500">{getDateTimeString(memo.displayTime)}</span>
            <div className="w-full px-6 text-base pb-4">
              <MemoContent nodes={memo.nodes} />
              <MemoResourceListView resourceList={memo.resources} />
            </div>
            <div className="flex flex-row justify-between items-center w-full bg-gray-100 dark:bg-zinc-700 py-4 px-6">
              <div className="flex flex-row justify-start items-center">
                <UserAvatar className="mr-2" avatarUrl={user.avatarUrl} />
                <div className="w-auto grow truncate flex mr-2 flex-col justify-center items-start">
                  <span className="w-full text truncate font-medium text-gray-600 dark:text-gray-300">
                    {user.nickname || user.username}
                  </span>
                </div>
              </div>
              <span className="text-gray-500 dark:text-gray-400">via memos</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default function showShareMemoDialog(memo: Memo): void {
  generateDialog(
    {
      className: "share-memo-dialog",
      dialogName: "share-memo-dialog",
    },
    ShareMemoDialog,
    { memo }
  );
}
