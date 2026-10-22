import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";
import * as Clipboard from "expo-clipboard";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import AutoHideTabBarScrollView from "../../components/AutoHideTabBarScrollView";
import ScreenTitle from "../../components/Title";
import InputField from "../../components/ui/InputField";
import PopupMessage from "../../components/ui/PopupMessage";
import { useRequireAuth } from "../../components/RequireAuth";
import { FontFamily } from "../../constants/fonts";
import { Colors } from "../../constants/theme";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { useTranslation } from "../../hooks/use-translation";
import {
  createApiKey,
  deleteApiKey,
  getApiKeys,
} from "../../services/apiKeysApi";
import formatDate from "../../utils/formatDate";

const API_KEY_LIMIT = 5;

const ApiKeysScreen = () => {
  const authStatus = useRequireAuth();
  const router = useRouter();
  const theme = useColorScheme() ?? "light";
  const palette = Colors[theme];
  const { t } = useTranslation();

  const translateApiKeyError = (code) => {
    const map = {
      API_KEY_NAME_REQUIRED: t("apiKeys.errorNameRequired"),
      API_KEY_LIMIT_REACHED: t("apiKeys.errorLimitReachedTemplate", {
        limit: API_KEY_LIMIT,
      }),
      API_KEY_NOT_FOUND: t("apiKeys.errorNotFound"),
      API_KEY_PERMISSION_DENIED: t("apiKeys.errorPermissionDenied"),
      API_KEY_NOT_ELIGIBLE_FOR_ROLE: t("apiKeys.errorNotEligibleForRole"),
    };
    return map[code] || t("apiKeys.errorGeneric");
  };
  const profile = useSelector((state) => state.user.profile);
  const isBusiness = profile?.role === "business";
  const canManage = isBusiness && profile?.canManageApiKeys === true;

  const [apiKeys, setApiKeys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [popup, setPopup] = useState({
    visible: false,
    message: "",
    type: "info",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  const showPopup = (message, type = "info") =>
    setPopup({ visible: true, message, type });
  const closePopup = () => setPopup((prev) => ({ ...prev, visible: false }));

  // Viewing only requires a business account; creating/deleting additionally
  // requires the canManageApiKeys permission an admin grants per-account.
  // Keep anyone who reaches this screen via a direct link without even the
  // business role from seeing it, even though the nav entry is hidden for
  // individual accounts too.
  useEffect(() => {
    if (authStatus === "auth" && !isBusiness) {
      router.replace("/profile");
    }
  }, [authStatus, isBusiness, router]);

  const fetchApiKeys = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getApiKeys();
      setApiKeys(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(translateApiKeyError(err?.response?.data?.code));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (authStatus === "auth" && isBusiness) {
        fetchApiKeys();
      }
    }, [authStatus, isBusiness, fetchApiKeys]),
  );

  const handleCreate = async () => {
    const name = newKeyName.trim();
    if (!name) {
      showPopup(t("apiKeys.errorNameRequired"), "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await createApiKey(name);
      setApiKeys((prev) => [
        {
          _id: created.id,
          name: created.name,
          keyPrefix: created.keyPrefix,
          createdByType: "user",
          createdAt: created.createdAt,
          lastUsedAt: null,
        },
        ...prev,
      ]);
      setRevealedSecret(created.secret);
      setNewKeyName("");
    } catch (err) {
      showPopup(translateApiKeyError(err?.response?.data?.code), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySecret = async () => {
    if (!revealedSecret) return;
    await Clipboard.setStringAsync(revealedSecret);
    setIsCopied(true);
  };

  const handleDoneCreating = () => {
    setRevealedSecret(null);
    setIsCopied(false);
    setIsCreating(false);
  };

  const handleDelete = async (apiKey) => {
    setDeletingId(apiKey._id);
    try {
      await deleteApiKey(apiKey._id);
      setApiKeys((prev) => prev.filter((item) => item._id !== apiKey._id));
      showPopup(t("apiKeys.deleteSuccess"), "success");
    } catch (err) {
      showPopup(translateApiKeyError(err?.response?.data?.code), "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (authStatus === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (authStatus === "unauth" || authStatus === "inactive" || !isBusiness) {
    return null;
  }

  return (
    <AutoHideTabBarScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
    >
      <PopupMessage
        visible={popup.visible}
        message={popup.message}
        type={popup.type}
        onClose={closePopup}
      />
      <ScreenTitle back>{t("apiKeys.title")}</ScreenTitle>
      <Text
        className="mt-2 text-sm"
        style={{ color: palette.icon, fontFamily: FontFamily.regular }}
      >
        {t("apiKeys.description")}
      </Text>

      {!canManage && (
        <View
          className="mt-4 rounded-2xl border px-4 py-3"
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.border,
          }}
        >
          <Text
            className="text-xs"
            style={{ color: palette.icon, fontFamily: FontFamily.regular }}
          >
            {t("apiKeys.viewOnlyNotice")}
          </Text>
        </View>
      )}

      {canManage && (isCreating ? (
        <View
          className="mt-4 rounded-2xl border px-4 py-4"
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.border,
          }}
        >
          {revealedSecret ? (
            <>
              <Text
                style={{ color: palette.text, fontFamily: FontFamily.bold }}
              >
                {t("apiKeys.keyCreatedTitle")}
              </Text>
              <Text
                className="mt-1 text-xs"
                style={{
                  color: palette.danger,
                  fontFamily: FontFamily.regular,
                }}
              >
                {t("apiKeys.copyWarning")}
              </Text>
              <View
                className="mt-3 rounded-2xl px-3 py-3"
                style={{
                  backgroundColor: palette.background,
                  borderColor: palette.border,
                  borderWidth: 1,
                }}
              >
                <Text
                  selectable
                  className="text-xs"
                  style={{
                    direction: "ltr",
                    textAlign: "left",
                    color: palette.text,
                    fontFamily: FontFamily.regular,
                  }}
                >
                  {revealedSecret}
                </Text>
              </View>
              <View className="mt-3 flex-row gap-2">
                <TouchableOpacity
                  onPress={handleCopySecret}
                  className="flex-1 py-2.5 rounded-2xl items-center"
                  style={{ backgroundColor: palette.primary }}
                >
                  <Text
                    style={{ color: "#fff", fontFamily: FontFamily.medium }}
                  >
                    {isCopied ? t("apiKeys.copiedLabel") : t("apiKeys.copyKeyButton")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDoneCreating}
                  className="flex-1 py-2.5 rounded-2xl items-center"
                  style={{ borderWidth: 1, borderColor: palette.border }}
                >
                  <Text
                    style={{
                      color: palette.text,
                      fontFamily: FontFamily.medium,
                    }}
                  >
                    {t("apiKeys.doneButton")}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <InputField
                label={t("apiKeys.nameLabel")}
                placeholder={t("apiKeys.namePlaceholder")}
                value={newKeyName}
                onChangeText={setNewKeyName}
              />
              <View className="mt-3 flex-row gap-2">
                <TouchableOpacity
                  onPress={handleCreate}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-2xl items-center"
                  style={{
                    backgroundColor: palette.primary,
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text
                      style={{ color: "#fff", fontFamily: FontFamily.medium }}
                    >
                      {t("apiKeys.createButton")}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setIsCreating(false);
                    setNewKeyName("");
                  }}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-2xl items-center"
                  style={{ borderWidth: 1, borderColor: palette.border }}
                >
                  <Text
                    style={{
                      color: palette.text,
                      fontFamily: FontFamily.medium,
                    }}
                  >
                    {t("apiKeys.cancelButton")}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setIsCreating(true)}
          disabled={apiKeys.length >= API_KEY_LIMIT}
          className="mt-4 py-3 rounded-2xl items-center flex-row justify-center gap-2"
          style={{
            backgroundColor: palette.primary,
            opacity: apiKeys.length >= API_KEY_LIMIT ? 0.5 : 1,
          }}
        >
          <MaterialCommunityIcons name="plus" size={18} color="#fff" />
          <Text style={{ color: "#fff", fontFamily: FontFamily.medium }}>
            {t("apiKeys.createNewKeyButton")}
          </Text>
        </TouchableOpacity>
      ))}

      {canManage && (
        <Text
          className="mt-3 text-xs"
          style={{ color: palette.icon, fontFamily: FontFamily.regular }}
        >
          {t("apiKeys.countLabelTemplate", {
            count: apiKeys.length,
            limit: API_KEY_LIMIT,
          })}
        </Text>
      )}

      {isLoading ? (
        <View className="py-8 items-center">
          <ActivityIndicator color={palette.primary} />
        </View>
      ) : errorMessage ? (
        <Text
          className="mt-6 text-center text-sm"
          style={{ color: palette.danger, fontFamily: FontFamily.regular }}
        >
          {errorMessage}
        </Text>
      ) : apiKeys.length === 0 ? (
        <Text
          className="mt-6 text-center text-sm"
          style={{ color: palette.icon, fontFamily: FontFamily.regular }}
        >
          {t("apiKeys.noKeys")}
        </Text>
      ) : (
        <View className="mt-4 gap-3">
          {apiKeys.map((apiKey) => (
            <View
              key={apiKey._id}
              className="rounded-2xl border px-4 py-3"
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
              }}
            >
              <View className="flex-row items-center gap-2">
                <MaterialCommunityIcons
                  name="key-outline"
                  size={22}
                  color={palette.primary}
                />
                <View className="flex-1">
                  <Text
                    style={{
                      color: palette.text,
                      fontFamily: FontFamily.bold,
                    }}
                  >
                    {apiKey.name}
                  </Text>
                  <Text
                    className="text-xs mt-0.5"
                    style={{
                      direction: "ltr",
                      textAlign: "left",
                      color: palette.icon,
                      fontFamily: FontFamily.regular,
                    }}
                  >
                    {apiKey.keyPrefix}…
                  </Text>
                </View>
                {canManage && (
                  <TouchableOpacity
                    onPress={() => handleDelete(apiKey)}
                    disabled={deletingId === apiKey._id}
                  >
                    {deletingId === apiKey._id ? (
                      <ActivityIndicator size="small" color={palette.danger} />
                    ) : (
                      <Text
                        className="text-xs"
                        style={{
                          color: palette.danger,
                          fontFamily: FontFamily.medium,
                        }}
                      >
                        {t("apiKeys.deleteButton")}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              <View className="flex-row items-center justify-between mt-2">
                <Text
                  className="text-xs"
                  style={{ color: palette.icon, fontFamily: FontFamily.regular }}
                >
                  {t("apiKeys.lastUsedLabel")}{" "}
                  {apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : t("apiKeys.neverUsed")}
                </Text>
                <Text
                  className="text-xs"
                  style={{ color: palette.icon, fontFamily: FontFamily.regular }}
                >
                  {apiKey.createdByType === "user" ? t("apiKeys.createdByUser") : t("apiKeys.createdByAdmin")}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </AutoHideTabBarScrollView>
  );
};

export default ApiKeysScreen;
