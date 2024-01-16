import classNames from "classnames";
import { useEffect, useState } from "react";
import Empty from "@/components/Empty";
import HomeSidebar from "@/components/HomeSidebar";
import HomeSidebarDrawer from "@/components/HomeSidebarDrawer";
import MemoEditor from "@/components/MemoEditor";
import MemoFilter from "@/components/MemoFilter";
import MemoView from "@/components/MemoView";
import MobileHeader from "@/components/MobileHeader";
import { DEFAULT_MEMO_LIMIT } from "@/helpers/consts";
import { getTimeStampByDate } from "@/helpers/datetime";
import useCurrentUser from "@/hooks/useCurrentUser";
import useResponsiveWidth from "@/hooks/useResponsiveWidth";
import { useFilterStore } from "@/store/module";
import { useMemoList, useMemoStore } from "@/store/v1";
import { useTranslate } from "@/utils/i18n";

const Home = () => {
  const t = useTranslate();
  const { md } = useResponsiveWidth();
  const user = useCurrentUser();
  const filterStore = useFilterStore();
  const memoStore = useMemoStore();
  const memoList = useMemoList();
  const [isRequesting, setIsRequesting] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const { tag: tagQuery, text: textQuery } = filterStore.state;
  const sortedMemos = memoList.value
    .sort((a, b) => getTimeStampByDate(b.displayTime) - getTimeStampByDate(a.displayTime))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  useEffect(() => {
    memoList.reset();
    fetchMemos();
  }, [tagQuery, textQuery]);

  const fetchMemos = async () => {
    const filters = [`creator == "${user.name}"`, `row_status == "NORMAL"`, `order_by_pinned == true`];
    const contentSearch: string[] = [];
    if (tagQuery) {
      contentSearch.push(`"#${tagQuery}"`);
    }
    if (textQuery) {
      contentSearch.push(`"${textQuery}"`);
    }
    if (contentSearch.length > 0) {
      filters.push(`content_search == [${contentSearch.join(", ")}]`);
    }
    setIsRequesting(true);
    const data = await memoStore.fetchMemos({
      limit: DEFAULT_MEMO_LIMIT,
      offset: memoList.size(),
      filter: filters.join(" && "),
    });
    setIsRequesting(false);
    setIsComplete(data.length < DEFAULT_MEMO_LIMIT);
  };

  return (
    <div className="w-full max-w-5xl flex flex-row justify-center items-start">
      <div className={classNames("w-full sm:pt-3 md:pt-6", md && "max-w-[calc(100%-14rem)]")}>
        <MobileHeader>{!md && <HomeSidebarDrawer />}</MobileHeader>
        <div className="w-full px-4 sm:px-6 md:pr-2">
          <MemoEditor className="mb-2" cacheKey="home-memo-editor" />
          <div className="flex flex-col justify-start items-start w-full max-w-full overflow-y-scroll pb-28 hide-scrollbar">
            <MemoFilter />
            {sortedMemos.map((memo) => (
              <MemoView key={`${memo.id}-${memo.updateTime}`} memo={memo} showVisibility showPinnedStyle showParent />
            ))}
            {isRequesting ? (
              <div className="flex flex-col justify-start items-center w-full my-8">
                <p className="text-sm text-gray-400 italic">{t("memo.fetching-data")}</p>
              </div>
            ) : isComplete ? (
              sortedMemos.length === 0 && (
                <div className="w-full mt-12 mb-8 flex flex-col justify-center items-center italic">
                  <Empty />
                  <p className="mt-2 text-gray-600 dark:text-gray-400">{t("message.no-data")}</p>
                </div>
              )
            ) : (
              <div className="w-full flex flex-row justify-center items-center my-2">
                <span className="cursor-pointer text-sm italic text-gray-500  hover:text-green-600" onClick={fetchMemos}>
                  {t("memo.fetch-more")}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      {md && (
        <div className="sticky top-0 left-0 shrink-0 w-56 h-full">
          <HomeSidebar />
        </div>
      )}
    </div>
  );
};

export default Home;
