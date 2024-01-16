import { Option, Select } from "@mui/joy";
import { useState } from "react";
import Icon from "@/components/Icon";
import MobileHeader from "@/components/MobileHeader";
import MemberSection from "@/components/Settings/MemberSection";
import MyAccountSection from "@/components/Settings/MyAccountSection";
import PreferencesSection from "@/components/Settings/PreferencesSection";
import SSOSection from "@/components/Settings/SSOSection";
import StorageSection from "@/components/Settings/StorageSection";
import SystemSection from "@/components/Settings/SystemSection";
import useCurrentUser from "@/hooks/useCurrentUser";
import { User_Role } from "@/types/proto/api/v2/user_service";
import { useTranslate } from "@/utils/i18n";
import "@/less/setting.less";

type SettingSection = "my-account" | "preference" | "member" | "system" | "storage" | "sso";

interface State {
  selectedSection: SettingSection;
}

const Setting = () => {
  const t = useTranslate();
  const user = useCurrentUser();
  const [state, setState] = useState<State>({
    selectedSection: "my-account",
  });
  const isHost = user.role === User_Role.HOST;

  const handleSectionSelectorItemClick = (settingSection: SettingSection) => {
    setState({
      selectedSection: settingSection,
    });
  };

  const getSettingSectionList = () => {
    let settingList: SettingSection[] = ["my-account", "preference"];
    if (isHost) {
      settingList = settingList.concat(["member", "system", "storage", "sso"]);
    }
    return settingList;
  };

  return (
    <section className="@container w-full max-w-5xl min-h-full flex flex-col justify-start items-start sm:pt-3 md:pt-6 pb-8">
      <MobileHeader />
      <div className="w-full px-4 sm:px-6">
        <div className="setting-page-wrapper">
          <div className="section-selector-container">
            <span className="section-title">{t("common.basic")}</span>
            <div className="section-items-container">
              <span
                onClick={() => handleSectionSelectorItemClick("my-account")}
                className={`section-item ${state.selectedSection === "my-account" ? "selected" : ""}`}
              >
                <Icon.User className="w-4 h-auto mr-2 opacity-80" /> {t("setting.my-account")}
              </span>
              <span
                onClick={() => handleSectionSelectorItemClick("preference")}
                className={`section-item ${state.selectedSection === "preference" ? "selected" : ""}`}
              >
                <Icon.Cog className="w-4 h-auto mr-2 opacity-80" /> {t("setting.preference")}
              </span>
            </div>
            {isHost ? (
              <>
                <span className="section-title">{t("common.admin")}</span>
                <div className="section-items-container">
                  <span
                    onClick={() => handleSectionSelectorItemClick("member")}
                    className={`section-item ${state.selectedSection === "member" ? "selected" : ""}`}
                  >
                    <Icon.Users className="w-4 h-auto mr-2 opacity-80" /> {t("setting.member")}
                  </span>
                  <span
                    onClick={() => handleSectionSelectorItemClick("system")}
                    className={`section-item ${state.selectedSection === "system" ? "selected" : ""}`}
                  >
                    <Icon.Settings2 className="w-4 h-auto mr-2 opacity-80" /> {t("setting.system")}
                  </span>
                  <span
                    onClick={() => handleSectionSelectorItemClick("storage")}
                    className={`section-item ${state.selectedSection === "storage" ? "selected" : ""}`}
                  >
                    <Icon.Database className="w-4 h-auto mr-2 opacity-80" /> {t("setting.storage")}
                  </span>
                  <span
                    onClick={() => handleSectionSelectorItemClick("sso")}
                    className={`section-item ${state.selectedSection === "sso" ? "selected" : ""}`}
                  >
                    <Icon.Key className="w-4 h-auto mr-2 opacity-80" /> {t("setting.sso")}
                  </span>
                </div>
              </>
            ) : null}
          </div>
          <div className="section-content-container sm:max-w-[calc(100%-12rem)]">
            <Select
              className="block mb-2 sm:!hidden"
              value={state.selectedSection}
              onChange={(_, value) => handleSectionSelectorItemClick(value as SettingSection)}
            >
              {getSettingSectionList().map((settingSection) => (
                <Option key={settingSection} value={settingSection}>
                  {t(`setting.${settingSection}`)}
                </Option>
              ))}
            </Select>
            {state.selectedSection === "my-account" ? (
              <MyAccountSection />
            ) : state.selectedSection === "preference" ? (
              <PreferencesSection />
            ) : state.selectedSection === "member" ? (
              <MemberSection />
            ) : state.selectedSection === "system" ? (
              <SystemSection />
            ) : state.selectedSection === "storage" ? (
              <StorageSection />
            ) : state.selectedSection === "sso" ? (
              <SSOSection />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Setting;
