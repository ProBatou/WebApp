import { AuthScreen } from "./components/AuthScreen";
import { AppShellLayout } from "./components/AppShellLayout";
import { useAppContentModel } from "./hooks/useAppContentModel";
import { I18nProvider } from "./lib/i18n";

function AppContent() {
  const { t, loading, error, user, authScreenProps, appShellLayoutProps } = useAppContentModel();

  if (loading) {
    return <div className="full-screen-state">{t("app.loadingWebapp")}</div>;
  }

  if (error && !user) {
    return <div className="full-screen-state error-state">{t(error)}</div>;
  }

  if (!user) {
    return <AuthScreen {...authScreenProps} />;
  }

  return appShellLayoutProps ? <AppShellLayout {...appShellLayoutProps} /> : null;
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
